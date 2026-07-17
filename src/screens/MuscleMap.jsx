import React, { useState, useEffect, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { fetchWorkoutHistory } from '../lib/social'
import { GROUP_LABELS, groupOf } from '../utils/muscleGroups'
import { RANKS, getMuscleRankInfo, MUSCLE_RANK_MIN_WORKOUTS } from '../utils/gamification'
import { bestGroupRankInfo, buildRankColors, buildIntensityRankColors, tierForGroup } from '../utils/muscleRankColors'
import { NB, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW, NB_PRO_GRADIENT } from '../styles/neoBrutalism'
import { LockIcon, CrownIcon } from '../components/Icons'

// Intensity levels used for the neutral (tier-less) legend swatches — the
// real per-muscle color always comes from that muscle's own rank tier
// (bronze glutes glow pale-to-rich bronze, platinum core pale-to-rich
// platinum, etc.), so the legend can't show one fixed color per level.
const LEGEND_LEVELS = [
  { level: 1, label: 'Light' },
  { level: 2, label: 'Moderate' },
  { level: 3, label: 'High' },
  { level: 4, label: 'Max' },
]

// Exercise-count → 0–4 volume scale. Week thresholds are tighter than month.
function countToVolume(count, period) {
  const t = period === 'week' ? [1, 3, 5, 8] : [2, 6, 12, 20]
  if (count >= t[3]) return 4
  if (count >= t[2]) return 3
  if (count >= t[1]) return 2
  if (count >= t[0]) return 1
  return 0
}

function buildVolumes(history, period) {
  const days = period === 'week' ? 7 : 30
  const cutoff = Date.now() - days * 86400000
  const counts = {}
  history.forEach(session => {
    if (new Date(session.completed_at).getTime() < cutoff) return
    ;(session.exercises || []).forEach(ex => {
      ;(ex.muscles?.primary || []).forEach(m => {
        const g = groupOf(m)
        if (g) counts[g] = (counts[g] || 0) + 1
      })
    })
  })
  return Object.keys(GROUP_LABELS).map(id => ({
    id,
    label: GROUP_LABELS[id],
    count: counts[id] || 0,
    volume: countToVolume(counts[id] || 0, period),
  }))
}

function recoveryTip(groups, period) {
  const maxed = groups.filter(g => g.volume >= 4).map(g => g.label)
  const idle  = groups.filter(g => g.volume === 0).map(g => g.label)
  if (maxed.length > 0) {
    return `${maxed.join(' and ')} ${maxed.length > 1 ? 'are' : 'is'} at max volume this ${period}. Consider a rest day before training ${maxed.length > 1 ? 'them' : 'it'} again.`
  }
  const trained = groups.filter(g => g.volume > 0)
  if (trained.length === 0) {
    return `No workouts logged this ${period} yet — complete a workout and your muscle map will light up.`
  }
  if (idle.length > 0 && idle.length <= 3) {
    return `Nice balance so far. ${idle.join(', ')} ${idle.length > 1 ? "haven't" : "hasn't"} been trained this ${period} — worth a look for your next session.`
  }
  return `Training volume looks balanced this ${period}. Keep recovery in mind as you add sessions.`
}

export default function MuscleMap({ session, gamification = {}, isProUser = false, onNavigate }) {
  const [period, setPeriod] = useState('week')
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('front')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [rankSheetOpen, setRankSheetOpen] = useState(false)
  const [rankSelected, setRankSelected] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return }
    fetchWorkoutHistory(session.user.id, 90).then(data => {
      setHistory(data)
      setLoading(false)
    })
  }, [session])

  const groups = useMemo(() => buildVolumes(history, period), [history, period])
  const counts = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g.count])), [groups])
  const frontColors = useMemo(() => buildIntensityRankColors(counts, gamification, 'front', c => countToVolume(c, period)), [counts, gamification, period])
  const backColors  = useMemo(() => buildIntensityRankColors(counts, gamification, 'back',  c => countToVolume(c, period)), [counts, gamification, period])
  const rankFrontColors = useMemo(() => buildRankColors(gamification, 'front'), [gamification])
  const rankBackColors  = useMemo(() => buildRankColors(gamification, 'back'), [gamification])

  const ranksUnlocked = (gamification.totalWorkouts || 0) >= MUSCLE_RANK_MIN_WORKOUTS

  const selectedGroup = groups.find(g => g.id === selected)
  const selectedTier = selectedGroup ? tierForGroup(gamification, selectedGroup.id) : null
  const selectedColor = selectedGroup && selectedGroup.volume > 0 ? (selectedTier?.bgGradient || selectedTier?.bg) : null
  const rankSelectedInfo = rankSelected ? bestGroupRankInfo(gamification, rankSelected) : null
  const rankSelectedLabel = GROUP_LABELS[rankSelected]

  return (
    <>
      <StatusBar />

      <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: NB.ink }}>Muscle Map</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Training volume this {period}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['week', 'month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', border: `2px solid ${NB.ink}`, borderRadius: 10,
              background: period === p ? NB.teal : NB.white,
              fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              color: NB.ink,
              cursor: 'pointer',
            }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 0' }}>

        {/* Front / Back toggle + Rank colors button */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, display: 'flex', border: `2px solid ${NB.ink}`, borderRadius: 12, overflow: 'hidden' }}>
            {['front', 'back'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                flex: 1, padding: '8px 0',
                background: view === v ? NB.magenta : NB.white,
                border: 'none', fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase',
                color: view === v ? NB.white : NB.ink,
                cursor: 'pointer',
              }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => isProUser ? setRankSheetOpen(true) : onNavigate('proUpsell')}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px',
              border: `2px solid ${NB.ink}`, borderRadius: 12,
              background: isProUser ? NB_PRO_GRADIENT : NB.white,
              fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, textTransform: 'uppercase',
              color: isProUser ? NB.white : NB.ink, cursor: 'pointer',
            }}
          >
            {!isProUser && <LockIcon size={11} />} Rank colors
          </button>
        </div>

        {/* SVG body diagram */}
        <div style={{ width: '100%', aspectRatio: '9/16', overflow: 'hidden', marginBottom: 14, ...nbCardStyle(NB.cream, 4), border: `3px solid ${NB.white}`, borderRadius: 18, position: 'relative' }}>
          {view === 'front'
            ? <MuscleSVG key={`front-${period}`} url="/muscle_map_front.svg" muscleColors={frontColors} />
            : <MuscleSVG key={`back-${period}`}  url="/muscle_map_back.svg"  muscleColors={backColors} />
          }
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)' }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, color: NB.ink }}>Loading…</span>
            </div>
          )}
        </div>

        {/* Legend — intensity is shown as shade, not a fixed color per level;
            each muscle chip below already carries its own rank-tier hue. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#777', fontWeight: 600 }}>Shade = intensity, color = rank:</span>
          {LEGEND_LEVELS.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: NB.ink, opacity: 0.2 + l.level * 0.2 }} />
              <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Muscle chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 14, scrollbarWidth: 'none' }}>
          {groups.map(m => {
            const tier = tierForGroup(gamification, m.id)
            const tierColor = tier.bgGradient || tier.bg
            const shade = m.volume > 0 ? 0.35 + m.volume * 0.1625 : 0.3
            const isSelected = selected === m.id
            return (
              <button key={m.id} onClick={() => setSelected(isSelected ? null : m.id)} style={{
                flexShrink: 0, padding: '8px 14px', border: `2px solid ${NB.ink}`, borderRadius: 10,
                background: isSelected ? tierColor : NB.white,
                fontSize: 12, fontWeight: 700,
                color: NB.ink,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: tierColor, opacity: shade, border: `1.5px solid ${NB.ink}` }} />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Detail card */}
        {selectedGroup && (
          <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: NB.ink, marginBottom: 8 }}>{selectedGroup.label} — this {period}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 10, borderRadius: 5, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
                <div style={{ width: `${(selectedGroup.volume / 4) * 100}%`, height: '100%', background: selectedColor || 'transparent' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{selectedGroup.volume}/4</span>
            </div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#666', marginTop: 8 }}>
              {selectedGroup.count} exercise{selectedGroup.count === 1 ? '' : 's'} logged
            </div>
            <p style={{ fontSize: 12, color: '#555', margin: '10px 0 0', lineHeight: 1.5 }}>
              {selectedGroup.volume >= 4
                ? `${selectedGroup.label} are at max volume. Rest before your next session targeting this group.`
                : selectedGroup.volume >= 3
                ? `${selectedGroup.label} are at high volume. A light stretch day would help recovery.`
                : selectedGroup.volume >= 2
                ? `${selectedGroup.label} are at moderate volume — good balance this ${period}.`
                : selectedGroup.volume >= 1
                ? `${selectedGroup.label} are lightly worked this ${period}. Room to add more if desired.`
                : `${selectedGroup.label} haven't been trained this ${period} yet.`}
            </p>
          </div>
        )}

        {/* Recovery tip */}
        <div style={{ ...nbCardStyle(NB.yellow, 3), border: `3px solid ${NB.white}`, padding: '14px 16px', borderRadius: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <span style={{ fontSize: 12, fontWeight: 800, color: NB.ink, textTransform: 'uppercase' }}>Recovery tip</span>
          </div>
          <p style={{ fontSize: 13, color: NB.ink, margin: 0, lineHeight: 1.4 }}>
            {recoveryTip(groups, period)}
          </p>
        </div>

      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />

      {/* Pro perk: per-body-part rank colors, tucked away in a sheet instead
          of permanently cluttering the main screen with a 9-tier legend. */}
      <BottomSheet open={rankSheetOpen} onClose={() => { setRankSheetOpen(false); setRankSelected(null) }} title="Rank colors">
        <div style={{ width: '100%', aspectRatio: '9/16', overflow: 'hidden', marginBottom: 14, ...nbCardStyle(NB.cream, 4), border: `3px solid ${NB.white}`, borderRadius: 18 }}>
          <MuscleSVG url={`/muscle_map_${view}.svg`} muscleColors={view === 'front' ? rankFrontColors : rankBackColors} />
        </div>

        {!ranksUnlocked ? (
          <div style={{ ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: NB.ink, display: 'flex', alignItems: 'center', gap: 5 }}><LockIcon size={13} /> Unlock body-part ranks</span>
              <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: NB.ink }}>{Math.min(gamification.totalWorkouts || 0, MUSCLE_RANK_MIN_WORKOUTS)} / {MUSCLE_RANK_MIN_WORKOUTS}</span>
            </div>
            <div style={{ height: 10, border: `2px solid ${NB.ink}`, borderRadius: 6, background: NB.white, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, ((gamification.totalWorkouts || 0) / MUSCLE_RANK_MIN_WORKOUTS) * 100)}%`, height: '100%', background: NB.magenta }} />
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
              {Math.max(0, MUSCLE_RANK_MIN_WORKOUTS - (gamification.totalWorkouts || 0))} more workout{MUSCLE_RANK_MIN_WORKOUTS - (gamification.totalWorkouts || 0) === 1 ? '' : 's'} to go.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
              {Object.keys(GROUP_LABELS).map(id => {
                const info = bestGroupRankInfo(gamification, id)
                const color = info ? (info.tier.bgGradient || info.tier.bg) : '#eee'
                const isSelected = rankSelected === id
                return (
                  <button key={id} onClick={() => setRankSelected(isSelected ? null : id)} style={{
                    flexShrink: 0, padding: '8px 14px', border: `2px solid ${NB.ink}`, borderRadius: 10,
                    background: isSelected ? color : NB.white,
                    fontSize: 12, fontWeight: 700, color: NB.ink, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: color, border: `1.5px solid ${NB.ink}` }} />
                    {GROUP_LABELS[id]}
                  </button>
                )
              })}
            </div>

            {rankSelected && (
              <div style={{ ...nbCardStyle(rankSelectedInfo ? (rankSelectedInfo.tier.bgGradient || rankSelectedInfo.tier.bg) : NB.lavenderMist, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px', marginBottom: 4 }}>
                {rankSelectedInfo ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={rankSelectedInfo.tier.image} alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />
                      <div>
                        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: rankSelectedInfo.tier.color }}>
                          {rankSelectedInfo.tier.label}{rankSelectedInfo.subLevelLabel ? ` ${rankSelectedInfo.subLevelLabel}` : ''}
                        </div>
                        <div style={{ fontSize: 12, color: rankSelectedInfo.tier.color === '#fff' ? 'rgba(255,255,255,.85)' : NB.ink, fontWeight: 700 }}>{rankSelectedLabel}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: rankSelectedInfo.tier.color === '#fff' ? '#fff' : NB.ink, margin: '10px 0 0', lineHeight: 1.5 }}>
                      {rankSelectedInfo.isTop ? `${rankSelectedInfo.rankPoints} pts — top tier reached!` : `${rankSelectedInfo.rankPoints}/100 pts to the next sub-level.`}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: NB.ink, margin: 0, lineHeight: 1.5 }}>{rankSelectedLabel} hasn't earned a rank yet — train it to get started.</p>
                )}
              </div>
            )}

            {/* 9-tier legend lives here, in the sheet, instead of the main screen */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              {RANKS.map(tier => (
                <div key={tier.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: tier.bgGradient || tier.bg }} />
                  <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{tier.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </BottomSheet>
    </>
  )
}
