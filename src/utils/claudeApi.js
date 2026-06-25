const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

async function callClaude(systemPrompt, userMessage, maxTokens = 512) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Claude API error ${res.status}`)
  }

  const data = await res.json()
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

const MODIFIER_INSTRUCTIONS = {
  more_protein:   'Maximise protein content — aim well above the protein target if possible.',
  less_calories:  'Keep calories as low as possible within the macro budget.',
  more_calories:  'Make this a higher-calorie, more filling meal.',
  higher_fibre:   'Include high-fibre ingredients (beans, legumes, veg, whole grains).',
  lower_carbs:    'Minimise carbohydrates — use vegetable or protein-based substitutes.',
  higher_volume:  'Maximise food volume and satiety for the same calories (lots of veg, broth, salad).',
  quick_prep:     'Keep prep time under 15 minutes. Simple, minimal ingredients.',
}

// --- Meal Suggestion ---
// Returns { name, ingredients[], macros{calories,protein,carbs,fat}, prepTimeMinutes, instructions[] } or null
// cravingOnly=true: generate the craved dish authentically — no calorie padding
export async function suggestMeal({ mealType, targetCalories, targetProtein, targetCarbs, targetFat, dietary, allergies, physique, craving, modifiers = [], cravingOnly = false }) {
  const allergyStr = allergies?.length ? `Never include: ${allergies.join(', ')}.` : ''
  const dietaryStr = dietary?.length ? `Diet: ${dietary.join(', ')}.` : ''
  const modifiersStr = modifiers.length
    ? `Extra requirements: ${modifiers.map(m => MODIFIER_INSTRUCTIONS[m]).filter(Boolean).join(' ')}`
    : ''

  let system
  if (cravingOnly && craving) {
    const calHint = targetCalories ? ` (approximately ${targetCalories} kcal)` : ''
    system = `You are a nutrition coach for a women's fitness app called Aura.
The user wants to eat: "${craving}".
${dietaryStr}
${allergyStr}
${modifiersStr}
Generate a proper home-cooked recipe for this dish${calHint}.
Rules:
- Assume the user is cooking from scratch with standard grocery-store raw ingredients
- Do NOT assume they have specialty or pre-prepared products (e.g. if they want salmon, use a fresh salmon fillet to cook — not smoked salmon or a pre-made product)
- Use a realistic single-serving portion
- prepTimeMinutes must reflect actual cooking time — never less than 10 minutes for a cooked meal
- Do NOT add extra side dishes or foods just to inflate calorie count
Return ONLY valid JSON:
{ "name": string, "ingredients": [string], "macros": {"calories": number, "protein": number, "carbs": number, "fat": number}, "prepTimeMinutes": number, "instructions": [string] }
No markdown, no explanation — just the JSON.`
  } else {
    const cravingStr = craving ? `The user is craving: "${craving}". Build the meal around this craving.` : ''
    system = `You are a nutrition coach for a women's fitness app called Aura.
Generate a single ${mealType} meal fitting these constraints:
- Target ~${targetCalories} kcal, Protein ~${targetProtein}g, Carbs ~${targetCarbs}g, Fat ~${targetFat}g
${dietaryStr}
${allergyStr}
${cravingStr}
${modifiersStr}
Physique goal: ${physique || 'lean_toned'} — lean, high protein, whole foods preferred.
Return ONLY valid JSON:
{ "name": string, "ingredients": [string], "macros": {"calories": number, "protein": number, "carbs": number, "fat": number}, "prepTimeMinutes": number, "instructions": [string] }
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
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system,
        messages,
      }),
    })

    if (!res.ok) throw new Error(`API error ${res.status}`)
    const data = await res.json()
    return data.content[0].text
  } catch (err) {
    return "Sorry, I couldn't connect right now. Try again in a moment!"
  }
}
