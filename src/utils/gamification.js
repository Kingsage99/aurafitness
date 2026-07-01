// ─── Gamification Engine ─────────────────────────────────────────────────────
// Pure functions — no React, no side effects.

export const DEFAULT_GAMIFICATION = {
  gems: 0,
  weeklyGemsEarned: 0,    // gems earned this week — resets Monday, used for penalty calc
  xp: 0,
  level: 1,
  lives: 3,               // reset every Monday
  livesWeek: '',          // Monday date "YYYY-MM-DD" of the current week
  workoutStreak: 0,
  longestStreak: 0,
  lastWorkoutDate: '',    // "YYYY-MM-DD"
  totalWorkouts: 0,
  weeklyWorkoutsDone: 0,  // reset Monday
  lastCalorieDate: '',    // last date calorie penalty/reward was checked
  calorieGoalStreak: 0,   // consecutive days calorie goal hit
  badges: [],
  title: 'Beginner',
  frame: 'default',
  aura: 'basic',
  rank: 'bronze',
  rankPoints: 0,
  dailyQuests: { date: '', completed: [] },
  purchasedItems: [],
  inventory: { streakFreezes: 0 },
  workoutDates: [],         // "YYYY-MM-DD" array of all workout days
  activeBanner: 'banner_default',
  activeTheme: 'theme_default',
}

// Cumulative XP to reach each level (index = level - 1)
export const LEVEL_XP = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000]

// % of that week's earned gems lost when all 3 lives are gone
export const LIFE_PENALTY_PCT = 0.25

// ─── Badge Definitions ───────────────────────────────────────────────────────

export const BADGES = [
  // Starter
  { id: 'first_step',     label: 'First Step',     tier: 'starter', icon: '👣', desc: 'Complete onboarding' },
  { id: 'fuelled_up',     label: 'Fuelled Up',     tier: 'starter', icon: '🍽️', desc: 'Log your first meal' },
  { id: 'sweat_session',  label: 'Sweat Session',  tier: 'starter', icon: '💪', desc: 'Complete your first workout' },
  { id: 'on_a_roll',      label: 'On a Roll',      tier: 'starter', icon: '🔥', desc: '3-day workout streak' },
  // Bronze
  { id: 'week_warrior',   label: 'Week Warrior',   tier: 'bronze',  icon: '⚔️', desc: 'Complete all workouts in a week' },
  { id: 'nutrition_nerd', label: 'Nutrition Nerd', tier: 'bronze',  icon: '🥗', desc: 'Hit calorie goal 5 days in a row' },
  { id: 'committed',      label: 'Committed',      tier: 'bronze',  icon: '🎯', desc: '7-day workout streak' },
  { id: 'cookbook_queen', label: 'Cookbook Queen', tier: 'bronze',  icon: '📖', desc: 'Save 5 recipes to your cookbook' },
  // Silver
  { id: 'iron_will',      label: 'Iron Will',      tier: 'silver',  icon: '🦾', desc: '14-day workout streak' },
  { id: 'ten_workouts',   label: 'Ten Strong',     tier: 'silver',  icon: '💯', desc: '10 total workouts completed' },
  { id: 'macro_master',   label: 'Macro Master',   tier: 'silver',  icon: '⚖️', desc: 'Hit calorie goal 7 days in a row' },
  { id: 'month_strong',   label: 'Month Strong',   tier: 'silver',  icon: '🗓️', desc: '30-day workout streak' },
  // Gold
  { id: 'fifty_workouts', label: 'Elite',          tier: 'gold',    icon: '👑', desc: '50 total workouts completed' },
  { id: 'legend_streak',  label: 'Legend Streak',  tier: 'gold',    icon: '⚡', desc: '60-day workout streak' },
  { id: 'perfect_week',   label: 'Perfect Week',   tier: 'gold',    icon: '🏆', desc: 'Complete every workout + hit calorie goal all week' },
  { id: 'aura_queen',     label: 'Aura Queen',     tier: 'gold',    icon: '✨', desc: 'Unlock all Silver badges' },
]

const SILVER_IDS = BADGES.filter(b => b.tier === 'silver').map(b => b.id)
const GOLD_IDS   = BADGES.filter(b => b.tier === 'gold').map(b => b.id)

export const TIER_COLORS = {
  starter: { bg: '#FEF3C7', text: '#D97706' },
  bronze:  { bg: '#FEF0E6', text: '#C2410C' },
  silver:  { bg: '#F1F5F9', text: '#64748B' },
  gold:    { bg: '#FEFCE8', text: '#A16207' },
}

// ─── Rank Definitions ────────────────────────────────────────────────────────

export const RANKS = [
  { id: 'bronze',   label: 'Bronze',   color: '#CD7C2F', bg: '#FEF0E6', minWorkouts: 0   },
  { id: 'silver',   label: 'Silver',   color: '#64748B', bg: '#F1F5F9', minWorkouts: 10  },
  { id: 'gold',     label: 'Gold',     color: '#D97706', bg: '#FEFCE8', minWorkouts: 25  },
  { id: 'diamond',  label: 'Diamond',  color: '#7C3AED', bg: '#F3E8FF', minWorkouts: 50  },
  { id: 'olympian', label: 'Olympian', color: '#E11D48', bg: '#FFF1F2', minWorkouts: 100 },
]
export const RANK_UP_AT = 100

// ─── Daily Quest Pool ─────────────────────────────────────────────────────────

export const QUEST_POOL = [
  { id: 'complete_workout', label: "Complete today's workout", reward: 15, icon: '💪' },
  { id: 'log_breakfast',    label: 'Log breakfast',            reward: 5,  icon: '🥞' },
  { id: 'log_lunch',        label: 'Log lunch',                reward: 5,  icon: '🥗' },
  { id: 'log_dinner',       label: 'Log dinner',               reward: 5,  icon: '🍽️' },
  { id: 'hit_calories',     label: 'Hit your calorie goal',    reward: 20, icon: '🎯' },
  { id: 'log_3_meals',      label: 'Log 3 meals today',        reward: 20, icon: '🍱' },
  { id: 'maintain_streak',  label: 'Keep your streak alive',   reward: 10, icon: '🔥' },
  { id: 'hit_protein',      label: 'Hit your protein goal',    reward: 15, icon: '💯' },
]

// Pick 3 quests deterministically for a given date string (YYYY-MM-DD)
export function getDailyQuests(dateStr) {
  const seed = dateStr.replace(/-/g, '').split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 1)
  const indices = []
  let s = seed
  while (indices.length < 3) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const idx = Math.abs(s) % QUEST_POOL.length
    if (!indices.includes(idx)) indices.push(idx)
  }
  return indices.map(i => QUEST_POOL[i])
}

// ─── Shop Definitions ─────────────────────────────────────────────────────────

export const SHOP_ITEMS = [
  { id: 'extra_life',    label: 'Extra Life',    cost: 50,  icon: '❤️',  desc: 'Restore 1 life immediately',  type: 'consumable' },
  { id: 'streak_freeze', label: 'Streak Freeze', cost: 75,  icon: '🧊',  desc: 'Protect streak for 1 miss',   type: 'consumable' },
  { id: 'frame_flame',   label: 'Flame Frame',   cost: 150, icon: '🔥',  desc: 'Unlock Flame avatar frame',   type: 'cosmetic'   },
  { id: 'frame_gold',    label: 'Gold Frame',    cost: 300, icon: '✨',  desc: 'Unlock Gold avatar frame',    type: 'cosmetic'   },
  { id: 'frame_crystal', label: 'Crystal Frame', cost: 500, icon: '💎',  desc: 'Unlock Crystal avatar frame', type: 'cosmetic'   },
]

// ─── Cosmetic Definitions ─────────────────────────────────────────────────────

export const FRAMES = [
  { id: 'default', label: 'Default',   style: { border: '3px solid rgba(196,168,232,0.5)' } },
  { id: 'flame',   label: 'Flame',     style: { border: '3px solid #F97316', boxShadow: '0 0 18px rgba(249,115,22,.55)' } },
  { id: 'neon',    label: 'Neon',      style: { border: '3px solid #A855F7', boxShadow: '0 0 20px rgba(168,85,247,.85), 0 0 42px rgba(168,85,247,.45)' } },
  { id: 'rose',    label: 'Rose Gold', style: { border: '3px solid #F9A8D4', boxShadow: '0 0 18px rgba(249,168,212,.65)' } },
  { id: 'gold',    label: 'Gold',      style: { border: '3px solid #F59E0B', boxShadow: '0 0 18px rgba(245,158,11,.45)' } },
  { id: 'crystal', label: 'Crystal',   style: { border: '3px solid #A855F7', boxShadow: '0 0 22px rgba(168,85,247,.65), 0 0 44px rgba(168,85,247,.25)' } },
]

export const AURAS = [
  { id: 'basic',    label: 'Basic',    style: { boxShadow: '0 8px 20px rgba(124,58,237,.3)' } },
  { id: 'ember',    label: 'Ember',    style: { boxShadow: '0 8px 24px rgba(249,115,22,.5), 0 0 40px rgba(239,68,68,.28)' } },
  { id: 'galaxy',   label: 'Galaxy',   style: { boxShadow: '0 8px 30px rgba(168,85,247,.6), 0 0 60px rgba(139,92,246,.35)' } },
  { id: 'champion', label: 'Champion', style: { boxShadow: '0 8px 30px rgba(245,158,11,.6), 0 0 60px rgba(249,115,22,.35)' } },
]

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getMondayDate(dateStr) {
  const d = new Date(dateStr || new Date())
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function getYesterday(todayStr) {
  const d = new Date(todayStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function getHighestTitle(g) {
  if (g.totalWorkouts >= 50 || g.workoutStreak >= 60) return 'Aura Elite'
  if (g.badges.includes('macro_master')) return 'Macro Master'
  if (g.totalWorkouts >= 25) return 'Sweat Legend'
  if (g.workoutStreak >= 14) return 'Iron Queen'
  if (g.workoutStreak >= 7) return 'Warrior'
  return 'Beginner'
}

function getHighestFrame(g) {
  const p = new Set(g.purchasedItems || [])
  const allSilver = SILVER_IDS.every(id => g.badges.includes(id))
  if ((g.totalWorkouts >= 50 && allSilver) || p.has('frame_crystal')) return 'crystal'
  if (g.totalWorkouts >= 25 || p.has('frame_gold'))  return 'gold'
  if (p.has('frame_neon'))  return 'neon'
  if (p.has('frame_rose'))  return 'rose'
  if (g.workoutStreak >= 7  || p.has('frame_flame')) return 'flame'
  return 'default'
}

function getHighestAura(g) {
  const allGold = GOLD_IDS.every(id => g.badges.includes(id))
  if (allGold) return 'champion'
  if (g.workoutStreak >= 60) return 'galaxy'
  if (g.workoutStreak >= 14) return 'ember'
  return 'basic'
}

// ─── Exported helpers ─────────────────────────────────────────────────────────

export function getLevel(xp) {
  let level = 1
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) level = i + 1
    else break
  }
  return level
}

export function xpProgress(xp) {
  const level = getLevel(xp)
  const current = LEVEL_XP[level - 1] ?? 0
  const next    = LEVEL_XP[level]    ?? LEVEL_XP[LEVEL_XP.length - 1]
  return { level, current: xp - current, needed: next - current }
}

// Returns updated gamification state
export function awardGems(g, amount) {
  return { ...g, gems: g.gems + amount, weeklyGemsEarned: g.weeklyGemsEarned + amount }
}

// Returns { g, leveledUp, newLevel }
export function awardXP(g, amount) {
  const newXP    = g.xp + amount
  const oldLevel = g.level
  const newLevel = getLevel(newXP)
  return { g: { ...g, xp: newXP, level: newLevel }, leveledUp: newLevel > oldLevel, newLevel }
}

// Returns { g, penaltyApplied }
export function loseLife(g) {
  const newLives = Math.max(0, g.lives - 1)
  if (g.lives > 0 && newLives === 0) {
    const penalty = Math.floor(g.weeklyGemsEarned * LIFE_PENALTY_PCT)
    return { g: { ...g, lives: 0, gems: Math.max(0, g.gems - penalty) }, penaltyApplied: penalty }
  }
  return { g: { ...g, lives: newLives }, penaltyApplied: 0 }
}

// Resets weekly counters when a new Monday starts
export function resetWeeklyIfNeeded(g) {
  const thisMonday = getMondayDate(new Date().toISOString())
  if (g.livesWeek === thisMonday) return g
  return { ...g, lives: 3, livesWeek: thisMonday, weeklyGemsEarned: 0, weeklyWorkoutsDone: 0 }
}

// Updates workout streak based on today's date
export function updateStreak(g, today) {
  if (g.lastWorkoutDate === today) return g
  const yd = getYesterday(today)
  if (g.lastWorkoutDate === yd) {
    const newStreak = g.workoutStreak + 1
    return { ...g, workoutStreak: newStreak, longestStreak: Math.max(g.longestStreak, newStreak), lastWorkoutDate: today }
  }
  // Missed at least one day — check for streak freeze
  const freezes = g.inventory?.streakFreezes ?? 0
  if (freezes > 0) {
    return { ...g, lastWorkoutDate: today, inventory: { ...(g.inventory || {}), streakFreezes: freezes - 1 } }
  }
  return { ...g, workoutStreak: 1, longestStreak: Math.max(g.longestStreak, 1), lastWorkoutDate: today }
}

// events: { onboardingCompleted, workoutCompleted, mealLogged, cookbookCount, weeklyTarget, allWeekDone }
// Returns { updatedG, newBadges }
export function checkBadges(g, events = {}) {
  const existing  = new Set(g.badges)
  const newBadges = []
  let updated = { ...g }

  const earn = (id) => {
    if (existing.has(id)) return
    const badge = BADGES.find(b => b.id === id)
    if (!badge) return
    existing.add(id)
    newBadges.push(badge)
    updated = awardGems(updated, 50)
    const { g: g2 } = awardXP(updated, 75)
    updated = g2
  }

  if (events.onboardingCompleted)                  earn('first_step')
  if (events.mealLogged)                           earn('fuelled_up')
  if (events.workoutCompleted && updated.totalWorkouts >= 1) earn('sweat_session')
  if (updated.workoutStreak >= 3)                  earn('on_a_roll')
  if (updated.workoutStreak >= 7)                  earn('committed')
  if ((events.cookbookCount || 0) >= 5)            earn('cookbook_queen')
  if (updated.calorieGoalStreak >= 5)              earn('nutrition_nerd')
  if (events.allWeekDone)                          earn('week_warrior')
  if (updated.workoutStreak >= 14)                 earn('iron_will')
  if (updated.totalWorkouts >= 10)                 earn('ten_workouts')
  if (updated.calorieGoalStreak >= 7)              earn('macro_master')
  if (updated.workoutStreak >= 30)                 earn('month_strong')
  if (updated.totalWorkouts >= 50)                 earn('fifty_workouts')
  if (updated.workoutStreak >= 60)                 earn('legend_streak')
  if (events.allWeekDone && updated.calorieGoalStreak >= 7) earn('perfect_week')
  if (SILVER_IDS.every(id => existing.has(id)))   earn('aura_queen')

  updated = { ...updated, badges: [...existing] }
  updated.title = getHighestTitle(updated)
  updated.frame = getHighestFrame(updated)
  updated.aura  = getHighestAura(updated)

  return { updatedG: updated, newBadges }
}

// Returns { g, rankedUp, newRank }
export function awardRankPoints(g, amount) {
  const currentIdx = RANKS.findIndex(r => r.id === (g.rank || 'bronze'))
  const isMax = currentIdx === RANKS.length - 1
  if (isMax) return { g, rankedUp: false, newRank: g.rank }

  const newTotal = (g.rankPoints || 0) + amount
  if (newTotal >= RANK_UP_AT) {
    const nextRank = RANKS[currentIdx + 1]
    return {
      g: { ...g, rank: nextRank.id, rankPoints: newTotal - RANK_UP_AT },
      rankedUp: true,
      newRank: nextRank.label,
    }
  }
  return { g: { ...g, rankPoints: newTotal }, rankedUp: false, newRank: g.rank }
}

// Returns { g, alreadyDone } — marks quest complete and awards gems
export function completeQuest(g, questId, dateStr) {
  const dq = g.dailyQuests || { date: '', completed: [] }
  const completed = dq.date === dateStr ? dq.completed : []
  if (completed.includes(questId)) return { g, alreadyDone: true }

  const quest = QUEST_POOL.find(q => q.id === questId)
  if (!quest) return { g, alreadyDone: false }

  let updated = awardGems(g, quest.reward)
  updated = { ...updated, dailyQuests: { date: dateStr, completed: [...completed, questId] } }
  return { g: updated, alreadyDone: false }
}

// Returns { g, success, reason } — deducts gems, applies item effect
// costOverride: pass item cost directly for store items not in SHOP_ITEMS
export function purchaseItem(g, itemId, costOverride) {
  const shopItem = SHOP_ITEMS.find(i => i.id === itemId)
  const cost = costOverride !== undefined ? costOverride : shopItem?.cost
  if (cost === undefined) return { g, success: false, reason: 'Unknown item' }
  if (cost > 0 && g.gems < cost) return { g, success: false, reason: 'Not enough gems' }

  let updated = {
    ...g,
    gems: g.gems - cost,
    purchasedItems: [...(g.purchasedItems || []).filter(id => id !== itemId), itemId],
  }

  if (itemId === 'extra_life') {
    updated = { ...updated, lives: Math.min(3, updated.lives + 1) }
  } else if (itemId === 'life_refill') {
    updated = { ...updated, lives: 3 }
  } else if (itemId === 'streak_freeze') {
    updated = { ...updated, inventory: { ...(updated.inventory || {}), streakFreezes: (updated.inventory?.streakFreezes || 0) + 1 } }
  } else if (itemId.startsWith('frame_')) {
    updated.frame = getHighestFrame(updated)
  } else if (itemId.startsWith('banner_')) {
    updated = { ...updated, activeBanner: itemId }
  } else if (itemId.startsWith('theme_')) {
    updated = { ...updated, activeTheme: itemId }
  }

  return { g: updated, success: true, reason: '' }
}

// Checks yesterday's calorie log on app load; awards bonus or deducts a life
// Returns { g, penaltyApplied, lifeLost, goalHit }
export function checkCaloriePenalty(g, yesterdayStr, dailyCalorieTarget, yesterdayLog) {
  if (g.lastCalorieDate === yesterdayStr) return { g, penaltyApplied: 0, lifeLost: false, goalHit: false }

  let updated = { ...g, lastCalorieDate: yesterdayStr }

  if (!yesterdayLog || !dailyCalorieTarget || dailyCalorieTarget <= 0) {
    return { g: updated, penaltyApplied: 0, lifeLost: false, goalHit: false }
  }

  const calories  = yesterdayLog.calories || 0
  const threshold = dailyCalorieTarget * 0.20
  const missed    = Math.abs(calories - dailyCalorieTarget) > threshold

  if (missed) {
    const { g: pg, penaltyApplied } = loseLife(updated)
    return { g: pg, penaltyApplied, lifeLost: true, goalHit: false }
  }

  // Goal hit — award gems + XP + streak
  updated = awardGems(updated, 20)
  const { g: g2 } = awardXP(updated, 30)
  updated = { ...g2, calorieGoalStreak: (g.calorieGoalStreak || 0) + 1 }
  return { g: updated, penaltyApplied: 0, lifeLost: false, goalHit: true }
}
