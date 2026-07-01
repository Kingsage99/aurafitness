import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { RANKS } from '../utils/gamification'

const FEED = [
  { name: 'Sofia', initial: 'S', color: '#7C3AED', action: 'just finished Lower Body Burn 🔥', time: '2m ago', likes: 8, comment: true },
  { name: 'Priya', initial: 'P', color: '#DB2777', action: 'hit a new PB — 60kg squat! 💪', time: '1h ago', likes: 14, comment: true },
  { name: 'Jess', initial: 'J', color: '#F59E0B', action: 'logged a 4th workout this week!', time: '3h ago', likes: 6, comment: false },
  { name: 'Amara', initial: 'A', color: '#059669', action: 'started Foundation phase 🌱', time: 'yesterday', likes: 11, comment: true },
  { name: 'Kezia', initial: 'K', color: '#6D28D9', action: 'hit her weekly goal 3 weeks in a row!', time: 'yesterday', likes: 19, comment: false },
]

const PLACEHOLDER_BOARD = [
  { name: 'Sofia',  workouts: 5, points: 420, rankId: 'gold'    },
  { name: 'Priya',  workouts: 4, points: 385, rankId: 'silver'  },
  { name: 'Amara',  workouts: 3, points: 290, rankId: 'silver'  },
  { name: 'Jess',   workouts: 2, points: 180, rankId: 'bronze'  },
]

export default function Squad({ gamification = {}, userProfile = {}, onNavigate }) {
  const [activeTab, setActiveTab] = useState('feed')
  const [liked, setLiked] = useState(new Set())

  const toggleLike = (i) => {
    setLiked(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '8px 22px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#2E1065' }}>Squad</div>
          <button style={{ width: 38, height: 38, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 6px 14px rgba(124,58,237,.3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#8478A0', marginTop: 2 }}>4 friends active this week</div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '12px 22px 0', display: 'flex', gap: 8, flexShrink: 0 }}>
        {[['feed', 'Activity feed'], ['leaderboard', 'Leaderboard']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              flex: 1, height: 40, borderRadius: 12,
              background: activeTab === id ? '#7C3AED' : '#fff',
              border: `1.5px solid ${activeTab === id ? '#7C3AED' : '#EDE4F8'}`,
              fontSize: 13, fontWeight: activeTab === id ? 800 : 700,
              color: activeTab === id ? '#fff' : '#8478A0',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 0' }}>
        {activeTab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEED.map((item, i) => (
              <div key={i} style={{ borderRadius: 20, background: '#fff', padding: '14px 16px', boxShadow: '0 4px 12px rgba(76,36,120,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{item.initial}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#2E1065' }}>{item.name} </span>
                    <span style={{ fontSize: 14, color: '#5B3D8A' }}>{item.action}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#A99BC4', flexShrink: 0 }}>{item.time}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => toggleLike(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', borderRadius: 10,
                      background: liked.has(i) ? '#F3E8FF' : '#F8F5FF',
                      border: liked.has(i) ? '1.5px solid #7C3AED' : '1.5px solid #EDE4F8',
                      fontSize: 12, fontWeight: 700, color: liked.has(i) ? '#7C3AED' : '#8478A0',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={liked.has(i) ? '#7C3AED' : 'none'} stroke={liked.has(i) ? '#7C3AED' : '#8478A0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {item.likes + (liked.has(i) ? 1 : 0)}
                  </button>
                  {item.comment && (
                    <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, background: '#F8F5FF', border: '1.5px solid #EDE4F8', fontSize: 12, fontWeight: 700, color: '#8478A0', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8478A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      Reply
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (() => {
          const g = gamification
          const myRankIdx  = RANKS.findIndex(r => r.id === (g.rank || 'bronze'))
          const myPoints   = myRankIdx * 100 + (g.rankPoints || 0)
          const myRank     = RANKS[myRankIdx] || RANKS[0]
          const youEntry   = {
            name: userProfile.name || 'You',
            workouts: g.totalWorkouts || 0,
            points: myPoints,
            rankId: myRank.id,
            you: true,
          }
          const board = [...PLACEHOLDER_BOARD, youEntry]
            .sort((a, b) => b.points - a.points)
            .map((e, i) => ({ ...e, rank: i + 1 }))

          return (
            <div>
              <div style={{ borderRadius: 20, background: 'linear-gradient(135deg,#2E1065,#6D28D9)', padding: '16px', marginBottom: 14, boxShadow: '0 12px 26px rgba(46,16,101,.28)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.6)', letterSpacing: '.5px', marginBottom: 8 }}>WEEKLY LEADERBOARD</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>Top 3 get gems bonus! 💎</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {board.map((entry) => {
                  const rank = RANKS.find(r => r.id === entry.rankId) || RANKS[0]
                  return (
                    <div
                      key={entry.name}
                      style={{
                        borderRadius: 18, padding: '12px 16px',
                        background: entry.you ? '#FAF5FF' : '#fff',
                        border: `2px solid ${entry.you ? '#7C3AED' : '#EDE4F8'}`,
                        boxShadow: entry.you ? '0 8px 18px rgba(124,58,237,.12)' : '0 4px 12px rgba(76,36,120,.04)',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: entry.rank === 1 ? '#FCD34D' : entry.rank === 2 ? '#9CA3AF' : entry.rank === 3 ? '#CD7C2F' : '#EDE4F8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800,
                        color: entry.rank <= 3 ? '#fff' : '#A99BC4',
                      }}>
                        {entry.rank}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#2E1065' }}>{entry.name}</span>
                          {entry.you && <span style={{ fontSize: 10, color: '#7C3AED', fontWeight: 800 }}>(you)</span>}
                          <span style={{ fontSize: 10, fontWeight: 800, color: rank.color, background: rank.bg, padding: '1px 6px', borderRadius: 999 }}>{rank.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#8478A0' }}>{entry.workouts} workouts</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: entry.you ? '#7C3AED' : '#2E1065' }}>{entry.points}</div>
                        <div style={{ fontSize: 10, color: '#A99BC4' }}>pts</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      <BottomNav active="squad" onNavigate={onNavigate} />
    </>
  )
}
