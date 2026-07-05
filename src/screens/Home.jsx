import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { Avatar } from '../components/AvatarSilhouette'
import { getDailyQuests, getMissFlags, xpProgress } from '../utils/gamification'
import { getPrimaryMuscles } from '../utils/workoutBuilder'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

export default function Home({ userProfile, loggedMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 }, todayWorkout = null, gamification = {}, missState = null, onStartMakeup, onSkipMakeup, onQuestComplete, onNavigate }) {
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

  const [dismissed, setDismissed] = useState({ workout: false, calorie: false })
  const { showWorkoutMiss, showCalorieMiss, missedWorkoutEntry } = getMissFlags(missState, gamification, loggedMacros)
  const notificationsOn = userProfile?.notificationsEnabled !== false

  const done = days.map((_, i) => {
    if (i > todayDayIdx) return false
    return (todayDayIdx - i) < streak
  })

  return (
    <>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 0' }}>
        {/* Top bar: profile widget, gems, notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button
            onClick={() => onNavigate('profile')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', minWidth: 0 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: NB_BORDER, background: NB.lavender, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Avatar url={userProfile?.avatarUrl} height={44} color={NB.ink} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile?.name || 'Aura'}</div>
              {(() => {
                const xp = xpProgress(gamification.xp || 0)
                const xpPct = Math.round((xp.current / Math.max(xp.needed, 1)) * 100)
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink, flexShrink: 0 }}>LVL {xp.level}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden', maxWidth: 90 }}>
                      <div style={{ width: `${xpPct}%`, height: '100%', background: NB.yellow }} />
                    </div>
                  </div>
                )
              })()}
            </div>
          </button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 14, background: NB.white, border: NB_BORDER, boxShadow: hardShadow(2), padding: '6px 10px' }}>
              <span style={{ width: 12, height: 12, background: NB.blue, border: `1.5px solid ${NB.ink}`, transform: 'rotate(45deg)' }} />
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, color: NB.ink }}>{gems}</span>
            </div>
          </div>
          <button style={{ width: 42, height: 42, borderRadius: 12, border: NB_BORDER, boxShadow: hardShadow(2), background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          </button>
        </div>

        {notificationsOn && showWorkoutMiss && !dismissed.workout && (
          <div style={{ border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.orange, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>😔 Missed {missedWorkoutEntry?.label || 'a workout'} yesterday</div>
            <div style={{ fontSize: 12, color: NB.ink, marginBottom: 10 }}>Want to catch up now, or skip it and move on?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => onStartMakeup?.()}
                style={{ flex: 1, height: 38, border: NB_BORDER, borderRadius: 10, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Do it now
              </button>
              <button
                onClick={() => { setDismissed(d => ({ ...d, workout: true })); onSkipMakeup?.() }}
                style={{ height: 38, padding: '0 14px', border: 'none', background: 'none', color: NB.ink, fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
              >
                Skip it
              </button>
            </div>
          </div>
        )}

        {notificationsOn && showCalorieMiss && !dismissed.calorie && (
          <div style={{ border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.yellow, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>🍽 Missed your calorie goal yesterday</div>
            <div style={{ fontSize: 12, color: NB.ink, marginBottom: 10 }}>Log a meal today to get back on track.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => onNavigate('meals')}
                style={{ flex: 1, height: 38, border: NB_BORDER, borderRadius: 10, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Log a meal
              </button>
              <button
                onClick={() => setDismissed(d => ({ ...d, calorie: true }))}
                style={{ height: 38, padding: '0 14px', border: 'none', background: 'none', color: NB.ink, fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
              >
                Skip it
              </button>
            </div>
          </div>
        )}

        <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: NB.ink, marginBottom: 12 }}>Foundation · Day 4</div>

        {/* Today's Workout Card */}
        {todayWorkout ? (
          <div style={{
            border: NB_BORDER, borderRadius: 22, padding: 20, marginBottom: 16,
            background: NB.magenta, boxShadow: hardShadow(7),
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.white, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Today's Workout</div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: NB.white, lineHeight: 1.1, marginBottom: 8 }}>{todayWorkout.name || "Today's Workout"}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {getPrimaryMuscles(todayWorkout.exercises).map(m => (
                <span key={m} style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: NB.ink, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '4px 8px' }}>{m}</span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontFamily: NB.fontDisplay, fontSize: 18, fontWeight: 900, color: NB.white }}>{todayWorkout.estimatedMinutes ?? '—'}</div>
                  <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: NB.white, textTransform: 'uppercase' }}>min</div>
                </div>
                <div>
                  <div style={{ fontFamily: NB.fontDisplay, fontSize: 18, fontWeight: 900, color: NB.white }}>{todayWorkout.exercises?.length ?? 0}</div>
                  <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: NB.white, textTransform: 'uppercase' }}>exercises</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('workout')}
                style={{
                  height: 44, padding: '0 20px', border: NB_BORDER, borderRadius: 14,
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
        ) : userProfile?.planningMode === 'custom' ? (
          <div style={{
            border: NB_BORDER, borderRadius: 22, padding: 20, marginBottom: 16,
            background: NB.lavender, boxShadow: hardShadow(5),
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>🛠️</div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>Build your first workout</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 14 }}>You chose to build your own — create a workout to see it here.</div>
            <button
              onClick={() => onNavigate('workoutBuilder')}
              style={{
                height: 44, padding: '0 20px', border: NB_BORDER, borderRadius: 14,
                background: NB.yellow, color: NB.ink,
                fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                boxShadow: hardShadow(3), cursor: 'pointer',
              }}
            >
              Create a workout
            </button>
          </div>
        ) : (
          <div style={{
            border: NB_BORDER, borderRadius: 22, padding: 20, marginBottom: 16,
            background: NB.cream, boxShadow: hardShadow(5),
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>💆</div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>Rest day today</div>
            <div style={{ fontSize: 13, color: '#555' }}>No workout scheduled — recover up and come back stronger.</div>
          </div>
        )}

        {/* Weekly Streak */}
        <div style={{ border: NB_BORDER, borderRadius: 20, boxShadow: hardShadow(4), background: NB.white, padding: '14px 16px', marginBottom: 16 }}>
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
                <div style={{ width: 30, height: 30, borderRadius: 10, border: `2px solid ${NB.ink}`, background: done[i] ? NB.green : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              width: '46%', flexShrink: 0, border: NB_BORDER, borderRadius: 20,
              background: NB.teal, padding: 17, display: 'flex', flexDirection: 'column',
              boxShadow: hardShadow(5), textAlign: 'left', cursor: 'pointer',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, border: `2.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v7a2 2 0 0 0 4 0V3M6 12v9M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5zM16 12v9"/></svg>
            </div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.05, marginTop: 18 }}>Build<br/>a meal</div>
            <div style={{ fontSize: 11, color: NB.ink, marginTop: 6, lineHeight: 1.35 }}>Tell us your craving — we hit your kcal target.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14 }}>
              <span style={{ flex: 1, height: 36, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', paddingLeft: 10, fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700 }}>{Math.max(0, Math.round((userProfile?.dailyCalorieTarget || 1750) - loggedMacros.calories))} kcal left</span>
              <span style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                <button onClick={() => onNavigate('meals')} style={{ border: NB_BORDER, borderRadius: 20, boxShadow: hardShadow(3), background: NB.white, padding: 14, display: 'flex', flexDirection: 'column', cursor: 'pointer', textAlign: 'left' }}>
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
                          <span style={{ width: 8, height: 8, borderRadius: 3, border: `1.5px solid ${NB.ink}`, background: color }}></span>
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
              style={{ border: NB_BORDER, borderRadius: 20, boxShadow: hardShadow(3), background: NB.lavender, padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Store</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['💎','🔥','🌸'].map((icon, i) => (
                  <div key={i} style={{ width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${NB.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</div>
                ))}
              </div>
              <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: '#555', fontWeight: 700, lineHeight: 1.3 }}>Borders, banners &amp; more</div>
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
                    border: `2.5px solid ${NB.ink}`, borderRadius: 18, padding: '16px 18px',
                    background: isDone ? NB.green : NB.white,
                    boxShadow: hardShadow(3),
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: isDone ? 'default' : 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 13, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {quest.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: NB.ink, textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.3 }}>{quest.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                      {isDone
                        ? <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: NB.ink, textTransform: 'uppercase' }}>Completed ✓</span>
                        : <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: NB.ink, background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '3px 9px' }}>+{quest.reward}</span>
                      }
                    </div>
                  </div>
                  {isDone
                    ? <div style={{ width: 34, height: 34, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
        <div style={{ border: NB_BORDER, borderRadius: 20, boxShadow: hardShadow(4), background: NB.white, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>Squad activity</span>
            <button onClick={() => onNavigate('squad')} style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}>See all</button>
          </div>
          {[
            { name: 'Sofia', action: 'just finished a leg day 🔥', time: '2m ago' },
            { name: 'Priya', action: 'hit a new PB — 60kg squat!', time: '1h ago' },
          ].map((activity, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i === 0 ? 10 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, border: `2px solid ${NB.ink}`, background: i === 0 ? NB.teal : NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
