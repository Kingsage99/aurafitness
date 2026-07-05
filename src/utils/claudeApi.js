import { supabase } from '../lib/supabase'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

// Once the proxy fails at the transport level, skip it for the rest of the
// session instead of paying a failed round-trip on every call.
let proxyUnavailable = false

// All Claude traffic goes through the claude-proxy Supabase Edge Function
// (key lives server-side). The direct browser call only exists as a local-dev
// fallback and requires VITE_ANTHROPIC_API_KEY in .env.
async function anthropicRequest({ system, messages, maxTokens = 512 }) {
  if (!proxyUnavailable) {
    const { data, error } = await supabase.functions.invoke('claude-proxy', {
      body: { system, messages, max_tokens: maxTokens },
    })
    if (!error && data?.content) return data
    if (!API_KEY) throw new Error(error?.message || 'Claude proxy error')
    proxyUnavailable = true
    console.warn('[claudeApi] proxy unavailable, falling back to direct dev call:', error?.message)
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Claude API error ${res.status}`)
  }

  return res.json()
}

async function callClaude(systemPrompt, userMessage, maxTokens = 512) {
  const data = await anthropicRequest({
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens,
  })
  return data.content[0].text
}

// --- Food Lookup ---
// Returns { name, calories, protein, carbs, fat, servingSize } or null
export async function lookupFood(query) {
  const system = `You are a nutrition database. Given a food description, return ONLY valid JSON with these exact keys:
{ "name": string, "servingSize": string, "calories": number, "protein": number, "carbs": number, "fat": number }
All macros are in grams. Calories are kcal. Use standard serving sizes.
If you cannot identify the food, return { "error": "not found" }.
Return ONLY the JSON object — no explanation, no markdown.`

  try {
    const raw = await callClaude(system, query, 250)
    const text = raw.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim()
    const json = JSON.parse(text)
    if (json.error) return null
    return json
  } catch (err) {
    console.error('[lookupFood] parse error', err?.message)
    return null
  }
}

const MACRO_SCHEMA = `{"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "saturatedFat": number, "sodium": number, "cholesterol": number, "potassium": number}`

// --- Meal Suggestion ---
// Returns { name, ingredients[], macros{...full macro schema...}, prepTimeMinutes, instructions[] } or null
// cravingOnly=true: generate the craved dish authentically — no calorie padding
export async function suggestMeal({ mealType, targetCalories, targetProtein, targetCarbs, targetFat, dietary, allergies, physique, craving, cravingOnly = false }) {
  const allergyStr = allergies?.length ? `Never include: ${allergies.join(', ')}.` : ''
  const dietaryStr = dietary?.length ? `Diet: ${dietary.join(', ')}.` : ''

  let system
  if (cravingOnly && craving) {
    const calHint = targetCalories ? ` (approximately ${targetCalories} kcal)` : ''
    system = `You are a nutrition coach for a women's fitness app called Aura.
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
Return ONLY valid JSON:
{ "name": string, "ingredients": [string], "macros": ${MACRO_SCHEMA}, "prepTimeMinutes": number, "instructions": [string] }
Estimate fiber/sugar/saturatedFat/sodium/cholesterol/potassium as best you can (grams for fiber/sugar/saturatedFat, milligrams for sodium/cholesterol/potassium) — these are tracked but not targeted.
No markdown, no explanation — just the JSON.`
  } else {
    const cravingStr = craving ? `The user is craving: "${craving}". Build the meal around this craving.` : ''
    system = `You are a nutrition coach for a women's fitness app called Aura.
Generate a single ${mealType} meal fitting these constraints:
- Target ~${targetCalories} kcal, Protein ~${targetProtein}g, Carbs ~${targetCarbs}g, Fat ~${targetFat}g
${dietaryStr}
${allergyStr}
${cravingStr}
Physique goal: ${physique || 'lean_toned'} — lean, high protein, whole foods preferred.
Return ONLY valid JSON:
{ "name": string, "ingredients": [string], "macros": ${MACRO_SCHEMA}, "prepTimeMinutes": number, "instructions": [string] }
Estimate fiber/sugar/saturatedFat/sodium/cholesterol/potassium as best you can (grams for fiber/sugar/saturatedFat, milligrams for sodium/cholesterol/potassium) — these are tracked but not targeted.
No markdown, no explanation — just the JSON.`
  }

  try {
    const raw = await callClaude(system, `Suggest a ${mealType} for today.`, 1100)
    const text = raw.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim()
    return JSON.parse(text)
  } catch (err) {
    console.error('[suggestMeal] failed for', mealType, err?.message)
    return null
  }
}

// --- Adjust an existing meal via free text ---
// Returns the same shape as suggestMeal, or null
export async function adjustMeal({ meal, instruction, dietary, allergies }) {
  const allergyStr = allergies?.length ? `Never include: ${allergies.join(', ')}.` : ''
  const dietaryStr = dietary?.length ? `Diet: ${dietary.join(', ')}.` : ''

  const system = `You are a nutrition coach for a women's fitness app called Aura.
The user has this existing meal:
${JSON.stringify({ name: meal.name, ingredients: meal.ingredients, instructions: meal.instructions, macros: meal.macros, prepTimeMinutes: meal.prepTimeMinutes })}
The user wants this change: "${instruction}"
${dietaryStr}
${allergyStr}
Apply the requested change. Keep everything else as similar as possible. Recalculate macros only if the change actually affects them.
Return ONLY valid JSON:
{ "name": string, "ingredients": [string], "macros": ${MACRO_SCHEMA}, "prepTimeMinutes": number, "instructions": [string] }
No markdown, no explanation — just the JSON.`

  try {
    const raw = await callClaude(system, 'Apply the change.', 1100)
    const text = raw.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim()
    return JSON.parse(text)
  } catch (err) {
    console.error('[adjustMeal] failed', err?.message)
    return null
  }
}

// --- Identify a food the user already ate, from free text ---
// Returns { identifiedAs, servingSize, macros{...full macro schema...} } or null
export async function identifyEatenFood(description) {
  const system = `You are a nutrition estimator for a women's fitness app called Aura.
The user tells you what they already ate. Identify the most likely specific food or dish — recognize brand-name/restaurant menu items where mentioned (e.g. "McDonald's medium fries") and use your best knowledge of that item's real nutrition; otherwise estimate from a standard home-cooked or generic serving.
If multiple items are mentioned, combine them into one total.
Return ONLY valid JSON with these exact keys:
{ "identifiedAs": string, "servingSize": string, "macros": ${MACRO_SCHEMA} }
If you cannot identify anything food-related, return { "error": "not found" }.
Return ONLY the JSON object — no explanation, no markdown.`

  try {
    const raw = await callClaude(system, description, 400)
    const text = raw.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim()
    const json = JSON.parse(text)
    if (json.error) return { error: json.error }
    return json
  } catch (err) {
    console.error('[identifyEatenFood] parse error', err?.message)
    return null
  }
}

// --- Chat Coach ---
// Sends a conversation message and returns the reply string
export async function chatWithCoach(userMessage, userProfile, conversationHistory = []) {
  const { physique, experience, equipment, name } = userProfile || {}

  const system = `You are Aura, a warm and supportive AI fitness coach for women.
User profile: name=${name || 'there'}, physique goal=${physique || 'lean_toned'}, experience=${experience || 'some'}, equipment=${(equipment || ['gym']).join(', ')}.
Answer workout form questions, suggest meal swaps, give motivation, explain exercises.
Never give medical advice. Keep responses under 120 words. Be warm, specific, science-backed.`

  const messages = [
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  try {
    const data = await anthropicRequest({ system, messages, maxTokens: 300 })
    return data.content[0].text
  } catch (err) {
    return "Sorry, I couldn't connect right now. Try again in a moment!"
  }
}
