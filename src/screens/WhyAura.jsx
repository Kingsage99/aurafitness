import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

const REVEAL_AVATAR = '/avatar/viewer%20%20back%20pose.png'

// Headline now reflects the fitness goal the user actually picked — the old
// "dream physique" step was removed, so labeling this by physique would show
// a default the user never chose.
const GOAL_LABELS = {
  lose_weight: 'Fat Loss',
  build_muscle: 'Muscle Gain',
  tone_recomp: 'Tone & Recomp',
  maintain: 'Maintenance',
  athletic_performance: 'Peak Performance',
}

const GOAL_COPY = {
  lose_weight:          { verb: 'burn fat at', detail: 'a caloric deficit' },
  build_muscle:         { verb: 'build muscle at', detail: 'a lean bulk surplus' },
  tone_recomp:          { verb: 'recompose at', detail: 'maintenance calories' },
  maintain:             { verb: 'maintain at', detail: 'your maintenance calories' },
  athletic_performance: { verb: 'perform at', detail: 'a performance surplus' },
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function WhyAura({ userProfile = {}, weeklyPlan = null, onContinue }) {
  const {
    fitnessGoal = 'tone_recomp',
    dailyCalorieTarget = null,
    tdee = null,
  } = userProfile

  const goalLabel = GOAL_LABELS[fitnessGoal] || 'Your Goal'
  const goalCopy = GOAL_COPY[fitnessGoal] || GOAL_COPY.tone_recomp
  const trainingDays = (weeklyPlan || []).filter(d => d.isTrainingDay)

  return (
    <>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 0', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>Your path to</div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1 }}>{goalLabel}</div>
        </div>

        {/* Avatar — bigger now that the schedule below is a single compact card */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: 8, flex: '0 1 auto' }}>
          <img src={REVEAL_AVATAR} alt="Your avatar" style={{ height: 320, width: 'auto', objectFit: 'contain', position: 'relative', filter: `drop-shadow(${hardShadow(3)})` }} />
          <div style={{ position: 'absolute', top: 8, right: 0, background: NB.white, border: NB_BORDER, borderRadius: 14, boxShadow: hardShadow(3), padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <div>
              <div style={{ fontFamily: NB.fontMono, fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>Timeline</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>~16 weeks</div>
            </div>
          </div>
        </div>

        {/* Calorie target card — only shown when real data collected */}
        {dailyCalorieTarget && (
          <div style={{ ...nbCardStyle(NB.yellow, 4), border: `3px solid ${NB.white}`, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: NB.ink, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Your nutrition target</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 32, color: NB.ink, lineHeight: 1 }}>{dailyCalorieTarget.toLocaleString()}</span>
              <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.ink, fontWeight: 700 }}>kcal / day</span>
            </div>
            <div style={{ fontSize: 13, color: NB.ink, lineHeight: 1.4 }}>
              We'll {goalCopy.verb} <strong>{dailyCalorieTarget.toLocaleString()} kcal</strong> — {goalCopy.detail}.
              {tdee && <span> Maintenance: {tdee.toLocaleString()} kcal.</span>}
            </div>
          </div>
        )}

        {/* Weekly schedule — one compact card (day strip + training list)
            instead of a row per day, so the avatar above has room to be big. */}
        {weeklyPlan && (
          <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Your weekly schedule</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {weeklyPlan.map(day => (
                <div key={day.dayId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', aspectRatio: '1', borderRadius: 9, border: `2px solid ${NB.ink}`, background: day.isTrainingDay ? NB.teal : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {day.isTrainingDay && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>}
                  </div>
                  <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink }}>{DAY_INITIALS[day.dayIndex]}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: NB.ink, fontWeight: 700, lineHeight: 1.5 }}>
              {trainingDays.length} training day{trainingDays.length !== 1 ? 's' : ''}
              {trainingDays.length > 0 && <>: {trainingDays.map(d => `${DAY_LABELS[d.dayIndex].slice(0, 3)} ${d.label}`).join(' · ')}</>}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 22px 26px', flexShrink: 0 }}>
        <button
          onClick={onContinue}
          style={{
            width: '100%', height: 56, border: NB_BORDER,
            background: NB.magenta, color: NB.white,
            fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase',
            boxShadow: hardShadow(5),
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}
        >
          Let's go
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
    </>
  )
}
