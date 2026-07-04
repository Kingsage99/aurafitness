import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { BADGES, TIER_COLORS } from '../utils/gamification'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

export default function MedalsScreen({ gamification = {}, onNavigate }) {
  const earned = new Set(gamification.badges || [])

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
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.white }}>Medal Room</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>{earned.size} / {BADGES.length} medals earned</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
        {/* Coming soon banner */}
        <div style={{ background: NB.yellow, border: `2.5px dashed ${NB.ink}`, padding: '24px 20px', textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏅</div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, marginBottom: 6 }}>Medal images coming soon</div>
          <div style={{ fontSize: 13, color: NB.ink, lineHeight: 1.5 }}>Unique artwork for every medal is on its way. Keep completing achievements to earn your place on the podium!</div>
        </div>

        {/* Badge grid grouped by tier */}
        {['gold', 'silver', 'bronze'].map(tier => {
          const tierBadges = BADGES.filter(b => b.tier === tier)
          const tc = TIER_COLORS[tier]
          return (
            <div key={tier} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ height: 2, flex: 1, background: NB.ink }} />
                <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: NB.ink, letterSpacing: 1, padding: '3px 10px', background: tc.bg, border: `1.5px solid ${NB.ink}` }}>{tier.toUpperCase()} MEDALS</span>
                <div style={{ height: 2, flex: 1, background: NB.ink }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {tierBadges.map(badge => {
                  const isEarned = earned.has(badge.id)
                  return (
                    <div key={badge.id} style={{ background: isEarned ? tc.bg : '#eee', padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: `2px solid ${NB.ink}`, boxShadow: isEarned ? hardShadow(2) : 'none', opacity: isEarned ? 1 : 0.5 }}>
                      <div style={{ width: 54, height: 54, border: `2px solid ${NB.ink}`, background: isEarned ? NB.white : '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, filter: isEarned ? 'none' : 'grayscale(1)' }}>
                        {badge.icon}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: NB.ink, textAlign: 'center', lineHeight: 1.3 }}>{badge.label}</div>
                      {isEarned && <div style={{ fontFamily: NB.fontMono, fontSize: 9, color: NB.ink, fontWeight: 700, background: NB.white, border: `1px solid ${NB.ink}`, padding: '2px 7px' }}>Earned ✓</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
