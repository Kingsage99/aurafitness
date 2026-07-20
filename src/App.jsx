import React, { useState, useEffect, useRef } from 'react'
import PhoneFrame from './components/PhoneFrame'
import { NavBadgeContext } from './components/BottomNav'
import Auth from './screens/Auth'
import Onboarding from './screens/Onboarding'
import WhyAura from './screens/WhyAura'
import ProUpsell from './screens/ProUpsell'
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
import StoreScreen from './screens/StoreScreen'
import Discovery from './screens/Discovery'
import UserProfileView from './screens/UserProfileView'
import MealPost from './screens/MealPost'
import Analytics from './screens/Analytics'
import BodyProgress from './screens/BodyProgress'
import RankPage from './screens/RankPage'
import Leaderboard from './screens/Leaderboard'
import Settings from './screens/Settings'
import LegalDoc from './screens/LegalDoc'
import { buildWeeklyPlan, buildCustomWeeklyPlan, getWeekdayIndex, dateKeyFor } from './utils/workoutBuilder'
import { supabase } from './lib/supabase'
import { saveWorkoutHistory, fetchPendingRequests, setUsername, logNutrition, notifySelf } from './lib/social'
import {
  DEFAULT_GAMIFICATION, resetWeeklyIfNeeded, awardGems, awardXP,
  updateStreak, checkBadges, checkCaloriePenalty, calorieGoalStatus,
  awardRankPoints, awardMuscleRankPoints, claimQuest, purchaseItem, equipCosmetic, QUEST_POOL, SHOP_ITEMS,
  MUSCLE_RANK_MIN_WORKOUTS, claimWeeklyChallenge, evaluateDailyQuests,
} from './utils/gamification'
import { getDailyTargets } from './utils/nutrition'
import { MUSCLE_LABELS } from './utils/muscleLabels'
import RewardToast from './components/RewardToast'

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
      setSubscription({ proUntil: data.pro_until || null, status: data.subscription_status || null })
      const plan = profile.planningMode === 'custom'
        ? buildCustomWeeklyPlan(data.custom_schedule || {})
        : buildWeeklyPlan(profile)
      setWeeklyPlan(plan)
      setScreen('home')

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

        // Check yesterday's calorie goal and apply penalty/reward
        const ydDate = new Date(); ydDate.setDate(ydDate.getDate() - 1)
        const yesterdayKey = dateKeyFor(ydDate)
        if (data.daily_log_date === yesterdayKey && data.daily_log) {
          const dailyTarget = profile.dailyCalorieTarget
          const { g: checkedG, lifeLost, penaltyApplied, goalHit } = checkCaloriePenalty(g, yesterdayKey, dailyTarget, data.daily_log)
          g = checkedG
          if (lifeLost) {
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
            pushNotification('+20 💎  Yesterday\'s calorie goal achieved!')
          }
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
        const cStatus = calorieGoalStatus(profile.dailyCalorieTarget, data.daily_log_date === yesterdayKey ? data.daily_log : null)
        const calorieMissedYesterday = activeBeforeToday && (cStatus === 'missed' || cStatus === 'not_logged')
        setMissState({ yesterdayKey, workoutMissedYesterday, missedWorkoutEntry: workoutMissedYesterday ? yesterdaySlot : null, calorieMissedYesterday })
        if (workoutMissedYesterday) pushNotification(`😔 You missed ${yesterdaySlot.label} yesterday`)

        setGamification(g)
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
        const { updatedG } = checkBadges(g, { onboardingCompleted: true })
        setGamification(updatedG)
        pushNotification('Welcome to MissVfit! +50 💎 +100 XP 🎉')
      }
    }

    if (profile.planningMode === 'custom') {
      setOnboardingFlow(true)
      navigate('workoutBuilder')
    } else {
      navigate('whyaura')
    }
  }

  const handleResetOnboarding = async () => {
    if (sessionRef.current) {
      await supabase.from('profiles').update({ onboarding_done: false }).eq('id', sessionRef.current.user.id)
    }
    dataReady.current = false
    setUserProfile(DEFAULT_PROFILE)
    setWeeklyPlan(null)
    setLoggedMacros(DEFAULT_LOGGED_MACROS)
    setCookbook([])
    setScreen('onboarding')
  }

  const handleWorkoutComplete = (rawSessionData = {}) => {
    const today = dateKeyFor()
    let g = resetWeeklyIfNeeded(gamification)
    g = { ...g, totalWorkouts: g.totalWorkouts + 1, weeklyWorkoutsDone: g.weeklyWorkoutsDone + 1 }
    // Track workout date for calendar
    const existingDates = g.workoutDates || []
    if (!existingDates.includes(today)) g = { ...g, workoutDates: [...existingDates, today] }
    g = updateStreak(g, today)
    if (activeWorkout?.source === 'makeup') g = { ...g, lastMakeupDate: today }

    // Base workout reward — scaled by how much of the workout was actually
    // completed, so finishing 1 set doesn't earn the same as finishing all of
    // them (a flat reward undermined the "Finish Workout" completion cue).
    const completionRatio = rawSessionData.totalSets > 0 ? rawSessionData.setsCompleted / rawSessionData.totalSets : 1
    const baseGems = Math.max(10, Math.round(30 * completionRatio))
    const baseXP = Math.max(15, Math.round(50 * completionRatio))
    g = awardGems(g, baseGems)
    let levelUp = false; let lvl = g.level
    ;({ g, leveledUp: levelUp, newLevel: lvl } = awardXP(g, baseXP))
    pushNotification(`+${baseGems} 💎  Workout complete!`)
    if (levelUp) pushNotification(`Level up! You're now Level ${lvl} ⬆️`)

    // Streak milestone bonuses
    const milestones = { 3: { gems: 25, xp: 40 }, 7: { gems: 75, xp: 100 }, 30: { gems: 300, xp: 500 }, 60: { gems: 500, xp: 800 } }
    const mb = milestones[g.workoutStreak]
    if (mb) {
      g = awardGems(g, mb.gems)
      ;({ g } = awardXP(g, mb.xp))
      pushNotification(`🔥 ${g.workoutStreak}-day streak bonus! +${mb.gems} 💎`)
    }

    const allWeekDone = g.weeklyWorkoutsDone >= (userProfile.daysPerWeek || 3)
    const { updatedG, newBadges } = checkBadges(g, { workoutCompleted: true, cookbookCount: cookbook.length, allWeekDone })
    g = updatedG
    newBadges.forEach(b => pushNotification(`🏅 ${b.label} badge unlocked!`))
    if (allWeekDone) pushNotification('+60 💎  Full week complete!')

    // Rank points
    let rankedUp = false; let newRankLabel = ''
    ;({ g, rankedUp, newRank: newRankLabel } = awardRankPoints(g, allWeekDone ? 20 : 10))
    if (rankedUp) pushNotification(`Rank up! You're now ${newRankLabel} 🏆`)

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
    if (g.totalWorkouts >= MUSCLE_RANK_MIN_WORKOUTS) {
      muscleRankUps.forEach(({ muscleId, label }) => pushNotification(`🏆 ${MUSCLE_LABELS[muscleId] || muscleId} ranked up to ${label}!`))
    }

    setGamification(g)
    setWorkoutSession({ ...rawSessionData, xpEarned: baseXP, gemsEarned: baseGems, streak: g.workoutStreak, muscleGains, muscleRankUps })

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
    }
  }

  const handleClaimChallenge = (challengeId) => {
    const { g: updated, awarded } = claimWeeklyChallenge(resetWeeklyIfNeeded(gamification), challengeId)
    if (awarded > 0) {
      setGamification(updated)
      pushNotification(`Weekly challenge complete! +${awarded} 💎`)
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

    let g = resetWeeklyIfNeeded(gamification)
    g = awardGems(g, 5)
    ;({ g } = awardXP(g, 10))
    const { updatedG, newBadges } = checkBadges(g, { mealLogged: true })
    g = updatedG

    // Track today's meal-kind buckets so meal-logging quests can auto-complete.
    // Date format must match the quest system (Home.jsx/QuestsScreen.jsx — local date).
    const todayKey = dateKeyFor()
    const bucket = mealBucket(mealData.mealType)
    const mt = g.mealsToday?.date === todayKey ? g.mealsToday : { date: todayKey, types: [] }
    g = { ...g, mealsToday: { date: todayKey, types: [...mt.types, bucket] } }

    setGamification(g)
    pushNotification('+5 💎  Meal logged!')
    newBadges.forEach(b => pushNotification(`🏅 ${b.label} badge unlocked!`))

    if (offerShare && mealData.name) {
      setMealPostData(mealData)
      navigate('mealPost')
    }
  }

  const handleUpdateCountry = async (country) => {
    setUserProfile(prev => ({ ...prev, country }))
    if (sessionRef.current) {
      const { error } = await supabase.from('profiles').update({
        profile_data: { ...userProfile, country },
      }).eq('id', sessionRef.current.user.id)
      if (error) console.error('Country save error:', error.message)
    }
  }

  const handleUpdateProfile = async (partial) => {
    const next = { ...userProfile, ...partial }
    setUserProfile(next)
    if (next.planningMode !== 'custom' && ('trainingStyle' in partial || 'daysPerWeek' in partial || 'trainingDays' in partial)) {
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
            onContinue={() => { setOnboardingFlow(false); navigate('proUpsell') }}
          />
        )
      case 'proUpsell':
        return <ProUpsell subscription={subscription} onContinue={() => navigate('home')} />
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
            onResetOnboarding={handleResetOnboarding}
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
            onUpdateCountry={handleUpdateCountry}
            onNavigate={navigate}
          />
        )
      default:
        return <Home userProfile={userProfile} loggedMacros={loggedMacros} todayWorkout={todayWorkout} gamification={gamification} isProUser={isProUser} session={session} onNavigate={navigate} />
    }
  }

  if (session === undefined) return <PhoneFrame hideStatus={true}><Spinner /></PhoneFrame>
  if (!session) return <PhoneFrame hideStatus={true}><Auth /></PhoneFrame>
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
