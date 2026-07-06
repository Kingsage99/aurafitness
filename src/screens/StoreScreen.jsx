import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { PETS } from '../data/pets'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

export const STORE_BORDERS = [
  { id: 'frame_default', label: 'Default',   cost: 0,   icon: '⬜', desc: 'Clean minimal border' },
  { id: 'frame_neon',    label: 'Neon',      cost: 200, icon: '💜', desc: 'Vibrant neon glow' },
  { id: 'frame_flame',   label: 'Flame',     cost: 150, icon: '🔥', desc: 'Fire border effect' },
  { id: 'frame_rose',    label: 'Rose Gold', cost: 250, icon: '🌸', desc: 'Elegant rose gold' },
  { id: 'frame_gold',    label: 'Gold',      cost: 300, icon: '✨', desc: 'Premium gold border' },
  { id: 'frame_crystal', label: 'Crystal',   cost: 500, icon: '💎', desc: 'Rare crystal frame' },
]

export const STORE_BANNERS = [
  { id: 'banner_default', label: 'Default', cost: 0,   icon: '🌑', desc: 'Dark purple gradient' },
  { id: 'banner_sunset',  label: 'Sunset',  cost: 100, icon: '🌅', desc: 'Warm sunset vibes' },
  { id: 'banner_galaxy',  label: 'Galaxy',  cost: 200, icon: '🌌', desc: 'Deep space nebula' },
  { id: 'banner_forest',  label: 'Forest',  cost: 150, icon: '🌿', desc: 'Fresh forest green' },
  { id: 'banner_ocean',   label: 'Ocean',   cost: 175, icon: '🌊', desc: 'Cool ocean waves' },
]

export const STORE_THEMES = [
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

export default function StoreScreen({ gamification = {}, onShopPurchase, onNavigate }) {
  const g = gamification
  const [subTab, setSubTab] = useState('pets')
  const owned = new Set(g.purchasedItems || [])

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

  const subTabs = [{ id: 'pets', label: 'Pets' }, { id: 'borders', label: 'Borders' }, { id: 'banners', label: 'Banners' }, { id: 'designs', label: 'Designs' }, { id: 'gems', label: 'Gems' }, { id: 'lives', label: 'Lives' }]

  // Pet card — real art gets the standard buy flow; teaser slots (no art yet)
  // show as locked mystery cards.
  const PetItem = ({ pet }) => {
    const isOwned = pet.cost === 0 || owned.has(pet.id)
    const isEquipped = (g.activePet || 'pet_panda') === pet.id
    const canAfford = (g.gems ?? 0) >= pet.cost
    const teaser = !pet.image
    return (
      <div style={{ background: NB.white, border: NB_BORDER, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: teaser ? 0.75 : 1 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, border: `2px solid ${NB.ink}`, background: teaser ? '#e8e2ef' : NB.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, overflow: 'hidden' }}>
          {teaser ? '❓' : <img src={pet.image} alt={pet.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: NB.ink }}>{teaser ? '???' : pet.label}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{pet.desc}</div>
        </div>
        {teaser ? (
          <span style={{ fontSize: 10, fontWeight: 800, color: NB.ink, background: NB.lavender, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '4px 10px', whiteSpace: 'nowrap' }}>SOON</span>
        ) : isOwned ? (
          <span style={{ fontSize: 11, fontWeight: 800, color: NB.ink, background: isEquipped ? NB.teal : NB.green, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '4px 10px', whiteSpace: 'nowrap' }}>{isEquipped ? 'Equipped' : 'Owned'}</span>
        ) : (
          <button
            onClick={() => onShopPurchase?.(pet.id, pet.cost)}
            disabled={!canAfford}
            style={{ height: 36, padding: '0 14px', border: `2px solid ${NB.ink}`, borderRadius: 10, whiteSpace: 'nowrap', background: canAfford ? NB.teal : NB.white, color: NB.ink, fontWeight: 800, fontSize: 12, cursor: canAfford ? 'pointer' : 'not-allowed' }}
          >
            {pet.cost} 💎
          </button>
        )}
      </div>
    )
  }

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
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>Store</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 1 }}>{g.gems ?? 0} gems available</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px' }}>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 6, marginBottom: 14, paddingBottom: 2 }}>
          {subTabs.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)} style={{ flexShrink: 0, height: 36, padding: '0 14px', border: `2px solid ${NB.ink}`, borderRadius: 10, background: subTab === t.id ? NB.teal : NB.white, color: NB.ink, fontWeight: subTab === t.id ? 800 : 700, fontSize: 12, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, background: NB.yellow, border: NB_BORDER, borderRadius: 12, padding: '8px 12px' }}>
          <span style={{ width: 12, height: 12, background: NB.blue, border: `1.5px solid ${NB.ink}`, transform: 'rotate(45deg)' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{g.gems ?? 0} gems available</span>
        </div>

        {subTab === 'pets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ border: NB_BORDER, borderRadius: 16, background: NB.lavender, padding: 16 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700 }}>Adopt a companion</div>
              <div style={{ fontSize: 13, color: NB.ink, fontWeight: 700, marginTop: 4 }}>Your pet lives on your profile — keep your lives up to keep it happy</div>
            </div>
            {PETS.map(pet => <PetItem key={pet.id} pet={pet} />)}
          </div>
        )}

        {subTab === 'borders' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{STORE_BORDERS.map(item => <StoreItem key={item.id} item={item} />)}</div>}
        {subTab === 'banners' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{STORE_BANNERS.map(item => <StoreItem key={item.id} item={item} />)}</div>}
        {subTab === 'designs' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{STORE_THEMES.map(item => <StoreItem key={item.id} item={item} />)}</div>}

        {subTab === 'gems' && (
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

        {subTab === 'lives' && (
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
    </>
  )
}
