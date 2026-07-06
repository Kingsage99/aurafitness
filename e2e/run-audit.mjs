// Boots the dev server (if not already running), launches one Chromium instance,
// runs all 4 section walkthroughs concurrently against isolated seeded accounts,
// then compiles the results into e2e/AUDIT_REPORT.md.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import runWorkoutSection from './sections/workout.mjs'
import runMealsSection from './sections/meals.mjs'
import runProfileSection from './sections/profile.mjs'
import runOnboardingSection from './sections/onboarding.mjs'
import { buildReport } from './report.mjs'

const DEV_URL = 'http://localhost:5173'

async function isServerUp() {
  try {
    const res = await fetch(DEV_URL)
    return res.ok
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

async function main() {
  let viteProcess = null
  const alreadyRunning = await isServerUp()

  if (!alreadyRunning) {
    console.log('Starting dev server...')
    viteProcess = spawn('npx', ['vite', '--port', '5173'], { stdio: 'inherit', shell: true })
    const up = await waitForServer()
    if (!up) throw new Error('Dev server did not start in time')
  } else {
    console.log('Dev server already running, reusing it.')
  }

  const browser = await chromium.launch()

  const results = await Promise.allSettled([
    runWorkoutSection(browser),
    runMealsSection(browser),
    runProfileSection(browser),
    runOnboardingSection(browser),
  ])

  results.forEach((r, i) => {
    const names = ['workout', 'meals', 'profile', 'onboarding']
    if (r.status === 'rejected') console.error(`✗ ${names[i]} section failed:`, r.reason)
    else console.log(`✓ ${names[i]} section finished`)
  })

  await browser.close()
  if (viteProcess) viteProcess.kill()

  await buildReport()
  console.log('\nDone. See e2e/AUDIT_REPORT.md')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
