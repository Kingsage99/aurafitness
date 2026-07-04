import React, { useState, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const DAY_NAMES  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const MUSCLE_TO_GROUP = {
  glutes: 'glutes', glute: 'glutes',
  hamstrings: 'legs', quads: 'legs', legs: 'legs',
  chest: 'chest', pecs: 'chest',
  shoulders: 'shoulders', delts: 'shoulders',
  back: 'back', lats: 'back', lat: 'back',
  core: 'core', abs: 'core',
  arms: 'arms', biceps: 'arms', triceps: 'arms',
  calves: 'calves',
}

function buildIntensityColors(exercises, side) {
  const counts = {}
  ;(exercises || []).forEach(ex => {
    ;(ex.muscles?.primary || []).forEach(m => {
      const group = MUSCLE_TO_GROUP[m.toLowerCase()]
      if (!group) return
      MUSCLE_SVG_IDS[group]?.[side]?.forEach(id => { counts[id] = (counts[id] || 0) + 1 })
    })
  })
  const colors = {}
  Object.entries(counts).forEach(([id, n]) => {
    colors[id] = n >= 3 ? '#E5352B' : n >= 2 ? '#FF9E4A' : '#FFD8A8'
  })
  return colors
}

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function estimateDuration(exercises) {
  if (!exercises?.length) return 0
  return Math.max(15, exercises.reduce((acc, ex) => acc + (ex.sets || 3) * 2, 0) + 5)
}

function DayDetailPanel({ dateKey, workouts, availableWorkouts, onAssign, onClose }) {
  const assigned = workouts[dateKey]
  const frontColors = useMemo(() => assigned ? buildIntensityColors(assigned.exercises, 'front') : {}, [assigned])
  const backColors  = useMemo(() => assigned ? buildIntensityColors(assigned.exercises, 'back') : {}, [assigned])

  const displayDate = dateKey ? new Date(dateKey + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>

      {/* Panel header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink }}>{displayDate}</div>
          {assigned && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{estimateDuration(assigned.exercises)} min · {assigned.exercises?.length || 0} exercises</div>}
        </div>
        <button onClick={onClose} style={{ background: NB.white, border: `2px solid ${NB.ink}`, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {assigned ? (
        <>
          {/* Workout name + change */}
          <div style={{ border: `2.5px solid ${NB.ink}`, padding: '12px 14px', background: NB.teal, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>{assigned.label?.replace(/^Day \d+ — /, '') ?? 'Workout'}</div>
              {assigned.split && <div style={{ fontSize: 12, color: NB.ink, marginTop: 1 }}>{assigned.split}</div>}
            </div>
            <button onClick={() => onAssign(dateKey, null)} style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 800, textTransform: 'uppercase', background: NB.white, border: `1.5px solid ${NB.ink}`, cursor: 'pointer', padding: '5px 10px' }}>
              Change
            </button>
          </div>

          {/* Muscle map with intensity */}
          <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Muscle Focus</div>
          <div style={{ border: NB_BORDER, background: NB.cream, padding: '8px 12px 6px', display: 'flex', gap: 4, marginBottom: 10 }}>
            <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
              <MuscleSVG key={`front-${dateKey}`} url="/muscle_map_front.svg" muscleColors={frontColors} />
            </div>
            <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
              <MuscleSVG key={`back-${dateKey}`} url="/muscle_map_back.svg" muscleColors={backColors} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['#FFD8A8','Low'],['#FF9E4A','Moderate'],['#E5352B','High']].map(([c, l]) => (
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
              <div key={i} style={{ border: `2px solid ${NB.ink}`, padding: '10px 12px', background: NB.white, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 26, height: 26, border: `1.5px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: NB.fontDisplay, fontSize: 11, fontWeight: 900, color: NB.ink }}>{i + 1}</span>
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
                  onClick={() => onAssign(dateKey, w)}
                  style={{ border: `2px solid ${NB.ink}`, boxShadow: hardShadow(1), padding: '12px 14px', background: NB.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: NB.ink }}>{w.label?.replace(/^Day \d+ — /, '') ?? `Workout ${i + 1}`}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{w.exercises?.length || 0} exercises · {estimateDuration(w.exercises)} min</div>
                  </div>
                  <div style={{ background: NB.yellow, border: `1.5px solid ${NB.ink}`, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, background: NB.white, border: `2.5px dashed ${NB.ink}` }}>
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

export default function WorkoutRoutine({ weeklyPlan, userProfile, userWorkouts = [], onNavigate, onUpdateRoutine, routine = {} }) {
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
    const planWorkouts = (weeklyPlan || []).map((day) => ({
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
        <button onClick={() => { setSelectedDay(null); onNavigate('workout') }} style={{ background: NB.white, border: NB_BORDER, boxShadow: hardShadow(2), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink }}>My Routine</div>
          <div style={{ fontSize: 12, color: '#555' }}>{MONTH_NAMES[month]} {year}</div>
        </div>
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
            const assigned  = localRoutine[dateKey]

            return (
              <div
                key={dateKey}
                onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                style={{
                  padding: '6px 2px 5px', textAlign: 'center', cursor: 'pointer',
                  background: isSelected ? NB.magenta : isToday ? NB.yellow : assigned ? NB.cream : NB.white,
                  border: `2px solid ${NB.ink}`,
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
          dateKey={selectedDay}
          workouts={localRoutine}
          availableWorkouts={availableWorkouts}
          onAssign={handleAssign}
          onClose={() => setSelectedDay(null)}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 22px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
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
