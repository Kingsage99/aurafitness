import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { getWeekdayIndex, getPrimaryMuscles, dateKeyFor, estimateDuration } from '../utils/workoutBuilder'
import { readWorkoutDraft } from '../utils/workoutDraft'
import { FireIcon, SpaIcon, ToolsIcon } from '../components/Icons'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// Compact kg/lbs pill — writes to the same userProfile.units field Settings.jsx
// uses, so toggling here or there always stays in sync app-wide.
function UnitToggle({ units, onUpdateProfile }) {
  return (
    <div style={{ display: 'flex', border: NB_BORDER, borderRadius: 10, overflow: 'hidden', boxShadow: hardShadow(2), flexShrink: 0 }}>
      {['metric', 'imperial'].map(u => {
        const sel = (units || 'metric') === u
        return (
          <button
            key={u}
            onClick={() => onUpdateProfile?.({ units: u })}
            style={{
              width: 40, height: 32, border: 'none', cursor: 'pointer',
              background: sel ? NB.teal : NB.white, color: NB.ink,
              fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 11, textTransform: 'uppercase',
            }}
          >
            {u === 'metric' ? 'Kg' : 'Lbs'}
          </button>
        )
      })}
    </div>
  )
}

export default function WorkoutHub({ weeklyPlan, userWorkouts = [], setActiveWorkout, onNavigate, gamification, userProfile, onUpdateProfile, routine = {}, userId }) {
  const now      = new Date()
  const todayDow = getWeekdayIndex(now)
  const draft    = readWorkoutDraft(userId)

  const handleResumeDraft = () => {
    if (!draft) return
    setActiveWorkout({ label: draft.label, exercises: draft.exercises, source: 'resume' })
    onNavigate('workoutActive')
  }

  const routineToday    = routine[dateKeyFor(now)]
  const today           = weeklyPlan?.[todayDow]
  const isRestDay       = !routineToday && !!weeklyPlan && !today?.isTrainingDay
  const todayWorkoutObj = routineToday || today?.workout
  const todayEx         = Array.isArray(todayWorkoutObj?.exercises) ? todayWorkoutObj.exercises : []
  const todayLabel      = todayWorkoutObj?.name ?? todayWorkoutObj?.label ?? today?.label ?? "Today's Workout"
  const todaySplit      = routineToday ? (routineToday.split || 'Custom') : (today?.label ?? '')
  const muscles         = getPrimaryMuscles(todayEx)
  const duration        = todayWorkoutObj?.estimatedMinutes ?? estimateDuration(todayEx)

  const handleViewToday = () => {
    if (!todayEx.length) return
    setActiveWorkout({ label: todayLabel, exercises: todayEx, split: todaySplit, source: 'plan' })
    onNavigate('workoutDetail')
  }

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 6px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 26, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1 }}>
            Workout
          </div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            {gamification?.workoutStreak > 0
              ? <><FireIcon size={13} /> {gamification.workoutStreak}-day streak · keep it up</>
              : "Let's get moving"}
          </div>
        </div>
        <UnitToggle units={userProfile?.units} onUpdateProfile={onUpdateProfile} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 16px' }}>

        {/* ── Resume unfinished workout (autosaved draft) ──────────── */}
        {draft && (
          <div
            onClick={handleResumeDraft}
            style={{ ...nbCardStyle(NB.lavender, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '13px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Resume unfinished workout</div>
              <div style={{ fontSize: 12, color: '#555' }}>{draft.label} · {Math.floor((draft.elapsed || 0) / 60)} min in</div>
            </div>
            <ChevronRight />
          </div>
        )}

        {/* ── Today's Workout ──────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>Today's Workout</SectionLabel>

          {todayEx.length > 0 ? (
            <div
              onClick={handleViewToday}
              style={{
                ...nbCardStyle(NB.magenta, 6), border: `3px solid ${NB.white}`, borderRadius: 20, padding: '20px 20px 18px',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
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
                  <div style={{ background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 10, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                    <ClockIcon />
                    <span style={{ fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 700 }}>{duration} min</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {muscles.map(m => (
                    <span key={m} style={{ background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '4px 10px', fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700, textTransform: 'uppercase' }}>
                      {m}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{todayEx.length} exercises</span>
                  <div style={{ background: NB.yellow, border: `2px solid ${NB.ink}`, borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight color={NB.ink} />
                  </div>
                </div>
              </div>
            </div>
          ) : isRestDay ? (
            <div style={{ ...nbCardStyle(NB.cream, 5), border: `3px solid ${NB.white}`, borderRadius: 20, padding: 20, textAlign: 'center' }}>
              <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><SpaIcon size={28} /></div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>Rest day</div>
              <div style={{ fontSize: 13, color: '#555' }}>No workout scheduled today — recover up and come back stronger.</div>
            </div>
          ) : userProfile?.planningMode === 'custom' ? (
            <div style={{ ...nbCardStyle(NB.lavender, 5, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 20, padding: 20, textAlign: 'center' }}>
              <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><ToolsIcon size={28} /></div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>You're in build-your-own mode</div>
              <div style={{ fontSize: 13, color: '#555' }}>Create a workout below and it will show up here on the days you schedule it.</div>
            </div>
          ) : (
            <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 5, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 20, padding: 20, textAlign: 'center' }}>
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
                style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
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

        {/* ── Muscle Map ────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>Muscle Map</SectionLabel>
          <div
            onClick={() => onNavigate('musclemap')}
            style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 13, border: `2.5px solid ${NB.ink}`, background: NB.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BodyIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink, marginBottom: 2 }}>See your muscle map</div>
              <div style={{ fontSize: 12, color: '#555' }}>Training volume & recovery by muscle group</div>
            </div>
            <ChevronRight />
          </div>
        </div>

        {/* ── Create Your Own ──────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>Create Your Own</SectionLabel>
          <div
            onClick={() => onNavigate(userProfile?.planningMode === 'custom' ? 'assignSchedule' : 'workoutBuilder')}
            style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 13, border: `2.5px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PlusIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink, marginBottom: 2 }}>Build a workout</div>
              <div style={{ fontSize: 12, color: '#555' }}>
                {userProfile?.planningMode === 'custom' ? 'Manage your workouts & weekly schedule' : 'Pick muscles & choose your exercises'}
              </div>
            </div>
            <ChevronRight />
          </div>
        </div>

        {/* ── Routine ──────────────────────────────── */}
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Routine</SectionLabel>
          <div
            onClick={() => onNavigate('workoutRoutine')}
            style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer' }}
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
                const hasPlan    = !!weeklyPlan?.[i]?.isTrainingDay
                return (
                  <div key={d} style={{ flex: 1, border: `2px solid ${NB.ink}`, borderRadius: 8, padding: '7px 2px 6px', background: isToday ? NB.teal : hasPlan ? NB.cream : NB.white, textAlign: 'center' }}>
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

function BodyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2.2"/><path d="M12 8v6M12 8c-2.2 0-4 1-4.5 3M12 8c2.2 0 4 1 4.5 3M9 21l1.5-7M15 21l-1.5-7"/>
    </svg>
  )
}
