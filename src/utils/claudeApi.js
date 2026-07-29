import { supabase } from '../lib/supabase'
import { normalizeMacros } from './macroValidation'
import { track } from '../lib/analytics'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

// Once the proxy fails at the transport level, skip it for the rest of the
// session instead of paying a failed round-trip on every call.
let proxyUnavailable = false

// The 10 macro fields we track. Used for numeric coercion and the structured-
// output schema below.
const MACRO_FIELDS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'saturatedFat', 'sodium', 'cholesterol', 'potassium']

// Structured outputs guarantee valid, correctly-typed JSON with every macro
// field present — the model can no longer silently omit `fiber` or return a
// string where a number belongs. It also removes nearly all parse failures,
// which matters for cost: a parse failure makes callClaudeJson() retry the
// whole request, which bills a second Haiku call AND burns a second free-tier
// quota unit (the proxy increments usage before calling Anthropic).
//
// Supported on claude-haiku-4-5 (GA, no beta header) and forwarded by
// claude-proxy v21+, which passes body.output_config straight through.
const USE_STRUCTURED_OUTPUT = true

// The "already ate" path attaches the web_search server tool. Structured
// outputs are documented as incompatible with citations, and web-search results
// carry their own citation blocks, so that combination stays OFF until it's
// verified live — a schema rejection there would break the app's highest-volume
// macro path. Everything else runs with schemas on.
const USE_STRUCTURED_OUTPUT_WITH_SEARCH = false

const MACRO_PROPS = MACRO_FIELDS.reduce((o, k) => { o[k] = { type: 'number' }; return o }, {})
const MACRO_OBJECT_SCHEMA = { type: 'object', properties: MACRO_PROPS, required: MACRO_FIELDS, additionalProperties: false }

// Note: numeric bounds (minimum/maximum) are deliberately absent — the API's
// structured-output subset doesn't support them. Range checking happens in
// macroValidation.js instead.
const MEAL_FORMAT = {
  format: {
    type: 'json_schema',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        ingredients: { type: 'array', items: { type: 'string' } },
        macros: MACRO_OBJECT_SCHEMA,
        prepTimeMinutes: { type: 'number' },
        instructions: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'ingredients', 'macros', 'prepTimeMinutes', 'instructions'],
      additionalProperties: false,
    },
  },
}

// A strict schema can't also express the old `{ error: "not found" }` escape
// hatch, so unidentifiable food is signalled with found:false instead. The
// callers still check json.error too, so a non-schema response is handled the
// same way it always was.
const LOOKUP_FORMAT = {
  format: {
    type: 'json_schema',
    schema: {
      type: 'object',
      properties: {
        found: { type: 'boolean' },
        name: { type: 'string' },
        servingSize: { type: 'string' },
        calories: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
      },
      required: ['found', 'name', 'servingSize', 'calories', 'protein', 'carbs', 'fat'],
      additionalProperties: false,
    },
  },
}

// Only used if USE_STRUCTURED_OUTPUT_WITH_SEARCH is turned on — see the note there.
const EATEN_FORMAT = {
  format: {
    type: 'json_schema',
    schema: {
      type: 'object',
      properties: {
        found: { type: 'boolean' },
        identifiedAs: { type: 'string' },
        servingSize: { type: 'string' },
        macros: MACRO_OBJECT_SCHEMA,
      },
      required: ['found', 'identifiedAs', 'servingSize', 'macros'],
      additionalProperties: false,
    },
  },
}

// Region/locale context. Given the user's country name, tells Claude to use
// that country's specific food data — the single biggest accuracy lever, since
// the same branded item differs by country (e.g. a UK vs US Big Mac).
function localeBlock(countryName) {
  if (!countryName) return ''
  return `The user is in ${countryName}. Use ${countryName}'s regional food data: for brand-name, restaurant, or packaged items use THAT country's specific recipe/formulation and serving sizes — these genuinely differ by country (e.g. a UK Big Mac and a US Big Mac have different calories). For generic foods use local standard portion sizes and regional fortification.
`
}

// Per-ingredient reconciliation forces the macros to actually add up, instead
// of a lump-sum guess. The worked example doubles as cheap few-shot grounding.
const RECONCILE = `Accuracy method: list each ingredient with an explicit quantity (grams or standard units, e.g. "120 g chicken breast"). Estimate each ingredient's macros from standard nutrition data, then sum them for the totals. The total calories MUST reconcile with the macros — calories ≈ 4×protein + 4×carbs + 9×fat, within ~5%. If they don't reconcile, correct the numbers before returning. Example: 150 g cooked chicken breast ≈ 248 kcal / 46 g protein / 0 g carbs / 5.4 g fat — sum every ingredient the same way.
Also check these hold before returning: saturatedFat ≤ fat, sugar ≤ carbs, fiber ≤ carbs.`

// The estimation paths (food lookup, "already ate") describe a portion rather
// than building a recipe, so they get the arithmetic requirement without the
// per-ingredient recipe framing.
const RECONCILE_ESTIMATE = `Accuracy method: work out the portion's component parts and their weights first, estimate each from standard nutrition data, then sum. The total calories MUST reconcile with the macros — calories ≈ 4×protein + 4×carbs + 9×fat, within ~5%. If they don't reconcile, correct the numbers before returning. Also check these hold: saturatedFat ≤ fat, sugar ≤ carbs, fiber ≤ carbs. Be realistic about portion size — it is the single largest source of error; state the portion you assumed in servingSize.`

// All Claude traffic goes through the claude-proxy Supabase Edge Function
// (key lives server-side). The direct browser call only exists as a local-dev
// fallback and requires VITE_ANTHROPIC_API_KEY in .env.
//
// webSearch=true asks the proxy to attach the web_search tool (used only on the
// "already ate" path for authoritative regional branded nutrition). countryCode
// (ISO alpha-2) scopes the search. outputConfig carries structured-output format.
async function anthropicRequest({ system, messages, maxTokens = 512, webSearch = false, countryCode = '', outputConfig = null, kind = '', temperature = null }) {
  if (!proxyUnavailable) {
    const body = { system, messages, max_tokens: maxTokens }
    if (webSearch) { body.webSearch = true; if (countryCode) body.country = countryCode }
    if (outputConfig) body.output_config = outputConfig
    if (kind) body.kind = kind
    if (temperature != null) body.temperature = temperature
    const { data, error } = await supabase.functions.invoke('claude-proxy', { body })
    if (!error && data?.content) return data
    // A Pro-gated or quota-exceeded rejection is never a "proxy is down"
    // situation — surface it distinctly instead of falling back to a direct
    // (paywall-bypassing) call.
    if (error?.context?.status === 402) {
      const proErr = new Error('MissVfit Pro required')
      proErr.code = 'PRO_REQUIRED'
      throw proErr
    }
    if (error?.context?.status === 429) {
      const quotaErr = new Error('Daily AI limit reached')
      quotaErr.code = 'QUOTA_EXCEEDED'
      throw quotaErr
    }
    if (!API_KEY) throw new Error(error?.message || 'Claude proxy error')
    proxyUnavailable = true
    console.warn('[claudeApi] proxy unavailable, falling back to direct dev call:', error?.message)
  }

  // Direct dev fallback — mirrors the proxy: attaches web_search / output_config
  // and resumes server-tool loops that stop with pause_turn.
  const basePayload = { model: MODEL, max_tokens: maxTokens, system }
  if (webSearch) {
    const userLocation = { type: 'approximate' }
    if (countryCode) userLocation.country = countryCode
    basePayload.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3, user_location: userLocation }]
  }
  if (outputConfig) basePayload.output_config = outputConfig
  if (temperature != null) basePayload.temperature = temperature

  let convo = messages
  let last = null
  for (let i = 0; i <= 5; i++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ ...basePayload, messages: convo }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Claude API error ${res.status}`)
    }
    last = await res.json()
    if (last.stop_reason !== 'pause_turn') return last
    convo = [...convo, { role: 'assistant', content: last.content }]
  }
  return last
}

// Concatenate all text blocks. Handles both plain responses (one text block)
// and web-search responses (text after server_tool_use / web_search_tool_result).
function extractText(data) {
  const blocks = data?.content
  if (!Array.isArray(blocks)) return ''
  return blocks.filter(b => b?.type === 'text').map(b => b.text).join('\n').trim()
}

async function callClaude(systemPrompt, userMessage, { maxTokens = 512, webSearch = false, countryCode = '', outputConfig = null, kind = '', temperature = null } = {}) {
  const data = await anthropicRequest({
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens, webSearch, countryCode, outputConfig, kind, temperature,
  })
  return extractText(data)
}

// Lenient JSON extraction: strip code fences, else grab the outermost {...}.
function parseLoose(raw) {
  const text = String(raw || '').replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim()
  try { return JSON.parse(text) } catch { /* fall through */ }
  const m = text.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch { /* fall through */ } }
  return undefined
}

// Call Claude for JSON, retrying the whole call once on a parse failure so a
// single malformed response doesn't silently become null. A thrown transport /
// API error fails gracefully to null (no retry) — matching the old behaviour so
// the UI never hangs on a network or proxy error.
async function callClaudeJson(system, userMessage, opts, tag) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw
    try {
      raw = await callClaude(system, userMessage, opts)
    } catch (err) {
      if (err?.code === 'PRO_REQUIRED' || err?.code === 'QUOTA_EXCEEDED') {
        track('ai_request', { kind: tag, outcome: err.code.toLowerCase() })
        throw err
      }
      console.error(`[${tag}] request failed`, err?.message)
      track('ai_request', { kind: tag, outcome: 'error' })
      return null
    }
    const json = parseLoose(raw)
    if (json !== undefined) {
      track('ai_request', { kind: tag, outcome: 'success' })
      return json
    }
    if (attempt === 1) console.error(`[${tag}] JSON parse failed after retry`)
  }
  track('ai_request', { kind: tag, outcome: 'parse_failed' })
  return null
}

// --- Food Lookup cache ---
// The craving box calls lookupFood on every 700ms typing pause, so backspacing
// a character and retyping it used to cost a fresh Haiku call AND a free-tier
// quota unit for an answer we already had. Keyed by query + country because the
// same query genuinely returns different figures per region (see localeBlock).
//
// Persisted so the cache survives a reload, capped so it can't grow unbounded,
// and versioned so a prompt change invalidates every stored answer.
const LOOKUP_CACHE_KEY = 'mv_food_lookup_v1'
const LOOKUP_CACHE_MAX = 200
const lookupCache = new Map()

function loadLookupCache() {
  try {
    const raw = localStorage.getItem(LOOKUP_CACHE_KEY)
    if (!raw) return
    for (const [k, v] of Object.entries(JSON.parse(raw))) lookupCache.set(k, v)
  } catch { /* corrupt or unavailable storage — start empty */ }
}
loadLookupCache()

function persistLookupCache() {
  try {
    // Map preserves insertion order, so the oldest entries drop out first.
    const trimmed = [...lookupCache.entries()].slice(-LOOKUP_CACHE_MAX)
    lookupCache.clear()
    for (const [k, v] of trimmed) lookupCache.set(k, v)
    localStorage.setItem(LOOKUP_CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)))
  } catch { /* quota exceeded / private mode — in-memory cache still works */ }
}

const lookupCacheKey = (query, countryName) =>
  `${countryName || '-'}::${String(query || '').trim().toLowerCase().replace(/\s+/g, ' ')}`

// --- Food Lookup ---
// Returns { name, calories, protein, carbs, fat, servingSize } or null
export async function lookupFood(query, { countryName = '' } = {}) {
  const cacheKey = lookupCacheKey(query, countryName)
  if (lookupCache.has(cacheKey)) return lookupCache.get(cacheKey)

  const system = `${localeBlock(countryName)}You are a nutrition database. Given a food description, return ONLY valid JSON with these exact keys:
{ "found": boolean, "name": string, "servingSize": string, "calories": number, "protein": number, "carbs": number, "fat": number }
All macros are in grams. Calories are kcal. Use standard serving sizes for the user's region.
${RECONCILE_ESTIMATE}
If you cannot identify the food, return found:false with empty name and zeroed numbers. Otherwise found:true.
Return ONLY the JSON object — no explanation, no markdown.`

  const json = await callClaudeJson(system, query, {
    maxTokens: 350,
    outputConfig: USE_STRUCTURED_OUTPUT ? LOOKUP_FORMAT : null,
    kind: 'lookupFood',
    temperature: 0,
  }, 'lookupFood')

  // A transport/parse failure (null json) is deliberately NOT cached — that's a
  // transient error, and caching it would lock the user out of retrying. A
  // confident "not found" is cached, since re-asking won't change the answer.
  if (!json) return null
  const result = (json.error || json.found === false) ? null : normalizeMacros(json)
  lookupCache.set(cacheKey, result)
  persistLookupCache()
  return result
}

const MACRO_SCHEMA = `{"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "saturatedFat": number, "sodium": number, "cholesterol": number, "potassium": number}`

// What the meal should be optimised for. This replaces an older "Physique goal"
// line that interpolated userProfile.physique — that field is hardcoded to
// 'lean_toned' for every user (the physique onboarding step was removed), so it
// was the same sentence on every request. fitnessGoal is set during onboarding
// and actually varies, so it's real personalisation for the same token cost.
const GOAL_PROMPT = {
  lose_weight: 'Goal: fat loss — high protein and high volume for satiety, moderate calories.',
  build_muscle: 'Goal: muscle gain — high protein with enough carbs to fuel training.',
  tone_recomp: 'Goal: tone and recomposition — high protein, whole foods, balanced carbs and fat.',
  maintain: 'Goal: maintenance — balanced whole foods, adequate protein.',
  athletic_performance: 'Goal: athletic performance — carb-forward for fuelling, solid protein for recovery.',
}

// --- Meal Suggestion ---
// Returns { name, ingredients[], macros{...full macro schema...}, prepTimeMinutes, instructions[] } or null
// cravingOnly=true: generate the craved dish authentically — no calorie padding
export async function suggestMeal({ mealType, targetCalories, targetProtein, targetCarbs, targetFat, dietary, allergies, fitnessGoal, craving, cravingOnly = false, countryName = '' }) {
  const allergyStr = allergies?.length ? `Never include: ${allergies.join(', ')}.` : ''
  const dietaryStr = dietary?.length ? `Diet: ${dietary.join(', ')}.` : ''
  const locale = localeBlock(countryName)
  const goalStr = GOAL_PROMPT[fitnessGoal] || GOAL_PROMPT.tone_recomp

  let system
  if (cravingOnly && craving) {
    const calHint = targetCalories ? ` (approximately ${targetCalories} kcal)` : ''
    system = `${locale}You are a nutrition coach for a women's fitness app called MissVfit.
The user wants to eat: "${craving}".
${dietaryStr}
${allergyStr}
Generate a proper home-cooked recipe for this dish${calHint}.
Rules:
- Assume the user is cooking from scratch with standard grocery-store raw ingredients
- Do NOT assume they have specialty or pre-prepared products (e.g. if they want salmon, use a fresh salmon fillet to cook — not smoked salmon or a pre-made product)
- Use a realistic single-serving portion
- prepTimeMinutes must reflect actual cooking time — never less than 10 minutes for a cooked meal
- Do NOT add extra side dishes or foods just to inflate calorie count
${RECONCILE}
Return ONLY valid JSON:
{ "name": string, "ingredients": [string], "macros": ${MACRO_SCHEMA}, "prepTimeMinutes": number, "instructions": [string] }
Estimate fiber/sugar/saturatedFat/sodium/cholesterol/potassium as best you can (grams for fiber/sugar/saturatedFat, milligrams for sodium/cholesterol/potassium) — these are tracked but not targeted.
No markdown, no explanation — just the JSON.`
  } else {
    const cravingStr = craving ? `The user is craving: "${craving}". Build the meal around this craving.` : ''
    system = `${locale}You are a nutrition coach for a women's fitness app called MissVfit.
Generate a single ${mealType} meal fitting these constraints:
- Target ~${targetCalories} kcal, Protein ~${targetProtein}g, Carbs ~${targetCarbs}g, Fat ~${targetFat}g
${dietaryStr}
${allergyStr}
${cravingStr}
${goalStr}
${RECONCILE}
Return ONLY valid JSON:
{ "name": string, "ingredients": [string], "macros": ${MACRO_SCHEMA}, "prepTimeMinutes": number, "instructions": [string] }
Estimate fiber/sugar/saturatedFat/sodium/cholesterol/potassium as best you can (grams for fiber/sugar/saturatedFat, milligrams for sodium/cholesterol/potassium) — these are tracked but not targeted.
No markdown, no explanation — just the JSON.`
  }

  // No temperature override here — recipe variety is a feature, and users
  // regenerate expecting something different. Only the estimation paths are
  // pinned to 0.
  const json = await callClaudeJson(system, `Suggest a ${mealType} for today.`, {
    maxTokens: 1100,
    outputConfig: USE_STRUCTURED_OUTPUT ? MEAL_FORMAT : null,
    kind: 'suggestMeal',
  }, 'suggestMeal')
  if (!json) return null
  if (json.macros) json.macros = normalizeMacros(json.macros)
  return json
}

// --- Adjust an existing meal via free text ---
// Returns the same shape as suggestMeal, or null
export async function adjustMeal({ meal, instruction, dietary, allergies, countryName = '' }) {
  const allergyStr = allergies?.length ? `Never include: ${allergies.join(', ')}.` : ''
  const dietaryStr = dietary?.length ? `Diet: ${dietary.join(', ')}.` : ''

  const system = `${localeBlock(countryName)}You are a nutrition coach for a women's fitness app called MissVfit.
The user has this existing meal:
${JSON.stringify({ name: meal.name, ingredients: meal.ingredients, instructions: meal.instructions, macros: meal.macros, prepTimeMinutes: meal.prepTimeMinutes })}
The user wants this change: "${instruction}"
${dietaryStr}
${allergyStr}
Apply the requested change. Keep everything else as similar as possible. Recalculate macros only if the change actually affects them.
${RECONCILE}
Return ONLY valid JSON:
{ "name": string, "ingredients": [string], "macros": ${MACRO_SCHEMA}, "prepTimeMinutes": number, "instructions": [string] }
No markdown, no explanation — just the JSON.`

  const json = await callClaudeJson(system, 'Apply the change.', {
    maxTokens: 1100,
    outputConfig: USE_STRUCTURED_OUTPUT ? MEAL_FORMAT : null,
    kind: 'adjustMeal',
  }, 'adjustMeal')
  if (!json) return null
  if (json.macros) json.macros = normalizeMacros(json.macros)
  return json
}

// --- Identify a food the user already ate, from free text ---
// Returns { identifiedAs, servingSize, macros{...full macro schema...} }, { error }, or null.
// Uses web search (when the proxy supports it) to ground branded/restaurant
// items in real, country-specific published nutrition data.
export async function identifyEatenFood(description, { countryName = '', countryCode = '' } = {}) {
  const brandExample = countryName
    ? `Example: "McDonald's Big Mac" in ${countryName} — use ${countryName}'s Big Mac figures, which differ from other countries.`
    : ''
  const system = `${localeBlock(countryName)}You are a nutrition estimator for a women's fitness app called MissVfit.
The user tells you what they already ate. Identify the most likely specific food or dish.
If the item is a branded, restaurant, or packaged product, use the web_search tool to look up its OFFICIAL published nutrition information for the user's country and base the macros on those figures. For generic or home-cooked food, estimate from a standard serving without searching.
${brandExample}
If multiple items are mentioned, combine them into one total.
${RECONCILE_ESTIMATE}
Return ONLY valid JSON with these exact keys:
{ "identifiedAs": string, "servingSize": string, "macros": ${MACRO_SCHEMA} }
If you cannot identify anything food-related, return { "error": "not found" }.
Return ONLY the JSON object — no explanation, no markdown.`

  const json = await callClaudeJson(system, description, {
    maxTokens: 1200,
    webSearch: true,
    countryCode,
    outputConfig: USE_STRUCTURED_OUTPUT && USE_STRUCTURED_OUTPUT_WITH_SEARCH ? EATEN_FORMAT : null,
    kind: 'identifyEatenFood',
    temperature: 0,
  }, 'identifyEatenFood')
  if (!json) return null
  if (json.error) return { error: json.error }
  if (json.macros) json.macros = normalizeMacros(json.macros)
  return json
}
