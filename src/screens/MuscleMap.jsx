import React, { useState, useEffect, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { fetchWorkoutHistory } from '../lib/social'
import { GROUP_LABELS, groupOf } from '../utils/muscleGroups'
import { NB, NB_INTENSITY_RAMP, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

const VOLUME_COLORS = [null, NB_INTENSITY_RAMP[1], NB_INTENSITY_RAMP[2], NB_INTENSITY_RAMP[3], NB_INTENSITY_RAMP[4]]

const LEGEND = [
  { color: NB_INTENSITY_RAMP[1], label: 'Light' },
  { color: NB_INTENSITY_RAMP[2], label: 'Moderate' },
  { color: NB_INTENSITY_RAMP[3], label: 'High' },
  { color: NB_INTENSITY_RAMP[4], label: 'Max' },
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

function buildColors(groups, side) {
  const colors = {}
  groups.forEach(({ id, volume }) => {
    const color = VOLUME_COLORS[volume]
    if (!color) return
    MUSCLE_SVG_IDS[id]?.[side]?.forEach(svgId => { colors[svgId] = color })
  })
  return colors
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

export default function MuscleMap({ session, onNavigate }) {
  const [period, setPeriod] = useState('week')
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('front')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return }
    fetchWorkoutHistory(session.user.id, 90).then(data => {
      setHistory(data)
      setLoading(false)
    })
  }, [session])

  const groups      = useMemo(() => buildVolumes(history, period), [history, period])
  const frontColors = useMemo(() => buildColors(groups, 'front'), [groups])
  const backColors  = useMemo(() => buildColors(groups, 'back'), [groups])

  const selectedGroup = groups.find(g => g.id === selected)
  const selectedColor = selectedGroup ? (VOLUME_COLORS[selectedGroup.volume] || NB.ink) : null

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

        {/* Front / Back toggle */}
        <div style={{ display: 'flex', border: `2px solid ${NB.ink}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
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

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: l.color }} />
              <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Muscle chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 14, scrollbarWidth: 'none' }}>
          {groups.map(m => {
            const color = VOLUME_COLORS[m.volume] || NB.white
            const isSelected = selected === m.id
            return (
              <button key={m.id} onClick={() => setSelected(isSelected ? null : m.id)} style={{
                flexShrink: 0, padding: '8px 14px', border: `2px solid ${NB.ink}`, borderRadius: 10,
                background: isSelected ? color : NB.white,
                fontSize: 12, fontWeight: 700,
                color: NB.ink,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: color, border: `1.5px solid ${NB.ink}` }} />
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
    </>
  )
}
