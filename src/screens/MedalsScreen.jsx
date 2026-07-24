import React, { useState } from 'react'
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
  '🎯': '/icons/new_quest.png',
  '👑': '/icons/crown.png',
  '⚡': '/icons/bolt.png',
  '🏆': '/icons/trophy.png',
  '🍽️': '/icons/meal-plate-new.png',
  '💪': '/icons/glute.png',
}

// Bump whenever a file in public/medals/ is overwritten in place (e.g. after
// running scripts/crop_medals.py or scripts/recolor_medals.py again) — since
// the filenames stay the same, browsers that already cached the old bytes
// otherwise keep showing stale art until a hard refresh.
const MEDAL_ART_VERSION = 2

// Full custom medal art (ribbon + disc + emblem already composited into one
// image) for every badge — keyed by badge id, not emoji, since it's a
// complete replacement of MedalArt's hand-drawn shape rather than a small
// emblem embossed onto it. Tiered family ids point at their recolored
// variant (see scripts/recolor_medals.py); badges with no entry fall back to
// the hand-drawn medal + BADGE_ICON_IMAGES/emoji below.
const BADGE_MEDAL_IMAGES = Object.fromEntries(Object.entries({
  first_step: '/medals/feet_crown.png',
  fuelled_up: '/medals/fuel_tank_medal.png',
  sweat_session: '/medals/glute_medals.png',
  perfect_week: '/medals/trophy_medal.png',

  streak_bronze: '/medals/fire_medal_bronze.png',
  streak_silver: '/medals/fire_medal_silver.png',
  streak_gold: '/medals/fire_medal.png',

  workouts_bronze: '/medals/crown_medal_bronze.png',
  workouts_silver: '/medals/crown_medal_silver.png',
  workouts_gold: '/medals/crown_medal.png',

  nutrition_bronze: '/medals/nutrition_bowl_bronze.png',
  nutrition_silver: '/medals/nutrition_bowl_silver.png',
  nutrition_gold: '/medals/nutrition_bowl.png',

  cookbook_bronze: '/medals/cookbook_medal_bronze.png',
  cookbook_silver: '/medals/cookbook_medal_silver.png',
  cookbook_gold: '/medals/cookbook_medal.png',

  community_bronze: '/medals/community_medal_bronze.png',
  community_silver: '/medals/community_medal_silver.png',
  community_gold: '/medals/community_medal.png',
}).map(([id, path]) => [id, `${path}?v=${MEDAL_ART_VERSION}`]))

const CATEGORIES = ['All', 'Workouts', 'Nutrition', 'Social', 'Milestones']
function categoryOf(id) {
  if (id.startsWith('streak_') || id.startsWith('workouts_')) return 'Workouts'
  if (id.startsWith('nutrition_')) return 'Nutrition'
  if (id.startsWith('community_')) return 'Social'
  return 'Milestones' // first_step, fuelled_up, sweat_session, cookbook_*, perfect_week
}

// Hand-drawn neo-brutalist medal: twin ribbon tails + struck metal disc,
// with the badge's icon embossed in the centre. Badges in BADGE_MEDAL_IMAGES
// render their own complete medal art instead of this hand-drawn shape.
function MedalArt({ id, tier, icon, earned }) {
  const fullMedal = BADGE_MEDAL_IMAGES[id]
  if (fullMedal) {
    return (
      <img
        src={fullMedal}
        alt=""
        style={{ width: 91, height: 116, objectFit: 'contain', filter: earned ? 'none' : 'grayscale(1)', opacity: earned ? 1 : 0.55 }}
      />
    )
  }
  const m = MEDAL_METALS[tier] || MEDAL_METALS.bronze
  const iconImg = BADGE_ICON_IMAGES[icon]
  return (
    <svg width="96" height="108" viewBox="0 0 64 72" style={{ filter: earned ? 'none' : 'grayscale(1)', opacity: earned ? 1 : 0.55 }}>
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

function chipStyle(active) {
  return {
    flexShrink: 0, padding: '6px 12px', border: `2px solid ${NB.ink}`, borderRadius: 10,
    background: active ? NB.magenta : NB.white,
    color: NB.ink,
    fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
  }
}

export default function MedalsScreen({ gamification = {}, onNavigate }) {
  const earned = new Set(gamification.badges || [])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

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

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search medals..."
          style={{ width: '100%', marginTop: 14, padding: '9px 12px', border: `1.5px solid ${NB.ink}`, borderRadius: 10, background: NB.white, fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={chipStyle(category === c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
        {/* Badge grid grouped by tier, filtered by search + category */}
        {['gold', 'silver', 'bronze', 'starter'].map(tier => {
          const tierBadges = BADGES
            .filter(b => b.tier === tier)
            .filter(b => category === 'All' || categoryOf(b.id) === category)
            .filter(b => !search.trim() || b.label.toLowerCase().includes(search.trim().toLowerCase()))
          if (tierBadges.length === 0) return null
          const tc = TIER_COLORS[tier]
          return (
            <div key={tier} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ height: 2, flex: 1, background: NB.ink }} />
                <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: NB.ink, letterSpacing: 1, padding: '3px 10px', background: tc.bg, border: `1.5px solid ${NB.ink}`, borderRadius: 8 }}>{tier.toUpperCase()} MEDALS</span>
                <div style={{ height: 2, flex: 1, background: NB.ink }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {tierBadges.map(badge => {
                  const isEarned = earned.has(badge.id)
                  return (
                    <div key={badge.id} style={{ background: isEarned ? tc.bg : '#eee', padding: '10px 4px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: 'none', borderRadius: 14 }}>
                      <MedalArt id={badge.id} tier={tier} icon={badge.icon} earned={isEarned} />
                      <div style={{ fontSize: 11, fontWeight: 800, color: NB.ink, textAlign: 'center', lineHeight: 1.3, opacity: isEarned ? 1 : 0.55 }}>{badge.label}</div>
                      {isEarned && <div style={{ fontFamily: NB.fontMono, fontSize: 9, color: NB.ink, fontWeight: 700, background: NB.white, border: `1px solid ${NB.ink}`, borderRadius: 16, padding: '2px 7px' }}>Earned ✓</div>}
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
