import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { getDailyQuests, WEEKLY_CHALLENGES, getWeeklyChallengeState } from '../utils/gamification'
import { dateKeyFor } from '../utils/workoutBuilder'
import { renderIcon, GemIcon } from '../components/Icons'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

export default function QuestsScreen({ gamification = {}, onClaimQuest, onClaimChallenge, onNavigate }) {
  const todayStr = dateKeyFor()
  const quests = getDailyQuests(todayStr)
  const completedToday = gamification.dailyQuests?.date === todayStr
    ? (gamification.dailyQuests.completed || [])
    : []
  const claimedToday = gamification.dailyQuests?.date === todayStr
    ? (gamification.dailyQuests.claimed || [])
    : []
  const claimedThisWeek = getWeeklyChallengeState(gamification).claimed

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ background: NB.lavender, padding: '12px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => onNavigate('profile')} style={{ width: 38, height: 38, borderRadius: 12, border: `1.5px solid ${NB.ink}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>Quests</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 1 }}>{completedToday.length} / 3 completed today</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 10, height: 10, border: `1.5px solid ${NB.ink}`, background: i < completedToday.length ? NB.yellow : 'transparent' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
        {/* Daily quests */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Daily Quests</span>
          <span style={{ fontSize: 11, color: '#555' }}>Resets at midnight</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {quests.map(quest => {
            const done = completedToday.includes(quest.id)
            const claimed = claimedToday.includes(quest.id)
            const readyToClaim = done && !claimed
            return (
              <div
                key={quest.id}
                style={{ position: 'relative', ...nbCardStyle(claimed ? NB.green : NB_CARD_NEUTRAL, 3, claimed ? undefined : NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '18px 18px' }}
              >
                {readyToClaim && (
                  <div style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 18, height: 18, borderRadius: 6, border: `2px solid ${NB.ink}`,
                    background: NB.red,
                  }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{renderIcon(quest.icon, 28)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: NB.ink, textDecoration: claimed ? 'line-through' : 'none', marginBottom: 4 }}>{quest.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <GemIcon size={12} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>+{quest.reward} gems</span>
                    </div>
                  </div>
                  {claimed ? (
                    <div style={{ width: 36, height: 36, borderRadius: 11, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                    </div>
                  ) : readyToClaim ? (
                    <button
                      onClick={() => onClaimQuest?.(quest.id)}
                      style={{ height: 38, padding: '0 14px', border: `2px solid ${NB.ink}`, borderRadius: 11, background: NB.yellow, color: NB.ink, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', boxShadow: hardShadow(2), flexShrink: 0 }}
                    >
                      Claim
                    </button>
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 11, border: `2px solid ${NB.ink}`, background: NB.white, flexShrink: 0 }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Weekly challenges — progress derived from real weekly counters */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>Weekly Challenges</div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 14 }}>Bigger rewards · resets Monday</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {WEEKLY_CHALLENGES.map(ch => {
              const progress = ch.progress(gamification)
              const claimed = claimedThisWeek.includes(ch.id)
              const done = progress >= ch.target
              const pct = Math.min(100, Math.round((progress / ch.target) * 100))
              return (
                <div key={ch.id} style={{ ...nbCardStyle(claimed ? NB.green : NB_CARD_NEUTRAL, 3, claimed ? undefined : NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 13, border: `2px solid ${NB.ink}`, background: NB.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{renderIcon(ch.icon, 24)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: NB.ink, textDecoration: claimed ? 'line-through' : 'none' }}>{ch.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <GemIcon size={12} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>+{ch.reward} gems</span>
                      </div>
                    </div>
                    {claimed ? (
                      <div style={{ width: 36, height: 36, borderRadius: 11, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                      </div>
                    ) : done ? (
                      <button
                        onClick={() => onClaimChallenge?.(ch.id)}
                        style={{ height: 38, padding: '0 14px', border: `2px solid ${NB.ink}`, borderRadius: 11, background: NB.yellow, color: NB.ink, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', boxShadow: hardShadow(2), flexShrink: 0 }}
                      >
                        Claim
                      </button>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 10, borderRadius: 5, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: claimed ? NB.ink : NB.magenta }} />
                    </div>
                    <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, color: NB.ink, flexShrink: 0 }}>{Math.min(progress, ch.target)}/{ch.target}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
