import React, { useState, useEffect } from 'react'
import PhoneFrame from './components/PhoneFrame'
import Auth from './screens/Auth'
import Onboarding from './screens/Onboarding'
import WhyAura from './screens/WhyAura'
import Home from './screens/Home'
import WorkoutPlayer from './screens/WorkoutPlayer'
import MuscleMap from './screens/MuscleMap'
import Meals from './screens/Meals'
import Profile from './screens/Profile'
import Stats from './screens/Stats'
import Squad from './screens/Squad'
import { buildWeeklyPlan } from './utils/workoutBuilder'
import { supabase } from './lib/supabase'

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
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = no user
  const [screen, setScreen] = useState('onboarding')
  const [userProfile, setUserProfile] = useState(DEFAULT_PROFILE)
  const [weeklyPlan, setWeeklyPlan] = useState(null)
  const [todayWorkoutIndex, setTodayWorkoutIndex] = useState(0)
  const [loggedMacros, setLoggedMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const navigate = (target) => setScreen(target)

  const handleOnboardingComplete = (answers) => {
    const profile = { ...DEFAULT_PROFILE, ...answers }
    setUserProfile(profile)
    const plan = buildWeeklyPlan(profile)
    setWeeklyPlan(plan)
    navigate('whyaura')
  }

  const handleSwapExercise = (exerciseId, replacement) => {
    setUserProfile(prev => ({
      ...prev,
      dislikedExercises: [...(prev.dislikedExercises || []), exerciseId],
    }))
  }

  const todayWorkout = weeklyPlan?.[todayWorkoutIndex]?.workout ?? null

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} />
      case 'whyaura':
        return <WhyAura userProfile={userProfile} onContinue={() => navigate('home')} />
      case 'home':
        return <Home userProfile={userProfile} loggedMacros={loggedMacros} todayWorkout={todayWorkout} onNavigate={navigate} />
      case 'workout':
        return (
          <WorkoutPlayer
            workout={todayWorkout}
            userProfile={userProfile}
            onSwapExercise={handleSwapExercise}
            onNavigate={navigate}
          />
        )
      case 'musclemap':
        return <MuscleMap workout={todayWorkout} onNavigate={navigate} />
      case 'meals':
        return <Meals userProfile={userProfile} loggedMacros={loggedMacros} onUpdateLoggedMacros={setLoggedMacros} onNavigate={navigate} />
      case 'profile':
        return <Profile userProfile={userProfile} weeklyPlan={weeklyPlan} onNavigate={navigate} onSignOut={() => setScreen('onboarding')} />
      case 'stats':
        return <Stats weeklyPlan={weeklyPlan} onNavigate={navigate} />
      case 'squad':
        return <Squad onNavigate={navigate} />
      default:
        return <Home userProfile={userProfile} todayWorkout={todayWorkout} onNavigate={navigate} />
    }
  }

  // Still loading session
  if (session === undefined) {
    return (
      <PhoneFrame hideStatus={true}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #EDE4F8', borderTopColor: '#7C3AED', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </PhoneFrame>
    )
  }

  // Not logged in → show auth screen
  if (!session) {
    return (
      <PhoneFrame hideStatus={true}>
        <Auth />
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame hideStatus={true}>
      {renderScreen()}
    </PhoneFrame>
  )
}
