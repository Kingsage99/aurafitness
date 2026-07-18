import React, { useState, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG from '../components/MuscleSVG'
import ExerciseThumb from '../components/ExerciseThumb'
import { dateKeyFor, getWeekdayIndex, estimateDuration, resolveExerciseImage } from '../utils/workoutBuilder'
import { buildMuscleIntensityColors } from '../utils/muscleIntensity'
import { NB, NB_BORDER, hardShadow, NB_INTENSITY_RAMP, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'
import { CalendarIcon } from '../components/Icons'

const DAY_NAMES  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function toKey(year, month, day) {
  return dateKeyFor(new Date(year, month, day))
}

// Effective assignment for a date: an explicit one-off override takes priority,
// otherwise fall back to the recurring weekly template for that weekday.
function effectiveAssignment(dateKey, routine, weeklyPlan) {
  if (routine[dateKey]) return routine[dateKey]
  const [y, m, d] = dateKey.split('-').map(Number)
  const slot = weeklyPlan?.[getWeekdayIndex(new Date(y, m - 1, d))]
  if (!slot?.isTrainingDay) return null
  return { label: slot.label, exercises: slot.workout?.exercises, split: slot.label }
}

function DayDetailPanel({ dateKey, assigned, availableWorkouts, onAssign, onClose, equipment, isProUser = false }) {
  const [picking, setPicking] = useState(false)
  const frontColors = useMemo(() => assigned ? buildMuscleIntensityColors(assigned.exercises, 'front', isProUser) : {}, [assigned, isProUser])
  const backColors  = useMemo(() => assigned ? buildMuscleIntensityColors(assigned.exercises, 'back', isProUser) : {}, [assigned, isProUser])

  const displayDate = dateKey ? new Date(dateKey + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const showPicker = !assigned || picking

  return (
    <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>

      {/* Panel header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink }}>{displayDate}</div>
          {assigned && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{estimateDuration(assigned.exercises)} min · {assigned.exercises?.length || 0} exercises</div>}
        </div>
        <button onClick={onClose} style={{ background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {!showPicker ? (
        <>
          {/* Workout name + change */}
          <div style={{ ...nbCardStyle(NB.teal, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>{assigned.label?.replace(/^Day \d+ — /, '') ?? 'Workout'}</div>
              {assigned.split && <div style={{ fontSize: 12, color: NB.ink, marginTop: 1 }}>{assigned.split}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => setPicking(true)} style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 800, textTransform: 'uppercase', background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, cursor: 'pointer', padding: '5px 10px' }}>
                Change
              </button>
              <button onClick={() => onAssign(dateKey, null)} title="Clear this day back to rest" style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 800, textTransform: 'uppercase', background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, cursor: 'pointer', padding: '5px 10px' }}>
                Clear
              </button>
            </div>
          </div>

          {/* Muscle map with intensity */}
          <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Muscle Focus</div>
          <div style={{ ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '8px 12px 6px', display: 'flex', gap: 4, marginBottom: 10 }}>
            <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
              <MuscleSVG key={`front-${dateKey}`} url="/muscle_map_front.svg" muscleColors={frontColors} />
            </div>
            <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
              <MuscleSVG key={`back-${dateKey}`} url="/muscle_map_back.svg" muscleColors={backColors} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[[NB_INTENSITY_RAMP[1],'Low'],[NB_INTENSITY_RAMP[3],'Moderate'],[NB_INTENSITY_RAMP[4],'High']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, border: `1.5px solid ${NB.ink}`, background: c }} />
                <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555', fontWeight: 700 }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Exercise list */}
          <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Exercises</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(assigned.exercises || []).map((ex, i) => (
              <div key={i} style={{ border: 'none', borderRadius: 14, padding: '10px 12px', background: NB.lavenderMist, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <ExerciseThumb src={resolveExerciseImage(ex, equipment)} slot={ex.slot} size={26} radius={8} />
                  <span style={{ position: 'absolute', bottom: -4, right: -4, width: 14, height: 14, borderRadius: 5, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NB.fontDisplay, fontSize: 8, fontWeight: 900, color: NB.ink }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{ex.sets || 3} sets × {ex.reps || ex.repsRange?.min || 8} reps</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Assign a workout */}
          <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Assign a Workout
          </div>
          {availableWorkouts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableWorkouts.map((w, i) => (
                <div
                  key={i}
                  onClick={() => { onAssign(dateKey, w); setPicking(false) }}
                  style={{ border: 'none', borderRadius: 14, padding: '12px 14px', background: NB.lavenderMist, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: NB.ink }}>{w.label?.replace(/^Day \d+ — /, '') ?? `Workout ${i + 1}`}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{w.exercises?.length || 0} exercises · {estimateDuration(w.exercises)} min</div>
                  </div>
                  <div style={{ background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 9, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16 }}>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                No workouts available yet.{'\n'}Create one first.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function WorkoutRoutine({ weeklyPlan, userProfile, userWorkouts = [], onNavigate, onUpdateRoutine, routine = {}, isProUser = false }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const [localRoutine, setLocalRoutine] = useState(routine)

  const now       = new Date()
  const year      = now.getFullYear()
  const month     = now.getMonth()
  const todayDate = now.getDate()

  const { grid } = useMemo(() => {
    const first    = new Date(year, month, 1)
    const last     = new Date(year, month + 1, 0)
    const dim      = last.getDate()
    const startDow = first.getDay() === 0 ? 6 : first.getDay() - 1

    const g = []
    for (let i = 0; i < startDow; i++) g.push(null)
    for (let d = 1; d <= dim; d++) g.push(d)
    while (g.length % 7 !== 0) g.push(null)
    return { grid: g, daysInMonth: dim }
  }, [year, month])

  const handleAssign = (dateKey, workout) => {
    const next = { ...localRoutine }
    if (workout === null) {
      delete next[dateKey]
    } else {
      next[dateKey] = workout
    }
    setLocalRoutine(next)
    if (onUpdateRoutine) onUpdateRoutine(next)
  }

  const availableWorkouts = useMemo(() => {
    const planWorkouts = (weeklyPlan || [])
      .filter((day) => day.isTrainingDay && day.workout)
      .map((day) => ({
        label: day.workout?.name ?? day.label ?? 'Workout',
        exercises: Array.isArray(day.workout?.exercises) ? day.workout.exercises : [],
        split: day.label ?? '',
      }))
    return [...planWorkouts, ...userWorkouts]
  }, [weeklyPlan, userWorkouts])

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => { setSelectedDay(null); onNavigate('workout') }} style={{ background: NB.white, border: NB_BORDER, borderRadius: 11, boxShadow: hardShadow(2), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink }}>My Routine</div>
          <div style={{ fontSize: 12, color: '#555' }}>{MONTH_NAMES[month]} {year}</div>
        </div>
        {userProfile?.planningMode === 'custom' && (
          <button onClick={() => onNavigate('assignSchedule')} style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 800, textTransform: 'uppercase', background: NB.white, border: NB_BORDER, boxShadow: hardShadow(2), borderRadius: 11, cursor: 'pointer', padding: '9px 12px', flexShrink: 0 }}>
            Edit Week
          </button>
        )}
      </div>

      {/* Calendar */}
      <div style={{ padding: '0 22px 12px', flexShrink: 0 }}>
        {/* Day labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign: 'center', fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', padding: '2px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {grid.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />

            const dateKey   = toKey(year, month, day)
            const isToday   = day === todayDate
            const isSelected = selectedDay === dateKey
            const assigned  = effectiveAssignment(dateKey, localRoutine, weeklyPlan)

            return (
              <div
                key={dateKey}
                onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                style={{
                  padding: '6px 2px 5px', textAlign: 'center', cursor: 'pointer',
                  background: isSelected ? NB.magenta : isToday ? NB.yellow : assigned ? NB.cream : NB.white,
                  border: `2px solid ${NB.ink}`,
                  borderRadius: 8,
                  minHeight: 44,
                }}
              >
                <div style={{ fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, color: isSelected ? NB.white : NB.ink, marginBottom: assigned ? 3 : 0 }}>{day}</div>
                {assigned && (
                  <div style={{ fontFamily: NB.fontMono, fontSize: 8, fontWeight: 700, color: isSelected ? NB.white : NB.ink, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' }}>
                    {(assigned.label || '').replace(/^Day \d+ — /, '').slice(0, 8)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel or prompt */}
      {selectedDay ? (
        <DayDetailPanel
          key={selectedDay}
          dateKey={selectedDay}
          assigned={effectiveAssignment(selectedDay, localRoutine, weeklyPlan)}
          availableWorkouts={availableWorkouts}
          onAssign={handleAssign}
          onClose={() => setSelectedDay(null)}
          equipment={userProfile?.equipment}
          isProUser={isProUser}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 22px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}><CalendarIcon size={36} /></div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.5 }}>
              Tap any day to assign a workout or see what's planned
            </div>
          </div>
        </div>
      )}

      <BottomNav active="workout" onNavigate={onNavigate} />
    </>
  )
}
