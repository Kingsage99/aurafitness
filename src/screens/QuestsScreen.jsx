import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { getDailyQuests } from '../utils/gamification'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

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
      <div style={{ background: NB.ink, padding: '12px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => onNavigate('profile')} style={{ width: 38, height: 38, border: `1.5px solid ${NB.white}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.white }}>Quests</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>{completedToday.length} / 3 completed today</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 10, height: 10, border: `1.5px solid ${NB.white}`, background: i < completedToday.length ? NB.yellow : 'transparent' }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
        {/* Daily quests */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Daily Quests</span>
          <span style={{ fontSize: 11, color: '#555' }}>Resets at midnight</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {quests.map(quest => {
            const done = completedToday.includes(quest.id)
            return (
              <div
                key={quest.id}
                style={{ border: `2.5px solid ${NB.ink}`, background: done ? NB.green : NB.white, boxShadow: hardShadow(3), padding: '18px 18px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{quest.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: NB.ink, textDecoration: done ? 'line-through' : 'none', marginBottom: 4 }}>{quest.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, background: NB.blue, border: `1.5px solid ${NB.ink}`, transform: 'rotate(45deg)' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>+{quest.reward} gems</span>
                    </div>
                  </div>
                  {done ? (
                    <div style={{ width: 36, height: 36, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                    </div>
                  ) : (
                    <button
                      onClick={() => onQuestComplete?.(quest.id)}
                      style={{ height: 38, padding: '0 14px', border: `2px solid ${NB.ink}`, background: NB.magenta, color: NB.white, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', boxShadow: hardShadow(2), flexShrink: 0 }}
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
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>Weekly Challenges</div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 14 }}>Bigger rewards, longer grind</div>
          <div style={{ background: NB.cream, border: `2.5px dashed ${NB.ink}`, padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏆</div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink, marginBottom: 6 }}>Coming soon</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>Weekly challenges with exclusive gem rewards are in the works. Check back soon!</div>
          </div>
        </div>
      </div>
    </>
  )
}
