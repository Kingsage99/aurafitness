import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const MUSCLE_GROUPS = [
  { id: 'glutes',    label: 'Glutes',    volume: 4 },
  { id: 'legs',      label: 'Legs',      volume: 3 },
  { id: 'back',      label: 'Back',      volume: 2 },
  { id: 'core',      label: 'Core',      volume: 2 },
  { id: 'arms',      label: 'Arms',      volume: 2 },
  { id: 'shoulders', label: 'Shoulders', volume: 1 },
  { id: 'chest',     label: 'Chest',     volume: 1 },
  { id: 'calves',    label: 'Calves',    volume: 1 },
]

const VOLUME_COLORS = [null, '#FFD8A8', '#FF9E4A', '#FF6A2C', '#E5352B']

const LEGEND = [
  { color: '#FFD8A8', label: 'Light' },
  { color: '#FF9E4A', label: 'Moderate' },
  { color: '#FF6A2C', label: 'High' },
  { color: '#E5352B', label: 'Max' },
]

function buildColors(side) {
  const colors = {}
  MUSCLE_GROUPS.forEach(({ id, volume }) => {
    const color = VOLUME_COLORS[volume]
    if (!color) return
    MUSCLE_SVG_IDS[id]?.[side]?.forEach(svgId => { colors[svgId] = color })
  })
  return colors
}

const FRONT_COLORS = buildColors('front')
const BACK_COLORS  = buildColors('back')

export default function MuscleMap({ onNavigate }) {
  const [period, setPeriod] = useState('week')
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('front')

  const selectedGroup = MUSCLE_GROUPS.find(g => g.id === selected)
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
              padding: '6px 14px', border: `2px solid ${NB.ink}`,
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
        <div style={{ display: 'flex', border: `2px solid ${NB.ink}`, marginBottom: 14 }}>
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
        <div style={{ width: '100%', aspectRatio: '9/16', overflow: 'hidden', background: NB.cream, marginBottom: 14, border: NB_BORDER }}>
          {view === 'front'
            ? <MuscleSVG key="front" url="/muscle_map_front.svg" muscleColors={FRONT_COLORS} />
            : <MuscleSVG key="back"  url="/muscle_map_back.svg"  muscleColors={BACK_COLORS} />
          }
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 12, border: `1.5px solid ${NB.ink}`, background: l.color }} />
              <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Muscle chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 14, scrollbarWidth: 'none' }}>
          {MUSCLE_GROUPS.map(m => {
            const color = VOLUME_COLORS[m.volume] || NB.ink
            const isSelected = selected === m.id
            return (
              <button key={m.id} onClick={() => setSelected(isSelected ? null : m.id)} style={{
                flexShrink: 0, padding: '8px 14px', border: `2px solid ${NB.ink}`,
                background: isSelected ? color : NB.white,
                fontSize: 12, fontWeight: 700,
                color: NB.ink,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 9, height: 9, background: color, border: `1.5px solid ${NB.ink}` }} />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Detail card */}
        {selectedGroup && (
          <div style={{ border: `2.5px solid ${NB.ink}`, background: NB.white, boxShadow: hardShadow(3), padding: '16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: NB.ink, marginBottom: 8 }}>{selectedGroup.label} — this {period}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 10, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
                <div style={{ width: `${(selectedGroup.volume / 4) * 100}%`, height: '100%', background: selectedColor }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{selectedGroup.volume}/4</span>
            </div>
            <p style={{ fontSize: 12, color: '#555', margin: '10px 0 0', lineHeight: 1.5 }}>
              {selectedGroup.volume >= 4
                ? `${selectedGroup.label} are at max volume. Rest before your next session targeting this group.`
                : selectedGroup.volume >= 3
                ? `${selectedGroup.label} are at high volume. A light stretch day would help recovery.`
                : selectedGroup.volume >= 2
                ? `${selectedGroup.label} are at moderate volume — good balance this ${period}.`
                : `${selectedGroup.label} are lightly worked this ${period}. Room to add more if desired.`}
            </p>
          </div>
        )}

        {/* Recovery tip */}
        <div style={{ background: NB.yellow, padding: '14px 16px', border: NB_BORDER, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <span style={{ fontSize: 12, fontWeight: 800, color: NB.ink, textTransform: 'uppercase' }}>Recovery tip</span>
          </div>
          <p style={{ fontSize: 13, color: NB.ink, margin: 0, lineHeight: 1.4 }}>
            Glutes and legs are at max volume this week. Consider adding a rest day before your next leg session.
          </p>
        </div>

      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />
    </>
  )
}
