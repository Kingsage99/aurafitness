import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { getDailyQuests } from '../utils/gamification'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

export default function Home({ userProfile, loggedMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 }, gamification = {}, onQuestComplete, onNavigate }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const gems = gamification.gems ?? 0
  const streak = gamification.workoutStreak ?? 0
  const lives = gamification.lives ?? 3
  // Mark today as done if user worked out today
  const today = new Date().toISOString().slice(0, 10)
  const todayDayIdx = (new Date().getDay() + 6) % 7 // 0=Mon … 6=Sun
  const todayStr = today
  const dailyQuests = getDailyQuests(todayStr)
  const completedQuests = gamification.dailyQuests?.date === todayStr ? (gamification.dailyQuests.completed || []) : []

  const done = days.map((_, i) => {
    if (i > todayDayIdx) return false
    return (todayDayIdx - i) < streak
  })

  return (
    <>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 0' }}>
        {/* Top bar: avatar, name, gems, notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, border: NB_BORDER, background: NB.lavender, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <svg width="32" height="36" viewBox="0 0 50 60" fill="none">
              <ellipse cx="25" cy="14" rx="9" ry="10" fill={NB.ink}/>
              <path d="M10 28C10 24 16 20 25 20C34 20 40 24 40 28L40 50L10 50Z" fill={NB.ink}/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>Good morning,</div>
            <div style={{ fontFamily: NB.fontDisplay, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1 }}>{userProfile?.name || 'Aura'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Lives */}
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,2,3].map(i => (
                <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= lives ? NB.red : '#ddd'}>
                  <path d="M12 21.593c-.5-.388-10-6.77-10-12.093 0-3.314 2.686-6 6-6 1.878 0 3.561.888 4.666 2.276C13.771 4.388 15.453 3.5 17.333 3.5 20.648 3.5 23 6.186 23 9.5c0 5.323-9.5 11.705-10 12.093z"/>
                </svg>
              ))}
            </div>
            {/* Gems */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: NB.white, border: NB_BORDER, boxShadow: hardShadow(2), padding: '6px 10px' }}>
              <span style={{ width: 12, height: 12, background: NB.blue, border: `1.5px solid ${NB.ink}`, transform: 'rotate(45deg)' }} />
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, color: NB.ink }}>{gems}</span>
            </div>
          </div>
          <button style={{ width: 42, height: 42, border: NB_BORDER, boxShadow: hardShadow(2), background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          </button>
        </div>

        <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: NB.ink, marginBottom: 12 }}>Foundation · Day 4</div>

        {/* Today's Workout Card */}
        <div style={{
          border: NB_BORDER, padding: 20, marginBottom: 16,
          background: NB.magenta, boxShadow: hardShadow(7),
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.white, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Today's Workout</div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: NB.white, lineHeight: 1.1, marginBottom: 8 }}>Lower Body Burn</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {['Glutes', 'Quads', 'Core'].map(m => (
              <span key={m} style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: NB.ink, background: NB.white, border: `1.5px solid ${NB.ink}`, padding: '4px 8px' }}>{m}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ fontFamily: NB.fontDisplay, fontSize: 18, fontWeight: 900, color: NB.white }}>35</div>
                <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: NB.white, textTransform: 'uppercase' }}>min</div>
              </div>
              <div>
                <div style={{ fontFamily: NB.fontDisplay, fontSize: 18, fontWeight: 900, color: NB.white }}>7</div>
                <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: NB.white, textTransform: 'uppercase' }}>exercises</div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('workout')}
              style={{
                height: 44, padding: '0 20px', border: NB_BORDER,
                background: NB.yellow, color: NB.ink,
                fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                boxShadow: hardShadow(3), cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill={NB.ink}><path d="M7 4v16l13-8z"/></svg>
              Start
            </button>
          </div>
        </div>

        {/* Weekly Streak */}
        <div style={{ border: NB_BORDER, boxShadow: hardShadow(4), background: NB.white, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🔥</span>
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink }}>{streak > 0 ? `${streak} day streak` : 'Start your streak!'}</span>
            </div>
            <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>this week</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {days.map((day, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 30, height: 30, border: `2px solid ${NB.ink}`, background: done[i] ? NB.green : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {done[i] && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
                  )}
                </div>
                <span style={{ fontFamily: NB.fontMono, fontSize: 9, color: NB.ink, fontWeight: 700 }}>{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick access grid — fixed height row so Build a meal doesn't stretch */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'stretch' }}>
          {/* Build a meal */}
          <button
            onClick={() => onNavigate('meals')}
            style={{
              width: '46%', flexShrink: 0, border: NB_BORDER,
              background: NB.teal, padding: 17, display: 'flex', flexDirection: 'column',
              boxShadow: hardShadow(5), textAlign: 'left', cursor: 'pointer',
            }}
          >
            <div style={{ width: 42, height: 42, border: `2.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v7a2 2 0 0 0 4 0V3M6 12v9M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5zM16 12v9"/></svg>
            </div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.05, marginTop: 18 }}>Build<br/>a meal</div>
            <div style={{ fontSize: 11, color: NB.ink, marginTop: 6, lineHeight: 1.35 }}>Tell us your craving — we hit your kcal target.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14 }}>
              <span style={{ flex: 1, height: 36, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', paddingLeft: 10, fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700 }}>{Math.max(0, Math.round((userProfile?.dailyCalorieTarget || 1750) - loggedMacros.calories))} kcal left</span>
              <span style={{ width: 36, height: 36, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </span>
            </div>
          </button>

          {/* Right column: Nutrition + Store */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Nutrition card */}
            {(() => {
              const target = userProfile?.dailyCalorieTarget || 1750
              const consumed = Math.round(loggedMacros.calories)
              const pct = Math.min(consumed / target, 1)
              const circ = 138
              const offset = circ - circ * pct
              return (
                <button onClick={() => onNavigate('meals')} style={{ border: NB_BORDER, boxShadow: hardShadow(3), background: NB.white, padding: 14, display: 'flex', flexDirection: 'column', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Nutrition</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                      <svg width="52" height="52" viewBox="0 0 54 54">
                        <circle cx="27" cy="27" r="22" fill="none" stroke="#eee" strokeWidth="8"/>
                        <circle cx="27" cy="27" r="22" fill="none" stroke={NB.teal} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 27 27)"/>
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: NB.fontDisplay, fontSize: 11, fontWeight: 800, color: NB.ink, lineHeight: 1 }}>{consumed}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[[NB.blue,'P',Math.round(loggedMacros.protein)+'g'],[NB.yellow,'C',Math.round(loggedMacros.carbs)+'g'],[NB.pink,'F',Math.round(loggedMacros.fat)+'g']].map(([color, name, val]) => (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 8, height: 8, border: `1.5px solid ${NB.ink}`, background: color }}></span>
                          <span style={{ fontFamily: NB.fontMono, fontSize: 10, color: '#555', fontWeight: 700, flex: 1 }}>{name}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: NB.ink }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })()}

            {/* Store card */}
            <button
              onClick={() => onNavigate('store')}
              style={{ border: NB_BORDER, boxShadow: hardShadow(3), background: NB.ink, padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: NB.white }}>Store</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['💎','🔥','🌸'].map((icon, i) => (
                  <div key={i} style={{ width: 30, height: 30, border: `1.5px solid ${NB.white}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</div>
                ))}
              </div>
              <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: '#ccc', fontWeight: 700, lineHeight: 1.3 }}>Borders, banners &amp; more</div>
            </button>
          </div>
        </div>

        {/* Daily Quests — horizontal swipe carousel */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>⭐</span>
              <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: NB.ink }}>Daily Quests</span>
            </div>
            <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555', fontWeight: 700 }}>{completedQuests.length}/3 done</span>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'scroll', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingBottom: 6, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {dailyQuests.map(quest => {
              const isDone = completedQuests.includes(quest.id)
              return (
                <button
                  key={quest.id}
                  onClick={() => !isDone && onQuestComplete && onQuestComplete(quest.id)}
                  style={{
                    minWidth: '78%', flexShrink: 0,
                    scrollSnapAlign: 'start',
                    border: `2.5px solid ${NB.ink}`, padding: '16px 18px',
                    background: isDone ? NB.green : NB.white,
                    boxShadow: hardShadow(3),
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: isDone ? 'default' : 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 48, height: 48, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {quest.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: NB.ink, textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.3 }}>{quest.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                      {isDone
                        ? <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: NB.ink, textTransform: 'uppercase' }}>Completed ✓</span>
                        : <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: NB.ink, background: NB.yellow, border: `1.5px solid ${NB.ink}`, padding: '3px 9px' }}>+{quest.reward}</span>
                      }
                    </div>
                  </div>
                  {isDone
                    ? <div style={{ width: 34, height: 34, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                      </div>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9,18 15,12 9,6"/></svg>
                  }
                </button>
              )
            })}
          </div>
        </div>

        {/* Squad Activity */}
        <div style={{ border: NB_BORDER, boxShadow: hardShadow(4), background: NB.white, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>Squad activity</span>
            <button onClick={() => onNavigate('squad')} style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}>See all</button>
          </div>
          {[
            { name: 'Sofia', action: 'just finished a leg day 🔥', time: '2m ago' },
            { name: 'Priya', action: 'hit a new PB — 60kg squat!', time: '1h ago' },
          ].map((activity, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i === 0 ? 10 : 0 }}>
              <div style={{ width: 36, height: 36, border: `2px solid ${NB.ink}`, background: i === 0 ? NB.teal : NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, color: NB.ink }}>{activity.name[0]}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{activity.name} </span>
                <span style={{ fontSize: 13, color: '#444' }}>{activity.action}</span>
              </div>
              <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#666', flexShrink: 0 }}>{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="home" onNavigate={onNavigate} />
    </>
  )
}
