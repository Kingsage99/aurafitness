import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { BADGES, TIER_COLORS } from '../utils/gamification'
import { NB } from '../styles/neoBrutalism'

// Literal metal tones for the medal discs (matches the rank-tier decision:
// bronze/silver/gold stay real metals, not palette pastels)
const MEDAL_METALS = {
  gold:   { disc: '#FFC93C', rim: '#A16207', ribbonA: '#B48CF2', ribbonB: '#9366E6' },
  silver: { disc: '#C7CDD6', rim: '#64748B', ribbonA: '#7FE6D0', ribbonB: '#4A7A6E' },
  bronze: { disc: '#CD7F32', rim: '#7C3F0E', ribbonA: '#F79AC6', ribbonB: '#C2557F' },
}

// Custom art exists for some badge emoji already (see scripts/medal-icons.json);
// the rest still emboss the raw emoji as SVG text until art is commissioned.
const BADGE_ICON_IMAGES = {
  '🥗': '/icons/bowl.png',
  '🎯': '/icons/quest.png',
  '👑': '/icons/crown.png',
  '⚡': '/icons/bolt.png',
  '🏆': '/icons/trophy.png',
  '🍽️': '/icons/meal-plate-new.png',
  '💪': '/icons/glute.png',
}

// Hand-drawn neo-brutalist medal: twin ribbon tails + struck metal disc,
// with the badge's icon embossed in the centre.
function MedalArt({ tier, icon, earned }) {
  const m = MEDAL_METALS[tier] || MEDAL_METALS.bronze
  const iconImg = BADGE_ICON_IMAGES[icon]
  return (
    <svg width="64" height="72" viewBox="0 0 64 72" style={{ filter: earned ? 'none' : 'grayscale(1)', opacity: earned ? 1 : 0.55 }}>
      {/* Ribbon tails */}
      <path d="M20 2 L32 26 L14 34 L8 8 Z" fill={m.ribbonA} stroke={NB.ink} strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 2 L32 26 L50 34 L56 8 Z" fill={m.ribbonB} stroke={NB.ink} strokeWidth="2" strokeLinejoin="round" />
      {/* Disc */}
      <circle cx="32" cy="46" r="22" fill={m.disc} stroke={NB.ink} strokeWidth="2.5" />
      <circle cx="32" cy="46" r="16" fill="none" stroke={m.rim} strokeWidth="2" strokeDasharray="3 3" />
      {/* Emblem */}
      {iconImg
        ? <image href={iconImg} x="20" y="34" width="24" height="24" />
        : <text x="32" y="53" textAnchor="middle" fontSize="18">{icon}</text>}
    </svg>
  )
}

export default function MedalsScreen({ gamification = {}, onNavigate }) {
  const earned = new Set(gamification.badges || [])

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
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>Medal Room</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 1 }}>{earned.size} / {BADGES.length} medals earned</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
        {/* Badge grid grouped by tier */}
        {['gold', 'silver', 'bronze'].map(tier => {
          const tierBadges = BADGES.filter(b => b.tier === tier)
          const tc = TIER_COLORS[tier]
          return (
            <div key={tier} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ height: 2, flex: 1, background: NB.ink }} />
                <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: NB.ink, letterSpacing: 1, padding: '3px 10px', background: tc.bg, border: `1.5px solid ${NB.ink}`, borderRadius: 8 }}>{tier.toUpperCase()} MEDALS</span>
                <div style={{ height: 2, flex: 1, background: NB.ink }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {tierBadges.map(badge => {
                  const isEarned = earned.has(badge.id)
                  return (
                    <div key={badge.id} style={{ background: isEarned ? tc.bg : '#eee', padding: '12px 8px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', borderRadius: 14 }}>
                      <MedalArt tier={tier} icon={badge.icon} earned={isEarned} />
                      <div style={{ fontSize: 10, fontWeight: 800, color: NB.ink, textAlign: 'center', lineHeight: 1.3, opacity: isEarned ? 1 : 0.55 }}>{badge.label}</div>
                      {isEarned && <div style={{ fontFamily: NB.fontMono, fontSize: 9, color: NB.ink, fontWeight: 700, background: NB.white, border: `1px solid ${NB.ink}`, borderRadius: 6, padding: '2px 7px' }}>Earned ✓</div>}
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
