import React, { useState, useEffect } from 'react'
import {
  NB, NB_BORDER, hardShadow, nbCardStyle, nbButton,
  NB_CARD_NEUTRAL_SHADOW, proTextStyle,
} from '../styles/neoBrutalism'
import { renderIcon } from '../components/Icons'
import { FEATURES as PRO_FEATURES } from './ProUpsell'
import { isIOSDevice } from '../utils/pushNotifications'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useIsMobile } from '../hooks/useIsMobile'
import { supabase } from '../lib/supabase'

const FREE_FEATURES = [
  { icon: '💪', label: 'Personalized workout plan', desc: 'An 8-step quiz builds your split around your goals, experience, equipment, and injuries' },
  { icon: '📈', label: 'Workout tracking + muscle heatmap', desc: 'See exactly which muscles you hit, session by session' },
  { icon: '🥗', label: 'AI meal suggestions', desc: '3 AI-generated meals and 10 food lookups every day, built around your macros' },
  { icon: '🌍', label: 'Squad feed', desc: 'Share workouts, react, and stay accountable with friends' },
  { icon: '🔥', label: 'Streaks, medals & quests', desc: 'Daily and weekly challenges that keep you coming back' },
]

function HeroSection({ onInstallClick, installLabel }) {
  return (
    <section style={{ textAlign: 'center', padding: '56px 20px 40px', maxWidth: 640, margin: '0 auto' }}>
      <img
        src="/cute_logo.png"
        alt="MissVfit"
        style={{ width: 84, height: 84, borderRadius: 20, border: NB_BORDER, boxShadow: hardShadow(5), objectFit: 'cover', margin: '0 auto 22px' }}
      />
      <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 'clamp(30px, 6vw, 46px)', textTransform: 'uppercase', color: NB.ink, lineHeight: 1.08, textWrap: 'balance' }}>
        Your women's strength companion
      </div>
      <div style={{ fontFamily: NB.fontMono, fontSize: 15, color: '#555', marginTop: 16, lineHeight: 1.6, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
        A personalized workout plan, AI-powered meal ideas, and a squad to keep you accountable — built for a phone, in your pocket.
      </div>
      <button
        onClick={onInstallClick}
        style={{ ...nbButton(NB.magenta, 6), color: NB.white, borderRadius: 16, height: 56, padding: '0 32px', fontSize: 16, marginTop: 28 }}
      >
        {installLabel}
      </button>
    </section>
  )
}

function FeatureColumn({ title, subtitle, features, accent, titleStyle }) {
  return (
    <div style={{
      ...nbCardStyle(NB.white, 6, accent),
      border: NB_BORDER,
      borderRadius: 22,
      padding: '28px 24px',
      flex: '1 1 320px',
      minWidth: 0,
    }}>
      <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', ...titleStyle }}>{title}</div>
      <div style={{ fontFamily: NB.fontMono, fontSize: 13, color: '#555', marginTop: 4, marginBottom: 20 }}>{subtitle}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {features.map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: NB.lavenderMist, border: `1.5px solid ${NB.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {renderIcon(f.icon, 18)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: NB.ink }}>{f.label}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2, lineHeight: 1.45 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureComparison() {
  return (
    <section style={{ maxWidth: 920, margin: '0 auto', padding: '20px 20px 48px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: NB.fontMono, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: NB.purpleDeep }}>What you get</div>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 'clamp(24px, 4vw, 32px)', textTransform: 'uppercase', color: NB.ink, marginTop: 6 }}>Free vs. Pro</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <FeatureColumn
          title="Free"
          subtitle="Everything you need to start training"
          features={FREE_FEATURES}
          accent={NB_CARD_NEUTRAL_SHADOW}
          titleStyle={{ color: NB.ink }}
        />
        <FeatureColumn
          title="MissVfit Pro"
          subtitle="Free 7-day trial, then from $14.99/mo"
          features={PRO_FEATURES}
          accent={NB.purpleDeep}
          titleStyle={proTextStyle}
        />
      </div>
    </section>
  )
}

function InstallCTA({ isMobile, canInstall, promptInstall }) {
  const [showIOSSteps, setShowIOSSteps] = useState(false)
  const isIOS = isIOSDevice()

  if (!isMobile) {
    return (
      <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 56px', textAlign: 'center' }}>
        <div style={{ ...nbCardStyle(NB.lavender, 5), border: NB_BORDER, borderRadius: 20, padding: '28px 26px' }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink }}>Get it on your phone</div>
          <div style={{ fontFamily: NB.fontMono, fontSize: 13, color: '#555', marginTop: 10, lineHeight: 1.6 }}>
            MissVfit is built for mobile. Open this page on your phone's browser to install it and get started.
          </div>
          <div style={{ ...nbCardStyle(NB.white, 3), border: `2px solid ${NB.ink}`, borderRadius: 12, padding: '10px 14px', marginTop: 16, fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, color: NB.ink, display: 'inline-block', wordBreak: 'break-all' }}>
            {typeof window !== 'undefined' ? window.location.host : ''}
          </div>
        </div>
      </section>
    )
  }

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall()
      return
    }
    if (isIOS) {
      setShowIOSSteps(true)
      return
    }
    window.location.href = '/app'
  }

  return (
    <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 56px', textAlign: 'center' }}>
      <button onClick={handleClick} style={{ ...nbButton(NB.magenta, 6), color: NB.white, borderRadius: 16, height: 56, padding: '0 32px', fontSize: 16, width: '100%' }}>
        {canInstall ? 'Install App' : isIOS ? 'Add to Home Screen' : 'Open the App'}
      </button>
      {showIOSSteps && (
        <div style={{ ...nbCardStyle(NB.lavender, 4), border: NB_BORDER, borderRadius: 16, padding: '18px 20px', marginTop: 16, textAlign: 'left' }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, color: NB.ink, marginBottom: 8 }}>On iPhone:</div>
          <div style={{ fontFamily: NB.fontMono, fontSize: 13, color: '#555', lineHeight: 1.8 }}>
            1. Tap the Share icon in Safari<br />
            2. Scroll down and tap "Add to Home Screen"<br />
            3. Open MissVfit from your Home Screen to sign up
          </div>
          <a href="/app" style={{ display: 'inline-block', marginTop: 14, fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, color: NB.purpleDeep, textDecoration: 'underline' }}>
            Or continue in the browser
          </a>
        </div>
      )}
    </section>
  )
}

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '32px 20px 40px', borderTop: `2px solid ${NB.lavender}` }}>
      <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>MissVfit</div>
      <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#888', marginTop: 6 }}>© {new Date().getFullYear()} MissVfit. All rights reserved.</div>
    </footer>
  )
}

export default function Landing() {
  const isMobile = useIsMobile()
  const { canInstall, promptInstall } = useInstallPrompt()

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

  const handleInstallClick = async () => {
    if (isMobile && canInstall) {
      await promptInstall()
      return
    }
    window.location.href = '/app'
  }

  const installLabel = !isMobile ? 'Get the App' : canInstall ? 'Install App' : 'Open the App'

  return (
    <div style={{ height: '100vh', overflowY: 'auto', width: '100%', background: NB.bg, boxSizing: 'border-box' }}>
      <HeroSection onInstallClick={handleInstallClick} installLabel={installLabel} />
      <FeatureComparison />
      <InstallCTA isMobile={isMobile} canInstall={canInstall} promptInstall={promptInstall} />
      <Footer />
    </div>
  )
}
