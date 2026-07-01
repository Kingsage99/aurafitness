import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { BADGES, TIER_COLORS } from '../utils/gamification'

export default function MedalsScreen({ gamification = {}, onNavigate }) {
  const earned = new Set(gamification.badges || [])

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
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff' }}>Medal Room</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 1 }}>{earned.size} / {BADGES.length} medals earned</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
        {/* Coming soon banner */}
        <div style={{ background: 'linear-gradient(135deg,#7C3AED22,#A855F722)', border: '1.5px dashed #A855F7', borderRadius: 22, padding: '24px 20px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏅</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#2E1065', marginBottom: 6 }}>Medal images coming soon</div>
          <div style={{ fontSize: 13, color: '#8478A0', lineHeight: 1.5 }}>Unique artwork for every medal is on its way. Keep completing achievements to earn your place on the podium!</div>
        </div>

        {/* Badge grid grouped by tier */}
        {['gold', 'silver', 'bronze'].map(tier => {
          const tierBadges = BADGES.filter(b => b.tier === tier)
          const tc = TIER_COLORS[tier]
          return (
            <div key={tier} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ height: 1, flex: 1, background: tc.text + '30' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: tc.text, letterSpacing: '.5px', padding: '2px 10px', background: tc.bg, borderRadius: 999 }}>{tier.toUpperCase()} MEDALS</span>
                <div style={{ height: 1, flex: 1, background: tc.text + '30' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {tierBadges.map(badge => {
                  const isEarned = earned.has(badge.id)
                  return (
                    <div key={badge.id} style={{ background: isEarned ? tc.bg : '#F1F5F9', borderRadius: 20, padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: `2px solid ${isEarned ? tc.text + '40' : '#E2E8F0'}`, opacity: isEarned ? 1 : 0.5 }}>
                      <div style={{ width: 54, height: 54, borderRadius: '50%', background: isEarned ? 'white' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, filter: isEarned ? 'none' : 'grayscale(1)', boxShadow: isEarned ? `0 6px 16px ${tc.text}30` : 'none' }}>
                        {badge.icon}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isEarned ? tc.text : '#94A3B8', textAlign: 'center', lineHeight: 1.3 }}>{badge.label}</div>
                      {isEarned && <div style={{ fontSize: 9, color: tc.text, fontWeight: 700, background: 'white', padding: '2px 7px', borderRadius: 999 }}>Earned ✓</div>}
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
