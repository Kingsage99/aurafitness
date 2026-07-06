import { openSection, shot, clickNav, writeFindings } from '../lib/audit.mjs'

const SECTION = 'workout'
const STORAGE_STATE = 'e2e/.auth/workout.json'

export default async function runWorkoutSection(browser) {
  const { page, findings, tracker } = await openSection(browser, { section: SECTION, storageStatePath: STORAGE_STATE })

  try {
    tracker.current = 'home'
    await page.waitForSelector('text=Squad activity', { timeout: 20_000 }).catch(() => {})
    await shot(page, SECTION, 'home')

    tracker.current = 'workoutHub'
    await clickNav(page, 'workout')
    await page.waitForTimeout(500)
    await shot(page, SECTION, 'workoutHub')

    // Today's Workout card — matched by its "N exercises" text (no test ids in this app)
    tracker.current = 'workoutDetail'
    const todayCard = page.getByText(/\d+ exercises/).first()
    if (await todayCard.isVisible().catch(() => false)) {
      await todayCard.click()
      await page.waitForTimeout(500)
      await shot(page, SECTION, 'workoutDetail')

      tracker.current = 'workoutActive'
      const startBtn = page.getByRole('button', { name: 'Start Workout' })
      if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click()
        await page.waitForTimeout(800)
        await shot(page, SECTION, 'workoutActive-exercise1')

        // Step through exercises via "Next Exercise →" until the last one, where
        // the button becomes "Finish Workout" instead (session length varies by
        // experience level, so this can't be a single fixed click).
        for (let i = 0; i < 10; i++) {
          const finishVisible = await page.getByRole('button', { name: /Finish Workout/i }).isVisible().catch(() => false)
          if (finishVisible) break
          const nextExerciseBtn = page.getByRole('button', { name: /Next Exercise/i })
          if (!(await nextExerciseBtn.isVisible().catch(() => false))) break
          await nextExerciseBtn.click()
          await page.waitForTimeout(400)
          if (i === 0) await shot(page, SECTION, 'workoutActive-exercise2')
        }

        tracker.current = 'workoutComplete'
        const finishBtn = page.getByRole('button', { name: /Finish Workout/i })
        await finishBtn.click({ timeout: 10_000 })
        await page.waitForTimeout(800)
        await shot(page, SECTION, 'workoutComplete')

        tracker.current = 'workoutPost'
        const shareBtn = page.getByRole('button', { name: 'Share Workout' })
        if (await shareBtn.isVisible().catch(() => false)) {
          await shareBtn.click()
          await page.waitForTimeout(500)
          await shot(page, SECTION, 'workoutPost')

          const skipBtn = page.getByRole('button', { name: 'Skip' })
          if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click()
          await page.waitForTimeout(500)
        }
      }
    } else {
      findings.push({ screen: 'workoutHub', level: 'warning', message: 'No "Today\'s Workout" card found — seed profile may not have today as a training day', ts: Date.now() })
    }

    // Back to WorkoutHub for the remaining cards
    tracker.current = 'workoutHub'
    await clickNav(page, 'workout')
    await page.waitForTimeout(500)

    tracker.current = 'musclemap'
    const muscleMapCard = page.getByText('See your muscle map')
    if (await muscleMapCard.isVisible().catch(() => false)) {
      await muscleMapCard.click()
      await page.waitForTimeout(1000)
      await shot(page, SECTION, 'musclemap-front-populated')
      const backToggle = page.getByRole('button', { name: 'Back' }).first()
      if (await backToggle.isVisible().catch(() => false)) {
        await backToggle.click()
        await page.waitForTimeout(300)
        await shot(page, SECTION, 'musclemap-back-populated')
      }
      const monthToggle = page.getByRole('button', { name: 'Month' })
      if (await monthToggle.isVisible().catch(() => false)) {
        await monthToggle.click()
        await page.waitForTimeout(500)
        await shot(page, SECTION, 'musclemap-month-populated')
      }
    }

    tracker.current = 'workoutHub'
    await clickNav(page, 'workout')
    await page.waitForTimeout(500)

    tracker.current = 'workoutBuilder'
    const buildBtn = page.getByText('Build a workout')
    if (await buildBtn.isVisible().catch(() => false)) {
      await buildBtn.click()
      await page.waitForTimeout(800)
      await shot(page, SECTION, 'workoutBuilder')
    }

    tracker.current = 'workoutHub'
    await clickNav(page, 'workout')
    await page.waitForTimeout(500)

    tracker.current = 'workoutRoutine'
    const scheduleBtn = page.getByText('My Schedule')
    if (await scheduleBtn.isVisible().catch(() => false)) {
      await scheduleBtn.click()
      await page.waitForTimeout(500)
      await shot(page, SECTION, 'workoutRoutine')
    }
  } catch (err) {
    findings.push({ screen: tracker.current, level: 'pageerror', message: `Section script error: ${err.message}`, ts: Date.now() })
  } finally {
    writeFindings(SECTION, findings)
    await page.context().close()
  }
}
