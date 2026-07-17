import React, { useMemo, useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import MuscleSVG from '../components/MuscleSVG'
import { getMuscleRankInfo, MUSCLE_RANK_MIN_WORKOUTS } from '../utils/gamification'
import { MUSCLE_LABELS } from '../utils/muscleLabels'
import { buildMuscleIntensityColors, MUSCLE_TO_GROUP } from '../utils/muscleIntensity'
import { countsByGroup, buildIntensityRankColors } from '../utils/muscleRankColors'
import RankLadder from '../components/RankLadder'
import { renderIcon, TrophyIcon } from '../components/Icons'
import { toDisplayWeight, weightUnitLabel } from '../utils/units'
import { NB, NB_BORDER, hardShadow, NB_INTENSITY_RAMP, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m === 0) return `${sec}s`
  return `${m}m ${sec > 0 ? sec + 's' : ''}`.trim()
}

export default function WorkoutComplete({ sessionData, gamification, userProfile, isProUser = false, onNavigate }) {
  const units = userProfile?.units
  const exercises = sessionData?.exercises ?? []
  const label     = sessionData?.workoutLabel ?? 'Workout'
  const elapsed   = sessionData?.elapsed ?? 0
  const xp        = sessionData?.xpEarned ?? 50
  const gems      = sessionData?.gemsEarned ?? 30
  const streak    = sessionData?.streak ?? gamification?.workoutStreak ?? 1

  // MissVfit Pro perk: color worked muscles by their real rank tier instead
  // of a flat "shiny" gradient — falls back to plain intensity coloring for
  // non-Pro users, or Pro users who haven't unlocked body-part ranks yet.
  const useRankColors = isProUser && (gamification?.totalWorkouts || 0) >= MUSCLE_RANK_MIN_WORKOUTS
  const sessionCounts = useMemo(() => countsByGroup(exercises, MUSCLE_TO_GROUP), [exercises])
  // Single-session counts skip level 1 (reserved for Muscle Map's low-volume
  // week/month view) so anything worked this session reads as at least a
  // visible "Moderate" shade, not a barely-tinted one.
  const sessionCountToLevel = count => count >= 3 ? 4 : count === 2 ? 3 : count === 1 ? 2 : 0
  const frontColors = useMemo(() => useRankColors
    ? buildIntensityRankColors(sessionCounts, gamification, 'front', sessionCountToLevel)
    : buildMuscleIntensityColors(exercises, 'front', false), [sessionCounts, gamification, useRankColors, exercises])
  const backColors = useMemo(() => useRankColors
    ? buildIntensityRankColors(sessionCounts, gamification, 'back', sessionCountToLevel)
    : buildMuscleIntensityColors(exercises, 'back', false), [sessionCounts, gamification, useRankColors, exercises])

  const hasColors = Object.keys(frontColors).length + Object.keys(backColors).length > 0

  const [ladderMuscle, setLadderMuscle] = useState(null)
  const muscleGateOpen = (gamification?.totalWorkouts || 0) >= MUSCLE_RANK_MIN_WORKOUTS
  const gainedMuscles  = Object.keys(sessionData?.muscleGains || {})

  // New personal records from this session — { exerciseId: weight } set live
  // in WorkoutActive as sets are logged; recapped here.
  const newPRs = sessionData?.newPRs || {}
  const prEntries = Object.entries(newPRs).map(([id, weight]) => ({
    id, weight, name: exercises.find(e => e.id === id)?.name || id,
  }))

  return (
    <>
      <StatusBar />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>

        {/* Celebration header */}
        <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1, marginBottom: 6 }}>
            Workout Complete!
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>
            {label.replace(/^Day \d+ — /, '')} · {fmt(elapsed)}
          </div>
        </div>

        {/* New Personal Records */}
        {prEntries.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <TrophyIcon size={13} /> New Personal Records
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prEntries.map(pr => (
                <div key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', borderRadius: 14, background: NB.yellow }}>
                  <TrophyIcon size={18} />
                  <span style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, flex: 1 }}>{pr.name}</span>
                  <span style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 800, color: NB.ink }}>{toDisplayWeight(pr.weight, units)}{weightUnitLabel(units)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <RewardCard icon="⚡" value={`+${xp}`} label="XP Earned" bg={NB.lavender} />
          <RewardCard icon="💎" value={`+${gems}`} label="Gems" bg={NB.blue} />
          <RewardCard icon="🔥" value={streak} label="Day Streak" bg={NB.orange} />
        </div>

        {/* XP Progress bar */}
        <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 18, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Level {gamification?.level ?? 1}</span>
            <span style={{ fontFamily: NB.fontMono, fontSize: 12, color: '#555' }}>{gamification?.xp ?? 0} XP</span>
          </div>
          <div style={{ height: 10, border: `2px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: NB.green, width: `${Math.min(((gamification?.xp ?? 0) % 500) / 5, 100)}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* Muscles worked */}
        {hasColors && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Muscles Worked
            </div>
            <div style={{ ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 18, overflow: 'hidden', padding: '10px 10px 6px', display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
                <MuscleSVG key="front-done" url="/muscle_map_front.svg" muscleColors={frontColors} />
              </div>
              <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
                <MuscleSVG key="back-done" url="/muscle_map_back.svg" muscleColors={backColors} />
              </div>
            </div>
            {useRankColors ? (
              <div style={{ textAlign: 'center', marginTop: 8, fontFamily: NB.fontMono, fontSize: 11, color: '#555', fontWeight: 700 }}>
                Colored by each muscle's current rank tier
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[[NB_INTENSITY_RAMP[1],'Light'],[NB_INTENSITY_RAMP[3],'Moderate'],[NB_INTENSITY_RAMP[4],'High']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, border: `1.5px solid ${NB.ink}`, background: c }} />
                    <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555', fontWeight: 700 }}>{l}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Muscle Progress */}
        {muscleGateOpen && gainedMuscles.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Muscle Progress
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gainedMuscles.map(muscleId => {
                const info = getMuscleRankInfo(gamification, muscleId)
                const gained = sessionData.muscleGains[muscleId]
                const rankedUp = (sessionData.muscleRankUps || []).some(r => r.muscleId === muscleId)
                return (
                  <button key={muscleId} onClick={() => setLadderMuscle(muscleId)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: 'none', borderRadius: 14,
                    background: info.tier.bgGradient || info.tier.bg, cursor: 'pointer', textAlign: 'left',
                  }}>
                    <img src={info.tier.image} alt="" style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }} />
                    <span style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: info.tier.color, flex: 1 }}>{MUSCLE_LABELS[muscleId] || muscleId}</span>
                    {rankedUp && <TrophyIcon size={13} />}
                    <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: info.tier.color, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 7, padding: '2px 8px' }}>{info.tier.label}{info.subLevelLabel ? ` ${info.subLevelLabel}` : ''}</span>
                    <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: info.tier.color, fontWeight: 700 }}>+{gained}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats summary */}
        <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 18, padding: '14px 16px', marginBottom: 24, display: 'flex', gap: 0 }}>
          <StatItem value={exercises.length} label="Exercises" />
          <Divider />
          <StatItem value={sessionData?.setsCompleted ?? 0} label="Sets Done" />
          <Divider />
          <StatItem value={fmt(elapsed)} label="Duration" />
        </div>

        {/* Buttons */}
        <button
          onClick={() => onNavigate('workoutPost')}
          style={{ width: '100%', padding: '15px', border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12 }}
        >
          Share Workout
        </button>
        <button
          onClick={() => onNavigate('home')}
          style={{ width: '100%', padding: '15px', border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Back to Home
        </button>

      </div>

      {ladderMuscle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setLadderMuscle(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} />
          <div style={{ position: 'relative', background: NB.white, borderTop: NB_BORDER, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: `0 -6px 0 ${NB.ink}`, padding: '0 20px 24px', zIndex: 1, maxHeight: '78%', overflowY: 'auto' }}>
            <div style={{ width: 38, height: 5, background: NB.ink, margin: '14px auto 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 19, textTransform: 'uppercase', color: NB.ink }}>{MUSCLE_LABELS[ladderMuscle] || ladderMuscle} Rank</span>
              <button onClick={() => setLadderMuscle(null)} style={{ width: 32, height: 32, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.white, cursor: 'pointer', color: NB.ink, fontWeight: 800 }}>✕</button>
            </div>
            <RankLadder {...getMuscleRankInfo(gamification, ladderMuscle)} />
          </div>
        </div>
      )}
    </>
  )
}

function RewardCard({ icon, value, label, bg }) {
  return (
    <div style={{ flex: 1, ...nbCardStyle(bg, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
      <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}>{renderIcon(icon, 24)}</div>
      <div style={{ fontFamily: NB.fontDisplay, fontSize: 22, color: NB.ink, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: NB.ink }}>{label}</div>
    </div>
  )
}

function StatItem({ value, label }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '4px 0' }}>
      <div style={{ fontFamily: NB.fontDisplay, fontSize: 22, color: NB.ink, fontWeight: 900, lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 2, background: NB.ink, alignSelf: 'stretch', margin: '4px 0' }} />
}
