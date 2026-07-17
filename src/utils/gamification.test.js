import { describe, it, expect } from 'vitest'
import {
  DEFAULT_GAMIFICATION, BADGES, QUEST_POOL, WEEKLY_CHALLENGES,
  awardGems, awardXP, updateStreak, resetWeeklyIfNeeded,
  getDailyQuests, checkBadges, claimWeeklyChallenge, getWeeklyChallengeState,
  evaluateDailyQuests, equipCosmetic, purchaseItem,
} from './gamification'

const g0 = () => ({ ...DEFAULT_GAMIFICATION })

describe('awardGems', () => {
  it('adds to both total and weekly counters', () => {
    const g = awardGems(g0(), 25)
    expect(g.gems).toBe(25)
    expect(g.weeklyGemsEarned).toBe(25)
  })
})

describe('awardXP', () => {
  it('levels up when crossing a threshold', () => {
    const { g, leveledUp, newLevel } = awardXP(g0(), 100)
    expect(leveledUp).toBe(true)
    expect(newLevel).toBe(2)
    expect(g.xp).toBe(100)
  })

  it('does not level up below the threshold', () => {
    const { leveledUp } = awardXP(g0(), 99)
    expect(leveledUp).toBe(false)
  })
})

describe('updateStreak', () => {
  it('increments on consecutive days', () => {
    const g = { ...g0(), workoutStreak: 3, lastWorkoutDate: '2026-07-05' }
    const next = updateStreak(g, '2026-07-06')
    expect(next.workoutStreak).toBe(4)
    expect(next.lastWorkoutDate).toBe('2026-07-06')
  })

  it('is idempotent for the same day', () => {
    const g = { ...g0(), workoutStreak: 3, lastWorkoutDate: '2026-07-06' }
    expect(updateStreak(g, '2026-07-06').workoutStreak).toBe(3)
  })

  it('resets to 1 after a missed day with no freeze', () => {
    const g = { ...g0(), workoutStreak: 5, lastWorkoutDate: '2026-07-01' }
    expect(updateStreak(g, '2026-07-06').workoutStreak).toBe(1)
  })

  it('consumes a streak freeze instead of resetting', () => {
    const g = { ...g0(), workoutStreak: 5, lastWorkoutDate: '2026-07-01', inventory: { streakFreezes: 1 } }
    const next = updateStreak(g, '2026-07-06')
    expect(next.workoutStreak).toBe(5)
    expect(next.inventory.streakFreezes).toBe(0)
  })

  it('tracks longest streak', () => {
    const g = { ...g0(), workoutStreak: 9, longestStreak: 9, lastWorkoutDate: '2026-07-05' }
    expect(updateStreak(g, '2026-07-06').longestStreak).toBe(10)
  })
})

describe('resetWeeklyIfNeeded', () => {
  it('resets weekly counters on a new week', () => {
    const g = { ...g0(), livesWeek: '2020-01-06', lives: 0, weeklyGemsEarned: 80, weeklyWorkoutsDone: 4 }
    const next = resetWeeklyIfNeeded(g)
    expect(next.lives).toBe(3)
    expect(next.weeklyGemsEarned).toBe(0)
    expect(next.weeklyWorkoutsDone).toBe(0)
  })

  it('is a no-op within the same week', () => {
    const fresh = resetWeeklyIfNeeded({ ...g0(), weeklyGemsEarned: 10 })
    const again = resetWeeklyIfNeeded({ ...fresh, weeklyGemsEarned: 10 })
    expect(again.weeklyGemsEarned).toBe(10)
  })
})

describe('getDailyQuests', () => {
  it('returns 3 distinct quests from the pool, deterministically', () => {
    const a = getDailyQuests('2026-07-06')
    const b = getDailyQuests('2026-07-06')
    expect(a).toHaveLength(3)
    expect(new Set(a.map(q => q.id)).size).toBe(3)
    expect(a.map(q => q.id)).toEqual(b.map(q => q.id))
    a.forEach(q => expect(QUEST_POOL.some(p => p.id === q.id)).toBe(true))
  })
})

describe('checkBadges', () => {
  it('awards first_step on onboarding with gems + xp', () => {
    const { updatedG, newBadges } = checkBadges(g0(), { onboardingCompleted: true })
    expect(newBadges.map(b => b.id)).toContain('first_step')
    expect(updatedG.badges).toContain('first_step')
    expect(updatedG.gems).toBe(50)
  })

  it('never awards the same badge twice', () => {
    const first = checkBadges(g0(), { mealLogged: true }).updatedG
    const { newBadges } = checkBadges(first, { mealLogged: true })
    expect(newBadges).toHaveLength(0)
  })

  it('awards streak badges from state alone', () => {
    const g = { ...g0(), workoutStreak: 7 }
    const { updatedG } = checkBadges(g, {})
    expect(updatedG.badges).toEqual(expect.arrayContaining(['on_a_roll', 'committed']))
  })

  it('does not revert a manually-equipped frame on the next tracked action', () => {
    // Regression test: checkBadges used to unconditionally recompute frame
    // via getHighestFrame() on every call, silently reverting any manual
    // pick (including frame_pro, which getHighestFrame doesn't know about at
    // all) back to the auto-suggested tier on the very next workout/meal log.
    const equipped = equipCosmetic(g0(), 'frame_pro')
    expect(equipped.frame).toBe('pro')
    expect(equipped.frameManual).toBe(true)

    const { updatedG } = checkBadges(equipped, { workoutCompleted: true })
    expect(updatedG.frame).toBe('pro')
  })

  it('still auto-suggests a frame for a user who has never manually chosen one', () => {
    const g = { ...g0(), totalWorkouts: 25 } // qualifies for the gold auto-tier
    const { updatedG } = checkBadges(g, {})
    expect(updatedG.frame).toBe('gold')
  })
})

describe('purchaseItem frame purchases', () => {
  it('marks a purchased frame as manual too, so it also survives the next checkBadges call', () => {
    const g = { ...g0(), gems: 1000 }
    const { g: afterPurchase, success } = purchaseItem(g, 'frame_flame')
    expect(success).toBe(true)
    expect(afterPurchase.frame).toBe('flame')
    expect(afterPurchase.frameManual).toBe(true)

    const { updatedG } = checkBadges(afterPurchase, { workoutCompleted: true })
    expect(updatedG.frame).toBe('flame')
  })
})

describe('weekly challenges', () => {
  it('every challenge id is unique and progress fns read tracked counters', () => {
    expect(new Set(WEEKLY_CHALLENGES.map(c => c.id)).size).toBe(WEEKLY_CHALLENGES.length)
    const g = { ...g0(), weeklyWorkoutsDone: 2, weeklyGemsEarned: 40, workoutStreak: 5 }
    WEEKLY_CHALLENGES.forEach(c => expect(typeof c.progress(g)).toBe('number'))
  })

  it('rejects a claim when the target is not met', () => {
    const { g, awarded } = claimWeeklyChallenge({ ...g0(), weeklyWorkoutsDone: 2 }, 'workouts_3')
    expect(awarded).toBe(0)
    expect(g.gems).toBe(0)
  })

  it('pays out once, then rejects the double claim', () => {
    const ready = { ...g0(), weeklyWorkoutsDone: 3 }
    const first = claimWeeklyChallenge(ready, 'workouts_3')
    expect(first.awarded).toBe(60)
    expect(first.g.gems).toBe(60)
    expect(getWeeklyChallengeState(first.g).claimed).toContain('workouts_3')
    const second = claimWeeklyChallenge(first.g, 'workouts_3')
    expect(second.awarded).toBe(0)
    expect(second.g.gems).toBe(60)
  })

  it('a stale claimed list from a previous week does not block claims', () => {
    const g = { ...g0(), weeklyWorkoutsDone: 3, weeklyChallenges: { week: '2020-01-06', claimed: ['workouts_3'] } }
    expect(claimWeeklyChallenge(g, 'workouts_3').awarded).toBe(60)
  })
})

describe('badge definitions', () => {
  it('all badge ids are unique', () => {
    expect(new Set(BADGES.map(b => b.id)).size).toBe(BADGES.length)
  })
})

describe('evaluateDailyQuests', () => {
  const DATE = '2025-01-15'
  // A signals object that satisfies every possible quest condition.
  const allSignals = {
    workoutDoneToday: true,
    caloriesHit: true,
    proteinHit: true,
    mealTypes: new Set(['breakfast', 'lunch', 'dinner']),
    mealCount: 3,
  }

  it('auto-completes met quests and awards their gems', () => {
    const { g, newlyCompleted } = evaluateDailyQuests(g0(), allSignals, DATE)
    const todays = getDailyQuests(DATE)
    expect(newlyCompleted.length).toBe(todays.length) // all 3 met
    expect(g.dailyQuests.date).toBe(DATE)
    expect(g.dailyQuests.completed.sort()).toEqual(todays.map(q => q.id).sort())
    expect(g.gems).toBe(todays.reduce((s, q) => s + q.reward, 0))
  })

  it('is idempotent — a second run awards nothing and returns the same object', () => {
    const first = evaluateDailyQuests(g0(), allSignals, DATE)
    const second = evaluateDailyQuests(first.g, allSignals, DATE)
    expect(second.newlyCompleted).toEqual([])
    expect(second.g).toBe(first.g) // same reference → no setState → no loop
  })

  it('completes nothing when no conditions are met', () => {
    const none = { workoutDoneToday: false, caloriesHit: false, proteinHit: false, mealTypes: new Set(), mealCount: 0 }
    const { g, newlyCompleted } = evaluateDailyQuests(g0(), none, DATE)
    expect(newlyCompleted).toEqual([])
    expect(g).toBe(g0() === g ? g : g) // returns original g unchanged
    expect(g.gems).toBe(0)
  })

  it('resets completion when the date changes', () => {
    const done = evaluateDailyQuests(g0(), allSignals, DATE)
    // A new day: prior completions for the old date should not count.
    const next = evaluateDailyQuests(done.g, allSignals, '2025-01-16')
    expect(next.newlyCompleted.length).toBeGreaterThan(0)
    expect(next.g.dailyQuests.date).toBe('2025-01-16')
  })
})
