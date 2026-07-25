import React, { useState, useEffect } from 'react'
import {
  NB, NB_BORDER, hardShadow, nbCardStyle, nbButton,
  NB_CARD_NEUTRAL_SHADOW, NB_INTENSITY_RAMP, proTextStyle,
} from '../styles/neoBrutalism'
import { renderIcon, FireIcon, StarIcon, SaladIcon, BurritoMealIcon, CookbookIcon } from '../components/Icons'
import { FEATURES as PRO_FEATURES } from './ProUpsell'
import MuscleSVG from '../components/MuscleSVG'
import { isIOSDevice } from '../utils/pushNotifications'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useIsMobile } from '../hooks/useIsMobile'
import { supabase } from '../lib/supabase'

// The five things every member gets without paying — the free tier is the
// real product, so it leads the "what you get" section.
const FREE_FEATURES = [
  { icon: '💪', label: 'Personalized workout plan', desc: 'An 8-step quiz builds your split around your goals, experience, equipment, and injuries' },
  { icon: '📈', label: 'Workout tracking + muscle heatmap', desc: 'See exactly which muscles you hit, session by session' },
  { icon: '🥗', label: 'AI meal suggestions', desc: '3 AI-generated meals and 10 food lookups every day, built around your macros' },
  { icon: '🌍', label: 'Squad feed', desc: 'Share workouts, react, and stay accountable with friends' },
  { icon: '🔥', label: 'Streaks, medals & quests', desc: 'Daily and weekly challenges that keep you coming back' },
]

// Motion is opt-in: every keyframe lives behind prefers-reduced-motion so a
// reduced-motion visitor just sees the fully-rendered page with no animation
// and no invisible (opacity:0) elements waiting on an animation that never runs.
const LANDING_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes lp-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  .lp-rise { animation: lp-rise .6s cubic-bezier(.2,.7,.3,1) both; }
}
`

// ── Shared bits ──────────────────────────────────────────────────────────

function InstallButton({ label, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{ ...nbButton(NB.magenta, 6), color: NB.white, borderRadius: 16, height: 56, padding: '0 32px', fontSize: 16, ...style }}
    >
      {label}
    </button>
  )
}

function TrialLine({ color = NB.purpleDeep, style }) {
  return (
    <div style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, color, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...style }}>
      <StarIcon size={14} /> 7 days of Pro features — free
    </div>
  )
}

function SectionEyebrow({ children }) {
  return (
    <div style={{ fontFamily: NB.fontMono, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: NB.purpleDeep, textAlign: 'center' }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 'clamp(24px, 4.5vw, 32px)', textTransform: 'uppercase', color: NB.ink, marginTop: 6, textAlign: 'center', textWrap: 'balance' }}>
      {children}
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────

function HeroSection({ installLabel, onInstall, isMobile }) {
  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(36px, 7vw, 64px) 20px 8px', textAlign: 'center' }}>
      <div className="lp-rise" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <img src="/cute_logo.png" alt="" style={{ width: 44, height: 44, borderRadius: 12, border: NB_BORDER, boxShadow: hardShadow(3), objectFit: 'cover' }} />
        <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase', color: NB.ink }}>MissVfit</span>
      </div>

      <div className="lp-rise" style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: NB.purpleDeep, marginBottom: 14, animationDelay: '.05s' }}>
        Strength &amp; physique — for women
      </div>

      <h1 className="lp-rise" style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 'clamp(34px, 8vw, 58px)', textTransform: 'uppercase', color: NB.ink, lineHeight: 1.02, margin: 0, textWrap: 'balance', animationDelay: '.1s' }}>
        Eat what you love.<br />Build your dream body.
      </h1>

      <p className="lp-rise" style={{ fontFamily: NB.fontMono, fontSize: 'clamp(14px, 3.6vw, 16px)', color: '#555', marginTop: 18, lineHeight: 1.6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', animationDelay: '.15s' }}>
        Eat what you love and we&rsquo;ll fit it into your calories. Track your workouts, then share your meals and wins with your squad on the Discover feed.
      </p>

      <div className="lp-rise" style={{ marginTop: 26, animationDelay: '.2s' }}>
        <InstallButton label={installLabel} onClick={onInstall} style={{ width: isMobile ? '100%' : 'auto', maxWidth: 360 }} />
        <TrialLine />
        <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#999', marginTop: 6 }}>No card to start · Free forever plan</div>
      </div>

      {/* Brand hero art — the squat render in a PORTRAIT card, scaled to fill
          so the athlete reads big and the barbell bleeds past the side edges. */}
      <div className="lp-rise" style={{ marginTop: 24, animationDelay: '.25s', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 330, aspectRatio: '4 / 5', borderRadius: 22, border: NB_BORDER, boxShadow: hardShadow(6), overflow: 'hidden', background: `linear-gradient(160deg, ${NB.tealLight}, ${NB.lavender})` }}>
          <img
            src="/exercises/barbell-squat.png"
            alt="A MissVfit athlete performing a barbell squat"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 44%', display: 'block' }}
          />
        </div>
      </div>
    </section>
  )
}

// ── Phone mockups ──────────────────────────────────────────────────────────

// A marketing device frame — the rounded, bordered, hard-shadowed "phone"
// that each feature screenshot sits inside. Not the real app chrome
// (PhoneFrame.jsx); a lighter stand-in sized for the landing grid.
function MarketingPhone({ children }) {
  return (
    <div style={{
      width: 236, height: 500, flexShrink: 0, position: 'relative',
      borderRadius: 30, border: NB_BORDER, boxShadow: hardShadow(6),
      background: NB.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)', width: 64, height: 6, borderRadius: 3, background: NB.ink, opacity: 0.22, zIndex: 5 }} />
      {children}
    </div>
  )
}

// Mirrors the real Meals "craving" screen: calorie bar + Pro pill, greeting,
// "What are you craving?", the Craving / Already-ate toggle, food input,
// craving tags, and the Plan-my-day / Cookbook tiles.
function MealsScreen() {
  const tags = ['Pasta', 'Light & fresh', 'Sweet', 'Spicy', 'High-protein', 'Comfort food']
  return (
    <div style={{ flex: 1, padding: '24px 10px 10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Calorie / macro bar + Pro pill */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <div style={{ flex: 1, ...nbCardStyle(NB.white, 2, NB_CARD_NEUTRAL_SHADOW), border: `2px solid ${NB.ink}`, borderRadius: 11, padding: '6px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink }}>0 / 2,116 <span style={{ fontSize: 7.5 }}>KCAL</span></div>
            <div style={{ display: 'flex', gap: 5, fontFamily: NB.fontMono, fontSize: 7.5, fontWeight: 800, marginTop: 2 }}>
              <span style={{ color: NB.magenta }}>P0</span><span style={{ color: '#C6A200' }}>C0</span><span style={{ color: NB.pink }}>F0</span>
            </div>
          </div>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </div>
        <div style={{ ...nbCardStyle(NB.ink, 2, NB.purpleDeep), border: `2px solid ${NB.ink}`, borderRadius: 11, padding: '0 11px', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ color: NB.yellow, fontSize: 9 }}>✦</span>
          <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 10, color: NB.white, letterSpacing: 0.5 }}>PRO</span>
        </div>
      </div>

      {/* Greeting + question */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <div style={{ fontSize: 13, lineHeight: 1, color: NB.purpleDeep, marginBottom: 4 }}>✦</div>
        <div style={{ fontFamily: NB.fontMono, fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: '#888', textTransform: 'uppercase' }}>Saturday Afternoon, Goth</div>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 17, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1, marginTop: 5 }}>What are you craving?</div>
      </div>

      {/* Craving / Already-ate toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <div style={{ display: 'inline-flex', gap: 3, background: NB.lavenderMist, borderRadius: 9, padding: 3, border: `2px solid ${NB.ink}` }}>
          {[['Craving', true], ['Already ate', false]].map(([label, active]) => (
            <span key={label} style={{ padding: '0 12px', height: 26, display: 'flex', alignItems: 'center', borderRadius: 6, background: active ? NB.ink : 'transparent', fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 9, textTransform: 'uppercase', color: active ? NB.white : NB.ink }}>{label}</span>
          ))}
        </div>
      </div>

      {/* Food input + send */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <div style={{ flex: 1, height: 34, border: `2px solid ${NB.ink}`, borderRadius: 9, padding: '0 10px', display: 'flex', alignItems: 'center', fontFamily: NB.fontDisplay, fontSize: 10, color: '#9a92a8', background: NB.white }}>Type a food or meal…</div>
        <div style={{ width: 34, height: 34, borderRadius: 9, border: `2px solid ${NB.ink}`, background: NB.lavenderMist, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" /></svg>
        </div>
      </div>

      {/* Craving tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
        {tags.map(t => (
          <span key={t} style={{ padding: '5px 10px', ...nbCardStyle(NB.lavender, 1, NB_CARD_NEUTRAL_SHADOW), border: `2px solid ${NB.white}`, borderRadius: 999, fontFamily: NB.fontDisplay, fontSize: 9, fontWeight: 800, color: NB.ink }}>{t}</span>
        ))}
      </div>

      <div style={{ fontSize: 8.5, color: '#666', fontWeight: 600, textAlign: 'center', marginTop: 10 }}>
        We&rsquo;ll fit meals to your <b style={{ color: NB.ink }}>2,116 kcal</b> left today.
      </div>

      <div style={{ flex: 1, minHeight: 10 }} />

      {/* Plan my day + Cookbook tiles */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ bg: NB.lavender, Icon: BurritoMealIcon, title: 'Plan my day', sub: 'All meals + snacks' }, { bg: NB.pink, Icon: CookbookIcon, title: 'Cookbook', sub: '0 favourites' }].map(t => (
          <div key={t.title} style={{ flex: 1, ...nbCardStyle(t.bg, 2), border: `2px solid ${NB.ink}`, borderRadius: 12, padding: 9, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><t.Icon size={16} /></div>
            <div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 9.5, textTransform: 'uppercase', color: NB.ink }}>{t.title}</div>
              <div style={{ fontSize: 7.5, color: '#666', marginTop: 1 }}>{t.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// A few front-body muscles pre-lit at varying intensity so the map reads as
// "trained this week" — colors come straight from the shared intensity ramp.
const MOCK_MUSCLE_COLORS = {
  front_quad: NB_INTENSITY_RAMP[4],
  front_adductor: NB_INTENSITY_RAMP[3],
  front_abductor: NB_INTENSITY_RAMP[2],
  front_core: NB_INTENSITY_RAMP[3],
  abs: NB_INTENSITY_RAMP[4],
  oblique: NB_INTENSITY_RAMP[2],
  front_Chest: NB_INTENSITY_RAMP[3],
  front_shoulder: NB_INTENSITY_RAMP[2],
  front_bicep: NB_INTENSITY_RAMP[2],
}

function MuscleScreen() {
  return (
    <div style={{ flex: 1, padding: '26px 12px 12px', display: 'flex', flexDirection: 'column', gap: 9, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: NB.ink }}>Muscle Map</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {['Week', 'Month'].map((p, i) => (
            <span key={p} style={{ padding: '3px 8px', border: `1.5px solid ${NB.ink}`, borderRadius: 7, background: i === 0 ? NB.teal : NB.white, fontFamily: NB.fontMono, fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{p}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', border: `2px solid ${NB.ink}`, borderRadius: 9, overflow: 'hidden' }}>
        {['Front', 'Back'].map((v, i) => (
          <span key={v} style={{ flex: 1, textAlign: 'center', padding: '5px 0', background: i === 0 ? NB.magenta : NB.white, color: i === 0 ? NB.white : NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 10, textTransform: 'uppercase' }}>{v}</span>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, ...nbCardStyle(NB.cream, 3), border: `2.5px solid ${NB.white}`, borderRadius: 12, overflow: 'hidden' }}>
        <MuscleSVG url="/muscle_map_front.svg" muscleColors={MOCK_MUSCLE_COLORS} />
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {['Quads', 'Core', 'Chest', 'Shoulders'].map(m => (
          <span key={m} style={{ padding: '4px 8px', border: `1.5px solid ${NB.ink}`, borderRadius: 7, background: NB.white, fontFamily: NB.fontMono, fontSize: 8.5, fontWeight: 700, color: NB.ink }}>{m}</span>
        ))}
      </div>
    </div>
  )
}

function DiscoverScreen() {
  const reactions = [['/sticker/fire_sticker.png', 12], ['/sticker/peach.png', 8], ['/sticker/heart.png', 5]]
  return (
    <div style={{ flex: 1, padding: '26px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: NB.ink }}>Discover</span>
        <span style={{ fontFamily: NB.fontMono, fontSize: 8.5, fontWeight: 700, color: '#888' }}>SQUAD</span>
      </div>

      <div style={{ ...nbCardStyle(NB.white, 3, NB_CARD_NEUTRAL_SHADOW), border: `2.5px solid ${NB.ink}`, borderRadius: 14, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${NB.ink}`, background: NB.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 13, color: NB.ink }}>M</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: NB.ink, lineHeight: 1.2 }}>Maya <span style={{ fontWeight: 600, color: '#555' }}>finished Lower Body</span> <FireIcon size={11} /></div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 8, color: '#aaa', marginTop: 1 }}>2m ago</div>
          </div>
        </div>

        <div style={{ borderRadius: 10, border: `1.5px solid ${NB.ink}`, background: NB.lavender, overflow: 'hidden', height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <img src="/exercises/barbell-squat.png" alt="" loading="lazy" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {reactions.map(([src, n]) => (
            <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 3, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '2px 6px', background: NB.lavenderMist }}>
              <img src={src} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
              <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink }}>{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Second post peeking in — reads as a live feed, not a single card */}
      <div style={{ ...nbCardStyle(NB.white, 3, NB_CARD_NEUTRAL_SHADOW), border: `2.5px solid ${NB.ink}`, borderRadius: 14, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 13, color: NB.ink, flexShrink: 0 }}>Z</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: NB.ink, lineHeight: 1.2 }}>Zoe <span style={{ fontWeight: 600, color: '#555' }}>logged Greek Yogurt Bowl</span> <SaladIcon size={11} /></div>
          <div style={{ fontFamily: NB.fontMono, fontSize: 8, color: '#aaa', marginTop: 1 }}>14m ago</div>
        </div>
        <img src="/sticker/peach.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} />
      </div>
    </div>
  )
}

function MockupsSection({ isMobile }) {
  const items = [
    { title: 'AI meal ideas', desc: 'Tell it a craving and AI builds a full meal around your macros — no endless barcode logging.', screen: <MealsScreen /> },
    { title: 'Muscle heatmap', desc: "See exactly which muscles you've trained, and what's ready for another session.", screen: <MuscleScreen /> },
    { title: 'Your squad', desc: 'Share workouts, cheer each other on, and stay accountable together.', screen: <DiscoverScreen /> },
  ]
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '16px 20px 40px' }}>
      <SectionEyebrow>See what's inside</SectionEyebrow>
      <SectionTitle>Features you won't find in a calorie app</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 40 : 28, justifyContent: 'center', marginTop: 30 }}>
        {items.map(it => (
          <div key={it.title} style={{ width: isMobile ? '100%' : 280, maxWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <MarketingPhone>{it.screen}</MarketingPhone>
            <div style={{ textAlign: 'center', maxWidth: 252 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: NB.ink }}>{it.title}</div>
              <div style={{ fontFamily: NB.fontMono, fontSize: 12.5, color: '#666', marginTop: 5, lineHeight: 1.5 }}>{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Them vs Us ─────────────────────────────────────────────────────────────

const VS_ROWS = [
  ['One generic plan for everyone', 'Personalized to your goal, equipment & injuries'],
  ['Endless manual barcode logging', 'AI builds your meals around your macros'],
  ['Just a number on a screen', 'A muscle heatmap of what you actually trained'],
  ['Easy to lose motivation and quit', 'Streaks, medals, quests & a squad keep it fun'],
  ['Built for everyone', "Built for women's strength & curves"],
]

function VsMark({ ok }) {
  return (
    <span style={{
      width: 17, height: 17, borderRadius: 5, flexShrink: 0, marginTop: 1,
      border: `1.5px solid ${NB.ink}`, background: ok ? NB.green : '#E7E1F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 900, color: ok ? NB.ink : '#9a92a8',
    }}>
      {ok ? '✓' : '✕'}
    </span>
  )
}

function ThemVsUs() {
  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '8px 20px 40px' }}>
      <SectionEyebrow>Why MissVfit</SectionEyebrow>
      <SectionTitle>Not just another calorie counter</SectionTitle>
      <div style={{ ...nbCardStyle(NB.white, 6), border: NB_BORDER, borderRadius: 20, overflow: 'hidden', marginTop: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ padding: '12px 14px', borderBottom: NB_BORDER, borderRight: `2px solid ${NB.ink}`, fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#999', textAlign: 'center' }}>Other apps</div>
          <div style={{ padding: '12px 14px', borderBottom: NB_BORDER, background: NB.lavender, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', ...proTextStyle }}>MissVfit</div>
        </div>
        {VS_ROWS.map((row, i) => {
          const last = i === VS_ROWS.length - 1
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '11px 12px', borderRight: `2px solid ${NB.ink}`, borderBottom: last ? 'none' : `2px solid ${NB.lavender}`, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <VsMark ok={false} />
                <span style={{ fontSize: 12, color: '#888', lineHeight: 1.35 }}>{row[0]}</span>
              </div>
              <div style={{ padding: '11px 12px', background: NB.lavenderMist, borderBottom: last ? 'none' : `2px solid ${NB.lavender}`, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <VsMark ok={true} />
                <span style={{ fontSize: 12.5, color: NB.ink, fontWeight: 700, lineHeight: 1.35 }}>{row[1]}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Free + Pro ─────────────────────────────────────────────────────────────

function FeatureRow({ f }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: NB.lavenderMist, border: `1.5px solid ${NB.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {renderIcon(f.icon, 18)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: NB.ink }}>{f.label}</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 2, lineHeight: 1.45 }}>{f.desc}</div>
      </div>
    </div>
  )
}

function FreeAndPro({ isMobile }) {
  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '8px 20px 40px' }}>
      <SectionEyebrow>What you get</SectionEyebrow>
      <SectionTitle>Everything you need — free</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginTop: 22 }}>
        {FREE_FEATURES.map(f => <FeatureRow key={f.label} f={f} />)}
      </div>

      <div style={{ ...nbCardStyle(NB.lavender, 5, NB.purpleDeep), border: NB_BORDER, borderRadius: 18, padding: '18px 20px', marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 17, textTransform: 'uppercase', ...proTextStyle }}>Plus 7 days of Pro — free</div>
        <div style={{ fontFamily: NB.fontMono, fontSize: 12.5, color: '#555', lineHeight: 1.5 }}>
          Every new member gets a week of Pro on us — no card, no commitment:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          {/* Only Pro features whose emoji maps to real /icons art (🍽️ 📅 📈 👑) */}
          {[PRO_FEATURES[0], PRO_FEATURES[2], PRO_FEATURES[5], PRO_FEATURES[6]].map(f => (
            <span key={f.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 9, padding: '5px 9px', fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, color: NB.ink }}>
              {renderIcon(f.icon, 13)} {f.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Final CTA + iOS steps + footer ───────────────────────────────────────

function FinalCTA({ isMobile, installLabel, onInstall, host }) {
  return (
    <section style={{ maxWidth: 560, margin: '0 auto', padding: '8px 20px 24px', textAlign: 'center' }}>
      <div style={{ ...nbCardStyle(NB.magenta, 7), border: `3px solid ${NB.white}`, borderRadius: 24, padding: '30px 24px' }}>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 'clamp(22px, 5vw, 30px)', textTransform: 'uppercase', color: NB.white, lineHeight: 1.05, textWrap: 'balance' }}>
          Your dream body starts today
        </div>
        <div style={{ fontFamily: NB.fontMono, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 10, lineHeight: 1.5 }}>
          Install MissVfit and get your personalized plan in minutes.
        </div>
        {isMobile ? (
          <>
            <InstallButton label={installLabel} onClick={onInstall} style={{ width: '100%', marginTop: 18, background: NB.white, color: NB.ink }} />
            <TrialLine color={NB.white} />
          </>
        ) : (
          <div style={{ ...nbCardStyle(NB.white, 3), border: `2px solid ${NB.ink}`, borderRadius: 12, padding: '12px 16px', marginTop: 18, display: 'inline-block' }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 700 }}>Open on your phone to install:</div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 14, fontWeight: 800, color: NB.purpleDeep, marginTop: 4, wordBreak: 'break-all' }}>{host}</div>
          </div>
        )}
      </div>
    </section>
  )
}

function IOSStepsSheet({ open, onClose }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(26,26,26,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: NB.white, borderTop: NB_BORDER, borderLeft: NB_BORDER, borderRight: NB_BORDER, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '22px 22px calc(30px + env(safe-area-inset-bottom))', width: '100%', maxWidth: 480 }}>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink, marginBottom: 12 }}>Add MissVfit to your Home Screen</div>
        <div style={{ fontFamily: NB.fontMono, fontSize: 13.5, color: '#555', lineHeight: 1.9 }}>
          1. Tap the <b>Share</b> icon in Safari<br />
          2. Scroll down and tap <b>“Add to Home Screen”</b><br />
          3. Open MissVfit from your Home Screen to sign up
        </div>
        <a href="/app" style={{ display: 'inline-block', marginTop: 16, fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, color: NB.purpleDeep, textDecoration: 'underline' }}>
          Or continue in the browser
        </a>
        <button onClick={onClose} style={{ display: 'block', width: '100%', marginTop: 16, height: 46, border: NB_BORDER, borderRadius: 12, background: NB.lavender, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}>
          Got it
        </button>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '28px 20px 40px', borderTop: `2px solid ${NB.lavender}` }}>
      <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>MissVfit</div>
      <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#888', marginTop: 6 }}>© {new Date().getFullYear()} MissVfit. All rights reserved.</div>
    </footer>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Landing() {
  const isMobile = useIsMobile()
  const { canInstall, promptInstall } = useInstallPrompt()
  const isIOS = isIOSDevice()
  const [showIOSSteps, setShowIOSSteps] = useState(false)
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  // An already-signed-in visitor on a phone (returning from an OAuth/email
  // redirect, or an old bookmark of the bare domain) should land straight in
  // the app, not the pitch. Desktop sessions are left here on purpose —
  // bouncing them to /app would just dead-end at the hard gate.
  useEffect(() => {
    if (!isMobile) return
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) window.location.replace('/app')
    })
    return () => { cancelled = true }
  }, [isMobile])

  // One install action shared by every CTA on the page: fire the native
  // Android/Chrome prompt when we have it, reveal the manual iOS steps sheet
  // on iOS, and otherwise hard-navigate into the app.
  const handleInstall = async () => {
    if (isMobile && canInstall) { await promptInstall(); return }
    if (isMobile && isIOS) { setShowIOSSteps(true); return }
    window.location.href = '/app'
  }

  const installLabel = !isMobile ? 'Get the App' : canInstall ? 'Install App' : isIOS ? 'Add to Home Screen' : 'Open the App'
  const host = typeof window !== 'undefined' ? window.location.host : ''

  // Keep the focal CTA one tap away on mobile: a floating install bar that
  // appears once the hero is scrolled past and hides again near the bottom
  // (where the final CTA already lives).
  const handleScroll = (e) => {
    const el = e.currentTarget
    const past = el.scrollTop > 520
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 260
    setShowStickyCTA(past && !nearBottom)
  }

  return (
    <div onScroll={handleScroll} style={{ height: '100vh', overflowY: 'auto', width: '100%', background: NB.bg, boxSizing: 'border-box' }}>
      <style>{LANDING_CSS}</style>

      <HeroSection installLabel={installLabel} onInstall={handleInstall} isMobile={isMobile} />
      <MockupsSection isMobile={isMobile} />
      <ThemVsUs />
      <FreeAndPro isMobile={isMobile} />
      <FinalCTA isMobile={isMobile} installLabel={installLabel} onInstall={handleInstall} host={host} />
      <Footer />

      {isMobile && showStickyCTA && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 150, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))', background: 'rgba(243,237,247,0.92)', borderTop: NB_BORDER, backdropFilter: 'blur(6px)' }}>
          <InstallButton label={installLabel} onClick={handleInstall} style={{ width: '100%', height: 52 }} />
        </div>
      )}

      <IOSStepsSheet open={showIOSSteps} onClose={() => setShowIOSSteps(false)} />
    </div>
  )
}
