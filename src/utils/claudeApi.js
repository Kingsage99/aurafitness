import { supabase } from '../lib/supabase'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

// Once the proxy fails at the transport level, skip it for the rest of the
// session instead of paying a failed round-trip on every call.
let proxyUnavailable = false

// The 10 macro fields we track. Used for numeric coercion and the structured-
// output schema below.
const MACRO_FIELDS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'saturatedFat', 'sodium', 'cholesterol', 'potassium']

// Structured outputs guarantee valid, correctly-typed JSON, but require the
// redeployed claude-proxy to forward output_config. Leave OFF until that proxy
// version is verified to accept it — the robust parsing below is the reliability
// floor regardless, so nothing depends on this being on.
const USE_STRUCTURED_OUTPUT = false
const MACRO_PROPS = MACRO_FIELDS.reduce((o, k) => { o[k] = { type: 'number' }; return o }, {})
const MEAL_FORMAT = {
  format: {
    type: 'json_schema',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        ingredients: { type: 'array', items: { type: 'string' } },
        macros: { type: 'object', properties: MACRO_PROPS, required: MACRO_FIELDS, additionalProperties: false },
        prepTimeMinutes: { type: 'number' },
        instructions: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'ingredients', 'macros', 'prepTimeMinutes', 'instructions'],
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
const RECONCILE = `Accuracy method: list each ingredient with an explicit quantity (grams or standard units, e.g. "120 g chicken breast"). Estimate each ingredient's macros from standard nutrition data, then sum them for the totals. The total calories MUST reconcile with the macros — calories ≈ 4×protein + 4×carbs + 9×fat, within ~5%. If they don't reconcile, correct the numbers before returning. Example: 150 g cooked chicken breast ≈ 248 kcal / 46 g protein / 0 g carbs / 5.4 g fat — sum every ingredient the same way.`

// All Claude traffic goes through the claude-proxy Supabase Edge Function
// (key lives server-side). The direct browser call only exists as a local-dev
// fallback and requires VITE_ANTHROPIC_API_KEY in .env.
//
// webSearch=true asks the proxy to attach the web_search tool (used only on the
// "already ate" path for authoritative regional branded nutrition). countryCode
// (ISO alpha-2) scopes the search. outputConfig carries structured-output format.
async function anthropicRequest({ system, messages, maxTokens = 512, webSearch = false, countryCode = '', outputConfig = null, kind = '' }) {
  if (!proxyUnavailable) {
    const body = { system, messages, max_tokens: maxTokens }
    if (webSearch) { body.webSearch = true; if (countryCode) body.country = countryCode }
    if (outputConfig) body.output_config = outputConfig
    if (kind) body.kind = kind
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

async function callClaude(systemPrompt, userMessage, { maxTokens = 512, webSearch = false, countryCode = '', outputConfig = null, kind = '' } = {}) {
  const data = await anthropicRequest({
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens, webSearch, countryCode, outputConfig, kind,
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
      if (err?.code === 'PRO_REQUIRED' || err?.code === 'QUOTA_EXCEEDED') throw err
      console.error(`[${tag}] request failed`, err?.message)
      return null
    }
    const json = parseLoose(raw)
    if (json !== undefined) return json
    if (attempt === 1) console.error(`[${tag}] JSON parse failed after retry`)
  }
  return null
}

// Coerce every present macro field to a finite number (never a string / NaN).
function coerceMacros(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = { ...obj }
  for (const k of MACRO_FIELDS) {
    if (k in out) {
      const n = Number(out[k])
      out[k] = Number.isFinite(n) ? n : 0
    }
  }
  return out
}

// --- Food Lookup ---
// Returns { name, calories, protein, carbs, fat, servingSize } or null
export async function lookupFood(query, { countryName = '' } = {}) {
  const system = `${localeBlock(countryName)}You are a nutrition database. Given a food description, return ONLY valid JSON with these exact keys:
{ "name": string, "servingSize": string, "calories": number, "protein": number, "carbs": number, "fat": number }
All macros are in grams. Calories are kcal. Use standard serving sizes for the user's region.
If you cannot identify the food, return { "error": "not found" }.
Return ONLY the JSON object — no explanation, no markdown.`

  const json = await callClaudeJson(system, query, { maxTokens: 250, kind: 'lookupFood' }, 'lookupFood')
  if (!json || json.error) return null
  return coerceMacros(json)
}

const MACRO_SCHEMA = `{"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "saturatedFat": number, "sodium": number, "cholesterol": number, "potassium": number}`

// --- Meal Suggestion ---
// Returns { name, ingredients[], macros{...full macro schema...}, prepTimeMinutes, instructions[] } or null
// cravingOnly=true: generate the craved dish authentically — no calorie padding
export async function suggestMeal({ mealType, targetCalories, targetProtein, targetCarbs, targetFat, dietary, allergies, physique, craving, cravingOnly = false, countryName = '' }) {
  const allergyStr = allergies?.length ? `Never include: ${allergies.join(', ')}.` : ''
  const dietaryStr = dietary?.length ? `Diet: ${dietary.join(', ')}.` : ''
  const locale = localeBlock(countryName)

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
Physique goal: ${physique || 'lean_toned'} — lean, high protein, whole foods preferred.
${RECONCILE}
Return ONLY valid JSON:
{ "name": string, "ingredients": [string], "macros": ${MACRO_SCHEMA}, "prepTimeMinutes": number, "instructions": [string] }
Estimate fiber/sugar/saturatedFat/sodium/cholesterol/potassium as best you can (grams for fiber/sugar/saturatedFat, milligrams for sodium/cholesterol/potassium) — these are tracked but not targeted.
No markdown, no explanation — just the JSON.`
  }

  const json = await callClaudeJson(system, `Suggest a ${mealType} for today.`, {
    maxTokens: 1100,
    outputConfig: USE_STRUCTURED_OUTPUT ? MEAL_FORMAT : null,
    kind: 'suggestMeal',
  }, 'suggestMeal')
  if (!json) return null
  if (json.macros) json.macros = coerceMacros(json.macros)
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
  if (json.macros) json.macros = coerceMacros(json.macros)
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
Return ONLY valid JSON with these exact keys:
{ "identifiedAs": string, "servingSize": string, "macros": ${MACRO_SCHEMA} }
If you cannot identify anything food-related, return { "error": "not found" }.
Return ONLY the JSON object — no explanation, no markdown.`

  const json = await callClaudeJson(system, description, { maxTokens: 1200, webSearch: true, countryCode, kind: 'identifyEatenFood' }, 'identifyEatenFood')
  if (!json) return null
  if (json.error) return { error: json.error }
  if (json.macros) json.macros = coerceMacros(json.macros)
  return json
}
