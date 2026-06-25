import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { BodyOutline } from '../components/AvatarSilhouette'

const MUSCLE_GROUPS = [
  { id: 'glutes', label: 'Glutes', volume: 4, color: '#FF3B3B' },
  { id: 'legs', label: 'Legs', volume: 3, color: '#FF5A2F' },
  { id: 'core', label: 'Core', volume: 2, color: '#FFAA30' },
  { id: 'chest', label: 'Chest', volume: 1, color: '#4ADE80' },
  { id: 'shoulders', label: 'Shoulders', volume: 1, color: '#4ADE80' },
  { id: 'arms', label: 'Arms', volume: 2, color: '#FFAA30' },
  { id: 'calves', label: 'Calves', volume: 1, color: '#4ADE80' },
]

const VOLUME_COLORS = {
  0: '#2A1F3D',
  1: '#4ADE80',
  2: '#FFAA30',
  3: '#FF5A2F',
  4: '#FF3B3B',
}

const LEGEND = [
  { color: '#4ADE80', label: 'Light' },
  { color: '#FFAA30', label: 'Moderate' },
  { color: '#FF5A2F', label: 'High' },
  { color: '#FF3B3B', label: 'Max' },
]

export default function MuscleMap({ onNavigate }) {
  const [period, setPeriod] = useState('week')

  const muscleColors = MUSCLE_GROUPS.reduce((acc, m) => {
    acc[m.id] = m.color
    return acc
  }, {})

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#2E1065' }}>Muscle Map</div>
          <div style={{ fontSize: 12, color: '#8478A0', marginTop: 2 }}>Training volume this week</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['week', 'month'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 12,
                background: period === p ? '#7C3AED' : '#fff',
                border: `1.5px solid ${period === p ? '#7C3AED' : '#EDE4F8'}`,
                fontSize: 12, fontWeight: 700,
                color: period === p ? '#fff' : '#8478A0',
                cursor: 'pointer',
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 0' }}>
        {/* Body map */}
        <div style={{
          borderRadius: 24, background: '#1E1430',
          padding: '20px 16px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          marginBottom: 16,
          boxShadow: '0 12px 30px rgba(46,16,101,.3)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#C9B7E8', letterSpacing: '.6px', marginBottom: 12 }}>FRONT VIEW</div>
          <BodyOutline muscleColors={muscleColors} height={240} />

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            {LEGEND.map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }}></div>
                <span style={{ fontSize: 11, color: '#C9B7E8', fontWeight: 600 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Muscle group list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#2E1065', marginBottom: 2 }}>Volume breakdown</div>
          {MUSCLE_GROUPS.map(m => (
            <div key={m.id} style={{ background: '#fff', borderRadius: 16, padding: '12px 16px', boxShadow: '0 4px 12px rgba(76,36,120,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#2E1065' }}>{m.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: m.color }}>{m.volume} sessions</span>
              </div>
              <div style={{ height: 7, borderRadius: 4, background: '#F0E8FF', overflow: 'hidden' }}>
                <div style={{ width: `${(m.volume / 4) * 100}%`, height: '100%', background: m.color, borderRadius: 4, transition: 'width 0.4s' }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
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
