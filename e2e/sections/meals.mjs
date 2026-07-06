import { openSection, shot, clickNav, waitForClaudeReply, writeFindings } from '../lib/audit.mjs'

const SECTION = 'meals'
const STORAGE_STATE = 'e2e/.auth/meals.json'

export default async function runMealsSection(browser) {
  const { page, findings, tracker } = await openSection(browser, { section: SECTION, storageStatePath: STORAGE_STATE })

  try {
    tracker.current = 'meals-home'
    await clickNav(page, 'meals')
    await page.waitForTimeout(500)
    await shot(page, SECTION, 'home')

    // Craving flow — real Claude API call
    tracker.current = 'meals-craving'
    await page.getByText('High-protein', { exact: true }).click()
    const generatedCard = page.getByRole('button', { name: 'Log Meal' }).first()
    const gotReply = await waitForClaudeReply(generatedCard, findings, 'meals-craving')
    await page.waitForTimeout(500)
    await shot(page, SECTION, 'craving-generated')
    if (gotReply) {
      // scroll the meal card to confirm the action bar stays pinned
      await page.mouse.wheel(0, 600)
      await page.waitForTimeout(300)
      await shot(page, SECTION, 'craving-generated-scrolled')
    }

    // Back to Meals home
    tracker.current = 'meals-home'
    const backBtn = page.getByText('Your meals').first()
    if (await backBtn.isVisible().catch(() => false)) await backBtn.click()
    else await clickNav(page, 'meals')
    await page.waitForTimeout(500)

    // Already-ate flow — real Claude API call
    tracker.current = 'meals-eaten'
    await page.getByText('Already ate', { exact: true }).click()
    await page.waitForTimeout(300)
    const eatenInput = page.getByPlaceholder(/McDonald/i)
    await eatenInput.fill('grilled chicken breast with rice and broccoli')
    await eatenInput.press('Enter')
    const eatenResult = page.getByRole('button', { name: 'Log Meal' }).first()
    await waitForClaudeReply(eatenResult, findings, 'meals-eaten')
    await page.waitForTimeout(500)
    await shot(page, SECTION, 'already-ate-result')

    // Cookbook — the "eaten" view has no bottom nav, only its own "Your meals"
    // back button (setView('home') internally), so use that instead of clickNav.
    tracker.current = 'meals-home'
    const eatenBackBtn = page.getByText('Your meals').first()
    if (await eatenBackBtn.isVisible().catch(() => false)) await eatenBackBtn.click()
    else await clickNav(page, 'meals')
    await page.waitForTimeout(500)
    tracker.current = 'cookbook'
    const seeAllBtn = page.getByText('See all', { exact: true })
    if (await seeAllBtn.isVisible().catch(() => false)) {
      await seeAllBtn.click()
      await page.waitForTimeout(500)
      await shot(page, SECTION, 'cookbook-grid')
    }

    // Full-day builder — Cookbook also has no bottom nav, only an icon-only
    // back button (first button on the page) that calls setView('home').
    tracker.current = 'meals-home'
    await page.locator('button').first().click()
    await page.waitForTimeout(500)
    tracker.current = 'meals-builder'
    const fullDayBtn = page.getByText('Build my full day')
    if (await fullDayBtn.isVisible().catch(() => false)) {
      await fullDayBtn.click()
      await page.waitForTimeout(500)
      await shot(page, SECTION, 'fullday-builder')
      const generateBtn = page.getByRole('button', { name: /Generate full day/i })
      if (await generateBtn.isVisible().catch(() => false)) {
        await generateBtn.click()
        const firstLogBtn = page.getByRole('button', { name: 'Log Meal' }).first()
        await waitForClaudeReply(firstLogBtn, findings, 'meals-builder', 60_000)
        await page.waitForTimeout(500)
        await shot(page, SECTION, 'fullday-generated')
      }
    }

    // Cross-check: Analytics calorie target vs this Meals-home value.
    // Clicking the bottom nav's "Meals" tab while already on the `meals` App
    // screen doesn't remount it, so Meals' internal `view` state wouldn't
    // reset — the full-day path's back button ("Back", since generatedFrom
    // is 'builder' there) lands on the builder view, not home, so it takes
    // one more click on the builder's own back button to actually reach home.
    tracker.current = 'analytics-crosscheck'
    const viaHome = page.getByText('Your meals').first()
    const viaBuilder = page.getByText('Back', { exact: true }).first()
    if (await viaHome.isVisible().catch(() => false)) {
      await viaHome.click()
    } else if (await viaBuilder.isVisible().catch(() => false)) {
      await viaBuilder.click()
      await page.waitForTimeout(300)
      const builderBackBtn = page.getByText(/Full day plan|Build meals/).first()
      if (await builderBackBtn.isVisible().catch(() => false)) await builderBackBtn.click()
    } else {
      await clickNav(page, 'meals')
    }
    await page.waitForTimeout(400)
    await shot(page, SECTION, 'home-calorie-target')
    await clickNav(page, 'analytics')
    await page.waitForTimeout(800)
    await shot(page, SECTION, 'analytics-calorie-target')
  } catch (err) {
    findings.push({ screen: tracker.current, level: 'pageerror', message: `Section script error: ${err.message}`, ts: Date.now() })
  } finally {
    writeFindings(SECTION, findings)
    await page.context().close()
  }
}
