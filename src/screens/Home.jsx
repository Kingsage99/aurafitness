import React, { useState, useEffect } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { Avatar } from '../components/AvatarSilhouette'
import { STORE_BORDERS } from './StoreScreen'
import { HeartIcon, FireIcon, GemIcon, StarIcon, ToolsIcon, SpaIcon, renderIcon } from '../components/Icons'
import { getDailyQuests, getMissFlags, xpProgress } from '../utils/gamification'
import { getPrimaryMuscles } from '../utils/workoutBuilder'
import { fetchFriendsFeed, timeAgo } from '../lib/social'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

function describeActivity(post) {
  const c = post.content || {}
  if (post.type === 'workout') return `just finished ${c.label || 'a workout'} 🔥`
  return `logged ${c.name || 'a meal'}`
}

export default function Home({ userProfile, loggedMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 }, todayWorkout = null, gamification = {}, missState = null, session, onStartMakeup, onSkipMakeup, onSkipCalorieMiss, onQuestComplete, onNavigate }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  // Image-based ring frame — same equipped cosmetic as Profile.jsx, shown
  // anywhere else the real avatar photo appears.
  const equippedBorder = gamification.frame ? STORE_BORDERS.find(b => b.id === `frame_${gamification.frame}`) : null
  const borderImage = equippedBorder?.image || null
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
  const [squadActivity, setSquadActivity] = useState([])
  const [squadLoading, setSquadLoading] = useState(true)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) { setSquadLoading(false); return }
    fetchFriendsFeed(userId, 2).then(posts => {
      setSquadActivity(posts)
      setSquadLoading(false)
    })
  }, [session?.user?.id])
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
            <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: NB_BORDER, background: NB.lavender, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Avatar url={userProfile?.avatarUrl} height={44} color={NB.ink} />
              </div>
              {borderImage && (
                <img
                  src={borderImage}
                  alt=""
                  style={{
                    position: 'absolute',
                    top: equippedBorder.frameOffset.top,
                    left: equippedBorder.frameOffset.left,
                    width: equippedBorder.frameOffset.size,
                    height: equippedBorder.frameOffset.size,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile?.name || 'MissVfit'}</div>
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
              {[1,2,3].map(i => <HeartIcon key={i} size={14} filled={i <= lives} />)}
            </div>
            {/* Gems */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 14, background: NB.white, border: NB_BORDER, boxShadow: hardShadow(2), padding: '6px 10px' }}>
              <GemIcon size={13} />
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, color: NB.ink }}>{gems}</span>
            </div>
          </div>
          <button style={{ width: 42, height: 42, borderRadius: 12, border: NB_BORDER, boxShadow: hardShadow(2), background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          </button>
        </div>

        {/* Today's Workout Card */}
        {todayWorkout ? (
          <div style={{
            ...nbCardStyle(NB.magenta, 7), border: `3px solid ${NB.white}`, borderRadius: 22, padding: 20, marginBottom: 16,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.white, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Foundation · Day 4 · Today's Workout</div>
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
            ...nbCardStyle(NB.lavender, 5, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 22, padding: 20, marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><ToolsIcon size={30} /></div>
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
            ...nbCardStyle(NB.cream, 5), border: `3px solid ${NB.white}`, borderRadius: 22, padding: 20, marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><SpaIcon size={30} /></div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>Rest day today</div>
            <div style={{ fontSize: 13, color: '#555' }}>No workout scheduled — recover up and come back stronger.</div>
          </div>
        )}

        {/* Weekly Streak */}
        <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 4, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 20, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FireIcon size={18} />
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

        {/* Missed-workout / missed-calorie block the rest of the app until the
            user acts or explicitly skips — shown one at a time as a modal,
            not an inline dismissible banner. */}
        {notificationsOn && showWorkoutMiss && !dismissed.workout && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,26,0.55)', padding: 28 }}>
            <div style={{ ...nbCardStyle(NB.orange, 6), border: `3px solid ${NB.white}`, borderRadius: 24, padding: '30px 24px 24px', width: '100%', maxWidth: 290, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>😔</div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 17, textTransform: 'uppercase', color: NB.ink, marginBottom: 8, lineHeight: 1.25 }}>Missed {missedWorkoutEntry?.label || 'a workout'} yesterday</div>
              <div style={{ fontSize: 13, color: NB.ink, marginBottom: 22, lineHeight: 1.4 }}>Want to catch up now, or skip it and move on?</div>
              <button
                onClick={() => onStartMakeup?.()}
                style={{ width: '100%', height: 46, border: NB_BORDER, borderRadius: 12, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12 }}
              >
                Do it now
              </button>
              <button
                onClick={() => { setDismissed(d => ({ ...d, workout: true })); onSkipMakeup?.() }}
                style={{ background: 'none', border: 'none', color: NB.ink, fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
              >
                Skip it
              </button>
            </div>
          </div>
        )}

        {notificationsOn && !(showWorkoutMiss && !dismissed.workout) && showCalorieMiss && !dismissed.calorie && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,26,0.55)', padding: 28 }}>
            <div style={{ ...nbCardStyle(NB.yellow, 6), border: `3px solid ${NB.white}`, borderRadius: 24, padding: '30px 24px 24px', width: '100%', maxWidth: 290, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🍽</div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 17, textTransform: 'uppercase', color: NB.ink, marginBottom: 8, lineHeight: 1.25 }}>Missed your calorie goal yesterday</div>
              <div style={{ fontSize: 13, color: NB.ink, marginBottom: 22, lineHeight: 1.4 }}>Log a meal today to get back on track.</div>
              <button
                onClick={() => onNavigate('meals')}
                style={{ width: '100%', height: 46, border: NB_BORDER, borderRadius: 12, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12 }}
              >
                Log a meal
              </button>
              <button
                onClick={() => { setDismissed(d => ({ ...d, calorie: true })); onSkipCalorieMiss?.() }}
                style={{ background: 'none', border: 'none', color: NB.ink, fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
              >
                Skip it
              </button>
            </div>
          </div>
        )}

        {/* Build a meal — single full-width card (macro ring + kcal remaining) */}
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: NB.ink, marginBottom: 10 }}>Build a meal</div>
        {(() => {
          const target = userProfile?.dailyCalorieTarget || 1750
          const consumed = Math.round(loggedMacros.calories)
          const pct = Math.min(consumed / target, 1)
          const circ = 138
          const offset = circ - circ * pct
          return (
            <button
              onClick={() => onNavigate('meals')}
              style={{ ...nbCardStyle(NB.tealLight, 5, NB.teal), border: `3px solid ${NB.white}`, borderRadius: 20, padding: 14, display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginBottom: 16, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                <svg width="52" height="52" viewBox="0 0 54 54">
                  <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="8"/>
                  <circle cx="27" cy="27" r="22" fill="none" stroke={NB.ink} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 27 27)"/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, color: NB.ink, lineHeight: 1 }}>{consumed}</span>
                </div>
              </div>
              <span style={{ flex: 1, fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 700 }}>
                {Math.max(0, Math.round(target - loggedMacros.calories))} kcal left · P {Math.round(loggedMacros.protein)} C {Math.round(loggedMacros.carbs)} F {Math.round(loggedMacros.fat)}
              </span>
              <span style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </span>
            </button>
          )
        })()}

        {/* Daily Quests — stacked checklist */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StarIcon size={14} />
              <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: NB.ink }}>Daily Quests</span>
            </div>
            <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555', fontWeight: 700 }}>{completedQuests.length}/3 done</span>
          </div>
          <div style={{ ...nbCardStyle(NB.lavender, 4, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 18, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dailyQuests.map(quest => {
              const isDone = completedQuests.includes(quest.id)
              return (
                <button
                  key={quest.id}
                  onClick={() => !isDone && onQuestComplete && onQuestComplete(quest.id)}
                  style={{
                    background: NB.lavenderMist, border: 'none', borderRadius: 14, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: isDone ? 'default' : 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${NB.ink}`, background: isDone ? NB.ink : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isDone && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                    )}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: NB.ink, textDecoration: isDone ? 'line-through' : 'none' }}>{quest.label}</span>
                  <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: NB.ink, background: NB.yellow, borderRadius: 8, padding: '3px 9px', flexShrink: 0 }}>+{quest.reward}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Store */}
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: NB.ink, marginBottom: 10 }}>Store</div>
        <button
          onClick={() => onNavigate('store')}
          style={{ ...nbCardStyle(NB.lavender, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 20, padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 16, cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {['💎','🔥','🌸'].map((icon, i) => (
              <div key={i} style={{ width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${NB.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{renderIcon(icon, 16)}</div>
            ))}
          </div>
          <span style={{ flex: 1, fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 700 }}>Borders, banners &amp; more</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
        </button>

        {/* Squad Activity */}
        <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 4, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 20, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>Squad activity</span>
            <button onClick={() => onNavigate('discovery')} style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}>See all</button>
          </div>
          {squadLoading ? (
            <div style={{ fontSize: 13, color: '#777', padding: '4px 0' }}>Loading…</div>
          ) : squadActivity.length === 0 ? (
            <div style={{ fontSize: 13, color: '#777', lineHeight: 1.5 }}>
              No squad activity yet — add friends in Discover to see their workouts and meals here.
            </div>
          ) : (
            squadActivity.map((post, i) => (
              <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i === squadActivity.length - 1 ? 0 : 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, border: `2px solid ${NB.ink}`, background: post.type === 'workout' ? NB.magenta : NB.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, color: post.type === 'workout' ? NB.white : NB.ink }}>{(post.display_name || 'U')[0].toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{post.display_name || 'MissVfit user'} </span>
                  <span style={{ fontSize: 13, color: '#444' }}>{describeActivity(post)}</span>
                </div>
                <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#666', flexShrink: 0 }}>{timeAgo(post.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav active="home" onNavigate={onNavigate} />
    </>
  )
}
