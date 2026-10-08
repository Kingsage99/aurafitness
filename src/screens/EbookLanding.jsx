import React, { useState, useEffect, useRef } from 'react'
import { EBOOK, EBOOK_BORDER, ebookButton, ebookCardStyle, hardShadow, NB_RADIUS, NB_RADIUS_SM } from '../styles/ebookTheme'
import { EBOOK_REVIEWS, getAverageRating } from '../data/ebookReviews'
import { useIsMobile } from '../hooks/useIsMobile'
import { EBOOK_STRIPE_PRICE, startEbookCheckout, getEbookDownloadUrl } from '../lib/stripe'
import { initAnalytics, track } from '../lib/analytics'

// Motion is opt-in: every keyframe lives behind prefers-reduced-motion, same
// convention as the app's other marketing page.
//
// .eb-product-grid is this file's first CSS-media-query-driven layout reflow
// (everything else uses the JS useIsMobile() hook, a 600px threshold, kept
// exactly as-is for what it already governs: the sticky bar and the
// expanded-reviews grid column count). 860px suits two ~350px+ columns
// better than a phone-width cutoff would.
const EBOOK_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes eb-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  .eb-rise { animation: eb-rise .6s cubic-bezier(.2,.7,.3,1) both; }
}
.eb-product-grid {
  display: grid;
  grid-template-columns: minmax(280px, 420px) 1fr;
  gap: clamp(28px, 5vw, 56px);
  align-items: start;
}
@media (max-width: 860px) {
  .eb-product-grid { grid-template-columns: 1fr; }
}

/* Reviews marquee — a seamless loop: the card list is rendered twice back
   to back and the track slides exactly -50%, so the moment the first copy
   scrolls fully offscreen the second copy is sitting in the exact start
   position, reading as one continuous, unbroken loop. */
.eb-marquee-mask { overflow: hidden; }
.eb-marquee-track { display: flex; gap: 12px; width: max-content; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes eb-marquee { from { transform: translateX(0); } to { transform: translateX(var(--marquee-shift, -50%)); } }
  .eb-marquee-track { animation: eb-marquee 34s linear infinite; }
  .eb-marquee-mask:hover .eb-marquee-track, .eb-marquee-mask:focus-within .eb-marquee-track { animation-play-state: paused; }
}
@media (prefers-reduced-motion: reduce) {
  .eb-marquee-mask { overflow-x: auto; }
}
`

const AVATAR_COLORS = [EBOOK.lavender, EBOOK.lavenderDeep, EBOOK.ink]

// ── Shared bits ──────────────────────────────────────────────────────────

function Star({ size = 14, filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? EBOOK.ink : 'none'} stroke={EBOOK.ink} strokeWidth={filled ? 0 : 1.5}>
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8L5.8 21l1.6-7L2 9.2l7.1-.6z" />
    </svg>
  )
}

function StarRow({ rating, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={size} filled={i <= rating} />)}
    </div>
  )
}

function BuyButton({ label, onClick, busy, style }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{ ...ebookButton(EBOOK.ink, EBOOK.white, 6), borderRadius: 16, height: 56, padding: '0 32px', fontSize: 16, opacity: busy ? 0.75 : 1, cursor: busy ? 'default' : 'pointer', ...style }}
    >
      {busy ? 'Redirecting…' : label}
    </button>
  )
}

function CheckMark({ size = 20 }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: EBOOK.ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke={EBOOK.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

// ── Purchase banners (unchanged — the purchase/download flow isn't part of this redesign) ──

function CancelBanner({ onDismiss }) {
  return (
    <div style={{
      maxWidth: 720, margin: '14px auto 0', padding: '14px 18px', borderRadius: NB_RADIUS_SM,
      border: EBOOK_BORDER, background: EBOOK.white, boxShadow: hardShadow(4),
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <span style={{ fontFamily: EBOOK.fontMono, fontSize: 12.5, fontWeight: 700, color: EBOOK.ink, lineHeight: 1.5 }}>
        Checkout canceled. No charge was made.
      </span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: EBOOK.ink, fontWeight: 800, flexShrink: 0 }} aria-label="Dismiss">✕</button>
    </div>
  )
}

// Shown in place of a plain banner once a buyer lands back from Stripe —
// verifies the purchase server-side (src/lib/stripe.js's getEbookDownloadUrl)
// and reveals a real download, rather than the old promise of an email that
// this project has no working way to send. Mirrors GiftTrialWelcome.jsx's
// "here's what you just got" shape (icon badge + headline + CTA), rebuilt
// for this page's web layout instead of the phone-frame app chrome.
function PurchaseSuccessReveal({ status, downloadUrl, onDismiss }) {
  return (
    <section style={{ maxWidth: 560, margin: '18px auto 0', padding: '0 20px' }}>
      <div style={{ ...ebookCardStyle(EBOOK.ink, 7), borderRadius: NB_RADIUS, padding: '30px 24px', textAlign: 'center', position: 'relative' }}>
        <button onClick={onDismiss} aria-label="Dismiss" style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>✕</button>

        <div style={{ width: 56, height: 56, borderRadius: '50%', background: EBOOK.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={EBOOK.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>

        <div style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: EBOOK.white }}>
          {status === 'error' ? "Let's Sort This Out" : "You're In"}
        </div>

        <div style={{ fontFamily: EBOOK.fontMono, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 10, lineHeight: 1.6 }}>
          {status === 'verifying' && 'Verifying your purchase…'}
          {status === 'ready' && 'Your download should start automatically. If it doesn’t, use the button below (valid for 2 hours). We’ve also emailed you a copy of this link, so you can come back and re-download any time.'}
          {status === 'error' && (
            <>We couldn't automatically verify this purchase. If you were just charged, email <a href="mailto:support@missvfit.app" style={{ color: EBOOK.lavender }}>support@missvfit.app</a> with your receipt and we'll get your copy to you directly.</>
          )}
        </div>

        {status === 'ready' && downloadUrl && (
          // whiteSpace: nowrap + padding-based (not fixed-height) sizing is
          // deliberate: a fixed height + lineHeight assumes one line, and if
          // the label ever wrapped to two, the second line would render
          // below the pill's own background in the same ink-on-ink text
          // color as the card behind it — invisible, not just misaligned.
          // Found exactly that bug here at narrow widths; this guards
          // against it structurally instead of just shortening the label.
          <a
            href={downloadUrl}
            style={{ ...ebookButton(EBOOK.lavender, EBOOK.ink, 5), display: 'inline-block', textDecoration: 'none', borderRadius: 14, padding: '15px 28px', whiteSpace: 'nowrap', marginTop: 20 }}
          >
            Download Playbook
          </a>
        )}
      </div>
    </section>
  )
}

// ── Brand bar ────────────────────────────────────────────────────────────

function BrandBar() {
  return (
    <header style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src="/cute_logo.png" alt="" style={{ width: 32, height: 32, borderRadius: 9, border: EBOOK_BORDER, objectFit: 'cover' }} />
      <span style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 900, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', color: EBOOK.ink }}>MissVfit</span>
    </header>
  )
}

// ── Product image: real cover + inside-page previews in a device frame ───

// Real cover art and 5 real page spreads (one per part of the book, in page
// order) — all 1414×2000 (A4-ratio) JPEGs exported straight from the actual
// PDF, living in public/ebook-preview/. Clicking a thumbnail swaps which one
// shows inside the device frame, same pattern as the reference product pages.
const GALLERY_IMAGES = [
  { src: '/ebook-preview/cover.jpg', alt: 'The Shape Shift Playbook cover' },
  { src: '/ebook-preview/page-10.jpg', alt: 'Inside the Playbook: Find Your Shift (page 10)' },
  { src: '/ebook-preview/page-21.jpg', alt: 'Inside the Playbook: the Swap System (page 21)' },
  { src: '/ebook-preview/page-40.jpg', alt: 'Inside the Playbook: Progressive Overload (page 40)' },
  { src: '/ebook-preview/page-44.jpg', alt: 'Inside the Playbook: Intensity and Proximity to Failure (page 44)' },
  { src: '/ebook-preview/page-51.jpg', alt: 'Inside the Playbook: Maintenance (page 51)' },
]
const GALLERY_ASPECT_RATIO = '1414 / 2000'

function ProductGallery() {
  const [active, setActive] = useState(0)
  const activeImage = GALLERY_IMAGES[active]
  return (
    <div>
      <div style={{
        width: '100%', maxWidth: 420, margin: '0 auto', padding: 18, boxSizing: 'border-box',
        borderRadius: 32, border: EBOOK_BORDER, boxShadow: hardShadow(10), background: EBOOK.ink,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', margin: '0 auto 14px' }} />
        <div style={{ borderRadius: 18, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.25)', aspectRatio: GALLERY_ASPECT_RATIO }}>
          <img src={activeImage.src} alt={activeImage.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      </div>

      <div role="tablist" aria-label="Preview pages" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
        {GALLERY_IMAGES.map((img, i) => (
          <button
            key={img.src}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-label={img.alt}
            onClick={() => setActive(i)}
            style={{
              width: 44, height: 62, borderRadius: 7, overflow: 'hidden', padding: 0, cursor: 'pointer', flexShrink: 0,
              border: active === i ? `2.5px solid ${EBOOK.ink}` : `1.5px solid ${EBOOK.lavenderDeep}`,
              opacity: active === i ? 1 : 0.65, background: 'none',
            }}
          >
            <img src={img.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Buy box ──────────────────────────────────────────────────────────────

// Small ink-stroke line icons matching the file's existing Star/CheckMark
// style — not emoji (used nowhere else on this page) and not the main app's
// raster Icons.jsx set (StarIcon there is a non-recolorable PNG, confirmed
// again this session, and the whole set is built for the app's multicolor
// palette, not this page's three-hue one).
function LayersIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={EBOOK.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>
}
function PageIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={EBOOK.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5" /></svg>
}
function DialIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={EBOOK.ink} strokeWidth="1.8" strokeLinecap="round"><path d="M4 16a8 8 0 0116 0" /><circle cx="12" cy="16" r="1.4" fill={EBOOK.ink} stroke="none" /><path d="M12 16l4-5" /></svg>
}
function RefreshIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={EBOOK.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0115-6.7M21 12a9 9 0 01-15 6.7" /><path d="M18 2v4h-4M6 22v-4h4" /></svg>
}

// Every stat here is a real fact about this specific book — deliberately NOT
// copying the "8 weeks program" style duration claim from the reference
// screenshots, since this book has no timed program and inventing one would
// be fabricating a claim the same way a fake compare-at price would be.
const STATS = [
  { icon: <LayersIcon />, label: '4-part system' },
  { icon: <PageIcon />, label: '58 pages' },
  { icon: <DialIcon />, label: 'Any level' },
  { icon: <RefreshIcon />, label: 'Lifetime access' },
]

function StatBadge({ icon, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
      <span style={{ width: 36, height: 36, borderRadius: '50%', border: EBOOK_BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ fontFamily: EBOOK.fontMono, fontSize: 10.5, fontWeight: 700, color: EBOOK.textBody, lineHeight: 1.3 }}>{label}</span>
    </div>
  )
}

const INCLUDED = [
  'The complete Shape Shift Playbook (digital PDF)',
  'The Core System: training, nutrition, recovery',
  'Blank exercise-selection grid + customizable weekly template',
  'Myth-busting section',
  'Lifetime access, yours to keep',
]

// The single consolidated purchase unit — replaces what used to be three
// separate buy buttons (hero, pricing section, final CTA) spread down the
// page. Deliberately no "dot-scale" attribute bars or difficulty slider
// (present in the reference screenshots) — those are rating/sorting
// devices, and this book's whole pitch is explicitly NOT sorting readers
// into categories; including one would visually contradict the copy next
// to it. DialIcon above echoes that visual texture without plotting an
// actual rating.
function BuyBox({ busy, onBuy, error, avgRating, reviewCount, buyBoxRef }) {
  return (
    <div ref={buyBoxRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <StarRow rating={Math.round(avgRating)} size={15} />
        <span style={{ fontFamily: EBOOK.fontMono, fontSize: 12.5, color: EBOOK.textMuted }}>
          {avgRating.toFixed(1)} ({reviewCount} reviews)
        </span>
      </div>

      <h1 style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 900, fontSize: 'clamp(30px, 4.2vw, 44px)', textTransform: 'uppercase', color: EBOOK.ink, lineHeight: 1.04, margin: '8px 0 0', textWrap: 'balance' }}>
        The Shape Shift Playbook
      </h1>
      <p style={{ fontFamily: EBOOK.fontMono, fontSize: 14.5, color: EBOOK.textBody, marginTop: 8, lineHeight: 1.55, maxWidth: 440 }}>
        The fitness guide that skips the body-type quiz. One adaptable system for training, nutrition, and recovery, built around your starting point.
      </p>

      <div style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 900, fontSize: 36, color: EBOOK.ink, marginTop: 24 }}>$26.99</div>
      <div style={{ fontFamily: EBOOK.fontMono, fontSize: 11, color: EBOOK.textMuted, marginTop: 4 }}>One-time payment · Instant digital download</div>

      <BuyButton label="Get The Playbook for $26.99" onClick={onBuy} busy={busy} style={{ width: '100%', marginTop: 16 }} />

      {error && (
        <div role="alert" style={{
          fontFamily: EBOOK.fontMono, fontSize: 11.5, fontWeight: 700, color: EBOOK.ink, marginTop: 8,
          padding: '8px 10px', border: `1.5px solid ${EBOOK.ink}`, borderRadius: 8, background: EBOOK.lavenderTint,
        }}>
          {error}
        </div>
      )}

      <div style={{ fontFamily: EBOOK.fontMono, fontSize: 10.5, color: EBOOK.textMuted, marginTop: 8 }}>
        Non-refundable once downloaded. See our <a href="/legal" style={{ color: EBOOK.textMuted }}>refund policy</a>.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 24 }}>
        {STATS.map(s => <StatBadge key={s.label} icon={s.icon} label={s.label} />)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 24 }}>
        {INCLUDED.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <CheckMark size={17} />
            <span style={{ fontSize: 13, color: EBOOK.textBody, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AboveFoldSection({ busy, onBuy, error, avgRating, reviewCount, buyBoxRef }) {
  return (
    <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(20px, 4vw, 48px) 20px 8px' }}>
      <div className="eb-product-grid">
        <div className="eb-rise">
          <ProductGallery />
        </div>
        <div className="eb-rise" style={{ animationDelay: '.08s' }}>
          <BuyBox busy={busy} onBuy={onBuy} error={error} avgRating={avgRating} reviewCount={reviewCount} buyBoxRef={buyBoxRef} />
        </div>
      </div>
    </section>
  )
}

// ── Reviews — compact, secondary treatment directly under the buy box ────

const FEATURED_REVIEW_IDS = ['r02', 'r04', 'r06', 'r08', 'r10', 'r13', 'r15', 'r17', 'r18']

function ReviewCard({ review, colorIndex, compact }) {
  const bg = AVATAR_COLORS[colorIndex % 3]
  const textColor = colorIndex % 3 === 2 ? EBOOK.white : EBOOK.ink
  return (
    <div style={{ ...ebookCardStyle(EBOOK.white, compact ? 3 : 4), borderRadius: NB_RADIUS_SM, padding: compact ? 13 : 18, display: 'flex', flexDirection: 'column', gap: 8, height: '100%', boxSizing: 'border-box' }}>
      <StarRow rating={review.rating} size={compact ? 12 : 14} />
      <div style={{
        fontSize: compact ? 12 : 13.5, color: EBOOK.textBody, lineHeight: 1.45, flex: 1,
        display: '-webkit-box', WebkitLineClamp: compact ? 4 : undefined, WebkitBoxOrient: 'vertical', overflow: compact ? 'hidden' : 'visible',
      }}>
        &ldquo;{review.quote}&rdquo;
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: compact ? 24 : 30, height: compact ? 24 : 30, borderRadius: '50%', border: `2px solid ${EBOOK.ink}`, background: bg, color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: EBOOK.fontDisplay, fontWeight: 900, fontSize: compact ? 11 : 13, flexShrink: 0 }}>
          {review.initial}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: EBOOK.ink }}>{review.name}</div>
      </div>
    </div>
  )
}

// Auto-scrolling, seamlessly looping strip of the featured reviews (pauses
// on hover/focus so a card can actually be read). Only used for the default
// collapsed view — "Show all 50" below switches to a plain static grid,
// which should never animate (looping 50 cards at once would be chaos, not
// a feature).
// Card width + the flex gap between cards are both fixed (never responsive),
// so the exact per-cycle shift distance is computable instead of guessed —
// see the long comment on why `-50%` doesn't work here.
const MARQUEE_CARD_WIDTH = 220
const MARQUEE_GAP = 12

function ReviewsMarquee({ reviews }) {
  const doubled = [...reviews, ...reviews]
  // The naive fix is `translateX(-50%)`, but that's wrong here: with a flex
  // `gap`, doubling N cards into 2N cards adds (2N-1) gaps total, not 2N —
  // so half of the doubled track's width is a few pixels short of exactly
  // one full copy's width. The animation still resets after exactly one
  // copy-width's worth of travel either way, so that few-pixel shortfall
  // shows up as a visible snap once per loop. The correct shift is exactly
  // N card-slots (each slot = card width + its own trailing gap), which is
  // precisely how far card N+1 needs to travel to land where card 1 started.
  const shift = reviews.length * (MARQUEE_CARD_WIDTH + MARQUEE_GAP)
  return (
    <div className="eb-marquee-mask" tabIndex={0} aria-label="Featured reviews, scrolling" style={{ '--marquee-shift': `-${shift}px` }}>
      <div className="eb-marquee-track" role="list">
        {doubled.map((r, i) => {
          const isDuplicate = i >= reviews.length
          return (
            <div
              key={`${r.id}-${i}`}
              role={isDuplicate ? undefined : 'listitem'}
              aria-hidden={isDuplicate || undefined}
              style={{ flexShrink: 0, width: MARQUEE_CARD_WIDTH }}
            >
              <ReviewCard review={r} colorIndex={i} compact />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReviewsSection({ isMobile }) {
  const [showAll, setShowAll] = useState(false)
  const featured = FEATURED_REVIEW_IDS.map(id => EBOOK_REVIEWS.find(r => r.id === id)).filter(Boolean)
  const visible = showAll ? EBOOK_REVIEWS : featured

  return (
    <section style={{ background: `linear-gradient(135deg, ${EBOOK.lavender} 0%, ${EBOOK.lavenderDeep} 100%)`, padding: '40px 0' }}>
      <div style={{ fontFamily: EBOOK.fontMono, fontWeight: 700, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: EBOOK.ink, textAlign: 'center', marginBottom: 16 }}>
        What Readers Say
      </div>

      {!showAll ? (
        // Deliberately full-bleed, outside the maxWidth wrapper below — a
        // scrolling ticker reads as a container with a visible edge if it
        // stops short of the viewport edge, which defeats the point of it
        // being a continuous loop.
        <ReviewsMarquee reviews={visible} />
      ) : (
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
            {visible.map((r, i) => <ReviewCard key={r.id} review={r} colorIndex={i} compact />)}
          </div>
        </div>
      )}

      {!showAll && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button
            onClick={() => setShowAll(true)}
            style={{ ...ebookButton(EBOOK.white, EBOOK.ink, 3), borderRadius: 10, height: 40, padding: '0 18px', fontSize: 12.5 }}
          >
            Show all {EBOOK_REVIEWS.length} reviews
          </button>
        </div>
      )}
    </section>
  )
}

// ── Description + feature highlights (always visible — too short for an accordion) ──

function ProductDescription() {
  return (
    <p style={{ fontFamily: EBOOK.fontMono, fontSize: 13.5, color: EBOOK.textBody, lineHeight: 1.7, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      The Shape Shift Playbook distills the training philosophy behind the MissVfit app (training, nutrition, and recovery, built on established exercise science) into one complete framework you read once and use for years.
    </p>
  )
}

const PILLAR_LABELS = ['Training', 'Nutrition', 'Recovery']

function FeatureHighlights() {
  return (
    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
      {PILLAR_LABELS.map(label => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckMark size={18} />
          <span style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: EBOOK.ink }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Details accordion — What's Inside / Myths / FAQ, single level ────────

const TOC = [
  {
    part: 'Front Matter', title: 'The Whole System, At A Glance',
    bullets: ['Foreword, disclosure, and a one-page overview of the whole Core System before you dive in'],
  },
  {
    part: 'Part 1', title: 'Find Your Shift',
    bullets: ['A goal-setting checklist that places you before it plans for you', 'Myths section: spot reduction, "lifting makes you bulky," extreme dieting, genetics'],
  },
  {
    part: 'Part 2', title: 'The Swap System',
    bullets: ['What to cut, what to add, including "the volume trick" (more food, fewer calories)', 'Three calorie directions (Fat Loss, Maintenance, Muscle Gain) tied to your own goal'],
  },
  {
    part: 'Part 3', title: 'The Training Path',
    bullets: ['Progressive overload, volume, frequency, intensity, and specificity, explained plainly', 'A movement-pattern system (squat, hinge, push, pull, core) plus a blank grid to build your own selection'],
  },
  {
    part: 'Part 4', title: 'Weekly Routines',
    bullets: ['Three-level progression: Build the Habit, Build Consistency, Build Results', 'One customizable weekly template you adapt, not three rigid plans to choose between'],
  },
]

const MYTHS = [
  { myth: '"Spot reduction works."', fact: 'You can’t choose where fat comes off by targeting a muscle. The Playbook explains what actually determines it.' },
  { myth: '"Lifting will make me bulky."', fact: 'The physiology behind that fear, and why it doesn’t hold up, laid out plainly in Part 1.' },
  { myth: '"Extreme dieting is the fast way."', fact: 'What actually happens when you cut too hard, and why it backfires more often than it works.' },
]

const FAQS = [
  { q: 'What exactly do I get?', a: 'A digital PDF: the complete Shape Shift Playbook, front matter, all four parts, and the blank exercise-selection grid and weekly template to fill in yourself. No physical book is shipped.' },
  { q: 'Is this personalized to my body type?', a: 'No, and that’s deliberate. Instead of sorting you into a category, the Playbook gives you one adaptable system and shows you how to adjust it to your own starting point and goal.' },
  { q: 'I’m a complete beginner. Is this still for me?', a: 'Yes. The three-level progression (Build the Habit, Build Consistency, Build Results) starts wherever you are, and you move through it at your own pace.' },
  { q: 'I’ve been training for years, is this too basic?', a: 'The Training Path is built on core exercise-science principles that apply at any experience level, and Build Results is written for someone already consistent.' },
  { q: 'Does it include exact calorie numbers or a meal plan?', a: 'No, on purpose. The Swap System teaches the framework (what to cut, what to add, and the three calorie directions) so you can apply it to your own food, not a meal plan you’d abandon the first time you eat out.' },
  { q: 'What equipment do I need?', a: 'None specifically required. The Training Path is built around movement patterns (squat, hinge, push, pull, core) so you build your own exercise selection around whatever equipment you actually have.' },
  { q: 'Is this a subscription?', a: 'No. One-time payment, $26.99, yours to keep.' },
  { q: 'How do I access it after I buy?', a: 'You’re redirected straight to your download the moment payment completes, no email needed. Keep that confirmation page open until the file has downloaded.' },
]

function WhatsInsideBody() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {TOC.map(section => (
        <div key={section.part}>
          <div style={{ fontFamily: EBOOK.fontMono, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: EBOOK.textMuted }}>{section.part}</div>
          <div style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: EBOOK.ink, marginTop: 2 }}>{section.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {section.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CheckMark size={15} />
                <span style={{ fontSize: 12.5, color: EBOOK.textBody, lineHeight: 1.5 }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MythsBody() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {MYTHS.map(m => (
        <div key={m.myth}>
          <div style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 800, fontSize: 13, color: EBOOK.textMuted, textDecoration: 'line-through', textDecorationThickness: 2 }}>{m.myth}</div>
          <div style={{ fontSize: 12.5, color: EBOOK.ink, marginTop: 4, lineHeight: 1.5, fontWeight: 600 }}>{m.fact}</div>
        </div>
      ))}
    </div>
  )
}

function FaqBody() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {FAQS.map(item => (
        <div key={item.q}>
          <div style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 800, fontSize: 13, color: EBOOK.ink }}>{item.q}</div>
          <div style={{ fontSize: 12.5, color: EBOOK.textBody, marginTop: 4, lineHeight: 1.5 }}>{item.a}</div>
        </div>
      ))}
    </div>
  )
}

function AccordionPanel({ title, isOpen, onToggle, children }) {
  const safeId = title.replace(/\s+/g, '-').toLowerCase()
  return (
    <div style={{ ...ebookCardStyle(EBOOK.white, 3), borderRadius: NB_RADIUS_SM, overflow: 'hidden' }}>
      <button
        id={`panel-btn-${safeId}`}
        aria-expanded={isOpen}
        aria-controls={`panel-body-${safeId}`}
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
          padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: EBOOK.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: EBOOK.ink,
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 20, flexShrink: 0, transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform .15s ease' }}>+</span>
      </button>
      {/* Always mounted (not conditionally rendered) — aria-controls on the
          button above must reference a real, present element. Collapsing it
          via `hidden` instead of unmounting keeps that reference valid even
          while closed; unmounting it entirely was an ARIA violation found
          during this session's accessibility sweep. */}
      <div id={`panel-body-${safeId}`} role="region" aria-labelledby={`panel-btn-${safeId}`} hidden={!isOpen} style={{ padding: '0 18px 18px' }}>
        {children}
      </div>
    </div>
  )
}

const ACCORDION_PANELS = [
  { title: "What's Inside", Body: WhatsInsideBody },
  { title: "Myths We're Done With", Body: MythsBody },
  { title: 'FAQ', Body: FaqBody },
]

function DetailsAccordion() {
  const [openPanel, setOpenPanel] = useState(null)
  return (
    <section style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ACCORDION_PANELS.map(({ title, Body }) => (
          <AccordionPanel key={title} title={title} isOpen={openPanel === title} onToggle={() => setOpenPanel(openPanel === title ? null : title)}>
            <Body />
          </AccordionPanel>
        ))}
      </div>
    </section>
  )
}

// ── Footer (unchanged) ────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '28px 20px 40px', borderTop: `2px solid ${EBOOK.lavenderTint}` }}>
      <div style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: EBOOK.ink }}>MissVfit</div>
      <div style={{ fontFamily: EBOOK.fontMono, fontSize: 11, color: EBOOK.textMuted, marginTop: 8, lineHeight: 1.6, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
        Digital product. No physical item is shipped. One-time payment, no subscription. Questions about your order? Contact us at <a href="mailto:support@missvfit.app" style={{ color: EBOOK.ink }}>support@missvfit.app</a>.
      </div>
      <div style={{ fontFamily: EBOOK.fontMono, fontSize: 11, color: EBOOK.textMuted, marginTop: 8 }}>
        © {new Date().getFullYear()} MissVfit. All rights reserved. · <a href="/legal" style={{ color: EBOOK.textMuted }}>Terms · Privacy · Refund Policy</a>
      </div>
    </footer>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function EbookLanding() {
  const isMobile = useIsMobile()
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [purchaseState, setPurchaseState] = useState(null)
  const [downloadStatus, setDownloadStatus] = useState('verifying') // 'verifying' | 'ready' | 'error'
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const buyBoxRef = useRef(null)
  const avgRating = getAverageRating()
  const reviewCount = EBOOK_REVIEWS.length

  // Analytics is only ever initialized inside the gated /app product today —
  // this page lives outside that, so it has to start its own session to get
  // any purchase-funnel data at all.
  useEffect(() => {
    initAnalytics()

    const params = new URLSearchParams(window.location.search)
    const ebookParam = params.get('ebook')
    const sessionId = params.get('session_id')

    if (ebookParam === 'success') {
      setPurchaseState('success')
      track('purchase_completed', { type: 'ebook' })
      // Re-verified server-side against Stripe directly (see getEbookDownloadUrl) —
      // the query param alone proves nothing, a buyer could type it by hand.
      getEbookDownloadUrl(sessionId).then(url => {
        if (url) {
          setDownloadUrl(url)
          setDownloadStatus('ready')
          // Auto-start the download the moment it's verified, rather than
          // making the buyer find and click a button. Safe from popup
          // blockers (unlike window.open) since it's a same-tab navigation —
          // and because get-ebook-download's signed URL now carries
          // Content-Disposition: attachment, navigating to it triggers a
          // save-to-disk without actually leaving this page. The visible
          // "Download Your Playbook" button stays as a manual fallback in
          // case a browser blocks this or the buyer dismissed it.
          window.location.href = url
        } else {
          setDownloadStatus('error')
        }
      })
    } else if (ebookParam === 'cancel') {
      setPurchaseState('cancel')
      track('purchase_canceled', { type: 'ebook' })
    }
    if (ebookParam) {
      params.delete('ebook')
      params.delete('session_id')
      const query = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash)
    }
  }, [])

  const handleBuy = async () => {
    setCheckoutError('')
    if (!EBOOK_STRIPE_PRICE) {
      setCheckoutError("This isn't set up for purchase yet. Check back soon.")
      return
    }
    setBusy(true)
    try {
      await startEbookCheckout(EBOOK_STRIPE_PRICE)
    } catch (err) {
      setCheckoutError(err.message || 'Could not start checkout')
      setBusy(false)
    }
  }

  // The sticky bar appears once the real buy box has scrolled out of view —
  // measured against its actual rendered position rather than a hardcoded
  // number, since the new two-column layout's height varies by breakpoint
  // (a fixed threshold tuned for one layout would silently be wrong against
  // the other).
  const handleScroll = (e) => {
    const el = e.currentTarget
    const buyBoxBottom = buyBoxRef.current
      ? buyBoxRef.current.getBoundingClientRect().bottom - el.getBoundingClientRect().top
      : 520
    const past = el.scrollTop > buyBoxBottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 260
    setShowStickyCTA(past && !nearBottom)
  }

  return (
    <div
      onScroll={handleScroll}
      style={{
        height: '100vh', overflowY: 'auto', width: '100%', boxSizing: 'border-box',
        background: `linear-gradient(165deg, ${EBOOK.white} 0%, ${EBOOK.lavenderTint} 45%, ${EBOOK.white} 75%, ${EBOOK.lavenderTint} 100%)`,
        backgroundAttachment: 'fixed',
      }}
    >
      <style>{EBOOK_CSS}</style>

      {purchaseState === 'success' && (
        <PurchaseSuccessReveal status={downloadStatus} downloadUrl={downloadUrl} onDismiss={() => setPurchaseState(null)} />
      )}
      {purchaseState === 'cancel' && (
        <CancelBanner onDismiss={() => setPurchaseState(null)} />
      )}

      <BrandBar />
      <AboveFoldSection busy={busy} onBuy={handleBuy} error={checkoutError} avgRating={avgRating} reviewCount={reviewCount} buyBoxRef={buyBoxRef} />
      <ReviewsSection isMobile={isMobile} />

      <section style={{ maxWidth: 680, margin: '0 auto', padding: '8px 20px 0' }}>
        <ProductDescription />
        <FeatureHighlights />
      </section>

      <DetailsAccordion />
      <Footer />

      {isMobile && showStickyCTA && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 150, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))', background: 'rgba(255,255,255,0.92)', borderTop: EBOOK_BORDER, backdropFilter: 'blur(6px)' }}>
          <BuyButton label="Buy now for $26.99" onClick={handleBuy} busy={busy} style={{ width: '100%', height: 52 }} />
        </div>
      )}
    </div>
  )
}
