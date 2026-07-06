import { openSection, shot, clickNav, writeFindings } from '../lib/audit.mjs'

const SECTION = 'profile'
const STORAGE_STATE = 'e2e/.auth/profile.json'

export default async function runProfileSection(browser) {
  const { page, findings, tracker } = await openSection(browser, { section: SECTION, storageStatePath: STORAGE_STATE })

  try {
    tracker.current = 'profile-overview'
    await clickNav(page, 'profile')
    await page.waitForTimeout(500)
    await shot(page, SECTION, 'overview')

    // Settings — the gear icon has no accessible text; it's the first button
    // rendered in Profile's header. Settings has no bottom nav either — its own
    // back button (also the first button on that screen) goes to Home, not
    // Profile, so we need an extra clickNav afterward.
    tracker.current = 'settings'
    await page.locator('button').first().click()
    await page.waitForTimeout(500)
    await shot(page, SECTION, 'settings')

    tracker.current = 'home-transit'
    await page.locator('button').first().click() // Settings' back arrow -> home
    await page.waitForTimeout(400)

    tracker.current = 'profile-overview'
    await clickNav(page, 'profile')
    await page.waitForTimeout(500)

    // Medals: click the in-Profile "Medals" tab, then "Open Medal Room →" for the real screen
    tracker.current = 'profile-medals-tab'
    await page.getByText('Medals', { exact: true }).click()
    await page.waitForTimeout(300)
    tracker.current = 'medals'
    const medalRoomBtn = page.getByText('Open Medal Room →')
    if (await medalRoomBtn.isVisible().catch(() => false)) {
      await medalRoomBtn.click()
      await page.waitForTimeout(500)
      await shot(page, SECTION, 'medals-screen')
      // MedalsScreen has no bottom nav; its own back button navigates straight to Profile.
      tracker.current = 'profile-overview'
      await page.locator('button').first().click()
      await page.waitForTimeout(500)
    }

    // Quests: click the in-Profile "Quests" tab, then "View Quest Board →"
    tracker.current = 'profile-quests-tab'
    await page.getByText('Quests', { exact: true }).click()
    await page.waitForTimeout(300)
    tracker.current = 'quests'
    const questBoardBtn = page.getByText('View Quest Board →')
    if (await questBoardBtn.isVisible().catch(() => false)) {
      await questBoardBtn.click()
      await page.waitForTimeout(500)
      await shot(page, SECTION, 'quests-screen')
      // QuestsScreen also has no bottom nav; back button navigates straight to Profile.
      tracker.current = 'profile-overview'
      await page.locator('button').first().click()
      await page.waitForTimeout(500)
    }

    // Store — in-Profile tab, not a separate onNavigate screen (Profile keeps its bottom nav here)
    tracker.current = 'profile-store-tab'
    await page.getByText('Store', { exact: true }).click()
    await page.waitForTimeout(500)
    await shot(page, SECTION, 'store-tab')

    // Nav badge check: screenshot the bottom nav BEFORE opening the "+" popup,
    // since the pending friend request should show a badge on the "+" button itself
    tracker.current = 'bottomnav-badge'
    await shot(page, SECTION, 'bottomnav-badge-check')

    // Discovery — pending friend request
    tracker.current = 'discovery'
    await clickNav(page, 'discovery')
    await page.waitForTimeout(800)
    await shot(page, SECTION, 'discovery-friends')

    // Leaderboard
    tracker.current = 'leaderboard'
    await clickNav(page, 'leaderboard')
    await page.waitForTimeout(800)
    await shot(page, SECTION, 'leaderboard')
  } catch (err) {
    findings.push({ screen: tracker.current, level: 'pageerror', message: `Section script error: ${err.message}`, ts: Date.now() })
  } finally {
    writeFindings(SECTION, findings)
    await page.context().close()
  }
}
