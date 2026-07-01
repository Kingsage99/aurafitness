import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { getDailyQuests } from '../utils/gamification'

export default function QuestsScreen({ gamification = {}, onQuestComplete, onNavigate }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const quests = getDailyQuests(todayStr)
  const completedToday = gamification.dailyQuests?.date === todayStr
    ? (gamification.dailyQuests.completed || [])
    : []

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ background: 'linear-gradient(175deg,#12022A,#2E1065,#4C1D95)', padding: '12px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => onNavigate('profile')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.14)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff' }}>Quests</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 1 }}>{completedToday.length} / 3 completed today</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < completedToday.length ? '#A78BFA' : 'rgba(255,255,255,.2)' }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
        {/* Daily quests */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#2E1065' }}>Daily Quests</span>
          <span style={{ fontSize: 11, color: '#8478A0' }}>Resets at midnight</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {quests.map(quest => {
            const done = completedToday.includes(quest.id)
            return (
              <div
                key={quest.id}
                style={{ borderRadius: 22, background: done ? 'linear-gradient(135deg,#ECFDF5,#D1FAE5)' : '#fff', border: `2px solid ${done ? '#10B981' : '#EDE4F8'}`, padding: '18px 18px', boxShadow: '0 6px 18px rgba(76,36,120,.06)', overflow: 'hidden', position: 'relative' }}
              >
                {done && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(16,185,129,.04)' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: done ? 'rgba(16,185,129,.14)' : '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{quest.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: done ? '#8478A0' : '#2E1065', textDecoration: done ? 'line-through' : 'none', marginBottom: 4 }}>{quest.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#A855F7"><path d="M6 3h12l3 6-9 12L3 9z"/></svg>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>+{quest.reward} gems</span>
                    </div>
                  </div>
                  {done ? (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                    </div>
                  ) : (
                    <button
                      onClick={() => onQuestComplete?.(quest.id)}
                      style={{ height: 36, padding: '0 14px', borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff', fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer', boxShadow: '0 6px 14px rgba(124,58,237,.28)', flexShrink: 0 }}
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Weekly challenges placeholder */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#2E1065', marginBottom: 4 }}>Weekly Challenges</div>
          <div style={{ fontSize: 12, color: '#8478A0', marginBottom: 14 }}>Bigger rewards, longer grind</div>
          <div style={{ background: 'linear-gradient(135deg,#7C3AED18,#A855F718)', border: '1.5px dashed #A855F7', borderRadius: 22, padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏆</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: '#2E1065', marginBottom: 6 }}>Coming soon</div>
            <div style={{ fontSize: 12, color: '#8478A0', lineHeight: 1.5 }}>Weekly challenges with exclusive gem rewards are in the works. Check back soon!</div>
          </div>
        </div>
      </div>
    </>
  )
}
