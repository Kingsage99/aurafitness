import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { getDailyQuests } from '../utils/gamification'

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
    // If streak covers this day (consecutive days back from today)
    return (todayDayIdx - i) < streak
  })

  return (
    <>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 0' }}>
        {/* Top bar: avatar, name, gems, notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(160deg,#EAD9FF,#C9A8F0)', overflow: 'hidden', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 4px 12px rgba(76,36,120,.16)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <svg width="32" height="36" viewBox="0 0 50 60" fill="none">
              <ellipse cx="25" cy="14" rx="9" ry="10" fill="rgba(255,255,255,0.85)"/>
              <path d="M10 28C10 24 16 20 25 20C34 20 40 24 40 28L40 50L10 50Z" fill="rgba(255,255,255,0.85)"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#8478A0' }}>Good morning,</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2E1065', lineHeight: 1.1 }}>{userProfile?.name || 'Aura'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Lives */}
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,2,3].map(i => (
                <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= lives ? '#EF4444' : '#E4D8F5'}>
                  <path d="M12 21.593c-.5-.388-10-6.77-10-12.093 0-3.314 2.686-6 6-6 1.878 0 3.561.888 4.666 2.276C13.771 4.388 15.453 3.5 17.333 3.5 20.648 3.5 23 6.186 23 9.5c0 5.323-9.5 11.705-10 12.093z"/>
                </svg>
              ))}
            </div>
            {/* Gems */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', borderRadius: 999, padding: '7px 12px', boxShadow: '0 4px 12px rgba(76,36,120,.08)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#A855F7"><path d="M6 3h12l3 6-9 12L3 9z"/></svg>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#2E1065' }}>{gems}</span>
            </div>
          </div>
          <button style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 12px rgba(76,36,120,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2E1065" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          </button>
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#7C3AED', marginBottom: 10 }}>Foundation · Day 4</div>

        {/* Today's Workout Card */}
        <div style={{
          borderRadius: 24, padding: 20, marginBottom: 14,
          background: 'linear-gradient(135deg,#5B21B6 0%,#7C3AED 50%,#A855F7 100%)',
          boxShadow: '0 16px 40px rgba(124,58,237,.32)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.7)', letterSpacing: '.6px', marginBottom: 6 }}>TODAY'S WORKOUT</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>Lower Body Burn</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {['Glutes', 'Quads', 'Core'].map(m => (
              <span key={m} style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.18)', padding: '4px 8px', borderRadius: 999 }}>{m}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>35</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)' }}>min</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>7</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)' }}>exercises</div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('workout')}
              style={{
                height: 44, padding: '0 20px', borderRadius: 14,
                background: '#fff', color: '#7C3AED',
                fontWeight: 800, fontSize: 14,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                boxShadow: '0 8px 18px rgba(46,16,101,.2)',
                border: 'none', cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#7C3AED"><path d="M7 4v16l13-8z"/></svg>
              Start
            </button>
          </div>
        </div>

        {/* Weekly Streak */}
        <div style={{ borderRadius: 20, background: '#fff', padding: '14px 16px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FB923C"><path d="M12 2c1.5 3.5 5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2.5-5C9.5 7 11 6 12 2z"/></svg>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#2E1065' }}>{streak > 0 ? `${streak} day streak` : 'Start your streak!'}</span>
            </div>
            <span style={{ fontSize: 11, color: '#8478A0', fontWeight: 600 }}>this week</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {days.map((day, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: done[i] ? '#7C3AED' : 'transparent', border: done[i] ? 'none' : '2px solid #E4D8F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {done[i] && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
                  )}
                </div>
                <span style={{ fontSize: 9, color: done[i] ? '#7C3AED' : '#C4B0E0', fontWeight: done[i] ? 800 : 700 }}>{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick access grid — fixed height row so Build a meal doesn't stretch */}
        <div style={{ display: 'flex', gap: 11, marginBottom: 14, alignItems: 'stretch' }}>
          {/* Build a meal */}
          <button
            onClick={() => onNavigate('meals')}
            style={{
              width: '46%', flexShrink: 0, borderRadius: 24,
              background: 'linear-gradient(165deg,#2E1065 0%,#6D28D9 100%)',
              padding: 17, display: 'flex', flexDirection: 'column',
              boxShadow: '0 12px 26px rgba(46,16,101,.28)',
              textAlign: 'left', border: 'none', cursor: 'pointer',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v7a2 2 0 0 0 4 0V3M6 12v9M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5zM16 12v9"/></svg>
            </div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff', lineHeight: 1.05, marginTop: 18 }}>Build<br/>a meal</div>
            <div style={{ fontSize: 11, color: '#D6C4FF', marginTop: 6, lineHeight: 1.35 }}>Tell us your craving — we hit your kcal target.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14 }}>
              <span style={{ flex: 1, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 11, color: '#EADBFF', fontWeight: 600 }}>{Math.max(0, Math.round((userProfile?.dailyCalorieTarget || 1750) - loggedMacros.calories))} kcal left</span>
              <span style={{ width: 36, height: 36, borderRadius: 11, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </span>
            </div>
          </button>

          {/* Right column: Nutrition + Store */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
            {/* Nutrition card */}
            {(() => {
              const target = userProfile?.dailyCalorieTarget || 1750
              const consumed = Math.round(loggedMacros.calories)
              const pct = Math.min(consumed / target, 1)
              const circ = 138
              const offset = circ - circ * pct
              return (
                <button onClick={() => onNavigate('meals')} style={{ borderRadius: 22, background: '#fff', padding: 14, boxShadow: '0 4px 12px rgba(76,36,120,.05)', display: 'flex', flexDirection: 'column', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#2E1065' }}>Nutrition</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C4B0E0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                      <svg width="52" height="52" viewBox="0 0 54 54">
                        <circle cx="27" cy="27" r="22" fill="none" stroke="#EDE4F8" strokeWidth="8"/>
                        <circle cx="27" cy="27" r="22" fill="none" stroke="#7C3AED" strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 27 27)"/>
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#2E1065', lineHeight: 1 }}>{consumed}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[['#7C3AED','P',Math.round(loggedMacros.protein)+'g'],['#F59E0B','C',Math.round(loggedMacros.carbs)+'g'],['#DB2777','F',Math.round(loggedMacros.fat)+'g']].map(([color, name, val]) => (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 2, background: color }}></span>
                          <span style={{ fontSize: 10, color: '#8478A0', fontWeight: 600, flex: 1 }}>{name}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#2E1065' }}>{val}</span>
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
              style={{ borderRadius: 22, background: 'linear-gradient(135deg,#1E1B4B,#4C1D95)', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 8, border: 'none', cursor: 'pointer', textAlign: 'left', boxShadow: '0 8px 20px rgba(76,36,120,.22)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Store</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['💎','🔥','🌸'].map((icon, i) => (
                  <div key={i} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', fontWeight: 600, lineHeight: 1.3 }}>Borders, banners &amp; more</div>
            </button>
          </div>
        </div>

        {/* Daily Quests — horizontal swipe carousel */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#7C3AED"><path d="M12 2l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z"/></svg>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED', letterSpacing: '.4px' }}>DAILY QUESTS</span>
            </div>
            <span style={{ fontSize: 11, color: '#8478A0', fontWeight: 700 }}>{completedQuests.length}/3 done</span>
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
                    borderRadius: 20, padding: '16px 18px',
                    background: isDone ? 'linear-gradient(135deg,#ECFDF5,#D1FAE5)' : '#fff',
                    border: `2px solid ${isDone ? '#10B981' : '#EDE4F8'}`,
                    boxShadow: '0 6px 18px rgba(76,36,120,.07)',
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: isDone ? 'default' : 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: isDone ? 'rgba(16,185,129,.14)' : '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {quest.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isDone ? '#8478A0' : '#2E1065', textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.3 }}>{quest.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                      {isDone
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>Completed ✓</span>
                        : <>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED', background: '#F3E8FF', padding: '3px 9px', borderRadius: 999 }}>+{quest.reward}</span>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="#A855F7"><path d="M6 3h12l3 6-9 12L3 9z"/></svg>
                          </>
                      }
                    </div>
                  </div>
                  {isDone
                    ? <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                      </div>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4BAD5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9,18 15,12 9,6"/></svg>
                  }
                </button>
              )
            })}
          </div>
        </div>

        {/* Squad Activity */}
        <div style={{ borderRadius: 20, background: '#fff', padding: '14px 16px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#2E1065' }}>Squad activity</span>
            <button onClick={() => onNavigate('squad')} style={{ fontSize: 12, color: '#7C3AED', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer' }}>See all</button>
          </div>
          {[
            { name: 'Sofia', action: 'just finished a leg day 🔥', time: '2m ago' },
            { name: 'Priya', action: 'hit a new PB — 60kg squat!', time: '1h ago' },
          ].map((activity, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i === 0 ? 10 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? '#7C3AED' : '#EDE4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? '#fff' : '#7C3AED' }}>{activity.name[0]}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2E1065' }}>{activity.name} </span>
                <span style={{ fontSize: 13, color: '#8478A0' }}>{activity.action}</span>
              </div>
              <span style={{ fontSize: 11, color: '#A99BC4', flexShrink: 0 }}>{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="home" onNavigate={onNavigate} />
    </>
  )
}
