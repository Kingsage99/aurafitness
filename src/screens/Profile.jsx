import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import AvatarSilhouette from '../components/AvatarSilhouette'
import { supabase } from '../lib/supabase'
import { BADGES, FRAMES, AURAS, TIER_COLORS, xpProgress, RANKS, RANK_UP_AT, getDailyQuests } from '../utils/gamification'

const BANNER_GRADIENTS = {
  banner_default: 'linear-gradient(175deg,#12022A,#2E1065,#4C1D95)',
  banner_sunset:  'linear-gradient(175deg,#1A0A00,#7C2D12,#C2410C)',
  banner_galaxy:  'linear-gradient(175deg,#020617,#1E1B4B,#5B21B6)',
  banner_forest:  'linear-gradient(175deg,#052E16,#166534,#15803D)',
  banner_ocean:   'linear-gradient(175deg,#0C1445,#1E3A8A,#1D4ED8)',
}

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

export default function Profile({ userProfile, session, gamification = {}, onShopPurchase, onNavigate, onResetOnboarding, initialTab = 'overview' }) {
  const g = gamification
  const [activeTab, setActiveTab] = useState(initialTab)
  const [signingOut, setSigningOut] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [storeSubTab, setStoreSubTab] = useState('borders')

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
  }
  const handleResetOnboarding = async () => {
    setResetting(true)
    await onResetOnboarding?.()
  }

  const bannerGradient = BANNER_GRADIENTS[g.activeBanner || 'banner_default'] || BANNER_GRADIENTS.banner_default
  const frame   = FRAMES.find(f => f.id === (g.frame || 'default')) || FRAMES[0]
  const aura    = AURAS.find(a => a.id === (g.aura  || 'basic'))   || AURAS[0]
  const xp      = xpProgress(g.xp || 0)
  const xpPct   = Math.round((xp.current / Math.max(xp.needed, 1)) * 100)
  const rank    = RANKS.find(r => r.id === (g.rank || 'bronze')) || RANKS[0]
  const rpPct   = Math.round(((g.rankPoints || 0) / RANK_UP_AT) * 100)
  const owned   = new Set(g.purchasedItems || [])

  const rankIcon = rank.id === 'bronze' ? '🥉' : rank.id === 'silver' ? '🥈' : rank.id === 'gold' ? '🥇' : rank.id === 'diamond' ? '💎' : '🏆'

  // ── StoreItem component ─────────────────────────────────────────────────────
  const StoreItem = ({ item }) => {
    const isOwned = item.cost === 0 || owned.has(item.id)
    const canAfford = (g.gems ?? 0) >= item.cost
    return (
      <div style={{ background: '#fff', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(76,36,120,.05)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#2E1065' }}>{item.label}</div>
          <div style={{ fontSize: 11, color: '#8478A0', marginTop: 1 }}>{item.desc}</div>
        </div>
        {isOwned ? (
          <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', background: '#ECFDF5', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>Owned</span>
        ) : (
          <button
            onClick={() => onShopPurchase?.(item.id, item.cost)}
            disabled={!canAfford}
            style={{ height: 36, padding: '0 14px', borderRadius: 12, whiteSpace: 'nowrap', background: canAfford ? '#7C3AED' : '#EDE4F8', color: canAfford ? '#fff' : '#A99BC4', fontWeight: 800, fontSize: 12, border: 'none', cursor: canAfford ? 'pointer' : 'not-allowed' }}
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
      <div style={{ background: rank.bg, borderRadius: 20, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 26 }}>{rankIcon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: rank.color }}>{rank.label} Rank</div>
            <div style={{ fontSize: 11, color: '#8478A0' }}>{g.rankPoints || 0} / {RANK_UP_AT} RP to next rank</div>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,.08)', overflow: 'hidden' }}>
          <div style={{ width: `${rpPct}%`, height: '100%', background: rank.color, borderRadius: 4 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 18, padding: 14, boxShadow: '0 4px 12px rgba(76,36,120,.06)' }}>
          <div style={{ fontSize: 9, color: '#8478A0', fontWeight: 800, letterSpacing: '.5px', marginBottom: 6 }}>CURRENT STREAK</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#2E1065' }}>{g.workoutStreak ?? 0}</span>
            <span style={{ fontSize: 11, color: '#8478A0' }}>days</span>
          </div>
          <div style={{ fontSize: 10, color: '#A99BC4', marginTop: 4 }}>Best: {g.longestStreak ?? 0} days</div>
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(140deg,#7C3AED,#A855F7)', borderRadius: 18, padding: 14, boxShadow: '0 10px 22px rgba(124,58,237,.26)' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.65)', fontWeight: 800, letterSpacing: '.5px', marginBottom: 6 }}>THIS WEEK</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 18 }}>💪</span>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#fff' }}>{g.weeklyWorkoutsDone ?? 0}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>/ {userProfile?.daysPerWeek ?? 3}</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>Total: {g.totalWorkouts ?? 0} workouts</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={handleResetOnboarding} disabled={resetting} style={{ flex: 1, height: 44, borderRadius: 14, background: '#F3EEFF', color: '#7C3AED', fontWeight: 700, fontSize: 12, border: '1.5px solid #DDD0F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          {resetting ? '…' : 'Redo Onboarding'}
        </button>
        <button onClick={handleSignOut} disabled={signingOut} style={{ flex: 1, height: 44, borderRadius: 14, background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: 12, border: '1.5px solid #FECACA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          {signingOut ? '…' : 'Sign Out'}
        </button>
      </div>
    </div>
  )

  // ── Medals tab ──────────────────────────────────────────────────────────────
  const MedalsTab = () => {
    const earnedSet = new Set(g.badges || [])
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#2E1065' }}>Medals ({earnedSet.size}/{BADGES.length})</span>
          <button onClick={() => onNavigate('medals')} style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {BADGES.map(badge => {
            const earned = earnedSet.has(badge.id)
            const tc = TIER_COLORS[badge.tier]
            return (
              <button
                key={badge.id}
                onClick={() => onNavigate('medals')}
                style={{ borderRadius: 14, padding: '10px 4px', background: earned ? tc.bg : '#F1F5F9', border: `2px solid ${earned ? tc.text + '40' : '#E2E8F0'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', opacity: earned ? 1 : 0.45 }}
              >
                <span style={{ fontSize: 20, filter: earned ? 'none' : 'grayscale(1)' }}>{badge.icon}</span>
                <span style={{ fontSize: 7.5, fontWeight: 800, color: earned ? tc.text : '#94A3B8', textAlign: 'center', lineHeight: 1.2 }}>{badge.label}</span>
              </button>
            )
          })}
        </div>
        <button onClick={() => onNavigate('medals')} style={{ width: '100%', marginTop: 14, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 8px 18px rgba(124,58,237,.28)' }}>
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
          <span style={{ fontSize: 14, fontWeight: 800, color: '#2E1065' }}>Daily Quests</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#F3E8FF', padding: '3px 9px', borderRadius: 999 }}>{completed.length}/3</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {quests.map(quest => {
            const done = completed.includes(quest.id)
            return (
              <button
                key={quest.id}
                onClick={() => onNavigate('quests')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: done ? 'rgba(16,185,129,.06)' : '#fff', borderRadius: 18, padding: '14px 16px', border: `2px solid ${done ? '#10B981' : '#EDE4F8'}`, cursor: 'pointer', textAlign: 'left', boxShadow: '0 4px 12px rgba(76,36,120,.05)' }}
              >
                <span style={{ fontSize: 22 }}>{quest.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: done ? '#8478A0' : '#2E1065', textDecoration: done ? 'line-through' : 'none' }}>{quest.label}</div>
                  <div style={{ fontSize: 11, color: '#A99BC4', marginTop: 2 }}>+{quest.reward} 💎</div>
                </div>
                {done
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#10B981"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A99BC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>
                }
              </button>
            )
          })}
        </div>
        <button onClick={() => onNavigate('quests')} style={{ width: '100%', marginTop: 14, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 8px 18px rgba(124,58,237,.28)' }}>
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
            <button key={t.id} onClick={() => setStoreSubTab(t.id)} style={{ flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 10, background: storeSubTab === t.id ? '#7C3AED' : '#fff', color: storeSubTab === t.id ? '#fff' : '#8478A0', fontWeight: storeSubTab === t.id ? 800 : 700, fontSize: 12, border: `1.5px solid ${storeSubTab === t.id ? '#7C3AED' : '#EDE4F8'}`, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, background: '#F3E8FF', borderRadius: 12, padding: '8px 12px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#A855F7"><path d="M6 3h12l3 6-9 12L3 9z"/></svg>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#2E1065' }}>{g.gems ?? 0} gems available</span>
        </div>

        {storeSubTab === 'borders' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{STORE_BORDERS.map(item => <StoreItem key={item.id} item={item} />)}</div>}
        {storeSubTab === 'banners' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{STORE_BANNERS.map(item => <StoreItem key={item.id} item={item} />)}</div>}
        {storeSubTab === 'designs' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{STORE_THEMES.map(item => <StoreItem key={item.id} item={item} />)}</div>}

        {storeSubTab === 'gems' && (
          <div>
            <div style={{ borderRadius: 18, background: 'linear-gradient(135deg,#2E1065,#7C3AED)', padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 700 }}>Top up your gems</div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginTop: 4, opacity: 0.85 }}>Gems never expire — use them to unlock exclusive cosmetics</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {GEM_PACKAGES.map(pkg => (
                <div key={pkg.id} style={{ background: '#fff', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(76,36,120,.05)', position: 'relative' }}>
                  {pkg.tag && <div style={{ position: 'absolute', top: -8, right: 12, background: '#7C3AED', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>{pkg.tag}</div>}
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>💎</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#2E1065' }}>{pkg.label}</div>
                    <div style={{ fontSize: 11, color: '#8478A0' }}>{pkg.gems.toLocaleString()} gems</div>
                  </div>
                  <button style={{ height: 36, padding: '0 16px', borderRadius: 12, background: '#7C3AED', color: '#fff', fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{pkg.price}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {storeSubTab === 'lives' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#FEF2F2', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {[1,2,3].map(i => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i <= (g.lives ?? 3) ? '#EF4444' : '#E4D8F5'}><path d="M12 21.593c-.5-.388-10-6.77-10-12.093 0-3.314 2.686-6 6-6 1.878 0 3.561.888 4.666 2.276C13.771 4.388 15.453 3.5 17.333 3.5 20.648 3.5 23 6.186 23 9.5c0 5.323-9.5 11.705-10 12.093z"/></svg>)}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>You have {g.lives ?? 3} / 3 lives this week</span>
            </div>
            {LIFE_ITEMS.map(item => {
              const canAfford = (g.gems ?? 0) >= item.cost
              return (
                <div key={item.id} style={{ background: '#fff', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(76,36,120,.05)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#2E1065' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#8478A0', marginTop: 1 }}>{item.desc}</div>
                  </div>
                  <button onClick={() => onShopPurchase?.(item.id, item.cost)} disabled={!canAfford} style={{ height: 36, padding: '0 14px', borderRadius: 12, background: canAfford ? '#7C3AED' : '#EDE4F8', color: canAfford ? '#fff' : '#A99BC4', fontWeight: 800, fontSize: 12, border: 'none', cursor: canAfford ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
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
        <div style={{ fontSize: 13, fontWeight: 800, color: '#2E1065', marginBottom: 14 }}>Owned ({ownedItems.length} items)</div>
        {ownedItems.length <= 3 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#A99BC4', fontSize: 13, marginBottom: 14, background: '#F8F5FF', borderRadius: 18 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛍️</div>
            Visit the Store to unlock more cosmetics!
          </div>
        )}
        {categories.map(cat => (
          <div key={cat.label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#8478A0', letterSpacing: '.5px', marginBottom: 8 }}>{cat.label.toUpperCase()}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.items.map(item => (
                <div key={item.id} style={{ background: '#fff', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 12px rgba(76,36,120,.05)' }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2E1065' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#8478A0' }}>{item.desc}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#10B981', background: '#ECFDF5', padding: '3px 8px', borderRadius: 999 }}>Owned</span>
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
    <button onClick={() => onNavigate('meals')} style={{ width: '100%', borderRadius: 22, background: 'linear-gradient(135deg,#7C3AED,#A855F7)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 12px 28px rgba(124,58,237,.32)' }}>
      <span style={{ fontSize: 44 }}>🥗</span>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff', marginTop: 12 }}>Nutrition & Meals</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 5 }}>Log meals, track macros & recipes</div>
      <div style={{ marginTop: 16, height: 42, padding: '0 28px', borderRadius: 12, background: 'rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>Go to Nutrition →</div>
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
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#2E1065' }}>{monthName} {year}</div>
          <div style={{ fontSize: 12, color: '#7C3AED', fontWeight: 700, background: '#F3E8FF', padding: '4px 10px', borderRadius: 999 }}>{thisMonthCount} workouts</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#A99BC4', padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`
            const hasWorkout = workoutSet.has(dateStr)
            const isToday = dateStr === todayStr
            const isPast = dateStr < todayStr
            return (
              <div key={i} style={{ height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasWorkout ? '#7C3AED' : isToday ? '#F3E8FF' : 'transparent', border: isToday && !hasWorkout ? '2px solid #7C3AED' : 'none' }}>
                <span style={{ fontSize: 11, fontWeight: hasWorkout || isToday ? 800 : 400, color: hasWorkout ? '#fff' : isToday ? '#7C3AED' : isPast ? '#8478A0' : '#C4BAD5' }}>{day}</span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#7C3AED' }} />
            <span style={{ fontSize: 11, color: '#8478A0' }}>Workout day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid #7C3AED' }} />
            <span style={{ fontSize: 11, color: '#8478A0' }}>Today</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <StatusBar />

      {/* Dark gaming header */}
      <div style={{ background: bannerGradient, padding: '10px 18px 18px', flexShrink: 0 }}>
        {/* Redo + Sign out */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
          <button onClick={handleResetOnboarding} disabled={resetting} style={{ height: 30, padding: '0 10px', borderRadius: 9, background: 'rgba(255,255,255,.14)', color: '#fff', fontWeight: 700, fontSize: 11, border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {resetting ? '…' : 'Redo'}
          </button>
          <button onClick={handleSignOut} disabled={signingOut} style={{ height: 30, padding: '0 10px', borderRadius: 9, background: 'rgba(239,68,68,.28)', color: '#fff', fontWeight: 700, fontSize: 11, border: '1px solid rgba(239,68,68,.38)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            {signingOut ? '…' : 'Sign out'}
          </button>
        </div>

        {/* Avatar + info centered */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%,#C4A8E8,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...frame.style, ...aura.style }}>
            <AvatarSilhouette height={78} color='rgba(255,255,255,0.92)' />
          </div>

          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff', marginTop: 10 }}>
            {userProfile?.name || 'Aura User'}
          </div>

          {userProfile?.username && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>
              @{userProfile.username}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.9)', background: 'rgba(255,255,255,.14)', padding: '3px 10px', borderRadius: 999 }}>{g.title || 'Beginner'}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: rank.color, background: rank.bg, padding: '3px 10px', borderRadius: 999 }}>{rankIcon} {rank.label}</span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
            {[
              { icon: '💎', value: g.gems ?? 0,          label: 'gems' },
              { icon: '🔥', value: g.workoutStreak ?? 0,  label: 'streak' },
              { icon: '💪', value: g.totalWorkouts ?? 0,  label: 'total' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{s.value}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,.5)' }}>{s.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3].map(j => <svg key={j} width="11" height="11" viewBox="0 0 24 24" fill={j <= (g.lives ?? 3) ? '#EF4444' : 'rgba(255,255,255,.22)'}><path d="M12 21.593c-.5-.388-10-6.77-10-12.093 0-3.314 2.686-6 6-6 1.878 0 3.561.888 4.666 2.276C13.771 4.388 15.453 3.5 17.333 3.5 20.648 3.5 23 6.186 23 9.5c0 5.323-9.5 11.705-10 12.093z"/></svg>)}
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{g.lives ?? 3}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.5)' }}>lives</span>
            </div>
          </div>

          {/* XP bar */}
          <div style={{ width: '100%', marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.65)' }}>LVL {xp.level}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>{xp.current} / {xp.needed} XP</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}>
              <div style={{ width: `${xpPct}%`, height: '100%', background: 'linear-gradient(90deg,#A78BFA,#E879F9)', borderRadius: 3 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable tab nav */}
      <div style={{ background: '#fff', borderBottom: '1.5px solid #EDE4F8', flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ padding: '11px 15px', fontSize: 12, fontWeight: activeTab === tab.id ? 800 : 600, color: activeTab === tab.id ? '#7C3AED' : '#8478A0', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: `2.5px solid ${activeTab === tab.id ? '#7C3AED' : 'transparent'}`, transition: 'color .15s' }}
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
