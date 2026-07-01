import React, { useState, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'

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

const VOLUME_COLORS = [null, '#4ADE80', '#FFAA30', '#FF5A2F', '#FF3B3B']

const LEGEND = [
  { color: '#4ADE80', label: 'Light' },
  { color: '#FFAA30', label: 'Moderate' },
  { color: '#FF5A2F', label: 'High' },
  { color: '#FF3B3B', label: 'Max' },
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
  const selectedColor = selectedGroup ? (VOLUME_COLORS[selectedGroup.volume] || '#8478A0') : null

  return (
    <>
      <StatusBar />

      <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#2E1065' }}>Muscle Map</div>
          <div style={{ fontSize: 12, color: '#8478A0', marginTop: 2 }}>Training volume this {period}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['week', 'month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: 12,
              background: period === p ? '#7C3AED' : '#fff',
              border: `1.5px solid ${period === p ? '#7C3AED' : '#EDE4F8'}`,
              fontSize: 12, fontWeight: 700,
              color: period === p ? '#fff' : '#8478A0',
              cursor: 'pointer',
            }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 0' }}>

        {/* Front / Back toggle */}
        <div style={{ display: 'flex', background: '#F0E8FF', borderRadius: 14, padding: 3, marginBottom: 12 }}>
          {['front', 'back'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, padding: '7px 0', borderRadius: 11,
              background: view === v ? '#7C3AED' : 'transparent',
              border: 'none', fontSize: 13, fontWeight: 700,
              color: view === v ? '#fff' : '#8478A0',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* SVG body diagram */}
        <div style={{ width: '100%', aspectRatio: '9/16', borderRadius: 20, overflow: 'hidden', background: '#F8F4FF', marginBottom: 12, border: '1.5px solid #EDE4F8' }}>
          {view === 'front'
            ? <MuscleSVG key="front" url="/muscle_map_front.svg" muscleColors={FRONT_COLORS} />
            : <MuscleSVG key="back"  url="/muscle_map_back.svg"  muscleColors={BACK_COLORS} />
          }
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
              <span style={{ fontSize: 11, color: '#8478A0', fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Muscle chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
          {MUSCLE_GROUPS.map(m => {
            const color = VOLUME_COLORS[m.volume] || '#8478A0'
            const isSelected = selected === m.id
            return (
              <button key={m.id} onClick={() => setSelected(isSelected ? null : m.id)} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 20,
                background: isSelected ? color + '22' : '#fff',
                border: `2px solid ${isSelected ? color : '#EDE4F8'}`,
                fontSize: 12, fontWeight: 700,
                color: isSelected ? color : '#8478A0',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Detail card */}
        {selectedGroup && (
          <div style={{ borderRadius: 20, background: '#fff', border: `1.5px solid ${selectedColor}55`, padding: '16px', marginBottom: 16, boxShadow: `0 8px 24px ${selectedColor}22` }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#2E1065', marginBottom: 6 }}>{selectedGroup.label} — this {period}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F0E8FF', overflow: 'hidden' }}>
                <div style={{ width: `${(selectedGroup.volume / 4) * 100}%`, height: '100%', background: selectedColor, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: selectedColor }}>{selectedGroup.volume}/4</span>
            </div>
            <p style={{ fontSize: 12, color: '#8478A0', margin: '10px 0 0', lineHeight: 1.5 }}>
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
        <div style={{ borderRadius: 16, background: 'linear-gradient(135deg,#FDF2FF,#F3E8FF)', padding: '14px 16px', border: '1.5px solid #EBD9FA', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED' }}>Recovery tip</span>
          </div>
          <p style={{ fontSize: 13, color: '#5B3D8A', margin: 0, lineHeight: 1.4 }}>
            Glutes and legs are at max volume this week. Consider adding a rest day before your next leg session.
          </p>
        </div>

      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />
    </>
  )
}
