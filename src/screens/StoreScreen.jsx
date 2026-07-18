import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { PETS } from '../data/pets'
import { GemIcon, HeartIcon, StarIcon, LockIcon, renderIcon } from '../components/Icons'
import ProBorderRing from '../components/ProBorderRing'
import { startGemCheckout, GEM_STRIPE_PRICES } from '../lib/stripe'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL_SHADOW, NB_PRO_GRADIENT } from '../styles/neoBrutalism'

export const STORE_BORDERS = [
  { id: 'frame_default', label: 'Default',   cost: 0,   icon: '⬜', desc: 'Clean minimal border' },
  { id: 'frame_neon',    label: 'Neon',      cost: 200, icon: '💜', desc: 'Vibrant neon glow' },
  { id: 'frame_flame',   label: 'Flame',     cost: 150, icon: '🔥', desc: 'Fire border effect' },
  { id: 'frame_rose',    label: 'Rose Gold', cost: 250, icon: '🌸', desc: 'Elegant rose gold' },
  { id: 'frame_gold',    label: 'Gold',      cost: 300, icon: '✨', desc: 'Premium gold border' },
  { id: 'frame_crystal', label: 'Crystal',   cost: 500, icon: '💎', desc: 'Rare crystal frame' },
  // Image-based ring frames — a separate set from the CSS glows above. Each
  // has an `image` (transparent PNG ring) rendered as an overlay around the
  // avatar photo in Profile.jsx, instead of a CSS border/boxShadow.
  // frameOffset (top/left/size, all px) was hand-calibrated per design with
  // the Border Calibrator tool — https://claude.ai/code/artifact/fb2e1170-32e4-4ef3-ab68-dd3c1ae05971
  // (drag-and-resize UI against the real 46px avatar). Use it again for any
  // future borders rather than guessing offsets.
  { id: 'frame_cat',       label: 'Cat',       cost: 400, icon: '🐱', desc: 'Cat ears ring frame',   image: '/borders/cat.png',       frameOffset: { top: -29, left: -36, size: 120 } },
  { id: 'frame_devil',     label: 'Devil',     cost: 400, icon: '😈', desc: 'Devil horns ring frame', image: '/borders/devil.png',    frameOffset: { top: -31, left: -39, size: 124 } },
  { id: 'frame_fox',       label: 'Fox',       cost: 400, icon: '🦊', desc: 'Fox ears ring frame',   image: '/borders/fox.png',       frameOffset: { top: -29, left: -36, size: 120 } },
  { id: 'frame_glitch',    label: 'Glitch',    cost: 400, icon: '📶', desc: 'Glitch ring frame',     image: '/borders/glitch.png',    frameOffset: { top: -29, left: -36, size: 120 } },
  { id: 'frame_love',      label: 'Love',      cost: 400, icon: '💕', desc: 'Heart ring frame',      image: '/borders/love.png',      frameOffset: { top: -29, left: -36, size: 120 } },
  { id: 'frame_plant',     label: 'Plant',     cost: 400, icon: '🌿', desc: 'Leafy ring frame',      image: '/borders/plant.png',     frameOffset: { top: -31, left: -39, size: 124 } },
  { id: 'frame_reindeer',  label: 'Reindeer',  cost: 400, icon: '🦌', desc: 'Reindeer antler ring frame', image: '/borders/reindeer.png', frameOffset: { top: -29, left: -39, size: 120 } },
  { id: 'frame_unicorn',   label: 'Unicorn',   cost: 400, icon: '🦄', desc: 'Unicorn ring frame',    image: '/borders/unicorn.png',   frameOffset: { top: -29, left: -36, size: 120 } },
  { id: 'frame_witch',     label: 'Witch',     cost: 400, icon: '🧙', desc: 'Witch hat ring frame',  image: '/borders/witch.png',     frameOffset: { top: -29, left: -39, size: 120 } },
  // Pro-exclusive border — CSS-rendered (blue/purple gradient ring + crown
  // overlay), not a raster image, so it has no `image`/`frameOffset` — the
  // avatar components special-case `id === 'frame_pro'` instead.
  { id: 'frame_pro', label: 'MissVfit Pro', cost: 0, icon: '👑', desc: 'Exclusive shiny ring for Pro members', proOnly: true },
]

export const STORE_BANNERS = [
  { id: 'banner_default',  label: 'Clouds',   cost: 0,   icon: '☁️', desc: 'Dreamy soft clouds',  image: '/banner/clouds.png' },
  { id: 'banner_sunset',   label: 'Sunset',   cost: 100, icon: '🌅', desc: 'Warm sunset skies',   image: '/banner/sunset.png' },
  { id: 'banner_beach',    label: 'Beach',    cost: 150, icon: '🏖️', desc: 'Sandy beach vibes',   image: '/banner/beach.png' },
  { id: 'banner_mountain', label: 'Mountain', cost: 150, icon: '⛰️', desc: 'Mountain horizon',    image: '/banner/mountain.png' },
  { id: 'banner_cat',      label: 'Cat',      cost: 250, icon: '🐱', desc: 'Cute cat banner',     image: '/banner/cat.png' },
]

// Gradient fallbacks — shown behind the banner image so the profile banner
// never looks broken if a PNG is missing.
const BANNER_GRADIENTS = {
  banner_default:  'linear-gradient(135deg, #C9D6FF, #E2E2F0)',
  banner_sunset:   'linear-gradient(135deg, #F79AC6, #F7CF4A)',
  banner_beach:    'linear-gradient(135deg, #7FD0E6, #F7E7B0)',
  banner_mountain: 'linear-gradient(135deg, #6D7B9A, #C9D6FF)',
  banner_cat:      'linear-gradient(135deg, #E7DCFB, #B48CF2)',
}

// The gradient fallback for a banner (shown behind the image, or alone if the
// PNG isn't present yet).
export function bannerGradientFor(bannerId) {
  const id = bannerId || 'banner_default'
  return BANNER_GRADIENTS[id] || BANNER_GRADIENTS.banner_default
}

// The banner PNG path, or null.
export function bannerImageFor(bannerId) {
  const id = bannerId || 'banner_default'
  return STORE_BANNERS.find(b => b.id === id)?.image || null
}

// Convenience CSS-background version (used where an <img> layer isn't practical).
export function bannerStyleFor(bannerId) {
  const grad = bannerGradientFor(bannerId)
  const img = bannerImageFor(bannerId)
  return {
    backgroundImage: img ? `url(${img}), ${grad}` : grad,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}

export const STORE_THEMES = [
  { id: 'theme_default', label: 'Default',   cost: 0,   icon: '💜', desc: 'Classic MissVfit purple' },
  { id: 'theme_dark',    label: 'Dark Mode', cost: 200, icon: '🖤', desc: 'Sleek dark interface' },
  { id: 'theme_rose',    label: 'Rose',      cost: 150, icon: '🌸', desc: 'Soft rose pink' },
  { id: 'theme_ocean',   label: 'Ocean',     cost: 175, icon: '🔵', desc: 'Ocean blue palette' },
]

const THEME_GRADIENTS = {
  theme_default: `linear-gradient(155deg, ${NB.magenta}, ${NB.purpleDeep})`,
  theme_dark:    'linear-gradient(155deg, #4a4a52, #16151c)',
  theme_rose:    `linear-gradient(155deg, ${NB.pink}, ${NB.roseGold})`,
  theme_ocean:   `linear-gradient(155deg, #7FD0E6, ${NB.purpleDeep})`,
}

// One shared size for the CSS-glow circle, the Pro conic-gradient ring, and
// the Designs theme circle — calibrated via the Store Card Calibrator.
const BORDER_ICON_SIZE = 95
// Image-ring PNGs (cat/devil/fox/etc.) get their own independent box —
// growing BORDER_ICON_SIZE above never resizes these, and vice versa — since
// a PNG's own size/crop/position has nothing to do with a CSS gradient's
// size (a shared size looked right in the tool but read visibly smaller
// once the PNGs' baked-in transparent padding was accounted for). Zoom/
// offset fine-tune the crop within that box. Tune via the calibrator.
const BORDER_IMG_BOX_SIZE = 176
const BORDER_IMG_ZOOM = 1
const BORDER_IMG_OFFSET_X = 1
const BORDER_IMG_OFFSET_Y = 11

const BORDER_GRADIENTS = {
  frame_default: NB.lavenderMist,
  frame_neon:    `linear-gradient(155deg, ${NB.magenta}, #6B3FA0)`,
  frame_flame:   `linear-gradient(155deg, ${NB.yellow}, ${NB.pink})`,
  frame_rose:    `linear-gradient(155deg, #F9C9DE, ${NB.roseGold})`,
  frame_gold:    `linear-gradient(155deg, ${NB.yellow}, ${NB.roseGold})`,
  frame_crystal: `linear-gradient(155deg, ${NB.tealLight}, ${NB.magenta})`,
}

const GEM_PACKAGES = [
  { id: 'gems_100',  label: '100 Gems',   gems: 100,  price: '£0.99',  tag: null },
  { id: 'gems_500',  label: '500 Gems',   gems: 500,  price: '£3.99',  tag: '🔥 Popular' },
  { id: 'gems_1200', label: '1,200 Gems', gems: 1200, price: '£7.99',  tag: '+200 Bonus' },
  { id: 'gems_2500', label: '2,500 Gems', gems: 2500, price: '£14.99', tag: '⭐ Best Value' },
]

const LIFE_ITEMS = [
  { id: 'extra_life',    label: 'Extra Life',     icon: '❤️',   desc: 'Restore 1 life immediately',       cost: 50  },
  { id: 'life_refill',   label: 'Full Refill',    icon: '❤️‍🔥', desc: 'Restore all 3 lives at once',    cost: 120, image: '/icons/revive_heart.png' },
  { id: 'streak_freeze', label: 'Streak Freeze',  icon: '🧊',   desc: 'Protect streak for 1 missed day',  cost: 75,  image: '/icons/frezze_streak.png' },
]

// ── Shared grid-card primitive ──────────────────────────────────────────────
// One tap-target per item: name overlaid straight on the themed card face,
// a big preview filling most of the card, and cost/status as a small pill
// "docked" at the bottom of the preview — no separate footer plate. Every
// store tab renders a 2-up grid of these instead of the old icon-and-text
// list rows.
function GridCard({ bg, preview, label, sublabel, labelColor = NB.white, badge, corner, locked, dim, onClick, disabled }) {
  const lightLabel = labelColor === NB.white
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative', textAlign: 'center', cursor: disabled ? 'default' : 'pointer',
        border: NB_BORDER, borderRadius: 20, boxShadow: hardShadow(4), overflow: 'hidden',
        background: bg, aspectRatio: '0.81', display: 'flex', flexDirection: 'column',
        padding: '11px 8px 9px', opacity: dim ? 0.6 : 1, WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase',
        color: labelColor, textShadow: lightLabel ? '0 1px 4px rgba(0,0,0,.45)' : 'none',
        lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
      {sublabel && (
        <div style={{
          fontSize: 9.5, fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: lightLabel ? 'rgba(255,255,255,.88)' : 'rgba(26,26,26,.6)',
        }}>
          {sublabel}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, padding: '2px 0' }}>
        {preview}
      </div>
      {badge && <div style={{ display: 'flex', justifyContent: 'center' }}>{badge}</div>}
      {corner && <div style={{ position: 'absolute', top: 34, right: 8 }}>{corner}</div>}
      {locked && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,14,32,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.92)', border: `2px solid ${NB.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
          </div>
        </div>
      )}
    </button>
  )
}

// The little "docked" card that sits at the bottom of the preview area —
// cost in gems, or a status word once owned/equipped/locked.
const costBadge = (cost, canAfford) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, background: NB.white,
    border: `2px solid ${NB.ink}`, borderRadius: 10, padding: '4px 10px',
    fontFamily: NB.fontMono, fontWeight: 800, fontSize: 12, color: canAfford ? NB.ink : '#aaa',
    boxShadow: hardShadow(2),
  }}>
    {cost} <GemIcon size={12} />
  </span>
)
const statusBadge = (text, bg) => (
  <span style={{
    display: 'inline-block', background: bg, border: `2px solid ${NB.ink}`, borderRadius: 10,
    padding: '4px 10px', fontFamily: NB.fontMono, fontWeight: 800, fontSize: 11, color: NB.ink,
    boxShadow: hardShadow(2),
  }}>
    {text}
  </span>
)

export default function StoreScreen({ gamification = {}, isProUser = false, onShopPurchase, onEquipPet, onNavigate, onNotify }) {
  const g = gamification
  const [subTab, setSubTab] = useState('pets')
  const [buyingGemPkg, setBuyingGemPkg] = useState(null)
  const owned = new Set(g.purchasedItems || [])

  const subTabs = [{ id: 'pets', label: 'Pets' }, { id: 'borders', label: 'Borders' }, { id: 'banners', label: 'Banners' }, { id: 'designs', label: 'Designs' }, { id: 'gems', label: 'Gems' }, { id: 'lives', label: 'Lives' }]

  // ── Cosmetic card (borders / banners / designs) ──────────────────────────
  const CosmeticCard = ({ item, category }) => {
    const locked = item.proOnly && !isProUser
    const isOwned = !locked && (item.proOnly || item.cost === 0 || owned.has(item.id))
    const canAfford = (g.gems ?? 0) >= item.cost

    // Banners skip the neo-brutalist card treatment entirely — a plain white
    // picture-frame outline around the (un-cropped) image instead, since a
    // thick ink border + hard shadow fights the photo rather than framing it.
    if (category === 'banners') {
      const badge = isOwned ? statusBadge('Owned', NB.green) : costBadge(item.cost, canAfford)
      return (
        <GridCard
          bg={bannerGradientFor(item.id)}
          preview={
            <div style={{ width: 'calc(100% + 10px)', margin: '0 -5px', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden' }}>
              <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          }
          label={item.label}
          badge={badge}
          dim={!isOwned && !canAfford}
          disabled={isOwned || !canAfford}
          onClick={() => onShopPurchase?.(item.id, item.cost)}
        />
      )
    }

    let bg = NB.lavenderMist
    let preview
    let labelColor = NB.white
    if (category === 'designs') {
      bg = THEME_GRADIENTS[item.id] || NB.lavenderMist
      preview = <div style={{ width: BORDER_ICON_SIZE, height: BORDER_ICON_SIZE, borderRadius: '50%', background: 'rgba(255,255,255,.25)', border: '3px solid rgba(255,255,255,.7)' }} />
    } else if (category === 'borders') {
      if (item.id === 'frame_pro') {
        bg = `linear-gradient(160deg, #241a38, #120c1e)`
        preview = (
          <div style={{ position: 'relative', width: BORDER_ICON_SIZE, height: BORDER_ICON_SIZE, zIndex: 0 }}>
            <div style={{ width: BORDER_ICON_SIZE, height: BORDER_ICON_SIZE, borderRadius: '50%', background: NB.lavender, border: `3px solid ${NB.white}` }} />
            <ProBorderRing size={BORDER_ICON_SIZE} />
          </div>
        )
      } else if (item.image) {
        bg = NB.white
        labelColor = NB.ink
        // Independent box (BORDER_IMG_BOX_SIZE), not BORDER_ICON_SIZE — see
        // the comment on that constant. Zoom crops within the box to
        // compensate for the PNG's baked-in transparent padding; offset
        // nudges the art if it isn't centered the way it should be.
        preview = (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: BORDER_IMG_BOX_SIZE, height: BORDER_IMG_BOX_SIZE, overflow: 'hidden' }}>
            <img
              src={item.image} alt=""
              style={{
                width: BORDER_IMG_BOX_SIZE * BORDER_IMG_ZOOM, height: BORDER_IMG_BOX_SIZE * BORDER_IMG_ZOOM, objectFit: 'contain',
                transform: `translate(${BORDER_IMG_OFFSET_X}px, ${BORDER_IMG_OFFSET_Y}px)`,
              }}
            />
          </span>
        )
      } else {
        bg = BORDER_GRADIENTS[item.id] || NB.lavenderMist
        labelColor = item.id === 'frame_default' ? NB.ink : NB.white
        preview = <div style={{ width: BORDER_ICON_SIZE, height: BORDER_ICON_SIZE, borderRadius: '50%', background: 'rgba(255,255,255,.3)', border: '3px solid rgba(255,255,255,.75)' }} />
      }
    }

    const badge = locked
      ? statusBadge('Pro Only', NB.lavender)
      : isOwned
        ? statusBadge('Owned', NB.green)
        : costBadge(item.cost, canAfford)

    return (
      <GridCard
        bg={bg}
        preview={preview}
        label={item.label}
        labelColor={labelColor}
        badge={badge}
        locked={locked}
        dim={!locked && !isOwned && !canAfford}
        disabled={locked || isOwned || !canAfford}
        onClick={() => onShopPurchase?.(item.id, item.cost)}
      />
    )
  }

  // Pet card — real art gets the standard buy flow; teaser slots (no art yet)
  // show as locked mystery cards.
  const PetCard = ({ pet }) => {
    const freeWithPro = pet.legendary && isProUser
    const isOwned = pet.cost === 0 || owned.has(pet.id) || freeWithPro
    const isEquipped = (g.activePet || 'pet_greycube') === pet.id
    const canAfford = (g.gems ?? 0) >= pet.cost
    const teaser = !pet.image

    const badge = teaser
      ? statusBadge('Soon', NB.lavender)
      : isEquipped
        ? statusBadge('Equipped', NB.teal)
        : isOwned
          ? statusBadge('Owned', NB.green)
          : costBadge(pet.cost, canAfford)

    return (
      <GridCard
        bg={NB.lavenderMist}
        labelColor={NB.ink}
        preview={teaser
          ? <span style={{ fontSize: 78 }}>❓</span>
          : <img src={pet.image} alt={pet.label} style={{ width: '98%', height: '98%', objectFit: 'contain' }} />}
        label={teaser ? '???' : pet.label}
        sublabel={pet.legendary && !isOwned ? 'Free with Pro' : null}
        badge={badge}
        dim={teaser || (!isOwned && !canAfford)}
        disabled={teaser || isOwned}
        onClick={() => isOwned ? onEquipPet?.(pet.id) : onShopPurchase?.(pet.id, pet.cost)}
      />
    )
  }

  const handleBuyGems = async (pkg) => {
    const priceId = GEM_STRIPE_PRICES[pkg.id]
    if (!priceId) { onNotify?.("This gem package isn't set up yet — check back soon."); return }
    setBuyingGemPkg(pkg.id)
    try {
      await startGemCheckout(priceId)
    } catch (err) {
      onNotify?.(err.message || 'Could not start checkout')
      setBuyingGemPkg(null)
    }
  }

  const GemCard = ({ pkg }) => {
    const busy = buyingGemPkg === pkg.id
    return (
      <GridCard
        bg={`linear-gradient(160deg, ${NB.yellow}, ${NB.roseGold})`}
        labelColor={NB.ink}
        preview={<GemIcon size={87} />}
        label={pkg.label}
        corner={pkg.tag && <span style={{ fontSize: 9, fontWeight: 800, color: NB.white, background: NB.magenta, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap' }}>{pkg.tag}</span>}
        badge={<span style={{ display: 'inline-block', background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 10, padding: '4px 10px', fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, color: NB.ink, boxShadow: hardShadow(2) }}>{busy ? '…' : pkg.price}</span>}
        dim={busy}
        disabled={busy || !!buyingGemPkg}
        onClick={() => handleBuyGems(pkg)}
      />
    )
  }

  const LifeCard = ({ item }) => {
    const canAfford = (g.gems ?? 0) >= item.cost
    return (
      <GridCard
        bg={`linear-gradient(160deg, ${NB.pink}, ${NB.red})`}
        preview={item.image
          ? <img src={item.image} alt="" style={{ width: '96%', height: '96%', objectFit: 'contain' }} />
          : <span style={{ fontSize: 78 }}>{renderIcon(item.icon, 78)}</span>}
        label={item.label}
        sublabel={item.desc}
        badge={costBadge(item.cost, canAfford)}
        dim={!canAfford}
        onClick={() => onShopPurchase?.(item.id, item.cost)}
      />
    )
  }

  const grid = (children) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>{children}</div>

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ background: NB.lavender, padding: '12px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => onNavigate('profile')} style={{ width: 38, height: 38, borderRadius: 12, border: `1.5px solid ${NB.ink}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink, flex: 1 }}>Store</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 12, padding: '6px 12px', boxShadow: hardShadow(2) }}>
            <GemIcon size={14} />
            <span style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{g.gems ?? 0}</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px' }}>

        {/* Pro promo banner — the store's premium centerpiece, hidden once you already are Pro */}
        {!isProUser && (
          <button
            onClick={() => onNavigate('proUpsell')}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer', border: NB_BORDER, borderRadius: 20, boxShadow: hardShadow(5),
              background: NB_PRO_GRADIENT, padding: '18px 18px', marginBottom: 16, position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -18, right: -18, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,.16)' }} />
            <div style={{ position: 'absolute', bottom: -30, right: 30, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,.12)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
              <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,.25)', border: '2px solid rgba(255,255,255,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: -7, left: -8, fontSize: 12, color: 'rgba(255,255,255,.85)' }}>✦</span>
                <span style={{ position: 'absolute', bottom: -6, left: -3, fontSize: 8, color: 'rgba(255,255,255,.65)' }}>✦</span>
                <StarIcon size={24} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 17, textTransform: 'uppercase', color: NB.white, textShadow: '0 1px 4px rgba(0,0,0,.3)' }}>MissVfit Pro</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.92)', marginTop: 2, fontWeight: 600 }}>Try it free for 7 days — unlock it all</div>
              </div>
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 11, textTransform: 'uppercase', color: NB.purpleDeep, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '6px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>Go Pro!</span>
            </div>
          </button>
        )}

        <div style={{ display: 'flex', overflowX: 'auto', gap: 6, marginBottom: 16, paddingBottom: 2 }}>
          {subTabs.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)} style={{ flexShrink: 0, height: 36, padding: '0 14px', border: `2px solid ${NB.ink}`, borderRadius: 10, background: subTab === t.id ? NB.teal : NB.white, color: NB.ink, fontWeight: subTab === t.id ? 800 : 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              {t.id === 'designs' && <LockIcon size={11} />}
              {t.label}
            </button>
          ))}
        </div>

        {subTab === 'pets' && (
          <div>
            <div style={{ ...nbCardStyle(NB.lavender, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700 }}>Adopt a companion</div>
              <div style={{ fontSize: 13, color: NB.ink, fontWeight: 700, marginTop: 4 }}>Your pet lives on your profile — keep your lives up to keep it happy</div>
            </div>
            {grid(PETS.map(pet => <PetCard key={pet.id} pet={pet} />))}
          </div>
        )}

        {subTab === 'borders' && grid(STORE_BORDERS.map(item => <CosmeticCard key={item.id} item={item} category="borders" />))}
        {subTab === 'banners' && grid(STORE_BANNERS.map(item => <CosmeticCard key={item.id} item={item} category="banners" />))}
        {subTab === 'designs' && (
          <div style={{ ...nbCardStyle(NB.cream, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🚧</div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink, marginBottom: 8 }}>Designs — coming soon</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>This section is still being built. Check back soon!</div>
          </div>
        )}

        {subTab === 'gems' && (
          <div>
            <div style={{ ...nbCardStyle(NB.lavender, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700 }}>Top up your gems</div>
              <div style={{ fontSize: 13, color: NB.ink, fontWeight: 700, marginTop: 4 }}>Gems never expire — use them to unlock exclusive cosmetics</div>
            </div>
            {grid(GEM_PACKAGES.map(pkg => <GemCard key={pkg.id} pkg={pkg} />))}
          </div>
        )}

        {subTab === 'lives' && (
          <div>
            <div style={{ ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {[1,2,3].map(i => <HeartIcon key={i} size={16} filled={i <= (g.lives ?? 3)} />)}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: NB.white }}>You have {g.lives ?? 3} / 3 lives this week</span>
            </div>
            {grid(LIFE_ITEMS.map(item => <LifeCard key={item.id} item={item} />))}
          </div>
        )}
      </div>
    </>
  )
}
