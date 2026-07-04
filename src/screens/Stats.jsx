import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

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
  { name: 'Glutes', volume: 12, max: 15, color: NB.magenta },
  { name: 'Quads', volume: 10, max: 15, color: NB.teal },
  { name: 'Hamstrings', volume: 8, max: 15, color: NB.blue },
  { name: 'Core', volume: 6, max: 15, color: NB.yellow },
  { name: 'Upper body', volume: 4, max: 15, color: NB.pink },
]

const PROGRESS_DATA = [30, 45, 42, 58, 62, 71, 68, 80, 85, 92, 88, 95]

export default function Stats({ onNavigate }) {
  const [period, setPeriod] = useState('week')
  const maxVol = Math.max(...WEEKLY_DATA.map(d => d.volume), 1)

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '8px 22px 0', flexShrink: 0 }}>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: NB.ink }}>Your Stats</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Foundation phase · Week 2</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 0' }}>
        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total workouts', value: '24', sub: '+3 this week', bg: NB.teal },
            { label: 'Total volume', value: '8,300kg', sub: 'lifted', bg: NB.white },
          ].map((card, i) => (
            <div key={i} style={{ flex: 1, border: NB_BORDER, boxShadow: hardShadow(3), background: card.bg, padding: '14px' }}>
              <div style={{ fontSize: 11, color: NB.ink, fontWeight: 600, marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, color: NB.ink, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['week', 'month', 'all'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1, height: 38, border: `2px solid ${NB.ink}`,
                background: period === p ? NB.magenta : NB.white,
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                color: period === p ? NB.white : NB.ink,
                cursor: 'pointer',
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Workout frequency chart */}
        <div style={{ border: NB_BORDER, boxShadow: hardShadow(3), background: NB.white, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 14 }}>Workout frequency</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
            {WEEKLY_DATA.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: d.volume > 0 ? `${(d.volume / maxVol) * 64}px` : '4px', minHeight: 4, background: d.volume > 0 ? NB.teal : '#eee', border: d.volume > 0 ? `1.5px solid ${NB.ink}` : 'none', transition: 'height 0.4s' }}></div>
                <span style={{ fontFamily: NB.fontMono, fontSize: 9, color: NB.ink, fontWeight: 700 }}>{d.day.slice(0,1)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#555' }}>3 sessions this week</span>
            <span style={{ fontSize: 11, color: NB.ink, fontWeight: 700 }}>8,300 kg total</span>
          </div>
        </div>

        {/* Muscle volume breakdown */}
        <div style={{ border: NB_BORDER, boxShadow: hardShadow(3), background: NB.white, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 12 }}>Volume by muscle group</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MUSCLE_VOLUME.map(m => (
              <div key={m.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>{m.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>{m.volume} sets</span>
                </div>
                <div style={{ height: 8, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
                  <div style={{ width: `${(m.volume / m.max) * 100}%`, height: '100%', background: m.color, transition: 'width 0.4s' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress over time */}
        <div style={{ border: NB_BORDER, boxShadow: hardShadow(3), background: NB.white, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 14 }}>Progress over time</div>
          <div style={{ height: 80, position: 'relative' }}>
            <svg width="100%" height="80" viewBox="0 0 320 80" preserveAspectRatio="none">
              <polyline
                points={PROGRESS_DATA.map((v, i) => `${(i / (PROGRESS_DATA.length - 1)) * 320},${80 - (v / 100) * 70}`).join(' ')}
                fill="none"
                stroke={NB.ink}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={320}
                cy={80 - (PROGRESS_DATA[PROGRESS_DATA.length - 1] / 100) * 70}
                r="5"
                fill={NB.magenta}
                stroke={NB.ink}
                strokeWidth="2"
              />
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#777' }}>Jan</span>
            <span style={{ fontSize: 10, color: '#777' }}>Jun</span>
            <span style={{ fontSize: 10, color: NB.ink, fontWeight: 700 }}>Now</span>
          </div>
        </div>
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </>
  )
}
