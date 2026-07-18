import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { DAY_IDS, estimateDuration } from '../utils/workoutBuilder'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

export default function AssignSchedule({ trainingDays = [], userWorkouts = [], customSchedule = {}, onAssignDay, onBuildAnother, onDone, onNavigate, isOnboarding = false }) {
  const [pickerDay, setPickerDay] = useState(null)

  const sortedDays = [...trainingDays].sort((a, b) => DAY_IDS.indexOf(a) - DAY_IDS.indexOf(b))
  const allAssigned = sortedDays.length > 0 && sortedDays.every(d => !!customSchedule[d])

  const handlePick = (workout) => {
    onAssignDay(pickerDay, workout)
    setPickerDay(null)
  }

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        {!isOnboarding && (
          <button onClick={() => onNavigate('workout')} style={{ width: 38, height: 38, borderRadius: 12, border: NB_BORDER, background: NB.white, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>Build Your Week</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>Assign a workout to each training day.</div>
        </div>
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '10px 22px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {sortedDays.map(dayId => {
            const assigned = customSchedule[dayId]
            return (
              <button
                key={dayId}
                onClick={() => setPickerDay(dayId)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '16px 18px', textAlign: 'left', cursor: 'pointer',
                  ...nbCardStyle(assigned ? NB.teal : NB_CARD_NEUTRAL, assigned ? 4 : 2, assigned ? undefined : NB_CARD_NEUTRAL_SHADOW),border: `3px solid ${NB.white}`, 
                  borderRadius: 16,
                }}
              >
                <div>
                  <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase' }}>{DAY_LABELS[dayId]}</div>
                  <div style={{ fontFamily: NB.fontDisplay, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginTop: 2 }}>
                    {assigned ? assigned.label : 'Tap to assign'}
                  </div>
                  {assigned && <div style={{ fontSize: 12, color: '#444', marginTop: 2 }}>{assigned.exercises?.length || 0} exercises · {estimateDuration(assigned.exercises)} min</div>}
                </div>
                {assigned && (
                  <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 800, textTransform: 'uppercase', background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '5px 10px', flexShrink: 0 }}>
                    Change
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={onBuildAnother}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, cursor: 'pointer' }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 11, border: `2.5px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>Build a new workout</span>
        </button>
      </div>

      {/* Picker sheet */}
      {pickerDay && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }} onClick={() => setPickerDay(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '70%', overflowY: 'auto', background: NB.cream, border: `2.5px solid ${NB.ink}`, borderRadius: '20px 20px 0 0', padding: '18px 22px 26px', boxSizing: 'border-box' }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: NB.ink, marginBottom: 14 }}>
              Assign to {DAY_LABELS[pickerDay]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {userWorkouts.map((w, i) => (
                <button
                  key={i}
                  onClick={() => handlePick(w)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', border: 'none', borderRadius: 14, background: NB.lavenderMist, cursor: 'pointer', textAlign: 'left' }}
                >
                  <div>
                    <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>{w.label}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{w.exercises?.length || 0} exercises · {estimateDuration(w.exercises)} min</div>
                  </div>
                </button>
              ))}
              {userWorkouts.length === 0 && (
                <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '10px 0' }}>No workouts built yet.</div>
              )}
              <button
                onClick={() => { setPickerDay(null); onBuildAnother() }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: 'none', borderRadius: 14, background: NB.lavenderMist, cursor: 'pointer' }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 9, border: `2px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: NB.ink }}>Build a new workout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 22px 26px', flexShrink: 0 }}>
        <button
          onClick={() => onDone(customSchedule)}
          disabled={!allAssigned}
          style={{
            width: '100%', height: 54, borderRadius: 16, border: NB_BORDER, boxShadow: allAssigned ? hardShadow(4) : 'none',
            background: allAssigned ? NB.magenta : NB.white, color: allAssigned ? NB.white : '#999',
            fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase',
            cursor: allAssigned ? 'pointer' : 'default',
          }}
        >
          {allAssigned ? 'Continue' : `Assign all ${sortedDays.length} days to continue`}
        </button>
      </div>

      {!isOnboarding && <BottomNav active="workout" onNavigate={onNavigate} />}
    </>
  )
}
