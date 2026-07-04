import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

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
  const today           = weeklyPlan?.[todayWorkoutIndex]
  const todayWorkoutObj = today?.workout
  const todayEx         = Array.isArray(todayWorkoutObj?.exercises) ? todayWorkoutObj.exercises : []
  const todayLabel      = todayWorkoutObj?.name ?? today?.label ?? "Today's Workout"
  const todaySplit      = today?.label ?? ''
  const muscles         = getPrimaryMuscles(todayEx)
  const duration        = todayWorkoutObj?.estimatedMinutes ?? estimateDuration(todayEx)

  const now      = new Date()
  const todayDow = now.getDay() === 0 ? 6 : now.getDay() - 1

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
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 26, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1 }}>
          Workout
        </div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
          {gamification?.workoutStreak > 0
            ? `🔥 ${gamification.workoutStreak}-day streak · keep it up`
            : "Let's get moving"}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 16px' }}>

        {/* ── Today's Workout ──────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>Today's Workout</SectionLabel>

          {todayEx.length > 0 ? (
            <div
              onClick={handleViewToday}
              style={{
                border: NB_BORDER, padding: '20px 20px 18px',
                background: NB.magenta, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                boxShadow: hardShadow(6),
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.white, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                      {todaySplit || 'Full Body'}
                    </div>
                    <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 21, textTransform: 'uppercase', color: NB.white, lineHeight: 1.15 }}>
                      {todayLabel}
                    </div>
                  </div>
                  <div style={{ background: NB.white, border: `2px solid ${NB.ink}`, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                    <ClockIcon />
                    <span style={{ fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 700 }}>{duration} min</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {muscles.map(m => (
                    <span key={m} style={{ background: NB.white, border: `1.5px solid ${NB.ink}`, padding: '4px 10px', fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700, textTransform: 'uppercase' }}>
                      {m}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{todayEx.length} exercises</span>
                  <div style={{ background: NB.yellow, border: `2px solid ${NB.ink}`, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight color={NB.ink} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ border: NB_BORDER, padding: 20, background: NB.white, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#555' }}>Complete onboarding to get your plan</div>
            </div>
          )}
        </div>

        {/* ── My Workouts (user-created) ───────────── */}
        {userWorkouts.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <SectionLabel>My Workouts</SectionLabel>
            {userWorkouts.map((w, i) => (
              <div
                key={i}
                onClick={() => { setActiveWorkout(w); onNavigate('workoutDetail') }}
                style={{ border: NB_BORDER, boxShadow: hardShadow(3), padding: '14px 16px', background: NB.white, cursor: 'pointer', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink, marginBottom: 2 }}>{w.label}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>{w.exercises?.length || 0} exercises · {estimateDuration(w.exercises)} min</div>
                </div>
                <ChevronRight />
              </div>
            ))}
          </div>
        )}

        {/* ── Create Your Own ──────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>Create Your Own</SectionLabel>
          <div
            onClick={() => onNavigate('workoutBuilder')}
            style={{ border: NB_BORDER, boxShadow: hardShadow(3), padding: '16px 18px', background: NB.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div style={{ width: 50, height: 50, border: `2.5px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PlusIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink, marginBottom: 2 }}>Build a workout</div>
              <div style={{ fontSize: 12, color: '#555' }}>Pick muscles &amp; choose your exercises</div>
            </div>
            <ChevronRight />
          </div>
        </div>

        {/* ── Routine ──────────────────────────────── */}
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Routine</SectionLabel>
          <div
            onClick={() => onNavigate('workoutRoutine')}
            style={{ border: NB_BORDER, boxShadow: hardShadow(3), padding: '16px 18px', background: NB.white, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink }}>My Schedule</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</div>
              </div>
              <ChevronRight />
            </div>

            {/* Mini week strip */}
            <div style={{ display: 'flex', gap: 5 }}>
              {DAY_LABELS.map((d, i) => {
                const isToday    = i === todayDow
                const hasPlan    = weeklyPlan && i < weeklyPlan.length
                return (
                  <div key={d} style={{ flex: 1, border: `2px solid ${NB.ink}`, padding: '7px 2px 6px', background: isToday ? NB.teal : hasPlan ? NB.cream : NB.white, textAlign: 'center' }}>
                    <div style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 700, color: NB.ink, marginBottom: 5 }}>{d}</div>
                    {hasPlan && <div style={{ width: 6, height: 6, background: NB.ink, margin: '0 auto' }} />}
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
    <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function ChevronRight({ color = NB.ink }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
