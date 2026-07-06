import { openSection, shot, clickNav, writeFindings } from '../lib/audit.mjs'

const SECTION = 'onboarding'
const STORAGE_STATE = 'e2e/.auth/onboarding.json'

async function clickNext(page) {
  await page.getByRole('button', { name: /Let's go|^Next$|Reveal my path|Next: build my workout/ }).click()
}

export default async function runOnboardingSection(browser) {
  const { page, findings, tracker } = await openSection(browser, { section: SECTION, storageStatePath: STORAGE_STATE })

  try {
    for (let step = 1; step <= 12; step++) {
      tracker.current = `onboarding-step${step}`
      await page.waitForTimeout(400)

      if (step === 1) {
        await page.getByPlaceholder('Your name or nickname').fill('E2E Onboarding')
      }
      if (step === 6) {
        for (const day of ['Mon', 'Tue', 'Wed']) {
          await page.getByRole('button', { name: day, exact: true }).click()
        }
      }
      if (step === 7) {
        await page.getByPlaceholder('170').fill('165')
        await page.getByPlaceholder('62').fill('62')
        await page.getByPlaceholder('26').fill('27')
      }

      await shot(page, SECTION, `step${String(step).padStart(2, '0')}`)
      await clickNext(page)
    }

    // Step 12's completion lands on WhyAura (guided mode default)
    tracker.current = 'whyaura'
    await page.waitForTimeout(800)
    await shot(page, SECTION, 'whyaura')
    const continueBtn = page.getByRole('button', { name: /Continue|Let's go|Start/i })
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click()
      await page.waitForTimeout(500)
    }

    tracker.current = 'home-fresh'
    await shot(page, SECTION, 'home-fresh-account')

    // Bonus: fresh-account Muscle Map empty state, for comparison against the
    // Workout section's populated version.
    tracker.current = 'musclemap-empty'
    await clickNav(page, 'workout')
    await page.waitForTimeout(500)
    const muscleMapCard = page.getByText('See your muscle map')
    if (await muscleMapCard.isVisible().catch(() => false)) {
      await muscleMapCard.click()
      await page.waitForTimeout(800)
      await shot(page, SECTION, 'musclemap-empty-state')
    }
  } catch (err) {
    findings.push({ screen: tracker.current, level: 'pageerror', message: `Section script error: ${err.message}`, ts: Date.now() })
  } finally {
    writeFindings(SECTION, findings)
    await page.context().close()
  }
}
