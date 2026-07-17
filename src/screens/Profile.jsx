import React, { useState, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import ImageCropSheet from '../components/ImageCropSheet'
import ProBorderRing from '../components/ProBorderRing'
import { Avatar } from '../components/AvatarSilhouette'
import CharacterAvatar from '../components/CharacterAvatar'
import { uploadAvatar } from '../lib/social'
import { FRAMES, AURAS, xpProgress, RANKS, normalizeRankId, SUB_LEVEL_ROMAN, SUB_LEVELS_PER_TIER } from '../utils/gamification'
import { PETS, getActivePet } from '../data/pets'
import { dateKeyFor } from '../utils/workoutBuilder'
import { STORE_BORDERS, STORE_BANNERS, STORE_THEMES } from './StoreScreen'
import { HeartIcon, ShoppingBagsIcon, renderIcon } from '../components/Icons'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW, proTextStyle } from '../styles/neoBrutalism'

// Icon tiles replacing the old text tab bar. Light sections open a bottom
// sheet in place; heavy sections navigate to their own full screen.
const SECTIONS = [
  { id: 'medals',    label: 'Medals',    icon: '🏅', bg: NB.yellow,   screen: 'medals' },
  { id: 'quests',    label: 'Quests',    icon: '🎯', bg: NB.teal,     screen: 'quests' },
  { id: 'store',     label: 'Store',     icon: '🛍️', bg: NB.pink,     screen: 'store' },
  { id: 'inventory', label: 'Inventory', icon: '🎒', bg: NB.green,    sheet: true },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗', bg: NB.cream,    screen: 'meals' },
  { id: 'calendar',  label: 'Calendar',  icon: '📅', bg: NB.white,    sheet: true },
  { id: 'analytics',   label: 'Analytics',   icon: '📈', bg: NB.magenta, screen: 'analytics' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', bg: NB.yellow,  screen: 'leaderboard' },
]

export default function Profile({ userProfile, session, gamification = {}, isProUser = false, onNavigate, onUpdateProfile, onEquipCosmetic, onShopPurchase }) {
  const g = gamification
  const [openSheet, setOpenSheet] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [petVideoFailed, setPetVideoFailed] = useState(false)
  const [petAnimFailed, setPetAnimFailed] = useState(false)
  const avatarFileRef = useRef()
  const [avatarCropFile, setAvatarCropFile] = useState(null)

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setAvatarCropFile(file)
  }

  const handleAvatarCropped = async (croppedFile) => {
    setAvatarCropFile(null)
    if (!session?.user?.id) return
    setAvatarUploading(true)
    const url = await uploadAvatar(session.user.id, croppedFile)
    if (url) onUpdateProfile?.({ avatarUrl: url })
    setAvatarUploading(false)
  }

  const xp      = xpProgress(g.xp || 0)
  const xpPct   = Math.round((xp.current / Math.max(xp.needed, 1)) * 100)
  const rank    = RANKS.find(r => r.id === normalizeRankId(g.rank)) || RANKS[0]
  const owned   = new Set(g.purchasedItems || [])

  const isTopRank = rank.id === RANKS[RANKS.length - 1].id
  const rankRoman = isTopRank ? '' : ` ${SUB_LEVEL_ROMAN[Math.min(g.rankSubLevel || 0, SUB_LEVELS_PER_TIER - 1)]}`

  const pet = getActivePet(g)
  const lives = g.lives ?? 3

  // Equipped cosmetics — frame replaces the border, aura replaces the shadow.
  // An image-based ring frame (bat/bunny/etc.) takes over entirely instead —
  // it overlays around the avatar rather than styling its CSS border.
  const equippedBorder = g.frame ? STORE_BORDERS.find(b => b.id === `frame_${g.frame}`) : null
  const borderImage = equippedBorder?.image || null
  const frameStyle = !borderImage && g.frame && g.frame !== 'default' ? (FRAMES.find(f => f.id === g.frame)?.style || {}) : {}
  const auraStyle  = g.aura && g.aura !== 'basic' ? (AURAS.find(a => a.id === g.aura)?.style || {}) : {}

  // ── Inventory sheet ─────────────────────────────────────────────────────────
  const InventoryContent = () => {
    const ownedPets = PETS.filter(p => p.image && (p.cost === 0 || owned.has(p.id) || (p.legendary && isProUser)))
    const allItems = [...STORE_BORDERS, ...STORE_BANNERS, ...STORE_THEMES]
    const ownedItems = [...ownedPets, ...allItems.filter(item => item.proOnly ? isProUser : (item.cost === 0 || owned.has(item.id)))]
    const categories = [
      { label: 'Pets',     items: ownedPets,                                          type: 'pet' },
      { label: 'Borders',  items: ownedItems.filter(i => i.id.startsWith('frame_')),  type: 'frame' },
      { label: 'Banners',  items: ownedItems.filter(i => i.id.startsWith('banner_')), type: 'banner' },
      { label: 'Designs',  items: ownedItems.filter(i => i.id.startsWith('theme_')),  type: 'theme' },
    ].filter(c => c.items.length > 0)

    const EQUIP_META = {
      pet:    { equippedId: g.activePet, defaultId: 'pet_greycube' },
      frame:  { equippedId: `frame_${g.frame || 'default'}`, defaultId: 'frame_default' },
      banner: { equippedId: g.activeBanner || 'banner_default', defaultId: 'banner_default' },
      theme:  { equippedId: g.activeTheme || 'theme_default', defaultId: 'theme_default' },
    }
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink, marginBottom: 14 }}>Owned ({ownedItems.length} items)</div>
        {ownedItems.length <= 3 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#555', fontSize: 13, marginBottom: 14, ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 14 }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><ShoppingBagsIcon size={32} /></div>
            Visit the Store to unlock more cosmetics!
          </div>
        )}
        {categories.map(cat => {
          const { equippedId, defaultId } = EQUIP_META[cat.type]
          return (
          <div key={cat.label} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', letterSpacing: 1, marginBottom: 8 }}>{cat.label.toUpperCase()}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.items.map(item => {
                const isEquipped = item.id === equippedId
                return (
                <div key={item.id} style={{ background: NB.lavenderMist, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.image ? (
                    <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <span style={{ fontSize: 22 }}>{renderIcon(item.icon)}</span>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{item.desc}</div>
                  </div>
                  {isEquipped ? (
                    item.id === defaultId ? (
                      <span style={{ fontSize: 10, fontWeight: 800, color: NB.ink, background: NB.teal, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>Equipped</span>
                    ) : (
                      <button
                        onClick={() => onEquipCosmetic?.(defaultId)}
                        style={{ fontSize: 10, fontWeight: 800, color: NB.ink, background: NB.teal, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '4px 8px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      >
                        Equipped ✕
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => onEquipCosmetic?.(item.id)}
                      style={{ fontSize: 10, fontWeight: 800, color: NB.ink, background: NB.green, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '4px 8px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                    >
                      Equip
                    </button>
                  )}
                </div>
                )
              })}
            </div>
          </div>
          )
        })}
      </div>
    )
  }

  // ── Calendar sheet ──────────────────────────────────────────────────────────
  const CalendarContent = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const monthName = now.toLocaleString('default', { month: 'long' })
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    const firstOffset = firstDay === 0 ? 6 : firstDay - 1
    const workoutSet = new Set(g.workoutDates || [])
    const todayStr = dateKeyFor(now)
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    const thisMonthCount = (g.workoutDates || []).filter(d => d.startsWith(monthKey)).length

    const cells = []
    for (let i = 0; i < firstOffset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink }}>{monthName} {year}</div>
          <div style={{ fontSize: 12, color: NB.ink, fontWeight: 700, background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '4px 10px' }}>{thisMonthCount} workouts</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`
            const hasWorkout = workoutSet.has(dateStr)
            const isToday = dateStr === todayStr
            return (
              <div key={i} style={{ height: 34, borderRadius: 8, border: isToday ? `2px solid ${NB.ink}` : '1.5px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasWorkout ? NB.teal : isToday ? NB.cream : 'transparent' }}>
                <span style={{ fontSize: 11, fontWeight: hasWorkout || isToday ? 800 : 400, color: NB.ink }}>{day}</span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, background: NB.teal, border: `1.5px solid ${NB.ink}` }} />
            <span style={{ fontSize: 11, color: '#555' }}>Workout day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, border: `2px solid ${NB.ink}` }} />
            <span style={{ fontSize: 11, color: '#555' }}>Today</span>
          </div>
        </div>
      </div>
    )
  }

  const handleSectionTap = (section) => {
    if (section.sheet) setOpenSheet(section.id)
    else onNavigate(section.screen)
  }

  return (
    <>
      <StatusBar />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ background: NB.lavender, padding: '14px 18px 22px' }}>
          <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <style>{`
            @keyframes avatarSpin { to { transform: rotate(360deg) } }
            @keyframes petBob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
            @keyframes petShadow { 0%, 100% { transform: scaleX(1); opacity: 1 } 50% { transform: scaleX(.85); opacity: .7 } }
          `}</style>

          {/* Identity row — who you are, anchored at the top */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Your photo — still used on Home and the squad feed */}
            <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0, zIndex: 0 }}>
              <button
                onClick={() => avatarFileRef.current?.click()}
                style={{ width: 46, height: 46, borderRadius: '50%', border: equippedBorder?.id === 'frame_pro' && isProUser ? 'none' : `2px solid ${NB.ink}`, background: NB.yellow, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', padding: 0, ...frameStyle, ...auraStyle }}
              >
                {avatarUploading
                  ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2.5px solid ${NB.ink}`, borderTopColor: 'transparent', animation: 'avatarSpin 0.7s linear infinite' }} />
                  : userProfile?.avatarUrl
                    ? <Avatar url={userProfile.avatarUrl} height={42} style={{ width: '100%', height: '100%' }} />
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                }
              </button>
              {/* Image-based ring frame — sized/offset per-design (see
                  frameOffset in STORE_BORDERS) so its transparent hole lines
                  up over the round avatar photo above. */}
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
              {equippedBorder?.id === 'frame_pro' && isProUser && <ProBorderRing size={46} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 21, textTransform: 'uppercase', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...(isProUser ? proTextStyle : { color: NB.ink }) }}>
                {userProfile?.name || 'MissVfit User'}
              </div>
              {userProfile?.username && <div style={{ fontSize: 12, color: '#555', fontWeight: 600, marginTop: 4 }}>@{userProfile.username}</div>}
            </div>
            <button onClick={() => onNavigate('settings')} style={{ width: 38, height: 38, borderRadius: 12, border: `2px solid ${NB.ink}`, background: NB.white, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </button>
          </div>

          {/* Pet stage — the companion is the centerpiece */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 2 }}>
            {/* Big rank badge — tap to open the full Rank page */}
            <button
              onClick={() => onNavigate('rankPage')}
              style={{ position: 'absolute', top: 0, right: 2, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img src={rank.image} alt={`${rank.label} rank`} style={{ width: 74, height: 74, objectFit: 'contain', filter: `drop-shadow(${hardShadow(2)})` }} />
              <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: NB.ink, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '1px 6px' }}>
                {rank.label}{rankRoman}
              </span>
            </button>
            {/* willChange promotes the bob onto its own GPU layer so it stays
                smooth while the pet video/animation repaints inside it. A
                dead pet (0 lives) stops bobbing and gets a skull overlay on
                top of the existing grayscale filter — no new art needed. */}
            <div style={{ position: 'relative', width: 230 * (pet.aspect || 1), height: 230, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: lives === 0 ? 'none' : 'petBob 3s ease-in-out infinite', willChange: 'transform' }}>
              {pet.video && !petVideoFailed ? (
                <video
                  src={pet.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setPetVideoFailed(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: lives === 0 ? 'grayscale(1) opacity(.75)' : 'none' }}
                />
              ) : pet.animation && !petAnimFailed ? (
                <img
                  src={pet.animation}
                  alt="Your pet"
                  onError={() => setPetAnimFailed(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: lives === 0 ? 'grayscale(1) opacity(.75)' : 'none' }}
                />
              ) : (
                <CharacterAvatar src={pet.image} size={230} style={{ width: '100%', height: '100%', filter: lives === 0 ? 'grayscale(1) opacity(.75)' : 'none' }} />
              )}
              {lives === 0 && (
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 64, filter: `drop-shadow(${hardShadow(2)})`, pointerEvents: 'none' }}>
                  💀
                </span>
              )}
            </div>
            {/* Ground shadow so the pet stands instead of floats — breathes with the bob.
                The PNG has empty space below the panda's base, so the shadow tucks up under it */}
            <div style={{ width: 130, height: 14, borderRadius: '50%', background: 'rgba(26,26,26,.16)', marginTop: -42, animation: lives === 0 ? 'none' : 'petShadow 3s ease-in-out infinite' }} />

            {/* Nameplate: pet name + health as one plate */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 9, boxShadow: hardShadow(2), overflow: 'hidden' }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, letterSpacing: 1, color: NB.ink, padding: '4px 10px', textTransform: 'uppercase' }}>{pet.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 10px', background: lives === 0 ? '#eee' : NB.pink, borderLeft: `2px solid ${NB.ink}`, alignSelf: 'stretch' }}>
                {[1,2,3].map(j => <HeartIcon key={j} size={11} filled={j <= lives} />)}
              </span>
            </div>
            {lives === 0 && (
              <button
                onClick={() => onShopPurchase?.('revive_pet')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: NB.ink, background: NB.yellow, border: `2px solid ${NB.ink}`, borderRadius: 10, boxShadow: hardShadow(2), padding: '7px 14px', marginTop: 10, cursor: 'pointer' }}
              >
                <span>💀 {pet.label} died — Revive</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: NB.fontMono }}>💎120</span>
              </button>
            )}
          </div>

          {/* Stats card — one unit instead of floating numbers */}
          <div style={{ display: 'flex', marginTop: 12, ...nbCardStyle(NB.white, 2, 'rgba(0,0,0,0.18)'), border: `3px solid ${NB.white}`, borderRadius: 13, overflow: 'hidden' }}>
            {[
              { icon: '💎', value: g.gems ?? 0,          label: 'GEMS' },
              { icon: '🔥', value: g.workoutStreak ?? 0,  label: 'STREAK' },
              { icon: '💪', value: g.totalWorkouts ?? 0,  label: 'WORKOUTS' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 4px 6px', borderLeft: i > 0 ? `2px solid ${NB.ink}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11 }}>{renderIcon(s.icon, 13)}</span>
                  <span style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 900, color: NB.ink, lineHeight: 1 }}>{s.value}</span>
                </div>
                <span style={{ fontFamily: NB.fontMono, fontSize: 7.5, fontWeight: 800, letterSpacing: 1, color: '#555', marginTop: 2 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* XP bar */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink, background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 5, padding: '1px 7px' }}>LVL {xp.level}</span>
              <span style={{ fontSize: 9, color: '#555', fontWeight: 700 }}>{xp.current} / {xp.needed} XP</span>
            </div>
            <div style={{ height: 8, border: `2px solid ${NB.ink}`, borderRadius: 5, background: NB.white, overflow: 'hidden' }}>
              <div style={{ width: `${xpPct}%`, height: '100%', background: NB.yellow, borderRight: xpPct > 0 && xpPct < 100 ? `2px solid ${NB.ink}` : 'none' }} />
            </div>
          </div>
        </div>

        {/* Section icons */}
        <div style={{ borderTop: NB_BORDER, background: NB.bg, padding: '18px 18px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => handleSectionTap(section)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <div style={{ width: 58, height: 58, borderRadius: 16, ...nbCardStyle(section.bg === NB.white ? NB_CARD_NEUTRAL : section.bg, 3, section.bg === NB.white ? NB_CARD_NEUTRAL_SHADOW : undefined), border: `3px solid ${NB.white}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                  {renderIcon(section.icon, 40)}
                </div>
                <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: NB.ink }}>{section.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section sheets */}
      <BottomSheet open={openSheet === 'inventory'} onClose={() => setOpenSheet(null)} title="Inventory">
        <InventoryContent />
      </BottomSheet>
      <BottomSheet open={openSheet === 'calendar'} onClose={() => setOpenSheet(null)} title="Calendar">
        <CalendarContent />
      </BottomSheet>

      <BottomNav active="profile" onNavigate={onNavigate} />

      <ImageCropSheet file={avatarCropFile} shape="circle" onCancel={() => setAvatarCropFile(null)} onCropped={handleAvatarCropped} />
    </>
  )
}
