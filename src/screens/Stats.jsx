import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'

const WEEKLY_DATA = [
  { day: 'Mon', workouts: 1, volume: 2400 },
  { day: 'Tue', workouts: 1, volume: 3100 },
  { day: 'Wed', workouts: 0, volume: 0 },
  { day: 'Thu', workouts: 1, volume: 2800 },
  { day: 'Fri', workouts: 0, volume: 0 },
  { day: 'Sat', workouts: 0, volume: 0 },
  { day: 'Sun', workouts: 0, volume: 0 },
]

const MUSCLE_VOLUME = [
  { name: 'Glutes', volume: 12, max: 15, color: '#7C3AED' },
  { name: 'Quads', volume: 10, max: 15, color: '#A855F7' },
  { name: 'Hamstrings', volume: 8, max: 15, color: '#C77DFF' },
  { name: 'Core', volume: 6, max: 15, color: '#DDB4FE' },
  { name: 'Upper body', volume: 4, max: 15, color: '#EDE4F8' },
]

const PROGRESS_DATA = [30, 45, 42, 58, 62, 71, 68, 80, 85, 92, 88, 95]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Stats({ onNavigate }) {
  const [period, setPeriod] = useState('week')
  const maxVol = Math.max(...WEEKLY_DATA.map(d => d.volume), 1)

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '8px 22px 0', flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#2E1065' }}>Your Stats</div>
        <div style={{ fontSize: 12, color: '#8478A0', marginTop: 2 }}>Foundation phase · Week 2</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 0' }}>
        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total workouts', value: '24', sub: '+3 this week', color: '#7C3AED', bg: '#F3E8FF' },
            { label: 'Total volume', value: '8,300kg', sub: 'lifted', color: '#2E1065', bg: '#fff' },
          ].map((card, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 20, background: card.bg, padding: '14px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', border: i === 0 ? '2px solid #EDE4F8' : '2px solid #EDE4F8' }}>
              <div style={{ fontSize: 11, color: '#8478A0', fontWeight: 600, marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#A99BC4', marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['week', 'month', 'all'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1, height: 36, borderRadius: 12,
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

        {/* Workout frequency chart */}
        <div style={{ borderRadius: 20, background: '#fff', padding: '16px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#2E1065', marginBottom: 14 }}>Workout frequency</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
            {WEEKLY_DATA.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: d.volume > 0 ? `${(d.volume / maxVol) * 64}px` : '4px', minHeight: 4, background: d.volume > 0 ? '#7C3AED' : '#EDE4F8', borderRadius: '4px 4px 0 0', transition: 'height 0.4s' }}></div>
                <span style={{ fontSize: 9, color: d.volume > 0 ? '#7C3AED' : '#C4B0E0', fontWeight: 700 }}>{d.day.slice(0,1)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#A99BC4' }}>3 sessions this week</span>
            <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 700 }}>8,300 kg total</span>
          </div>
        </div>

        {/* Muscle volume breakdown */}
        <div style={{ borderRadius: 20, background: '#fff', padding: '16px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#2E1065', marginBottom: 12 }}>Volume by muscle group</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MUSCLE_VOLUME.map(m => (
              <div key={m.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2E1065' }}>{m.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.volume} sets</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#F0E8FF', overflow: 'hidden' }}>
                  <div style={{ width: `${(m.volume / m.max) * 100}%`, height: '100%', background: m.color, borderRadius: 3, transition: 'width 0.4s' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress over time */}
        <div style={{ borderRadius: 20, background: '#fff', padding: '16px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#2E1065', marginBottom: 14 }}>Progress over time</div>
          <div style={{ height: 80, position: 'relative' }}>
            {/* Simple CSS line chart using SVG */}
            <svg width="100%" height="80" viewBox="0 0 320 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02"/>
                </linearGradient>
              </defs>
              {/* Filled area */}
              <path
                d={`M ${PROGRESS_DATA.map((v, i) => `${(i / (PROGRESS_DATA.length - 1)) * 320},${80 - (v / 100) * 70}`).join(' L ')} L 320,80 L 0,80 Z`}
                fill="url(#lineGrad)"
              />
              {/* Line */}
              <polyline
                points={PROGRESS_DATA.map((v, i) => `${(i / (PROGRESS_DATA.length - 1)) * 320},${80 - (v / 100) * 70}`).join(' ')}
                fill="none"
                stroke="#7C3AED"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Last point dot */}
              <circle
                cx={320}
                cy={80 - (PROGRESS_DATA[PROGRESS_DATA.length - 1] / 100) * 70}
                r="4"
                fill="#7C3AED"
              />
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#C4B0E0' }}>Jan</span>
            <span style={{ fontSize: 10, color: '#C4B0E0' }}>Jun</span>
            <span style={{ fontSize: 10, color: '#7C3AED', fontWeight: 700 }}>Now</span>
          </div>
        </div>
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </>
  )
}
