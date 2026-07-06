---
name: verify
description: How to build, launch, and drive the Aura Fitness app to verify a change end-to-end.
---

# Verifying Aura Fitness changes

## Build / launch

Node is not on PATH — prepend it first:

```powershell
$env:Path = "C:\Users\PC\AppData\Local\node-portable\node-v20.18.1-win-x64;$env:Path"
npm run build      # fast compile check (~1.5s)
npm run dev        # dev server → http://localhost:5173 (run in background)
```

## Drive it (Playwright)

Playwright is a project dep. Pre-authenticated storage states for seeded
test accounts live in `e2e/.auth/*.json` (workout / meals / profile /
onboarding — password + accounts documented in `e2e/login-capture.mjs`;
re-run that script if a session is revoked).

Recipe:

- Write a throwaway `.mjs` script that launches chromium with
  `storageState: 'e2e/.auth/<section>.json'` and viewport
  `{ width: 390, height: 844 }` (the app is a fixed phone frame).
- **The script must live inside the repo** (e.g. `e2e/tmp-*.mjs`) or Node
  ESM can't resolve the project's `playwright` package. Delete it after.
- After `page.goto('http://localhost:5173')`, wait ~3s for the Supabase
  session restore before interacting.
- Bottom-nav tabs are reachable via `page.getByText('Profile', { exact: true })`
  etc. Screens are state-switched in App.jsx (no URLs/routes to deep-link).
- Collect `pageerror` / console `error` / HTTP >= 400 events — the app fails
  quietly otherwise.

Screenshot to the session scratchpad and Read the PNGs to inspect visually.
