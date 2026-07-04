import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { RANKS } from '../utils/gamification'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const FEED = [
  { name: 'Sofia', initial: 'S', color: NB.teal, action: 'just finished Lower Body Burn 🔥', time: '2m ago', likes: 8, comment: true },
  { name: 'Priya', initial: 'P', color: NB.magenta, action: 'hit a new PB — 60kg squat! 💪', time: '1h ago', likes: 14, comment: true },
  { name: 'Jess', initial: 'J', color: NB.yellow, action: 'logged a 4th workout this week!', time: '3h ago', likes: 6, comment: false },
  { name: 'Amara', initial: 'A', color: NB.green, action: 'started Foundation phase 🌱', time: 'yesterday', likes: 11, comment: true },
  { name: 'Kezia', initial: 'K', color: NB.lavender, action: 'hit her weekly goal 3 weeks in a row!', time: 'yesterday', likes: 19, comment: false },
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
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: NB.ink }}>Squad</div>
          <button style={{ width: 40, height: 40, border: NB_BORDER, background: NB.magenta, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: hardShadow(3) }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>4 friends active this week</div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '12px 22px 0', display: 'flex', gap: 8, flexShrink: 0 }}>
        {[['feed', 'Activity feed'], ['leaderboard', 'Leaderboard']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              flex: 1, height: 42, border: `2.5px solid ${NB.ink}`,
              background: activeTab === id ? NB.teal : NB.white,
              boxShadow: activeTab === id ? hardShadow(2) : 'none',
              fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase',
              color: NB.ink,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 0' }}>
        {activeTab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEED.map((item, i) => (
              <div key={i} style={{ border: NB_BORDER, boxShadow: hardShadow(3), background: NB.white, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, border: `2px solid ${NB.ink}`, background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: NB.ink }}>{item.initial}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: NB.ink }}>{item.name} </span>
                    <span style={{ fontSize: 14, color: '#444' }}>{item.action}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#666', flexShrink: 0 }}>{item.time}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => toggleLike(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', border: `1.5px solid ${NB.ink}`,
                      background: liked.has(i) ? NB.yellow : NB.white,
                      fontSize: 12, fontWeight: 700, color: NB.ink,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={liked.has(i) ? NB.ink : 'none'} stroke={NB.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {item.likes + (liked.has(i) ? 1 : 0)}
                  </button>
                  {item.comment && (
                    <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1.5px solid ${NB.ink}`, background: NB.white, fontSize: 12, fontWeight: 700, color: NB.ink, cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <div style={{ border: NB_BORDER, boxShadow: hardShadow(4), background: NB.ink, padding: '16px', marginBottom: 16 }}>
                <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.yellow, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Weekly Leaderboard</div>
                <div style={{ fontSize: 13, color: NB.white }}>Top 3 get gems bonus! 💎</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {board.map((entry) => {
                  const rank = RANKS.find(r => r.id === entry.rankId) || RANKS[0]
                  return (
                    <div
                      key={entry.name}
                      style={{
                        border: `2.5px solid ${NB.ink}`, padding: '12px 16px',
                        background: entry.you ? NB.yellow : NB.white,
                        boxShadow: entry.you ? hardShadow(3) : hardShadow(1),
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, border: `2px solid ${NB.ink}`, flexShrink: 0,
                        background: entry.rank === 1 ? '#FCD34D' : entry.rank === 2 ? '#B8C0CC' : entry.rank === 3 ? '#CD7F32' : NB.white,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: NB.ink,
                      }}>
                        {entry.rank}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: NB.ink }}>{entry.name}</span>
                          {entry.you && <span style={{ fontSize: 10, color: NB.ink, fontWeight: 800 }}>(you)</span>}
                          <span style={{ fontSize: 10, fontWeight: 800, color: rank.color === '#fff' ? NB.ink : rank.color, background: rank.bg, border: `1.5px solid ${NB.ink}`, padding: '1px 6px' }}>{rank.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#555' }}>{entry.workouts} workouts</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: NB.ink }}>{entry.points}</div>
                        <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: '#555' }}>pts</div>
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
