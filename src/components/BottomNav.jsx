import React, { useState } from 'react'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const MAIN_TABS = [
  {
    id: 'home',
    label: 'Home',
    activeBg: NB.teal,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinejoin="round">
        <path d="M3 11l9-7 9 7v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'workout',
    label: 'Workouts',
    activeBg: NB.yellow,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5l11 11M4 9l-2 2 3 3 2-2M20 15l2-2-3-3-2 2"/>
      </svg>
    ),
  },
  {
    id: 'meals',
    label: 'Meals',
    activeBg: NB.green,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 3v7a2 2 0 0 0 4 0V3M6 12v9M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5zM16 12v9"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    activeBg: NB.lavender,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
      </svg>
    ),
  },
]

const PLUS_ITEMS = [
  {
    id: 'discovery',
    label: 'Discover',
    bg: NB.teal,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    bg: NB.blue,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    bg: NB.yellow,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2 2 0 0 1 0-4H6M18 9h1.5a2 2 0 0 0 0-4H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z"/>
      </svg>
    ),
  },
]

export default function BottomNav({ active, onNavigate, pendingRequests = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handlePlusItem = (id) => {
    setMenuOpen(false)
    onNavigate(id)
  }

  const LEFT_TABS  = MAIN_TABS.slice(0, 2)
  const RIGHT_TABS = MAIN_TABS.slice(2)

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      )}

      {menuOpen && (
        <div style={{
          position: 'absolute', bottom: 82, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 12,
          padding: '0 16px 12px', zIndex: 50,
        }}>
          {PLUS_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handlePlusItem(item.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: NB.white, border: NB_BORDER,
                padding: '10px 14px', cursor: 'pointer', minWidth: 70,
                boxShadow: hardShadow(4), position: 'relative',
              }}
            >
              <div style={{ width: 32, height: 32, border: NB_BORDER, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </div>
              <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: NB.ink }}>{item.label}</span>
              {item.id === 'discovery' && pendingRequests > 0 && (
                <div style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 20, height: 20, border: NB_BORDER,
                  background: NB.red, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.white }}>{pendingRequests}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{
        height: 80, background: NB.white, borderTop: NB_BORDER,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '8px 8px 18px', position: 'relative', zIndex: 41,
      }}>
        {LEFT_TABS.map(tab => <TabBtn key={tab.id} tab={tab} active={active} onNavigate={onNavigate} />)}

        <div style={{ width: 78, position: 'relative', flex: 'none' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              cursor: 'pointer', position: 'absolute', left: '50%', top: 0,
              transform: 'translate(-50%,-46%)', width: 66, height: 66,
              filter: `drop-shadow(${hardShadow(4)})`, border: 'none', background: 'none', padding: 0,
            }}
          >
            <div style={{
              width: '100%', height: '100%', background: NB.ink,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 56, height: 56, background: NB.magenta,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  color: NB.white, fontWeight: 900, fontSize: 30, lineHeight: 1,
                  transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.15s',
                }}>＋</span>
              </div>
            </div>
          </button>
        </div>

        {RIGHT_TABS.map(tab => <TabBtn key={tab.id} tab={tab} active={active} onNavigate={onNavigate} />)}
      </div>
    </div>
  )
}

function TabBtn({ tab, active, onNavigate }) {
  const isActive = active === tab.id
  return (
    <button
      onClick={() => onNavigate(tab.id)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        background: isActive ? tab.activeBg : 'none',
        border: isActive ? NB_BORDER : '3px solid transparent',
        cursor: 'pointer', padding: '6px 10px',
      }}
    >
      {tab.icon}
      <span style={{ fontFamily: NB.fontMono, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: NB.ink }}>
        {tab.label}
      </span>
    </button>
  )
}
