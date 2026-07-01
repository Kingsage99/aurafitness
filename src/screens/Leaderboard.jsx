import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'

export default function Leaderboard({ onNavigate }) {
  return (
    <>
      <StatusBar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ width: 100, height: 100, borderRadius: 30, background: 'linear-gradient(135deg,#F59E0B18,#F59E0B30)', border: '1.5px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2 2 0 0 1 0-4H6M18 9h1.5a2 2 0 0 0 0-4H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z"/>
          </svg>
        </div>

        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: '#2E1065', marginBottom: 10 }}>
          Leaderboard
        </div>
        <div style={{ fontSize: 14, color: '#8478A0', lineHeight: 1.7, maxWidth: 260 }}>
          Challenge friends and climb the ranks — coming soon!
        </div>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
          {['🥇 Weekly Top Performer', '🔥 Longest Streak', '💪 Most Workouts'].map((item, i) => (
            <div key={i} style={{ borderRadius: 14, padding: '12px 16px', background: '#F8F4FF', border: '1.5px solid #EDE4F8', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, color: '#8478A0', fontWeight: 600 }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: '#B6A8CE' }}>More categories coming soon</div>
      </div>

      <BottomNav active="leaderboard" onNavigate={onNavigate} />
    </>
  )
}
