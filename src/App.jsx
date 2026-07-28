import React, { useState, useEffect, useRef } from 'react'
import PhoneFrame from './components/PhoneFrame'
import { NavBadgeContext } from './components/BottomNav'
import Auth from './screens/Auth'
import Onboarding from './screens/Onboarding'
import WhyAura from './screens/WhyAura'
import ProUpsell from './screens/ProUpsell'
import GiftTrialEnded from './screens/GiftTrialEnded'
import GiftTrialDowngrade from './screens/GiftTrialDowngrade'
import GiftTrialWelcome from './screens/GiftTrialWelcome'
import Home from './screens/Home'
import WorkoutHub from './screens/WorkoutHub'
import WorkoutDetail from './screens/WorkoutDetail'
import WorkoutActive from './screens/WorkoutActive'
import WorkoutComplete from './screens/WorkoutComplete'
import WorkoutPost from './screens/WorkoutPost'
import WorkoutBuilder from './screens/WorkoutBuilder'
import AssignSchedule from './screens/AssignSchedule'
import WorkoutRoutine from './screens/WorkoutRoutine'
import MuscleMap from './screens/MuscleMap'
import Meals from './screens/Meals'
import MacrosScreen from './screens/MacrosScreen'
import Profile from './screens/Profile'
import MedalsScreen from './screens/MedalsScreen'
import QuestsScreen from './screens/QuestsScreen'
import CalendarScreen from './screens/CalendarScreen'
import StoreScreen from './screens/StoreScreen'
import Discovery from './screens/Discovery'
import UserProfileView from './screens/UserProfileView'
import MealPost from './screens/MealPost'
import Analytics from './screens/Analytics'
import BodyProgress from './screens/BodyProgress'
import RankPage from './screens/RankPage'
import Leaderboard from './screens/Leaderboard'
import Settings from './screens/Settings'
import EditDetails from './screens/EditDetails'
import LegalDoc from './screens/LegalDoc'
import { buildWeeklyPlan, buildCustomWeeklyPlan, getWeekdayIndex, dateKeyFor } from './utils/workoutBuilder'
import { supabase } from './lib/supabase'
import { saveWorkoutHistory, fetchPendingRequests, setUsername, logNutrition, notifySelf } from './lib/social'
import { grantGiftTrial } from './lib/giftTrial'
import {
  DEFAULT_GAMIFICATION, resetWeeklyIfNeeded, awardGems, awardXP,
  updateStreak, reconcileWorkoutStreak, getYesterday, checkBadges, checkCaloriePenalty, calorieGoalStatus,
  awardRankPoints, awardMuscleRankPoints, claimQuest, purchaseItem, equipCosmetic, QUEST_POOL, SHOP_ITEMS,
  MUSCLE_RANK_MIN_WORKOUTS, claimWeeklyChallenge, evaluateDailyQuests,
} from './utils/gamification'
import { getDailyTargets } from './utils/nutrition'
import { MUSCLE_LABELS } from './utils/muscleLabels'
import RewardToast from './components/RewardToast'

// The one place gems actually persist. protect_billing_columns_trigger (DB)
// reverts any write to gamification.gems that isn't made as service_role —
// correctly blocks self-granting, but that also silently swallowed every
// legitimate award, since the client's own debounced autosave writes
// gamification the same way a forged write would. This Edge Function
// recomputes the reward/cost itself from a server-owned copy of the same
// tables (never trusts a client-supplied amount), then writes via a
// service-role client so the trigger's check passes. Everything else in
// gamification (streaks, badges, dailyQuests, purchasedItems, XP) isn't
// gem-protected and keeps persisting through the normal autosave — this
// only ever needs to correct `gems` itself. Returns the authoritative gems
// total on success, or null on failure (caller reverts its optimistic guess).
async function callGamificationAction(action, payload) {
  const { data, error } = await supabase.functions.invoke('gamification-action', { body: { action, payload } })
  if (error || !data?.ok) {
    console.error('gamification-action failed:', error?.message || data?.error)
    return null
  }
  return data.gems
}

const DEFAULT_PROFILE = {
  physique: 'lean_toned',
  experience: 'some',
  daysPerWeek: 3,
  trainingDays: [],
  equipment: [],
  targetAreas: [],
  injuries: [],
  dietary: [],
  allergies: [],
  trainingStyle: 'strength',
  dislikedExercises: [],
  name: '',
  fitnessGoal: 'tone_recomp',
  heightCm: null,
  weightKg: null,
  age: null,
  tdee: null,
  dailyCalorieTarget: null,
  avatarUrl: null,
  units: 'metric',
  notificationsEnabled: true,
  notificationPrefs: {
    workoutReminders: true, mealReminders: true, streakAlerts: true, petCare: true,
    socialActivity: true, questsAndChallenges: true, weeklySummary: true,
  },
  planningMode: 'guided',
  country: '',
  cookbookCollections: [], // user-defined cookbook collections: [{ id, name }]
  customStickers: [], // user-uploaded reaction stickers: [{ id, url }]
}

const DEFAULT_LOGGED_MACROS = {
  calories: 0, protein: 0, carbs: 0, fat: 0,
  fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, cholesterol: 0, potassium: 0,
}

// Buckets any meal-type string (breakfast/lunch/dinner/snack_1/second_lunch/…)
// into one of four kinds, for meal-logging quest auto-completion.
function mealBucket(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('breakfast')) return 'breakfast'
  if (t.includes('lunch')) return 'lunch'
  if (t.includes('dinner')) return 'dinner'
  return 'snack'
}

const Spinner = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner">
      <div /><div /><div /><div /><div /><div />
    </div>
  </div>
)

export default function App() {
  const [session, setSession] = useState(undefined)
  // Set on a PASSWORD_RECOVERY auth event — see onAuthStateChange below. Keeps
  // <Auth/> mounted (in its "set new password" mode) even though verifyOtp
  // already made `session` truthy, since nobody actually "logged in" yet.
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [screen, setScreen] = useState('onboarding')
  const [userProfile, setUserProfile] = useState(DEFAULT_PROFILE)
  const [weeklyPlan, setWeeklyPlan] = useState(null)
  const [loggedMacros, setLoggedMacros] = useState(DEFAULT_LOGGED_MACROS)
  const [cookbook, setCookbook] = useState([])
  const [gamification, setGamification] = useState(DEFAULT_GAMIFICATION)
  const [notifications, setNotifications] = useState([])
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [workoutSession, setWorkoutSession] = useState(null)
  const [userWorkouts, setUserWorkouts] = useState([])
  const [routine, setRoutine] = useState({})
  const [pendingRequests, setPendingRequests] = useState([])
  const [mealPostData, setMealPostData] = useState(null)
  const [viewUserId, setViewUserId] = useState(null)
  const [missState, setMissState] = useState(null)
  const [onboardingFlow, setOnboardingFlow] = useState(false)
  const [customSchedule, setCustomSchedule] = useState({})
  const [customExercises, setCustomExercises] = useState([])
  const [subscription, setSubscription] = useState({ proUntil: null, status: null })
  const isProUser = !!subscription.proUntil && new Date(subscription.proUntil).getTime() > Date.now()

  // Tracks whether data has been loaded from DB — prevents auto-saves on initial load
  const dataReady = useRef(false)
  const sessionRef = useRef(null)
  // Supabase fires both getSession() and an onAuthStateChange 'SIGNED_IN' event on
  // initial load — this guards loadProfile from running twice (which was double-firing
  // the "missed workout yesterday" notification, among other one-time side effects).
  const profileLoadTriggered = useRef(false)

  // Wipes ALL user-specific in-memory state back to defaults. Called on sign-out
  // AND at the very start of loadProfile, so switching accounts (or a brand-new
  // signup) in the same tab can never inherit the previous user's workouts, Pro
  // status, gamification, etc. Must run with dataReady.current === false so the
  // debounced autosaves stay suppressed and don't flush these defaults into the
  // incoming user's row before their real data loads.
  const resetUserState = () => {
    setUserProfile(DEFAULT_PROFILE)
    setWeeklyPlan(null)
    setLoggedMacros(DEFAULT_LOGGED_MACROS)
    setCookbook([])
    setGamification(DEFAULT_GAMIFICATION)
    setUserWorkouts([])
    setRoutine({})
    setCustomSchedule({})
    setCustomExercises([])
    setSubscription({ proUntil: null, status: null })
    setActiveWorkout(null)
    setWorkoutSession(null)
    setMealPostData(null)
    setMissState(null)
    setPendingRequests([])
    setViewUserId(null)
  }

  const pushNotification = (msg) => {
    const id = Date.now() + Math.random()
    setNotifications(prev => [...prev, { id, msg }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000)
  }

  async function loadProfile(userId) {
    // Clean slate before loading — guarantees a new/switched account never
    // inherits the previous user's state. dataReady stays false here (set by the
    // caller / below) so these resets don't trigger autosaves into userId's row.
    dataReady.current = false
    resetUserState()

    // Try full select first; fall back to core columns if new columns don't exist yet
    let data = null
    let usedFallback = false

    const { data: fullData, error: fullError } = await supabase
      .from('profiles')
      .select('profile_data, onboarding_done, cookbook, daily_log_date, daily_log, gamification, username, user_workouts, routine, custom_schedule, custom_exercises, pro_until, subscription_status')
      .eq('id', userId)
      .single()

    if (fullError && fullError.code !== 'PGRST116') {
      // Likely missing columns — fall back to core columns only
      console.warn('Full profile load failed, trying core columns:', fullError.message)
      usedFallback = true
      const { data: coreData, error: coreError } = await supabase
        .from('profiles')
        .select('profile_data, onboarding_done')
        .eq('id', userId)
        .single()
      if (coreError && coreError.code !== 'PGRST116') {
        console.error('Profile load error:', coreError.message)
      }
      data = coreData
    } else {
      data = fullData
    }

    if (data?.onboarding_done && data?.profile_data) {
      const profile = { ...DEFAULT_PROFILE, ...data.profile_data }

      // Auto-generate username silently if not yet set
      if (!data.username) {
        const base = (profile.name || 'missvfit').toLowerCase().replace(/[^a-z0-9]/g, '') || 'missvfit'
        const { error: u1 } = await setUsername(userId, base)
        if (u1) {
          const fallback = base + Math.floor(100 + Math.random() * 900)
          await setUsername(userId, fallback)
          profile.username = fallback
        } else {
          profile.username = base
        }
      } else {
        profile.username = data.username
      }

      setUserProfile(profile)
      const subState = { proUntil: data.pro_until || null, status: data.subscription_status || null }
      setSubscription(subState)
      const plan = profile.planningMode === 'custom'
        ? buildCustomWeeklyPlan(data.custom_schedule || {})
        : buildWeeklyPlan(profile)
      setWeeklyPlan(plan)

      // The automatic 7-day gift trial just lapsed (status still marks it as
      // the gift, but pro_until is now in the past) -- force the "Continue
      // with Pro" / "Continue Free" decision before anything else loads. Only
      // re-checked here, on load/login -- not live mid-session. A user
      // already inside the app when their gift lapses simply sees normal
      // free-tier gating (isProUser is recomputed every render, so that part
      // IS live) until their next reload, rather than an interstitial.
      const giftTrialLapsed = subState.status === 'trialing_gift'
        && subState.proUntil
        && new Date(subState.proUntil).getTime() <= Date.now()
      setScreen(giftTrialLapsed ? 'giftTrialEnded' : 'home')

      if (!usedFallback) {
        if (data.cookbook && Array.isArray(data.cookbook)) {
          // Backfill id + collections so legacy saved meals work with collections.
          setCookbook(data.cookbook.map(it => ({
            ...it,
            id: it.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`),
            collections: Array.isArray(it.collections) ? it.collections : [],
          })))
        }
        setUserWorkouts(Array.isArray(data.user_workouts) ? data.user_workouts : [])
        setRoutine(data.routine && typeof data.routine === 'object' ? data.routine : {})
        setCustomSchedule(data.custom_schedule && typeof data.custom_schedule === 'object' ? data.custom_schedule : {})
        setCustomExercises(Array.isArray(data.custom_exercises) ? data.custom_exercises : [])
        const todayKey = dateKeyFor()
        if (data.daily_log_date === todayKey && data.daily_log) setLoggedMacros(data.daily_log)

        // Load + reset weekly gamification
        let g = { ...DEFAULT_GAMIFICATION, ...(data.gamification || {}) }
        g = resetWeeklyIfNeeded(g)

        // Check yesterday's calorie goal and apply penalty/reward. Called
        // unconditionally now (not just when data.daily_log_date is exactly
        // yesterday) — checkCaloriePenalty itself detects a multi-day gap and
        // resets a stale calorieGoalStreak instead of leaving it frozen, and
        // no-ops safely when there's nothing new to evaluate.
        const ydDate = new Date(); ydDate.setDate(ydDate.getDate() - 1)
        const yesterdayKey = dateKeyFor(ydDate)
        const yesterdayLog = data.daily_log_date === yesterdayKey ? data.daily_log : null
        let calorieGoalHit = false
        let calorieLifeLost = false
        let streakLifeLost = false
        {
          const dailyTarget = profile.dailyCalorieTarget
          const { g: checkedG, lifeLost, penaltyApplied, goalHit } = checkCaloriePenalty(g, yesterdayKey, dailyTarget, yesterdayLog)
          g = checkedG
          if (lifeLost) {
            calorieLifeLost = true
            if (penaltyApplied > 0) pushNotification(`❤️ Life lost — missed calorie goal. -${penaltyApplied} 💎 penalty`)
            else pushNotification('❤️ Life lost — calorie goal missed yesterday')
            if (checkedG.lives === 0) {
              notifySelf({
                title: '💀 Your pet has died',
                body: 'Your pet ran out of lives — revive it in the Store to bring it back.',
                url: '/',
                category: 'petCare',
              })
            }
          } else if (goalHit) {
            calorieGoalHit = true
            pushNotification('+20 💎  Yesterday\'s calorie goal achieved!')
          }
        }

        // Proactively reconcile a broken workout streak — a genuine 2+ day gap
        // either consumes a streak freeze (streak preserved) or breaks it and
        // costs a life, same mechanic as a missed calorie goal.
        {
          const { g: reconciledG, streakBroken, freezeConsumed, penaltyApplied: streakPenalty } = reconcileWorkoutStreak(g, todayKey)
          g = reconciledG
          if (streakBroken) {
            streakLifeLost = true
            if (streakPenalty > 0) pushNotification(`❤️ Life lost — workout streak broken. -${streakPenalty} 💎 penalty`)
            else pushNotification('❤️ Life lost — workout streak broken')
            if (g.lives === 0) {
              notifySelf({
                title: '💀 Your pet has died',
                body: 'Your pet ran out of lives — revive it in the Store to bring it back.',
                url: '/',
                category: 'petCare',
              })
            }
          } else if (freezeConsumed) {
            pushNotification('🧊 Streak freeze used — your streak is safe!')
          }
        }

        // Badge thresholds (calorieGoalStreak / workoutStreak) may have just
        // been crossed by either check above — evaluate immediately instead of
        // waiting for an unrelated later meal-log/workout event.
        let loadBadgeIds = []
        {
          const { updatedG, newBadges } = checkBadges(g, {})
          g = updatedG
          loadBadgeIds = newBadges.map(b => b.id)
          newBadges.forEach(b => pushNotification(`🏅 ${b.label} badge unlocked!`))
        }

        // Unified "did the user miss yesterday" detection — feeds the Home banner,
        // the Discovery lock, and the missed-workout make-up prompt from one pass.
        // Only meaningful for a user who was actually active before today —
        // a brand-new or just-onboarded account never "missed" yesterday.
        const activeBeforeToday = (g.workoutDates || []).some(d => d < todayKey)
          || (!!data.daily_log_date && data.daily_log_date < todayKey)
        const yesterdayDow = getWeekdayIndex(ydDate)
        const yesterdaySlot = plan?.[yesterdayDow] ?? null
        const workoutMissedYesterday = activeBeforeToday && !!yesterdaySlot?.isTrainingDay && !(g.workoutDates || []).includes(yesterdayKey)
        const cStatus = calorieGoalStatus(profile.dailyCalorieTarget, yesterdayLog)
        const calorieMissedYesterday = activeBeforeToday && (cStatus === 'missed' || cStatus === 'not_logged')
        setMissState({ yesterdayKey, workoutMissedYesterday, missedWorkoutEntry: workoutMissedYesterday ? yesterdaySlot : null, calorieMissedYesterday })
        if (workoutMissedYesterday) pushNotification(`😔 You missed ${yesterdaySlot.label} yesterday`)

        setGamification(g)

        // Sync gems for whatever this load pass just determined happened —
        // see callGamificationAction's comment for why this is the only
        // path that actually persists gems. Penalties and rewards can't
        // both apply from the same check, but the calorie check and the
        // streak check are independent, so both penalties could fire together.
        if (calorieLifeLost) callGamificationAction('apply_penalty', {}).then(gems => { if (gems != null) setGamification(prev => ({ ...prev, gems })) })
        if (streakLifeLost) callGamificationAction('apply_penalty', {}).then(gems => { if (gems != null) setGamification(prev => ({ ...prev, gems })) })
        if (calorieGoalHit) callGamificationAction('award_action', { kind: 'calorie_goal' }).then(gems => { if (gems != null) setGamification(prev => ({ ...prev, gems })) })
        if (loadBadgeIds.length > 0) callGamificationAction('award_action', { kind: 'badge_only', newBadgeIds: loadBadgeIds }).then(gems => { if (gems != null) setGamification(prev => ({ ...prev, gems })) })
      }

      console.log('Profile loaded ✓', profile.name)
      // Load pending friend requests
      fetchPendingRequests(userId).then(reqs => setPendingRequests(reqs))
    } else {
      console.log('No profile → onboarding')
    }

    setProfileLoading(false)
    dataReady.current = true
  }

  // Stripe Checkout redirects back with ?checkout=success|cancel — surface it
  // once, then strip the param so a refresh doesn't repeat the toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (!checkout) return
    if (checkout === 'success' && params.get('type') === 'gems') pushNotification('💎 Gems added to your balance!')
    else if (checkout === 'success') pushNotification('🎉 Welcome to MissVfit Pro!')
    else if (checkout === 'cancel') pushNotification('Checkout canceled')
    params.delete('checkout')
    const query = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save loggedMacros to Supabase (debounced 1.5s)
  useEffect(() => {
    if (!dataReady.current || !sessionRef.current || screen === 'onboarding') return
    const todayKey = dateKeyFor()
    const uid = sessionRef.current.user.id
    const t = setTimeout(async () => {
      if (sessionRef.current?.user?.id !== uid) return // account switched mid-flight — don't write A's data into B's row
      const { error } = await supabase.from('profiles').update({
        daily_log: loggedMacros,
        daily_log_date: todayKey,
      }).eq('id', uid)
      if (error) console.error('Daily log save error:', error.message)
    }, 1500)
    return () => clearTimeout(t)
  }, [loggedMacros]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save cookbook to Supabase (debounced 1.5s)
  useEffect(() => {
    if (!dataReady.current || !sessionRef.current || screen === 'onboarding') return
    const uid = sessionRef.current.user.id
    const t = setTimeout(async () => {
      if (sessionRef.current?.user?.id !== uid) return // account switched mid-flight
      const { error } = await supabase.from('profiles').update({
        cookbook,
      }).eq('id', uid)
      if (error) console.error('Cookbook save error:', error.message)
    }, 1500)
    return () => clearTimeout(t)
  }, [cookbook]) // eslint-disable-line react-hooks/exhaustive-deps

  // Evaluates cookbook_queen the moment cookbook count actually changes (save
  // OR delete), instead of waiting for the user's next unrelated workout
  // completion — the only place cookbookCount was previously threaded into
  // checkBadges. Idempotent — checkBadges no-ops once the badge is already
  // earned — and this also retroactively grants the badge to any existing
  // user who already has 5+ items but never triggered the old check.
  useEffect(() => {
    if (!dataReady.current) return
    const { newBadges } = checkBadges(gamification, { cookbookCount: cookbook.length })
    if (newBadges.length > 0) {
      setGamification(prev => checkBadges(prev, { cookbookCount: cookbook.length }).updatedG)
      newBadges.forEach(b => pushNotification(`🏅 ${b.label} badge unlocked!`))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cookbook.length])

  // Evaluates the Community medal family the moment totalReactionsGiven
  // changes — updateReactionStreak() (called from Discovery's handleReact)
  // never threads into checkBadges itself, same reasoning as the cookbook
  // effect above. Idempotent — also retroactively grants tiers to any
  // existing user who already crossed a threshold but never triggered a check.
  useEffect(() => {
    if (!dataReady.current) return
    const { newBadges } = checkBadges(gamification, {})
    if (newBadges.length > 0) {
      setGamification(prev => checkBadges(prev, {}).updatedG)
      newBadges.forEach(b => pushNotification(`🏅 ${b.label} badge unlocked!`))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamification.totalReactionsGiven])

  // Auto-save gamification to Supabase (debounced 1.5s)
  useEffect(() => {
    if (!dataReady.current || !sessionRef.current) return
    const uid = sessionRef.current.user.id
    const t = setTimeout(async () => {
      if (sessionRef.current?.user?.id !== uid) return // account switched mid-flight
      const { error } = await supabase.from('profiles').update({ gamification }).eq('id', uid)
      if (error) console.error('Gamification save error:', error.message)
    }, 1500)
    return () => clearTimeout(t)
  }, [gamification]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-complete daily quests from real actions (meals logged, calories/protein
  // hit, workout done). Idempotent + only setGamification on a NEW completion, so
  // it can't loop even though it reads and writes gamification.
  useEffect(() => {
    if (!dataReady.current) return
    const todayKey = dateKeyFor()
    const targets = getDailyTargets(userProfile)
    const mealsToday = gamification.mealsToday?.date === todayKey ? gamification.mealsToday.types : []
    const reactionsToday = gamification.reactionsToday?.date === todayKey ? gamification.reactionsToday.postIds.length : 0
    const signals = {
      workoutDoneToday: (gamification.workoutDates || []).includes(todayKey) || gamification.lastWorkoutDate === todayKey,
      caloriesHit: (loggedMacros.calories || 0) >= (targets.calories || 0) * 0.9,
      proteinHit: (loggedMacros.protein || 0) >= (targets.protein || 0) * 0.9,
      mealTypes: new Set(mealsToday),
      mealCount: mealsToday.length,
      postedToday: gamification.lastPostDate === todayKey,
      reactionsToday,
    }
    const { g: updated, newlyCompleted } = evaluateDailyQuests(gamification, signals, todayKey)
    if (newlyCompleted.length > 0) {
      setGamification(updated)
      newlyCompleted.forEach(() => pushNotification('Quest ready to claim! 🎁'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedMacros, gamification.mealsToday, gamification.lastWorkoutDate, gamification.workoutDates, gamification.lastPostDate, gamification.reactionsToday, userProfile.dailyCalorieTarget])

  // Auto-save user-built workouts to Supabase (debounced 1.5s)
  useEffect(() => {
    if (!dataReady.current || !sessionRef.current || screen === 'onboarding') return
    const uid = sessionRef.current.user.id
    const t = setTimeout(async () => {
      if (sessionRef.current?.user?.id !== uid) return // account switched mid-flight
      const { error } = await supabase.from('profiles').update({ user_workouts: userWorkouts }).eq('id', uid)
      if (error) console.error('User workouts save error:', error.message)
    }, 1500)
    return () => clearTimeout(t)
  }, [userWorkouts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save My Routine assignments to Supabase (debounced 1.5s)
  useEffect(() => {
    if (!dataReady.current || !sessionRef.current || screen === 'onboarding') return
    const uid = sessionRef.current.user.id
    const t = setTimeout(async () => {
      if (sessionRef.current?.user?.id !== uid) return // account switched mid-flight
      const { error } = await supabase.from('profiles').update({ routine }).eq('id', uid)
      if (error) console.error('Routine save error:', error.message)
    }, 1500)
    return () => clearTimeout(t)
  }, [routine]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save custom weekly schedule to Supabase (debounced 1.5s)
  useEffect(() => {
    if (!dataReady.current || !sessionRef.current) return
    const uid = sessionRef.current.user.id
    const t = setTimeout(async () => {
      if (sessionRef.current?.user?.id !== uid) return // account switched mid-flight
      const { error } = await supabase.from('profiles').update({ custom_schedule: customSchedule }).eq('id', uid)
      if (error) console.error('Custom schedule save error:', error.message)
    }, 1500)
    return () => clearTimeout(t)
  }, [customSchedule]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save user-created custom exercises to Supabase (debounced 1.5s)
  useEffect(() => {
    if (!dataReady.current || !sessionRef.current || screen === 'onboarding') return
    const uid = sessionRef.current.user.id
    const t = setTimeout(async () => {
      if (sessionRef.current?.user?.id !== uid) return // account switched mid-flight
      const { error } = await supabase.from('profiles').update({ custom_exercises: customExercises }).eq('id', uid)
      if (error) console.error('Custom exercises save error:', error.message)
    }, 1500)
    return () => clearTimeout(t)
  }, [customExercises]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      sessionRef.current = session
      if (session) {
        if (!profileLoadTriggered.current) {
          profileLoadTriggered.current = true
          loadProfile(session.user.id)
        }
      } else {
        setProfileLoading(false)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      sessionRef.current = newSession

      if (event === 'SIGNED_IN') {
        if (profileLoadTriggered.current) return // already handled by getSession() above
        profileLoadTriggered.current = true
        dataReady.current = false
        setProfileLoading(true)
        loadProfile(newSession.user.id)
      } else if (event === 'SIGNED_OUT') {
        profileLoadTriggered.current = false // allow a fresh load on the next sign-in
        dataReady.current = false
        setProfileLoading(false)
        setScreen('onboarding')
        resetUserState()
      } else if (event === 'PASSWORD_RECOVERY') {
        // verifyOtp({type:'recovery'}) establishes a real session (session
        // becomes truthy above) without the user ever "logging in" — without
        // this flag the render gate below would treat them as authenticated
        // and fall through to the profileLoading spinner forever, since
        // loadProfile() is only ever triggered by SIGNED_IN.
        setPasswordRecovery(true)
      }
      // TOKEN_REFRESHED / USER_UPDATED / INITIAL_SESSION etc: session refs are already
      // updated above — don't reset dataReady/profileLoading or re-run loadProfile, or
      // in-memory gamification progress not yet flushed by the debounced save gets clobbered.
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (target) => setScreen(target)

  const handleOnboardingComplete = async (answers) => {
    const profile = { ...DEFAULT_PROFILE, ...answers }
    setUserProfile(profile)
    const plan = profile.planningMode === 'custom' ? null : buildWeeklyPlan(profile)
    setWeeklyPlan(plan)
    setCustomSchedule({})

    if (sessionRef.current) {
      const { error } = await supabase.from('profiles').upsert({
        id: sessionRef.current.user.id,
        onboarding_done: true,
        profile_data: profile,
        cookbook: [],
        user_workouts: [],
        routine: {},
        custom_schedule: {},
        custom_exercises: [],
        updated_at: new Date().toISOString(),
      })
      if (error) console.error('Profile save failed:', error.message, error.code)
      else {
        console.log('Profile saved ✓')
        dataReady.current = true
        // Award onboarding gems + first_step badge
        let g = resetWeeklyIfNeeded(DEFAULT_GAMIFICATION)
        g = awardGems(g, 50)
        ;({ g } = awardXP(g, 100))
        const { updatedG, newBadges } = checkBadges(g, { onboardingCompleted: true })
        setGamification(updatedG)
        pushNotification('Welcome to MissVfit! +50 💎 +100 XP 🎉')
        callGamificationAction('award_action', { kind: 'onboarding', newBadgeIds: newBadges.map(b => b.id) })
          .then(gems => { if (gems != null) setGamification(prev => ({ ...prev, gems })) })
      }
    }

    if (profile.planningMode === 'custom') {
      setOnboardingFlow(true)
      navigate('workoutBuilder')
    } else {
      navigate('whyaura')
    }
  }

  const handleClaimGiftTrial = async () => {
    setOnboardingFlow(false)
    try {
      const next = await grantGiftTrial()
      setSubscription(next)
      navigate('giftTrialWelcome')
    } catch (err) {
      console.error('Gift trial grant failed:', err.message)
      // Never strand a new user here -- worst case they land on Home without
      // Pro yet and can subscribe normally later from Settings.
      navigate('home')
    }
  }

  const handleWorkoutComplete = (rawSessionData = {}) => {
    const today = dateKeyFor()
    const isMakeup = activeWorkout?.source === 'makeup'
    const completionRatio = rawSessionData.totalSets > 0 ? rawSessionData.setsCompleted / rawSessionData.totalSets : 1
    const baseGems = Math.max(10, Math.round(30 * completionRatio))
    const baseXP = Math.max(15, Math.round(50 * completionRatio))

    // Pure — computes the full gamification delta for this workout completion
    // from a given base state. Called once against the render-time `gamification`
    // (purely to derive this call's notification text / workoutSession summary)
    // and once more inside the setGamification updater against the freshest
    // `prev` (the actual persisted commit) — so a near-simultaneous mutation from
    // another handler (e.g. handleMealLogged) can never be silently dropped by
    // one overwriting the other's stale snapshot.
    const buildWorkoutRewards = (baseG) => {
      let g = resetWeeklyIfNeeded(baseG)
      g = { ...g, totalWorkouts: g.totalWorkouts + 1, weeklyWorkoutsDone: g.weeklyWorkoutsDone + 1 }
      // Track workout date for calendar
      const existingDates = g.workoutDates || []
      if (!existingDates.includes(today)) g = { ...g, workoutDates: [...existingDates, today] }
      // A makeup workout is credited for the day it was FOR (yesterday — this
      // app only ever flags a single most-recent missed day, no backlog), not
      // today — otherwise updateStreak sees `today` as a fresh gap and resets
      // to 1 exactly as if the user had skipped it, identical to handleSkipMakeup's outcome.
      g = updateStreak(g, isMakeup ? getYesterday(today) : today)
      if (isMakeup) g = { ...g, lastMakeupDate: today }

      // Base workout reward — scaled by how much of the workout was actually
      // completed, so finishing 1 set doesn't earn the same as finishing all of
      // them (a flat reward undermined the "Finish Workout" completion cue).
      g = awardGems(g, baseGems)
      let levelUp = false; let lvl = g.level
      ;({ g, leveledUp: levelUp, newLevel: lvl } = awardXP(g, baseXP))

      // Streak milestone bonuses
      const milestones = { 3: { gems: 25, xp: 40 }, 7: { gems: 75, xp: 100 }, 30: { gems: 300, xp: 500 }, 60: { gems: 500, xp: 800 } }
      const mb = milestones[g.workoutStreak]
      if (mb) {
        g = awardGems(g, mb.gems)
        ;({ g } = awardXP(g, mb.xp))
      }

      const allWeekDone = g.weeklyWorkoutsDone >= (userProfile.daysPerWeek || 3)
      if (allWeekDone) g = awardGems(g, 60)
      const { updatedG, newBadges } = checkBadges(g, { workoutCompleted: true, cookbookCount: cookbook.length, allWeekDone })
      g = updatedG

      // Rank points
      let rankedUp = false; let newRankLabel = ''
      ;({ g, rankedUp, newRank: newRankLabel } = awardRankPoints(g, allWeekDone ? 20 : 10))

      // Muscle-group rank points
      const muscleGains = {}   // { muscleId: pointsGainedThisSession }
      ;(rawSessionData.exercises || []).forEach(ex => {
        const doneSets = (ex.loggedSets || []).filter(s => s.done)
        if (doneSets.length === 0) return

        const avgWeight = doneSets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0), 0) / doneSets.length
        const weightBonus = Math.min(30, Math.round(avgWeight / 5))

        ;(ex.muscles?.primary   || []).forEach(m => { muscleGains[m] = (muscleGains[m] || 0) + 10 + weightBonus })
        ;(ex.muscles?.secondary || []).forEach(m => { muscleGains[m] = (muscleGains[m] || 0) + 5  + weightBonus })
      })

      const muscleRankUps = []
      Object.entries(muscleGains).forEach(([muscleId, points]) => {
        const { g: g2, rankedUp: muscleRankedUp, newRank: muscleNewRank } = awardMuscleRankPoints(g, muscleId, points)
        g = g2
        if (muscleRankedUp) muscleRankUps.push({ muscleId, label: muscleNewRank })
      })

      return { g, levelUp, lvl, mb, allWeekDone, newBadges, rankedUp, newRankLabel, muscleGains, muscleRankUps }
    }

    const display = buildWorkoutRewards(gamification)
    pushNotification(`+${baseGems} 💎  Workout complete!`)
    if (display.levelUp) pushNotification(`Level up! You're now Level ${display.lvl} ⬆️`)
    if (display.mb) pushNotification(`🔥 ${display.g.workoutStreak}-day streak bonus! +${display.mb.gems} 💎`)
    display.newBadges.forEach(b => pushNotification(`🏅 ${b.label} badge unlocked!`))
    if (display.allWeekDone) pushNotification('+60 💎  Full week complete!')
    if (display.rankedUp) pushNotification(`Rank up! You're now ${display.newRankLabel} 🏆`)
    if (display.g.totalWorkouts >= MUSCLE_RANK_MIN_WORKOUTS) {
      display.muscleRankUps.forEach(({ muscleId, label }) => pushNotification(`🏆 ${MUSCLE_LABELS[muscleId] || muscleId} ranked up to ${label}!`))
    }

    setGamification(prev => buildWorkoutRewards(prev).g)
    setWorkoutSession({ ...rawSessionData, xpEarned: baseXP, gemsEarned: baseGems, streak: display.g.workoutStreak, muscleGains: display.muscleGains, muscleRankUps: display.muscleRankUps })
    callGamificationAction('award_action', {
      kind: 'workout',
      setsCompleted: rawSessionData.setsCompleted || 0,
      totalSets: rawSessionData.totalSets || 0,
      workoutStreak: display.g.workoutStreak,
      allWeekDone: display.allWeekDone,
      newBadgeIds: display.newBadges.map(b => b.id),
    }).then(gems => { if (gems != null) setGamification(prev => ({ ...prev, gems })) })

    // Persist workout history (user chooses whether to post via WorkoutPost)
    if (sessionRef.current) {
      saveWorkoutHistory(sessionRef.current.user.id, rawSessionData)
    }

    navigate('workoutComplete')
  }

  const handleStartMakeup = () => {
    const entry = missState?.missedWorkoutEntry
    if (!entry?.workout) return
    setActiveWorkout({ ...entry.workout, label: entry.workout.name ?? entry.label, split: entry.label, source: 'makeup' })
    navigate('workoutDetail')
  }

  const handleSkipMakeup = () => {
    const today = dateKeyFor()
    setGamification(g => ({ ...g, lastMakeupDate: today }))
  }

  const handleSkipCalorieMiss = () => {
    const today = dateKeyFor()
    setGamification(g => ({ ...g, lastCalorieSkipDate: today }))
  }

  const handleSaveWorkout = (workout) => {
    setUserWorkouts(prev => [...prev, workout])
  }

  const handleAddCustomExercise = (exercise) => {
    setCustomExercises(prev => [...prev, exercise])
  }

  const handleAssignScheduleDay = (dayId, workout) => {
    setCustomSchedule(prev => ({ ...prev, [dayId]: workout }))
  }

  const handleScheduleDone = (schedule) => {
    setWeeklyPlan(buildCustomWeeklyPlan(schedule))
    navigate('whyaura')
  }

  const handleUpdateRoutine = (updatedRoutine) => {
    setRoutine(updatedRoutine)
  }

  const handleClaimQuest = (questId) => {
    const today = dateKeyFor()
    const { g: updated, awarded } = claimQuest(gamification, questId, today)
    if (awarded > 0) {
      setGamification(updated)
      pushNotification(`+${awarded} 💎`)
      callGamificationAction('claim_quest', { questId }).then(gems => {
        if (gems != null) setGamification(prev => ({ ...prev, gems }))
        else {
          setGamification(prev => ({ ...prev, gems: prev.gems - awarded, dailyQuests: { ...prev.dailyQuests, claimed: prev.dailyQuests.claimed.filter(id => id !== questId) } }))
          pushNotification("Couldn't claim reward — try again")
        }
      })
    }
  }

  const handleClaimChallenge = (challengeId) => {
    const { g: updated, awarded } = claimWeeklyChallenge(resetWeeklyIfNeeded(gamification), challengeId)
    if (awarded > 0) {
      setGamification(updated)
      pushNotification(`Weekly challenge complete! +${awarded} 💎`)
      callGamificationAction('claim_challenge', { challengeId }).then(gems => {
        if (gems != null) setGamification(prev => ({ ...prev, gems }))
        else {
          setGamification(prev => ({ ...prev, gems: prev.gems - awarded, weeklyChallenges: { ...prev.weeklyChallenges, claimed: prev.weeklyChallenges.claimed.filter(id => id !== challengeId) } }))
          pushNotification("Couldn't claim reward — try again")
        }
      })
    }
  }

  const handleEquipCosmetic = (itemId) => {
    setGamification(equipCosmetic(gamification, itemId))
  }

  const handleShopPurchase = (itemId, costOverride) => {
    const { g: updated, success } = purchaseItem(gamification, itemId, costOverride)
    if (success) {
      setGamification(updated)
      const item = SHOP_ITEMS.find(i => i.id === itemId)
      pushNotification(item ? `${item.icon} ${item.label} purchased!` : '✅ Purchased!')
      const cost = costOverride ?? item?.cost ?? 0
      callGamificationAction('purchase_item', { itemId }).then(gems => {
        if (gems != null) setGamification(prev => ({ ...prev, gems }))
        else {
          setGamification(prev => ({ ...prev, gems: prev.gems + cost, purchasedItems: prev.purchasedItems.filter(id => id !== itemId) }))
          pushNotification("Purchase didn't go through — try again")
        }
      })
    } else {
      pushNotification('Not enough gems')
    }
  }

  const handleMealLogged = (mealData = {}, { offerShare = true } = {}) => {
    // Persist the individual meal for nutrition history/analytics (fire-and-forget)
    if (sessionRef.current && mealData.macros) {
      logNutrition(sessionRef.current.user.id, {
        date: dateKeyFor(),
        name: mealData.name,
        mealType: mealData.mealType,
        macros: mealData.macros,
      })
    }

    // Track today's meal-kind buckets so meal-logging quests can auto-complete.
    // Date format must match the quest system (Home.jsx/QuestsScreen.jsx — local date).
    const todayKey = dateKeyFor()
    const bucket = mealBucket(mealData.mealType)

    // Pure, same reasoning as handleWorkoutComplete's buildWorkoutRewards.
    const buildMealRewards = (baseG) => {
      let g = resetWeeklyIfNeeded(baseG)
      g = awardGems(g, 5)
      ;({ g } = awardXP(g, 10))
      const { updatedG, newBadges } = checkBadges(g, { mealLogged: true })
      g = updatedG
      const mt = g.mealsToday?.date === todayKey ? g.mealsToday : { date: todayKey, types: [] }
      g = { ...g, mealsToday: { date: todayKey, types: [...mt.types, bucket] } }
      return { g, newBadges }
    }

    const display = buildMealRewards(gamification)
    setGamification(prev => buildMealRewards(prev).g)
    pushNotification('+5 💎  Meal logged!')
    display.newBadges.forEach(b => pushNotification(`🏅 ${b.label} badge unlocked!`))
    callGamificationAction('award_action', { kind: 'meal', newBadgeIds: display.newBadges.map(b => b.id) })
      .then(gems => { if (gems != null) setGamification(prev => ({ ...prev, gems })) })

    if (offerShare && mealData.name) {
      setMealPostData(mealData)
      navigate('mealPost')
    }
  }

  const handleUpdateProfile = async (partial) => {
    const next = { ...userProfile, ...partial }
    setUserProfile(next)
    if (next.planningMode !== 'custom' && (
      'trainingStyle' in partial || 'daysPerWeek' in partial || 'trainingDays' in partial ||
      'equipment' in partial || 'experience' in partial
    )) {
      setWeeklyPlan(buildWeeklyPlan(next))
    }
    if (sessionRef.current) {
      const { error } = await supabase.from('profiles').update({
        profile_data: next,
      }).eq('id', sessionRef.current.user.id)
      if (error) console.error('Profile update error:', error.message)
    }
  }

  const routineToday = routine[dateKeyFor()]
  const todayWorkout = routineToday
    ? { ...routineToday, name: routineToday.name ?? routineToday.label }
    : weeklyPlan?.[getWeekdayIndex()]?.workout ?? null

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} session={session} />
      case 'whyaura':
        return (
          <WhyAura
            userProfile={userProfile}
            weeklyPlan={weeklyPlan}
            onContinue={handleClaimGiftTrial}
          />
        )
      case 'proUpsell':
        return <ProUpsell subscription={subscription} onContinue={() => navigate('home')} />
      case 'giftTrialWelcome':
        return <GiftTrialWelcome onContinue={() => navigate('home')} />
      case 'giftTrialEnded':
        return <GiftTrialEnded onNavigate={navigate} />
      case 'giftTrialDowngrade':
        return (
          <GiftTrialDowngrade
            onDeclined={(next) => { setSubscription(next); navigate('home') }}
            onNavigate={navigate}
          />
        )
      case 'home':
        return <Home userProfile={userProfile} loggedMacros={loggedMacros} todayWorkout={todayWorkout} gamification={gamification} isProUser={isProUser} missState={missState} session={session} onStartMakeup={handleStartMakeup} onSkipMakeup={handleSkipMakeup} onSkipCalorieMiss={handleSkipCalorieMiss} onNavigate={navigate} />

      // ── Workout section ──────────────────────────────────────────────────────
      case 'workout':
        return (
          <WorkoutHub
            weeklyPlan={weeklyPlan}
            userWorkouts={userWorkouts}
            setActiveWorkout={setActiveWorkout}
            onNavigate={navigate}
            gamification={gamification}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            routine={routine}
            userId={session?.user?.id}
          />
        )
      case 'workoutDetail':
        return (
          <WorkoutDetail
            activeWorkout={activeWorkout}
            userProfile={userProfile}
            setActiveWorkout={setActiveWorkout}
            onUpdateProfile={handleUpdateProfile}
            onNavigate={navigate}
          />
        )
      case 'workoutActive':
        return (
          <WorkoutActive
            activeWorkout={activeWorkout}
            userProfile={userProfile}
            session={session}
            onWorkoutComplete={handleWorkoutComplete}
            onNavigate={navigate}
            onNotify={pushNotification}
          />
        )
      case 'workoutComplete':
        return <WorkoutComplete sessionData={workoutSession} gamification={gamification} userProfile={userProfile} isProUser={isProUser} onNavigate={navigate} />
      case 'workoutPost':
        return <WorkoutPost sessionData={workoutSession} userProfile={userProfile} session={session} gamification={gamification} isProUser={isProUser} onGamificationChange={setGamification} onNavigate={navigate} />
      case 'mealPost':
        return <MealPost mealData={mealPostData} userProfile={userProfile} session={session} onGamificationChange={setGamification} onNavigate={navigate} />
      case 'workoutBuilder':
        return (
          <WorkoutBuilder
            onSaveWorkout={handleSaveWorkout}
            onNavigate={navigate}
            postSaveScreen={userProfile.planningMode === 'custom' ? 'assignSchedule' : 'workout'}
            isOnboarding={onboardingFlow}
            userId={session?.user?.id}
            customExercises={customExercises}
            onAddCustomExercise={handleAddCustomExercise}
            equipment={userProfile.equipment}
            units={userProfile.units}
          />
        )
      case 'assignSchedule':
        return (
          <AssignSchedule
            trainingDays={userProfile.trainingDays}
            userWorkouts={userWorkouts}
            customSchedule={customSchedule}
            onAssignDay={handleAssignScheduleDay}
            onBuildAnother={() => navigate('workoutBuilder')}
            onDone={handleScheduleDone}
            onNavigate={navigate}
            isOnboarding={onboardingFlow}
          />
        )
      case 'workoutRoutine':
        return (
          <WorkoutRoutine
            weeklyPlan={weeklyPlan}
            userProfile={userProfile}
            userWorkouts={userWorkouts}
            routine={routine}
            isProUser={isProUser}
            onUpdateRoutine={handleUpdateRoutine}
            onNavigate={navigate}
          />
        )
      case 'musclemap':
        return <MuscleMap session={session} gamification={gamification} isProUser={isProUser} onNavigate={navigate} />
      case 'meals':
        return (
          <Meals
            userProfile={userProfile}
            loggedMacros={loggedMacros}
            onUpdateLoggedMacros={setLoggedMacros}
            cookbook={cookbook}
            onUpdateCookbook={setCookbook}
            onUpdateProfile={handleUpdateProfile}
            onMealLogged={handleMealLogged}
            onNotify={pushNotification}
            onNavigate={navigate}
            gamification={gamification}
            onGamificationChange={setGamification}
            isProUser={isProUser}
          />
        )
      case 'macros':
        return <MacrosScreen session={session} loggedMacros={loggedMacros} userProfile={userProfile} onNavigate={navigate} />
      case 'profile':
        return (
          <Profile
            userProfile={userProfile}
            weeklyPlan={weeklyPlan}
            session={session}
            gamification={gamification}
            isProUser={isProUser}
            onShopPurchase={handleShopPurchase}
            onEquipCosmetic={handleEquipCosmetic}
            onNavigate={navigate}
            onUpdateProfile={handleUpdateProfile}
          />
        )
      case 'store':
        return <StoreScreen gamification={gamification} isProUser={isProUser} onShopPurchase={handleShopPurchase} onEquipPet={handleEquipCosmetic} onNavigate={navigate} onNotify={pushNotification} />
      case 'settings':
        return (
          <Settings
            userProfile={userProfile}
            session={session}
            subscription={subscription}
            isProUser={isProUser}
            onNavigate={navigate}
            onUpdateProfile={handleUpdateProfile}
          />
        )
      case 'editDetails':
        return (
          <EditDetails
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onNavigate={navigate}
          />
        )
      case 'terms':
        return <LegalDoc doc="terms" onBack={() => navigate('settings')} />
      case 'privacy':
        return <LegalDoc doc="privacy" onBack={() => navigate('settings')} />
      case 'medals':
        return <MedalsScreen gamification={gamification} onNavigate={navigate} />
      case 'quests':
        return <QuestsScreen gamification={gamification} onClaimQuest={handleClaimQuest} onClaimChallenge={handleClaimChallenge} onNavigate={navigate} />
      case 'calendar':
        return (
          <CalendarScreen
            gamification={gamification}
            routine={routine}
            weeklyPlan={weeklyPlan}
            session={session}
            onClaimQuest={handleClaimQuest}
            onNavigate={navigate}
          />
        )
      case 'discovery':
        return (
          <Discovery
            session={session}
            userProfile={userProfile}
            gamification={gamification}
            onGamificationChange={setGamification}
            onUpdateProfile={handleUpdateProfile}
            loggedMacros={loggedMacros}
            missState={missState}
            onStartMakeup={handleStartMakeup}
            onPendingChange={setPendingRequests}
            onViewProfile={(uid) => { setViewUserId(uid); navigate('userProfile') }}
            onNavigate={navigate}
          />
        )
      case 'userProfile':
        return <UserProfileView userId={viewUserId} session={session} onNavigate={navigate} />
      case 'analytics':
        return <Analytics gamification={gamification} userProfile={userProfile} loggedMacros={loggedMacros} session={session} isProUser={isProUser} onNavigate={navigate} />
      case 'bodyProgress':
        return <BodyProgress session={session} userProfile={userProfile} onNavigate={navigate} />
      case 'rankPage':
        return <RankPage gamification={gamification} onNavigate={navigate} />
      case 'leaderboard':
        return (
          <Leaderboard
            session={session}
            userProfile={userProfile}
            gamification={gamification}
            isProUser={isProUser}
            onNavigate={navigate}
          />
        )
      default:
        return <Home userProfile={userProfile} loggedMacros={loggedMacros} todayWorkout={todayWorkout} gamification={gamification} isProUser={isProUser} session={session} onNavigate={navigate} />
    }
  }

  if (session === undefined) return <PhoneFrame hideStatus={true}><Spinner /></PhoneFrame>
  if (!session || passwordRecovery) {
    return (
      <PhoneFrame hideStatus={true}>
        <Auth recoveryMode={passwordRecovery} onRecoveryDone={() => setPasswordRecovery(false)} />
      </PhoneFrame>
    )
  }
  if (profileLoading) return <PhoneFrame hideStatus={true}><Spinner /></PhoneFrame>

  const todayKeyForBadge = dateKeyFor()
  const dq = gamification.dailyQuests
  const questsReady = dq?.date === todayKeyForBadge
    ? (dq.completed || []).filter(id => !(dq.claimed || []).includes(id)).length
    : 0

  return (
    <NavBadgeContext.Provider value={{ pendingRequests: pendingRequests.length, questsReady }}>
      <PhoneFrame hideStatus={true}>
        {renderScreen()}
        <RewardToast notifications={notifications} />
      </PhoneFrame>
    </NavBadgeContext.Provider>
  )
}
