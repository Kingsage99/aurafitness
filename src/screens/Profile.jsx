import React, { useState, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { Avatar } from '../components/AvatarSilhouette'
import { uploadAvatar } from '../lib/social'
import { BADGES, FRAMES, AURAS, TIER_COLORS, xpProgress, RANKS, RANK_UP_AT, getDailyQuests } from '../utils/gamification'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const STORE_BORDERS = [
  { id: 'frame_default', label: 'Default',   cost: 0,   icon: '⬜', desc: 'Clean minimal border' },
  { id: 'frame_neon',    label: 'Neon',      cost: 200, icon: '💜', desc: 'Vibrant neon glow' },
  { id: 'frame_flame',   label: 'Flame',     cost: 150, icon: '🔥', desc: 'Fire border effect' },
  { id: 'frame_rose',    label: 'Rose Gold', cost: 250, icon: '🌸', desc: 'Elegant rose gold' },
  { id: 'frame_gold',    label: 'Gold',      cost: 300, icon: '✨', desc: 'Premium gold border' },
  { id: 'frame_crystal', label: 'Crystal',   cost: 500, icon: '💎', desc: 'Rare crystal frame' },
]

const STORE_BANNERS = [
  { id: 'banner_default', label: 'Default', cost: 0,   icon: '🌑', desc: 'Dark purple gradient' },
  { id: 'banner_sunset',  label: 'Sunset',  cost: 100, icon: '🌅', desc: 'Warm sunset vibes' },
  { id: 'banner_galaxy',  label: 'Galaxy',  cost: 200, icon: '🌌', desc: 'Deep space nebula' },
  { id: 'banner_forest',  label: 'Forest',  cost: 150, icon: '🌿', desc: 'Fresh forest green' },
  { id: 'banner_ocean',   label: 'Ocean',   cost: 175, icon: '🌊', desc: 'Cool ocean waves' },
]

const STORE_THEMES = [
  { id: 'theme_default', label: 'Default',   cost: 0,   icon: '💜', desc: 'Classic Aura purple' },
  { id: 'theme_dark',    label: 'Dark Mode', cost: 200, icon: '🖤', desc: 'Sleek dark interface' },
  { id: 'theme_rose',    label: 'Rose',      cost: 150, icon: '🌸', desc: 'Soft rose pink' },
  { id: 'theme_ocean',   label: 'Ocean',     cost: 175, icon: '🔵', desc: 'Ocean blue palette' },
]

const GEM_PACKAGES = [
  { id: 'gems_100',  label: '100 Gems',   gems: 100,  price: '£0.99',  tag: null },
  { id: 'gems_500',  label: '500 Gems',   gems: 500,  price: '£3.99',  tag: '🔥 Popular' },
  { id: 'gems_1200', label: '1,200 Gems', gems: 1200, price: '£7.99',  tag: '+200 Bonus' },
  { id: 'gems_2500', label: '2,500 Gems', gems: 2500, price: '£14.99', tag: '⭐ Best Value' },
]

const LIFE_ITEMS = [
  { id: 'extra_life',    label: 'Extra Life',     icon: '❤️',   desc: 'Restore 1 life immediately',       cost: 50  },
  { id: 'life_refill',   label: 'Full Refill',    icon: '❤️‍🔥', desc: 'Restore all 3 lives at once',    cost: 120 },
  { id: 'streak_freeze', label: 'Streak Freeze',  icon: '🧊',   desc: 'Protect streak for 1 missed day',  cost: 75  },
]

const NAV_TABS = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'medals',    label: 'Medals'    },
  { id: 'quests',    label: 'Quests'    },
  { id: 'store',     label: 'Store'     },
  { id: 'inventory', label: 'Inventory' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'calendar',  label: 'Calendar'  },
]

export default function Profile({ userProfile, session, gamification = {}, onShopPurchase, onNavigate, onUpdateProfile, initialTab = 'overview' }) {
  const g = gamification
  const [activeTab, setActiveTab] = useState(initialTab)
  const [storeSubTab, setStoreSubTab] = useState('borders')
  const [avatarUploading, setAvatarUploading] = useState(false)
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

  // ── StoreItem component ─────────────────────────────────────────────────────
  const StoreItem = ({ item }) => {
    const isOwned = item.cost === 0 || owned.has(item.id)
    const canAfford = (g.gems ?? 0) >= item.cost
    return (
      <div style={{ background: NB.white, border: NB_BORDER, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, border: `2px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: NB.ink }}>{item.label}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{item.desc}</div>
        </div>
        {isOwned ? (
          <span style={{ fontSize: 11, fontWeight: 800, color: NB.ink, background: NB.green, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '4px 10px', whiteSpace: 'nowrap' }}>Owned</span>
        ) : (
          <button
            onClick={() => onShopPurchase?.(item.id, item.cost)}
            disabled={!canAfford}
            style={{ height: 36, padding: '0 14px', border: `2px solid ${NB.ink}`, borderRadius: 10, whiteSpace: 'nowrap', background: canAfford ? NB.teal : NB.white, color: NB.ink, fontWeight: 800, fontSize: 12, cursor: canAfford ? 'pointer' : 'not-allowed' }}
          >
            {item.cost} 💎
          </button>
        )}
      </div>
    )
  }

  // ── Overview tab ────────────────────────────────────────────────────────────
  const OverviewTab = () => (
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

  // ── Medals tab ──────────────────────────────────────────────────────────────
  const MedalsTab = () => {
    const earnedSet = new Set(g.badges || [])
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Medals ({earnedSet.size}/{BADGES.length})</span>
          <button onClick={() => onNavigate('medals')} style={{ fontSize: 12, fontWeight: 700, color: NB.ink, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {BADGES.map(badge => {
            const earned = earnedSet.has(badge.id)
            const tc = TIER_COLORS[badge.tier]
            return (
              <button
                key={badge.id}
                onClick={() => onNavigate('medals')}
                style={{ border: `2px solid ${NB.ink}`, borderRadius: 12, padding: '10px 4px', background: earned ? tc.bg : '#eee', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', opacity: earned ? 1 : 0.5 }}
              >
                <span style={{ fontSize: 20, filter: earned ? 'none' : 'grayscale(1)' }}>{badge.icon}</span>
                <span style={{ fontSize: 7.5, fontWeight: 800, color: NB.ink, textAlign: 'center', lineHeight: 1.2 }}>{badge.label}</span>
              </button>
            )
          })}
        </div>
        <button onClick={() => onNavigate('medals')} style={{ width: '100%', marginTop: 14, height: 48, border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>
          Open Medal Room →
        </button>
      </div>
    )
  }

  // ── Quests tab ──────────────────────────────────────────────────────────────
  const QuestsTab = () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const quests = getDailyQuests(todayStr)
    const completed = g.dailyQuests?.date === todayStr ? (g.dailyQuests.completed || []) : []
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Daily Quests</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: NB.ink, background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 7, padding: '3px 9px' }}>{completed.length}/3</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {quests.map(quest => {
            const done = completed.includes(quest.id)
            return (
              <button
                key={quest.id}
                onClick={() => onNavigate('quests')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: done ? NB.green : NB.white, border: `2px solid ${NB.ink}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: 22 }}>{quest.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink, textDecoration: done ? 'line-through' : 'none' }}>{quest.label}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>+{quest.reward} 💎</div>
                </div>
                {done
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.6"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>
                }
              </button>
            )
          })}
        </div>
        <button onClick={() => onNavigate('quests')} style={{ width: '100%', marginTop: 14, height: 48, border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>
          View Quest Board →
        </button>
      </div>
    )
  }

  // ── Store tab ───────────────────────────────────────────────────────────────
  const StoreTab = () => {
    const subTabs = [{ id: 'borders', label: 'Borders' }, { id: 'banners', label: 'Banners' }, { id: 'designs', label: 'Designs' }, { id: 'gems', label: 'Gems' }, { id: 'lives', label: 'Lives' }]
    return (
      <div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 6, marginBottom: 14, paddingBottom: 2 }}>
          {subTabs.map(t => (
            <button key={t.id} onClick={() => setStoreSubTab(t.id)} style={{ flexShrink: 0, height: 36, padding: '0 14px', border: `2px solid ${NB.ink}`, borderRadius: 10, background: storeSubTab === t.id ? NB.teal : NB.white, color: NB.ink, fontWeight: storeSubTab === t.id ? 800 : 700, fontSize: 12, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, background: NB.yellow, border: NB_BORDER, borderRadius: 12, padding: '8px 12px' }}>
          <span style={{ width: 12, height: 12, background: NB.blue, border: `1.5px solid ${NB.ink}`, transform: 'rotate(45deg)' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{g.gems ?? 0} gems available</span>
        </div>

        {storeSubTab === 'borders' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{STORE_BORDERS.map(item => <StoreItem key={item.id} item={item} />)}</div>}
        {storeSubTab === 'banners' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{STORE_BANNERS.map(item => <StoreItem key={item.id} item={item} />)}</div>}
        {storeSubTab === 'designs' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{STORE_THEMES.map(item => <StoreItem key={item.id} item={item} />)}</div>}

        {storeSubTab === 'gems' && (
          <div>
            <div style={{ border: NB_BORDER, borderRadius: 16, background: NB.lavender, padding: 16, marginBottom: 14 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700 }}>Top up your gems</div>
              <div style={{ fontSize: 13, color: NB.ink, fontWeight: 700, marginTop: 4 }}>Gems never expire — use them to unlock exclusive cosmetics</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {GEM_PACKAGES.map(pkg => (
                <div key={pkg.id} style={{ background: NB.white, border: NB_BORDER, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                  {pkg.tag && <div style={{ position: 'absolute', top: -10, right: 12, background: NB.magenta, color: NB.white, fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '3px 8px', border: `1.5px solid ${NB.ink}` }}>{pkg.tag}</div>}
                  <div style={{ width: 48, height: 48, borderRadius: 13, border: `2px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>💎</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: NB.ink }}>{pkg.label}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{pkg.gems.toLocaleString()} gems</div>
                  </div>
                  <button style={{ height: 36, padding: '0 16px', border: `2px solid ${NB.ink}`, borderRadius: 10, background: NB.teal, color: NB.ink, fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{pkg.price}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {storeSubTab === 'lives' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: NB.red, border: NB_BORDER, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {[1,2,3].map(i => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i <= (g.lives ?? 3) ? NB.white : 'rgba(255,255,255,.3)'}><path d="M12 21.593c-.5-.388-10-6.77-10-12.093 0-3.314 2.686-6 6-6 1.878 0 3.561.888 4.666 2.276C13.771 4.388 15.453 3.5 17.333 3.5 20.648 3.5 23 6.186 23 9.5c0 5.323-9.5 11.705-10 12.093z"/></svg>)}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: NB.white }}>You have {g.lives ?? 3} / 3 lives this week</span>
            </div>
            {LIFE_ITEMS.map(item => {
              const canAfford = (g.gems ?? 0) >= item.cost
              return (
                <div key={item.id} style={{ background: NB.white, border: NB_BORDER, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, border: `2px solid ${NB.ink}`, background: NB.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: NB.ink }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{item.desc}</div>
                  </div>
                  <button onClick={() => onShopPurchase?.(item.id, item.cost)} disabled={!canAfford} style={{ height: 36, padding: '0 14px', border: `2px solid ${NB.ink}`, borderRadius: 10, background: canAfford ? NB.teal : NB.white, color: NB.ink, fontWeight: 800, fontSize: 12, cursor: canAfford ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
                    {item.cost} 💎
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Inventory tab ───────────────────────────────────────────────────────────
  const InventoryTab = () => {
    const allItems = [...STORE_BORDERS, ...STORE_BANNERS, ...STORE_THEMES]
    const ownedItems = allItems.filter(item => item.cost === 0 || owned.has(item.id))
    const categories = [
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

  // ── Nutrition tab ───────────────────────────────────────────────────────────
  const NutritionTab = () => (
    <button onClick={() => onNavigate('meals')} style={{ width: '100%', border: NB_BORDER, borderRadius: 20, boxShadow: hardShadow(5), background: NB.green, padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
      <span style={{ fontSize: 44 }}>🥗</span>
      <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink, marginTop: 12 }}>Nutrition & Meals</div>
      <div style={{ fontSize: 13, color: NB.ink, marginTop: 5 }}>Log meals, track macros & recipes</div>
      <div style={{ marginTop: 16, height: 44, padding: '0 28px', border: `2px solid ${NB.ink}`, borderRadius: 12, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NB.ink, fontWeight: 800, fontSize: 14, textTransform: 'uppercase' }}>Go to Nutrition →</div>
    </button>
  )

  // ── Calendar tab ────────────────────────────────────────────────────────────
  const CalendarTab = () => {
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

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ background: NB.lavender, padding: '18px 18px 18px', flexShrink: 0 }}>
        {/* Settings */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={() => onNavigate('settings')} style={{ width: 38, height: 38, borderRadius: 12, border: `2px solid ${NB.ink}`, background: NB.white, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
        </div>

        {/* Avatar + info centered */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              onClick={() => avatarFileRef.current?.click()}
              style={{ width: 90, height: 90, borderRadius: '50%', border: `3px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
            >
              {avatarUploading
                ? <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2.5px solid ${NB.ink}`, borderTopColor: 'transparent', animation: 'avatarSpin 0.7s linear infinite' }} />
                : <Avatar url={userProfile?.avatarUrl} height={78} color={NB.ink} />
              }
            </div>
            <button
              onClick={() => avatarFileRef.current?.click()}
              style={{ width: 34, height: 34, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
          <style>{`@keyframes avatarSpin { to { transform: rotate(360deg) } }`}</style>

          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink, marginTop: 10 }}>
            {userProfile?.name || 'Aura User'}
          </div>

          {userProfile?.username && (
            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
              @{userProfile.username}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: NB.ink, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '3px 10px' }}>{g.title || 'Beginner'}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: rank.color === '#fff' ? NB.ink : rank.color, background: rank.bg, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '3px 10px' }}>{rankIcon} {rank.label}</span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
            {[
              { icon: '💎', value: g.gems ?? 0,          label: 'gems' },
              { icon: '🔥', value: g.workoutStreak ?? 0,  label: 'streak' },
              { icon: '💪', value: g.totalWorkouts ?? 0,  label: 'total' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: NB.ink, lineHeight: 1.1 }}>{s.value}</span>
                <span style={{ fontFamily: NB.fontMono, fontSize: 9, color: '#555' }}>{s.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3].map(j => <svg key={j} width="11" height="11" viewBox="0 0 24 24" fill={j <= (g.lives ?? 3) ? NB.red : '#fff'} stroke={NB.ink} strokeWidth="1"><path d="M12 21.593c-.5-.388-10-6.77-10-12.093 0-3.314 2.686-6 6-6 1.878 0 3.561.888 4.666 2.276C13.771 4.388 15.453 3.5 17.333 3.5 20.648 3.5 23 6.186 23 9.5c0 5.323-9.5 11.705-10 12.093z"/></svg>)}
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: NB.ink, lineHeight: 1.1 }}>{g.lives ?? 3}</span>
              <span style={{ fontFamily: NB.fontMono, fontSize: 9, color: '#555' }}>lives</span>
            </div>
          </div>

          {/* XP bar */}
          <div style={{ width: '100%', marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink }}>LVL {xp.level}</span>
              <span style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{xp.current} / {xp.needed} XP</span>
            </div>
            <div style={{ height: 8, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
              <div style={{ width: `${xpPct}%`, height: '100%', background: NB.yellow }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable tab nav */}
      <div style={{ background: NB.white, borderBottom: `2.5px solid ${NB.ink}`, flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ padding: '11px 15px', fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: NB.ink, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: `3px solid ${activeTab === tab.id ? NB.magenta : 'transparent'}`, marginBottom: -2.5 }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px' }}>
        {activeTab === 'overview'  && <OverviewTab />}
        {activeTab === 'medals'    && <MedalsTab />}
        {activeTab === 'quests'    && <QuestsTab />}
        {activeTab === 'store'     && <StoreTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'nutrition' && <NutritionTab />}
        {activeTab === 'calendar'  && <CalendarTab />}
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </>
  )
}
