# Aura Fitness — Project Guide

## What This App Is

A women's strength & physique app. Soft purple design, mobile-first (384×832 phone frame). Users complete an 8-step onboarding that builds a personalised workout + nutrition plan. The app tracks workouts, logs meals, shows muscle heatmaps, and has a social squad feed.

## Tech Stack

- **React 18 + Vite 6** — SPA, no routing library (screen state in App.jsx)
- **No backend yet** — all state is in-memory React state; persistence comes later (Firebase or Supabase)
- **Fonts:** DM Serif Display (headings), Plus Jakarta Sans (body) — loaded via Google Fonts in index.html
- **Styling:** Inline styles matching the design system (no CSS framework)

## Design System Tokens (`src/styles/tokens.css`)

| Token | Value | Use |
|-------|-------|-----|
| Primary purple | `#7C3AED` | Buttons, active states, progress |
| Dark purple | `#2E1065` | Headings, text |
| Background | `#E9E5F2` | App background |
| Card background | `#FBF7FF → #F4ECFB` | Phone frame gradient |
| Muted text | `#8478A0` | Subtitles, hints |
| Border | `#EDE4F8` | Card borders |
| Card shadow | `0 24px 60px rgba(76,36,120,.18)` | Elevated cards |

## Screen Navigation

`App.jsx` holds a `currentScreen` string state. All screens are in `src/screens/`. Navigation is done by calling `setScreen('screenName')` passed as a prop.

Screens: `onboarding` → `whyaura` → `home` → `workout` / `musclemap` / `meals` / `profile` / `stats` / `squad`

Bottom nav appears on all post-onboarding screens.

## Onboarding Data Shape

After onboarding, the app holds a `userProfile` object:

```js
{
  physique: 'lean_toned' | 'athletic' | 'hourglass' | 'slim_thick' | 'soft_curvy' | 'functional',
  experience: 'starter' | 'some' | 'active',
  daysPerWeek: 2 | 3 | 4 | 5,
  equipment: ['none'] | ['dumbbells'] | ['bands'] | ['gym'] | (combinations),
  targetAreas: ['core', 'lower_body', ...],
  injuries: ['knees', 'lower_back', ...],
  dietary: ['vegetarian', ...],
  allergies: ['nuts', ...],
  trainingStyle: 'strength' | 'hypertrophy' | 'endurance',  // default: 'strength'
  dislikedExercises: [],  // IDs of exercises the user has swapped out
}
```

## Workout Personalization (NO external API)

All logic is custom-built. No workout API is used.

### Files
- `src/data/exercises.json` — ~150–200 exercises, each with primary/secondary/other muscle groups, equipment requirements, physique weights, swap alternatives, and form cues
- `src/utils/workoutBuilder.js` — takes `userProfile`, returns a `WorkoutPlan` object

### Exercise JSON Schema

```json
{
  "id": "hip-thrust-barbell",
  "name": "Barbell Hip Thrust",
  "muscles": {
    "primary": ["glutes"],
    "secondary": ["hamstrings"],
    "other": ["core", "lower_back"]
  },
  "equipment": ["gym"],
  "difficulty": ["intermediate", "advanced"],
  "slot": "main",
  "repsRange": { "min": 6, "max": 8 },
  "injuries_avoid": ["hips"],
  "physique_weight": {
    "hourglass": 10, "slim_thick": 10, "lean_toned": 5,
    "athletic": 7, "soft_curvy": 3, "functional": 5
  },
  "swappable_with": ["hip-thrust-dumbbell", "glute-bridge-weighted", "hip-thrust-banded"],
  "cues": ["Drive through heels", "Squeeze glutes at top", "Keep chin tucked"]
}
```

### Workout Structure Per Session

| Experience | Exercises | Sets | Default reps |
|-----------|-----------|------|-------------|
| starter | 5 | 3 | 6–8 |
| some | 6–7 | 3–4 | 6–8 |
| active | 7–8 | 4 | 6–8 |

Session shape (always):
1. Big Compound (squat / hinge / push / pull)
2. Second Compound
3–4. Secondary movements (lunges, rows, split squats)
5–7. Isolation / Accessory
Last. Finisher (plank, glute pulses — time-based)

Rep style overrides (user-settable in Settings):
- Strength: 6–8 reps (default)
- Hypertrophy: 8–12 reps
- Endurance: 12–15 reps

Users can also tap any rep count in the Workout Player to override per exercise.

### Exercise Swap Logic

When user taps "Swap this exercise":
1. Check `swappable_with` list first (same movement pattern, pre-curated)
2. Fall back to any exercise with same `slot` + same `primary` muscle group + compatible `equipment` + no `injuries_avoid` conflict
3. Add original exercise ID to `userProfile.dislikedExercises` — never show it again

### Days-Per-Week → Split

| Days | Split |
|------|-------|
| 2 | Full body A / Full body B |
| 3 | Lower / Upper / Full body |
| 4 | Upper A / Lower A / Upper B / Lower B |
| 5 | Lower / Upper / Lower / Upper / Full body |

## Nutrition (Edamam + Claude)

### Food Logging → Edamam Food Database API
Used when user manually searches/logs food ("I ate 200g chicken breast").

- Endpoint: `https://api.edamam.com/api/food-database/v2/parser`
- Auth: `app_id` + `app_key` query params
- Returns: food name, calories, protein, carbs, fat per serving
- Plan: Enterprise Basic — $14/month, 100K requests/month

### Meal Recipe Generation → Claude Haiku 4.5
Used when user taps "Suggest a meal" or chats with the AI coach.

System prompt template (kept in `src/utils/claudePrompts.js`):
```
You are a nutrition coach for a women's fitness app called Aura.
Generate a meal fitting these constraints:
- Target calories: ~{remainingCalories} kcal
- Macros: Protein {protein}g, Carbs {carbs}g, Fat {fat}g
- Dietary preference: {dietary}
- Allergies (never include): {allergies}
- Physique goal: {physique}
Return ONLY valid JSON: { name, ingredients[], macros{calories,protein,carbs,fat}, prepTimeMinutes, instructions[] }
```

## AI Chat Coach → Claude Haiku 4.5

Floating chat button on Home, Meals, and WorkoutPlayer screens.

System prompt (in `src/utils/claudePrompts.js`):
```
You are Aura, a supportive AI fitness coach for women. 
The user's profile: physique goal={physique}, experience={experience}, equipment={equipment}.
Be warm, concise, and science-backed. Answer workout form questions, suggest meal swaps, 
give motivation. Never give medical advice. Keep responses under 120 words.
```

Model: `claude-haiku-4-5-20251001`
API: Anthropic Messages API (`https://api.anthropic.com/v1/messages`)

## API Keys — Environment Variables

All keys go in `.env` at the project root. Never commit this file (it's in `.gitignore`).

```
VITE_EDAMAM_APP_ID=your_edamam_app_id
VITE_EDAMAM_APP_KEY=your_edamam_app_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

Access in code: `import.meta.env.VITE_EDAMAM_APP_ID`

Note: In production, Anthropic API calls must go through a backend (never expose the key in the browser). For MVP/dev, calling from the frontend is acceptable for testing.

## Running the App

```bash
# Requires Node.js in PATH
npm run dev      # Dev server → http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

Node path (if needed): `C:\Users\PC\AppData\Local\node-portable\node-v20.18.1-win-x64`

## Monthly API Cost (1,000 users)

| Service | Cost |
|---------|------|
| Workout algorithm | $0 (custom) |
| Edamam food lookup | $14/mo |
| Claude Haiku (chat + meals) | ~$30–50/mo |
| Avatar/images | $0 (SVG) |
| **Total** | **~$44–64/mo** |
