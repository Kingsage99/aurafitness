# MissVfit — Project Guide

## What This App Is

A women's strength & physique app. Soft purple design, mobile-first (384×832 phone frame). Users complete an 8-step onboarding that builds a personalised workout + nutrition plan. The app tracks workouts, logs meals, shows muscle heatmaps, and has a social squad feed.

## Tech Stack

- **React 18 + Vite 6** — SPA, no routing library (screen state in App.jsx)
- **Supabase backend** — auth, `profiles` table (jsonb columns for profile/gamification/cookbook/workouts/routine), `workout_history`, social tables (posts, friends, reactions), storage for media uploads. Schema changes are applied via MCP migrations (no local migration files).
- **Fonts:** Archivo (display/headings), Space Mono (labels/numbers) — loaded via Google Fonts in index.html
- **Styling:** Inline styles, neo-brutalist design system (no CSS framework)

## Design System (`src/styles/neoBrutalism.js`)

All colors/fonts come from the `NB` token object — screens never hardcode hex. Key exports: `NB` (palette: ink `#1A1A1A`, purple `#B48CF2`, deep purple `#9366E6`, mint `#7FE6D0`, lime `#C2E84B`, yellow `#F7CF4A`, pink `#F79AC6`, lavender `#E7DCFB`), `NB_BORDER` (3px ink), `hardShadow(px)` (hard offset shadow, no blur), `NB_INTENSITY_RAMP` (5-step muscle-heat scale). Source of truth is the "Fitness UI Kit v2" Claude Design project. `src/styles/tokens.css` mirrors the palette as CSS custom properties.

## Screen Navigation

`App.jsx` holds a `screen` string state. All screens are in `src/screens/`. Navigation is done by calling `navigate('screenName')` passed as an `onNavigate` prop.

Main tabs (bottom nav): `home` / `workout` / `meals` / `profile`, plus a center "+" menu → `discovery` / `analytics` / `leaderboard`. Other screens: `onboarding` → `whyaura` (first run), `workoutDetail` → `workoutActive` → `workoutComplete` → `workoutPost`, `workoutBuilder`, `assignSchedule`, `workoutRoutine`, `musclemap`, `mealPost`, `store`, `settings`, `medals`, `quests`.

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

## Nutrition (Claude Haiku for everything)

All nutrition AI lives in `src/utils/claudeApi.js` — there is **no Edamam integration** (it was planned, then dropped; Claude handles food lookup too). Functions:

- `lookupFood(query)` — quick macro estimate for the craving-box preview
- `suggestMeal({...targets, dietary, allergies, physique, craving})` — full recipe generation (name, ingredients, method, full 10-field macros: calories/protein/carbs/fat/fiber/sugar/saturatedFat/sodium/cholesterol/potassium)
- `adjustMeal({meal, instruction, dietary, allergies})` — free-text recipe adjustment ("make it dairy free")
- `identifyEatenFood(description)` — "already ate" mode: identifies a described meal and estimates macros
- `chatWithCoach(message, userProfile, history)` — the floating AI coach (Home, Meals, workout screens)

Model: `claude-haiku-4-5-20251001`, via the Anthropic Messages API. All prompts are inline in `claudeApi.js` (there is no `claudePrompts.js`).

## API Keys — Environment Variables

All keys go in `.env` at the project root. Never commit this file (it's in `.gitignore`).

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key   # dev fallback only — see below
```

Access in code: `import.meta.env.VITE_SUPABASE_URL`

**Production note:** Claude calls go through the `claude-proxy` Supabase Edge Function (key stored as a Supabase secret, never shipped to the browser). `claudeApi.js` calls the proxy first and only falls back to a direct browser call with `VITE_ANTHROPIC_API_KEY` in local dev when the proxy isn't deployed.

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
| Claude Haiku (chat + meals + food lookup) | ~$35–60/mo |
| Supabase (free tier → Pro if needed) | $0–25/mo |
| Avatar/images | $0 (SVG) |
| **Total** | **~$35–85/mo** |
