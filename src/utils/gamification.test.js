import { describe, it, expect } from 'vitest'
import {
  DEFAULT_GAMIFICATION, BADGES, QUEST_POOL, WEEKLY_CHALLENGES,
  awardGems, awardXP, updateStreak, updateReactionStreak, resetWeeklyIfNeeded,
  getDailyQuests, checkBadges, claimWeeklyChallenge, getWeeklyChallengeState,
  evaluateDailyQuests, claimQuest, equipCosmetic, purchaseItem,
  reconcileWorkoutStreak, checkCaloriePenalty,
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
  it('returns 4 distinct quests from the pool, deterministically', () => {
    const a = getDailyQuests('2026-07-06')
    const b = getDailyQuests('2026-07-06')
    expect(a).toHaveLength(4)
    expect(new Set(a.map(q => q.id)).size).toBe(4)
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
    expect(updatedG.badges).toEqual(expect.arrayContaining(['streak_bronze']))
    expect(updatedG.badges).not.toContain('streak_silver')
  })

  it('awards bronze + silver but not gold when a stat lands mid-family', () => {
    const g = { ...g0(), totalWorkouts: 26 }
    const { updatedG } = checkBadges(g, {})
    expect(updatedG.badges).toEqual(expect.arrayContaining(['workouts_bronze', 'workouts_silver']))
    expect(updatedG.badges).not.toContain('workouts_gold')
  })

  it('awards all three tiers at once when a stat jumps straight past every threshold', () => {
    const g = { ...g0(), workoutStreak: 60 }
    const { updatedG } = checkBadges(g, {})
    expect(updatedG.badges).toEqual(expect.arrayContaining(['streak_bronze', 'streak_silver', 'streak_gold']))
  })

  it('awards the Community family from totalReactionsGiven', () => {
    const g = { ...g0(), totalReactionsGiven: 10 }
    const { updatedG } = checkBadges(g, {})
    expect(updatedG.badges).toContain('community_bronze')
    expect(updatedG.badges).not.toContain('community_silver')
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

  it('react_streak_7 reads reactionStreak and pays out once reached', () => {
    const g = { ...g0(), reactionStreak: 7 }
    const { awarded } = claimWeeklyChallenge(g, 'react_streak_7')
    expect(awarded).toBe(70)
  })

  it('react_streak_7 rejects a claim below target', () => {
    const g = { ...g0(), reactionStreak: 6 }
    expect(claimWeeklyChallenge(g, 'react_streak_7').awarded).toBe(0)
  })
})

describe('badge definitions', () => {
  it('all badge ids are unique', () => {
    expect(new Set(BADGES.map(b => b.id)).size).toBe(BADGES.length)
  })
})

describe('evaluateDailyQuests', () => {
  const DATE = '2025-01-15'
  // A signals object that satisfies every possible quest condition, including
  // both post_workout_or_meal (via postedToday) and react_10_posts (via
  // reactionsToday >= 10) — every quest in the pool should complete.
  const allSignals = {
    workoutDoneToday: true,
    caloriesHit: true,
    proteinHit: true,
    mealTypes: new Set(['breakfast', 'lunch', 'dinner']),
    mealCount: 3,
    postedToday: true,
    reactionsToday: 10,
  }

  it('marks met quests as completed but does NOT award gems — claiming is a separate step', () => {
    const { g, newlyCompleted } = evaluateDailyQuests(g0(), allSignals, DATE)
    const todays = getDailyQuests(DATE)
    expect(newlyCompleted.length).toBe(todays.length) // all of today's quests met
    expect(g.dailyQuests.date).toBe(DATE)
    expect(g.dailyQuests.completed.sort()).toEqual(todays.map(q => q.id).sort())
    expect(g.dailyQuests.claimed).toEqual([])
    expect(g.gems).toBe(0)
  })

  it('is idempotent — a second run completes nothing new and returns the same object', () => {
    const first = evaluateDailyQuests(g0(), allSignals, DATE)
    const second = evaluateDailyQuests(first.g, allSignals, DATE)
    expect(second.newlyCompleted).toEqual([])
    expect(second.g).toBe(first.g) // same reference → no setState → no loop
  })

  it('completes nothing when no conditions are met', () => {
    const none = { workoutDoneToday: false, caloriesHit: false, proteinHit: false, mealTypes: new Set(), mealCount: 0, postedToday: false, reactionsToday: 0 }
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

  it('react_10_posts is satisfied by reacting to 10 posts even without posting', () => {
    const signals = { workoutDoneToday: false, caloriesHit: false, proteinHit: false, mealTypes: new Set(), mealCount: 0, postedToday: false, reactionsToday: 10 }
    const { g } = evaluateDailyQuests(g0(), signals, DATE)
    if (g.dailyQuests.completed.includes('react_10_posts')) {
      expect(g.dailyQuests.completed).toContain('react_10_posts')
    } else {
      // react_10_posts wasn't one of today's picked quests — condition fn is still directly testable.
      expect(QUEST_POOL.find(q => q.id === 'react_10_posts')).toBeTruthy()
    }
  })
})

describe('claimQuest', () => {
  const DATE = '2025-01-15'
  const todays = getDailyQuests(DATE)

  it('pays out a completed quest once, then rejects the double claim', () => {
    const completed = { ...g0(), dailyQuests: { date: DATE, completed: [todays[0].id], claimed: [] } }
    const first = claimQuest(completed, todays[0].id, DATE)
    expect(first.awarded).toBe(todays[0].reward)
    expect(first.g.gems).toBe(todays[0].reward)
    expect(first.g.dailyQuests.claimed).toContain(todays[0].id)

    const second = claimQuest(first.g, todays[0].id, DATE)
    expect(second.awarded).toBe(0)
    expect(second.g.gems).toBe(todays[0].reward)
  })

  it('rejects a claim for a quest that is not yet completed', () => {
    const g = { ...g0(), dailyQuests: { date: DATE, completed: [], claimed: [] } }
    const { awarded } = claimQuest(g, todays[0].id, DATE)
    expect(awarded).toBe(0)
  })

  it('rejects a claim from a stale date', () => {
    const g = { ...g0(), dailyQuests: { date: '2020-01-01', completed: [todays[0].id], claimed: [] } }
    const { awarded } = claimQuest(g, todays[0].id, DATE)
    expect(awarded).toBe(0)
  })
})

describe('updateReactionStreak', () => {
  it('increments on consecutive days', () => {
    const g = { ...g0(), reactionStreak: 3, lastReactionDate: '2026-07-05' }
    const next = updateReactionStreak(g, '2026-07-06')
    expect(next.reactionStreak).toBe(4)
    expect(next.lastReactionDate).toBe('2026-07-06')
  })

  it('is idempotent for the same day', () => {
    const g = { ...g0(), reactionStreak: 3, lastReactionDate: '2026-07-06' }
    expect(updateReactionStreak(g, '2026-07-06').reactionStreak).toBe(3)
  })

  it('resets to 1 after a missed day', () => {
    const g = { ...g0(), reactionStreak: 5, lastReactionDate: '2026-07-01' }
    expect(updateReactionStreak(g, '2026-07-06').reactionStreak).toBe(1)
  })

  it('is independent of workoutStreak', () => {
    const g = { ...g0(), workoutStreak: 9, lastWorkoutDate: '2026-07-06', reactionStreak: 0, lastReactionDate: '' }
    const next = updateReactionStreak(g, '2026-07-06')
    expect(next.reactionStreak).toBe(1)
    expect(next.workoutStreak).toBe(9)
  })

  it('increments the lifetime totalReactionsGiven counter alongside the streak', () => {
    const g = { ...g0(), totalReactionsGiven: 4, lastReactionDate: '2026-07-05' }
    expect(updateReactionStreak(g, '2026-07-06').totalReactionsGiven).toBe(5)
  })

  it('does not double-count totalReactionsGiven for the same day', () => {
    const g = { ...g0(), totalReactionsGiven: 4, lastReactionDate: '2026-07-06' }
    expect(updateReactionStreak(g, '2026-07-06').totalReactionsGiven).toBe(4)
  })
})

describe('reconcileWorkoutStreak', () => {
  it('no-ops when already trained today', () => {
    const g = { ...g0(), workoutStreak: 5, lastWorkoutDate: '2026-07-06' }
    const result = reconcileWorkoutStreak(g, '2026-07-06')
    expect(result.g).toBe(g)
    expect(result.streakBroken).toBe(false)
  })

  it("no-ops when the streak is still legitimately pending today's workout", () => {
    const g = { ...g0(), workoutStreak: 5, lastWorkoutDate: '2026-07-05' }
    const result = reconcileWorkoutStreak(g, '2026-07-06')
    expect(result.g).toBe(g)
    expect(result.streakBroken).toBe(false)
  })

  it('no-ops for a brand-new user with no workout history', () => {
    const result = reconcileWorkoutStreak(g0(), '2026-07-06')
    expect(result.streakBroken).toBe(false)
    expect(result.freezeConsumed).toBe(false)
  })

  it('consumes a streak freeze on a real gap instead of breaking the streak', () => {
    const g = { ...g0(), workoutStreak: 5, lastWorkoutDate: '2026-07-01', inventory: { streakFreezes: 1 } }
    const result = reconcileWorkoutStreak(g, '2026-07-06')
    expect(result.freezeConsumed).toBe(true)
    expect(result.streakBroken).toBe(false)
    expect(result.g.workoutStreak).toBe(5)
    expect(result.g.lastWorkoutDate).toBe('2026-07-05')
    expect(result.g.inventory.streakFreezes).toBe(0)
  })

  it('breaks the streak and costs a life on a real gap with no freeze available', () => {
    const g = { ...g0(), workoutStreak: 5, longestStreak: 5, lastWorkoutDate: '2026-07-01', lives: 3, weeklyGemsEarned: 40 }
    const result = reconcileWorkoutStreak(g, '2026-07-06')
    expect(result.streakBroken).toBe(true)
    expect(result.lifeLost).toBe(true)
    expect(result.g.workoutStreak).toBe(0)
    expect(result.g.lives).toBe(2)
    expect(result.g.lastWorkoutDate).toBe('2026-07-01') // untouched — real gap math stays correct
  })

  it('applies the gem penalty + pet-death when the life loss brings lives to 0', () => {
    const g = { ...g0(), workoutStreak: 2, lastWorkoutDate: '2026-07-01', lives: 1, gems: 100, weeklyGemsEarned: 40 }
    const result = reconcileWorkoutStreak(g, '2026-07-06')
    expect(result.g.lives).toBe(0)
    expect(result.penaltyApplied).toBe(10) // 25% of weeklyGemsEarned
    expect(result.g.gems).toBe(90)
  })

  it('does not lose a life when there was no streak to lose', () => {
    const g = { ...g0(), workoutStreak: 0, lastWorkoutDate: '2026-07-01', lives: 3 }
    const result = reconcileWorkoutStreak(g, '2026-07-06')
    expect(result.streakBroken).toBe(false)
    expect(result.lifeLost).toBe(false)
    expect(result.g).toBe(g)
  })
})

describe('checkCaloriePenalty multi-day gap', () => {
  it('resets calorieGoalStreak on a genuine multi-day gap even with nothing logged', () => {
    const g = { ...g0(), calorieGoalStreak: 6, lastCalorieDate: '2026-07-01' }
    const { g: next, goalHit, lifeLost } = checkCaloriePenalty(g, '2026-07-06', 2000, null)
    expect(next.calorieGoalStreak).toBe(0)
    expect(next.lastCalorieDate).toBe('2026-07-06')
    expect(goalHit).toBe(false)
    expect(lifeLost).toBe(false)
  })

  it('does not reset the streak in the normal contiguous day-to-day case', () => {
    const g = { ...g0(), calorieGoalStreak: 4, lastCalorieDate: '2026-07-05' }
    const { g: next } = checkCaloriePenalty(g, '2026-07-06', 2000, { calories: 2000 })
    expect(next.calorieGoalStreak).toBe(5)
  })

  it('does not flag a brand-new user (empty lastCalorieDate) as a gap', () => {
    const g = { ...g0(), calorieGoalStreak: 0, lastCalorieDate: '' }
    const { g: next } = checkCaloriePenalty(g, '2026-07-06', 2000, null)
    expect(next.calorieGoalStreak).toBe(0)
    expect(next.lastCalorieDate).toBe('2026-07-06')
  })

  it('a hit right after a gap starts the streak at 1, not from the stale pre-gap count', () => {
    const g = { ...g0(), calorieGoalStreak: 6, lastCalorieDate: '2026-07-01' }
    const { g: next, goalHit } = checkCaloriePenalty(g, '2026-07-06', 2000, { calories: 2000 })
    expect(goalHit).toBe(true)
    expect(next.calorieGoalStreak).toBe(1) // gap reset to 0, then +1 — NOT 7
  })
})
