import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'

function estimateDuration(exercises) {
  if (!exercises?.length) return 0
  return Math.max(15, exercises.reduce((acc, ex) => acc + (ex.sets || 3) * 2, 0) + 5)
}

function getPrimaryMuscles(exercises) {
  const seen = new Set()
  const out = []
  ;(exercises || []).forEach(ex => {
    ;(ex.muscles?.primary || []).forEach(m => {
      if (!seen.has(m)) { seen.add(m); out.push(m) }
    })
  })
  return out.slice(0, 5)
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function WorkoutHub({ weeklyPlan, todayWorkoutIndex, userWorkouts = [], setActiveWorkout, onNavigate, gamification }) {
  // workoutBuilder returns: weeklyPlan[i] = { dayIndex, sessionType, label, workout: { name, exercises, totalSets, estimatedMinutes } }
  const today           = weeklyPlan?.[todayWorkoutIndex]
  const todayWorkoutObj = today?.workout                        // { name, exercises, totalSets, estimatedMinutes }
  const todayEx         = Array.isArray(todayWorkoutObj?.exercises) ? todayWorkoutObj.exercises : []
  const todayLabel      = todayWorkoutObj?.name ?? today?.label ?? "Today's Workout"
  const todaySplit      = today?.label ?? ''                   // 'Lower Body', 'Upper Body A', etc.
  const muscles         = getPrimaryMuscles(todayEx)
  const duration        = todayWorkoutObj?.estimatedMinutes ?? estimateDuration(todayEx)

  const now      = new Date()
  const todayDow = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0

  const handleViewToday = () => {
    if (!todayEx.length) return
    setActiveWorkout({ label: todayLabel, exercises: todayEx, split: todaySplit, source: 'plan' })
    onNavigate('workoutDetail')
  }

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 6px', flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#2E1065', lineHeight: 1.1 }}>
          Workout
        </div>
        <div style={{ fontSize: 13, color: '#8478A0', marginTop: 2 }}>
          {gamification?.workoutStreak > 0
            ? `🔥 ${gamification.workoutStreak}-day streak · keep it up`
            : "Let's get moving"}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 16px' }}>

        {/* ── Today's Workout ──────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Today's Workout</SectionLabel>

          {todayEx.length > 0 ? (
            <div
              onClick={handleViewToday}
              style={{
                borderRadius: 22, padding: '20px 20px 18px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                boxShadow: '0 10px 28px rgba(124,58,237,.32)',
              }}
            >
              <Blob style={{ top: -24, right: -24, width: 130, height: 130, opacity: 0.08 }} />
              <Blob style={{ bottom: -36, right: 28, width: 90, height: 90, opacity: 0.05 }} />

              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                      {todaySplit || 'Full Body'}
                    </div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, color: '#fff', lineHeight: 1.15 }}>
                      {todayLabel}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,.18)', borderRadius: 20, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                    <ClockIcon />
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{duration} min</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {muscles.map(m => (
                    <span key={m} style={{ background: 'rgba(255,255,255,.18)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#fff', fontWeight: 700, textTransform: 'capitalize' }}>
                      {m}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>{todayEx.length} exercises</span>
                  <div style={{ background: 'rgba(255,255,255,.22)', borderRadius: 12, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight color="white" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: 18, padding: 20, background: '#F8F4FF', border: '1.5px solid #EDE4F8', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#8478A0' }}>Complete onboarding to get your plan</div>
            </div>
          )}
        </div>

        {/* ── My Workouts (user-created) ───────────── */}
        {userWorkouts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>My Workouts</SectionLabel>
            {userWorkouts.map((w, i) => (
              <div
                key={i}
                onClick={() => { setActiveWorkout(w); onNavigate('workoutDetail') }}
                style={{ borderRadius: 16, padding: '14px 16px', background: '#fff', border: '1.5px solid #EDE4F8', cursor: 'pointer', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(76,36,120,.05)' }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#2E1065', marginBottom: 2 }}>{w.label}</div>
                  <div style={{ fontSize: 12, color: '#8478A0' }}>{w.exercises?.length || 0} exercises · {estimateDuration(w.exercises)} min</div>
                </div>
                <ChevronRight />
              </div>
            ))}
          </div>
        )}

        {/* ── Create Your Own ──────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Create Your Own</SectionLabel>
          <div
            onClick={() => onNavigate('workoutBuilder')}
            style={{ borderRadius: 20, padding: '16px 18px', background: '#fff', border: '1.5px solid #EDE4F8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 8px rgba(76,36,120,.05)' }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 16, background: 'linear-gradient(135deg, #F0E8FF, #E8D5FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PlusIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#2E1065', marginBottom: 2 }}>Build a workout</div>
              <div style={{ fontSize: 12, color: '#8478A0' }}>Pick muscles &amp; choose your exercises</div>
            </div>
            <ChevronRight />
          </div>
        </div>

        {/* ── Routine ──────────────────────────────── */}
        <div style={{ marginBottom: 8 }}>
          <SectionLabel>Routine</SectionLabel>
          <div
            onClick={() => onNavigate('workoutRoutine')}
            style={{ borderRadius: 20, padding: '16px 18px', background: '#fff', border: '1.5px solid #EDE4F8', cursor: 'pointer', boxShadow: '0 2px 8px rgba(76,36,120,.05)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#2E1065' }}>My Schedule</div>
                <div style={{ fontSize: 12, color: '#8478A0', marginTop: 2 }}>{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</div>
              </div>
              <ChevronRight />
            </div>

            {/* Mini week strip */}
            <div style={{ display: 'flex', gap: 4 }}>
              {DAY_LABELS.map((d, i) => {
                const isToday    = i === todayDow
                const hasPlan    = weeklyPlan && i < weeklyPlan.length
                return (
                  <div key={d} style={{ flex: 1, borderRadius: 10, padding: '7px 2px 6px', background: isToday ? '#7C3AED' : hasPlan ? '#F0E8FF' : '#F8F4FF', border: `1.5px solid ${isToday ? '#7C3AED' : '#EDE4F8'}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? 'rgba(255,255,255,.75)' : '#8478A0', marginBottom: 5 }}>{d}</div>
                    {hasPlan && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isToday ? '#fff' : '#7C3AED', margin: '0 auto' }} />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />
    </>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function Blob({ style }) {
  return <div style={{ position: 'absolute', borderRadius: '50%', background: '#fff', ...style }} />
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function ChevronRight({ color = '#8478A0' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
