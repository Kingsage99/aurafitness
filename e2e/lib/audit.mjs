import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const DEV_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = path.resolve('e2e/screenshots')
const FINDINGS_DIR = path.resolve('e2e/findings')

const shotCounters = {}

// Launches an isolated context from a saved login session, wires up console/error
// capture, and navigates to the app. `tracker.current` should be updated by the
// section script before each navigation so findings are attributable to a screen.
export async function openSection(browser, { section, storageStatePath }) {
  const context = await browser.newContext({
    storageState: storageStatePath,
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  const findings = []
  const tracker = { current: 'launch' }

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      findings.push({ screen: tracker.current, level: msg.type(), message: msg.text(), ts: Date.now() })
    }
  })
  page.on('pageerror', err => {
    findings.push({ screen: tracker.current, level: 'pageerror', message: err.message, ts: Date.now() })
  })

  await page.goto(DEV_URL)
  return { context, page, findings, tracker }
}

// Sequentially-numbered full-page screenshot, e.g. e2e/screenshots/workout/03-workoutDetail.png
export async function shot(page, section, name) {
  const dir = path.join(SCREENSHOT_DIR, section)
  mkdirSync(dir, { recursive: true })
  shotCounters[section] = (shotCounters[section] || 0) + 1
  const n = String(shotCounters[section]).padStart(2, '0')
  const file = path.join(dir, `${n}-${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

const NAV_LABELS = { home: 'Home', workout: 'Workouts', meals: 'Meals', profile: 'Profile' }
const MAIN_TABS = new Set(['home', 'workout', 'meals', 'profile'])
const PLUS_LABELS = { discovery: 'Discover', analytics: 'Analytics', leaderboard: 'Leaderboard' }

// Bottom nav: home/workout/meals/profile are direct taps; discovery/analytics/
// leaderboard live behind the center "+" popup and must be opened first.
export async function clickNav(page, tabId) {
  if (MAIN_TABS.has(tabId)) {
    await page.getByText(NAV_LABELS[tabId], { exact: true }).click()
  } else {
    await page.getByRole('button', { name: '＋' }).click()
    await page.getByText(PLUS_LABELS[tabId], { exact: true }).click()
  }
}

// Real Claude-backed responses (suggestMeal/identifyEatenFood) have no client-side
// timeout, so wait generously and log a warning rather than let one slow call
// abort the whole section.
export async function waitForClaudeReply(locator, findings, screen, timeout = 45_000) {
  try {
    await locator.waitFor({ state: 'visible', timeout })
    return true
  } catch {
    findings.push({ screen, level: 'warning', message: `Claude-backed response exceeded ${timeout / 1000}s timeout`, ts: Date.now() })
    return false
  }
}

export function writeFindings(section, findings) {
  mkdirSync(FINDINGS_DIR, { recursive: true })
  writeFileSync(path.join(FINDINGS_DIR, `${section}.json`), JSON.stringify(findings, null, 2))
}
