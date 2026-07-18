// One-time setup: logs into each seeded test account for real through the actual
// Auth.jsx UI (email/password — Google OAuth can't be scripted headlessly), then
// saves the authenticated browser storageState to e2e/.auth/<section>.json for
// every section script to reuse. Re-run only if a seed account's session is
// revoked/rotated.
import { chromium } from 'playwright'
import path from 'node:path'

const DEV_URL = 'http://localhost:5173/app'
const PASSWORD = 'AuraE2ETest123!'

const ACCOUNTS = [
  { section: 'workout', email: 'e2e-workout@aura.audit' },
  { section: 'meals', email: 'e2e-meals@aura.audit' },
  { section: 'profile', email: 'e2e-profile@aura.audit' },
  { section: 'onboarding', email: 'e2e-onboarding@aura.audit' },
]

async function loginOne(browser, { section, email }) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto(DEV_URL)

  await page.getByRole('button', { name: 'Log in' }).click()
  await page.getByPlaceholder('Email address').fill(email)
  await page.getByPlaceholder('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()

  // Auth.jsx unmounts entirely once session is established — wait for that.
  await page.getByPlaceholder('Email address').waitFor({ state: 'detached', timeout: 20_000 })

  const outPath = path.resolve(`e2e/.auth/${section}.json`)
  await context.storageState({ path: outPath })
  await context.close()
  console.log(`✓ ${section} (${email}) → ${outPath}`)
}

const browser = await chromium.launch()
for (const account of ACCOUNTS) {
  try {
    await loginOne(browser, account)
  } catch (err) {
    console.error(`✗ ${account.section} (${account.email}) failed:`, err.message)
  }
}
await browser.close()
