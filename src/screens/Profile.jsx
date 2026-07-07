import React, { useState, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import { Avatar } from '../components/AvatarSilhouette'
import CharacterAvatar from '../components/CharacterAvatar'
import { uploadAvatar } from '../lib/social'
import { FRAMES, AURAS, xpProgress, RANKS, RANK_UP_AT } from '../utils/gamification'
import { PETS, getActivePet } from '../data/pets'
import { STORE_BORDERS, STORE_BANNERS, STORE_THEMES } from './StoreScreen'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

// Icon tiles replacing the old text tab bar. Light sections open a bottom
// sheet in place; heavy sections navigate to their own full screen.
const SECTIONS = [
  { id: 'overview',  label: 'Overview',  icon: '📊', bg: NB.lavender, sheet: true },
  { id: 'medals',    label: 'Medals',    icon: '🏅', bg: NB.yellow,   screen: 'medals' },
  { id: 'quests',    label: 'Quests',    icon: '🎯', bg: NB.teal,     screen: 'quests' },
  { id: 'store',     label: 'Store',     icon: '🛍️', bg: NB.pink,     screen: 'store' },
  { id: 'inventory', label: 'Inventory', icon: '🎒', bg: NB.green,    sheet: true },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗', bg: NB.cream,    screen: 'meals' },
  { id: 'calendar',  label: 'Calendar',  icon: '📅', bg: NB.white,    sheet: true },
]

export default function Profile({ userProfile, session, gamification = {}, onNavigate, onUpdateProfile }) {
  const g = gamification
  const [openSheet, setOpenSheet] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [petVideoFailed, setPetVideoFailed] = useState(false)
  const [petAnimFailed, setPetAnimFailed] = useState(false)
  const avatarFileRef = useRef()

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !session?.user?.id) return
    setAvatarUploading(true)
    const url = await uploadAvatar(session.user.id, file)
    if (url) onUpdateProfile?.({ avatarUrl: url })
    setAvatarUploading(false)
  }

  const xp      = xpProgress(g.xp || 0)
  const xpPct   = Math.round((xp.current / Math.max(xp.needed, 1)) * 100)
  const rank    = RANKS.find(r => r.id === (g.rank || 'bronze')) || RANKS[0]
  const rpPct   = Math.round(((g.rankPoints || 0) / RANK_UP_AT) * 100)
  const owned   = new Set(g.purchasedItems || [])

  const rankIcon = rank.id === 'bronze' ? '🥉' : rank.id === 'silver' ? '🥈' : rank.id === 'gold' ? '🥇' : rank.id === 'diamond' ? '💎' : rank.id === 'olympian' ? '🏆' : '⭐'

  const pet = getActivePet(g)
  const lives = g.lives ?? 3

  // Equipped cosmetics — frame replaces the border, aura replaces the shadow.
  const frameStyle = g.frame && g.frame !== 'default' ? (FRAMES.find(f => f.id === g.frame)?.style || {}) : {}
  const auraStyle  = g.aura && g.aura !== 'basic' ? (AURAS.find(a => a.id === g.aura)?.style || {}) : {}

  // ── Overview sheet ──────────────────────────────────────────────────────────
  const OverviewContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: rank.bg, border: NB_BORDER, borderRadius: 18, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 26 }}>{rankIcon}</span>
          <div>
            <div style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{rank.label} Rank</div>
            <div style={{ fontSize: 11, color: NB.ink }}>{g.rankPoints || 0} / {RANK_UP_AT} RP to next rank</div>
          </div>
        </div>
        <div style={{ height: 10, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
          <div style={{ width: `${rpPct}%`, height: '100%', background: NB.ink }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: NB.white, border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), padding: 14 }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 9, color: '#555', fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>CURRENT STREAK</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <span style={{ fontFamily: NB.fontDisplay, fontSize: 26, fontWeight: 900, color: NB.ink }}>{g.workoutStreak ?? 0}</span>
            <span style={{ fontSize: 11, color: '#555' }}>days</span>
          </div>
          <div style={{ fontSize: 10, color: '#777', marginTop: 4 }}>Best: {g.longestStreak ?? 0} days</div>
        </div>
        <div style={{ flex: 1, background: NB.magenta, border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), padding: 14 }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 9, color: NB.white, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>THIS WEEK</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 18 }}>💪</span>
            <span style={{ fontFamily: NB.fontDisplay, fontSize: 26, fontWeight: 900, color: NB.white }}>{g.weeklyWorkoutsDone ?? 0}</span>
            <span style={{ fontSize: 11, color: '#f0d9ff' }}>/ {userProfile?.daysPerWeek ?? 3}</span>
          </div>
          <div style={{ fontSize: 10, color: '#f0d9ff', marginTop: 4 }}>Total: {g.totalWorkouts ?? 0} workouts</div>
        </div>
      </div>
    </div>
  )

  // ── Inventory sheet ─────────────────────────────────────────────────────────
  const InventoryContent = () => {
    const ownedPets = PETS.filter(p => p.image && (p.cost === 0 || owned.has(p.id))).map(p => ({ ...p, icon: '🐾' }))
    const allItems = [...STORE_BORDERS, ...STORE_BANNERS, ...STORE_THEMES]
    const ownedItems = [...ownedPets, ...allItems.filter(item => item.cost === 0 || owned.has(item.id))]
    const categories = [
      { label: 'Pets',     items: ownedPets },
      { label: 'Borders',  items: ownedItems.filter(i => i.id.startsWith('frame_')) },
      { label: 'Banners',  items: ownedItems.filter(i => i.id.startsWith('banner_')) },
      { label: 'Designs',  items: ownedItems.filter(i => i.id.startsWith('theme_')) },
    ].filter(c => c.items.length > 0)
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink, marginBottom: 14 }}>Owned ({ownedItems.length} items)</div>
        {ownedItems.length <= 3 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#555', fontSize: 13, marginBottom: 14, background: NB.cream, border: NB_BORDER, borderRadius: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛍️</div>
            Visit the Store to unlock more cosmetics!
          </div>
        )}
        {categories.map(cat => (
          <div key={cat.label} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', letterSpacing: 1, marginBottom: 8 }}>{cat.label.toUpperCase()}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.items.map(item => (
                <div key={item.id} style={{ background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{item.desc}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: NB.ink, background: NB.green, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '3px 8px' }}>Owned</span>
                </div>
              ))}
            </div>
          </div>
        ))}
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
    const todayStr = now.toISOString().slice(0, 10)
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
            <button
              onClick={() => avatarFileRef.current?.click()}
              style={{ width: 46, height: 46, borderRadius: '50%', border: `2px solid ${NB.ink}`, background: NB.yellow, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', padding: 0, flexShrink: 0 }}
            >
              {avatarUploading
                ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2.5px solid ${NB.ink}`, borderTopColor: 'transparent', animation: 'avatarSpin 0.7s linear infinite' }} />
                : userProfile?.avatarUrl
                  ? <Avatar url={userProfile.avatarUrl} height={42} style={{ width: '100%', height: '100%' }} />
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              }
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 21, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile?.name || 'Aura User'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4, flexWrap: 'wrap' }}>
                {userProfile?.username && <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>@{userProfile.username}</span>}
                <span style={{ fontSize: 10, fontWeight: 800, color: NB.ink, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 7, padding: '2px 8px' }}>{g.title || 'Beginner'}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: rank.color === '#fff' ? NB.ink : rank.color, background: rank.bg, border: `1.5px solid ${NB.ink}`, borderRadius: 7, padding: '2px 8px' }}>{rankIcon} {rank.label}</span>
              </div>
            </div>
            <button onClick={() => onNavigate('settings')} style={{ width: 38, height: 38, borderRadius: 12, border: `2px solid ${NB.ink}`, background: NB.white, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </button>
          </div>

          {/* Pet stage — the companion is the centerpiece */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 2 }}>
            {/* willChange promotes the bob onto its own GPU layer so it stays
                smooth while the pet video/animation repaints inside it */}
            <div style={{ width: 230, height: 230, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'petBob 3s ease-in-out infinite', willChange: 'transform', ...frameStyle, ...auraStyle }}>
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
            </div>
            {/* Ground shadow so the pet stands instead of floats — breathes with the bob.
                The PNG has empty space below the panda's base, so the shadow tucks up under it */}
            <div style={{ width: 130, height: 14, borderRadius: '50%', background: 'rgba(26,26,26,.16)', marginTop: -42, animation: 'petShadow 3s ease-in-out infinite' }} />

            {/* Nameplate: pet name + health as one plate */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 9, boxShadow: hardShadow(2), overflow: 'hidden' }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, letterSpacing: 1, color: NB.ink, padding: '4px 10px', textTransform: 'uppercase' }}>{pet.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 10px', background: lives === 0 ? '#eee' : NB.pink, borderLeft: `2px solid ${NB.ink}`, alignSelf: 'stretch' }}>
                {[1,2,3].map(j => <svg key={j} width="11" height="11" viewBox="0 0 24 24" fill={j <= lives ? NB.red : 'rgba(255,255,255,.75)'} stroke={NB.ink} strokeWidth="1"><path d="M12 21.593c-.5-.388-10-6.77-10-12.093 0-3.314 2.686-6 6-6 1.878 0 3.561.888 4.666 2.276C13.771 4.388 15.453 3.5 17.333 3.5 20.648 3.5 23 6.186 23 9.5c0 5.323-9.5 11.705-10 12.093z"/></svg>)}
              </span>
            </div>
            {lives === 0 && (
              <div style={{ fontSize: 10, fontWeight: 700, color: NB.ink, background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 7, padding: '3px 10px', marginTop: 8 }}>
                Your pet needs you! Restore a life in the Store 💔
              </div>
            )}
          </div>

          {/* Stats card — one unit instead of floating numbers */}
          <div style={{ display: 'flex', marginTop: 12, background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 13, boxShadow: hardShadow(2), overflow: 'hidden' }}>
            {[
              { icon: '💎', value: g.gems ?? 0,          label: 'GEMS' },
              { icon: '🔥', value: g.workoutStreak ?? 0,  label: 'STREAK' },
              { icon: '💪', value: g.totalWorkouts ?? 0,  label: 'WORKOUTS' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 4px 6px', borderLeft: i > 0 ? `2px solid ${NB.ink}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11 }}>{s.icon}</span>
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
                <div style={{ width: 58, height: 58, borderRadius: 16, border: `2.5px solid ${NB.ink}`, background: section.bg, boxShadow: hardShadow(3), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                  {section.icon}
                </div>
                <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: NB.ink }}>{section.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section sheets */}
      <BottomSheet open={openSheet === 'overview'} onClose={() => setOpenSheet(null)} title="Overview">
        <OverviewContent />
      </BottomSheet>
      <BottomSheet open={openSheet === 'inventory'} onClose={() => setOpenSheet(null)} title="Inventory">
        <InventoryContent />
      </BottomSheet>
      <BottomSheet open={openSheet === 'calendar'} onClose={() => setOpenSheet(null)} title="Calendar">
        <CalendarContent />
      </BottomSheet>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </>
  )
}
