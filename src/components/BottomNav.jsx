import React, { useContext, createContext } from 'react'
import { NB, NB_BORDER } from '../styles/neoBrutalism'

// Provided by App with the pending friend-request count, so the badge shows on
// every screen's nav without each screen having to thread the prop through.
export const NavBadgeContext = createContext(0)

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
    id: 'discovery',
    label: 'Discover',
    activeBg: NB.pink,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
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

export default function BottomNav({ active, onNavigate, pendingRequests }) {
  const ctxPending = useContext(NavBadgeContext)
  // Explicit prop wins (Discovery passes a live count); otherwise use App's context
  const pendingCount = pendingRequests ?? ctxPending ?? 0

  return (
    <div style={{
      height: 80, background: NB.white, borderTop: NB_BORDER,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '8px 8px 18px', flexShrink: 0,
    }}>
      {MAIN_TABS.map(tab => (
        <TabBtn key={tab.id} tab={tab} active={active} onNavigate={onNavigate} badge={tab.id === 'discovery' ? pendingCount : 0} />
      ))}
    </div>
  )
}

function TabBtn({ tab, active, onNavigate, badge = 0 }) {
  const isActive = active === tab.id
  return (
    <button
      onClick={() => onNavigate(tab.id)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        background: isActive ? tab.activeBg : 'none',
        border: isActive ? NB_BORDER : '3px solid transparent',
        borderRadius: 12,
        cursor: 'pointer', padding: '6px 10px', position: 'relative',
      }}
    >
      {tab.icon}
      <span style={{ fontFamily: NB.fontMono, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: NB.ink }}>
        {tab.label}
      </span>
      {badge > 0 && (
        <div style={{
          position: 'absolute', top: -4, right: 2,
          width: 18, height: 18, borderRadius: 6, border: `2px solid ${NB.ink}`,
          background: NB.red, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.white }}>{badge}</span>
        </div>
      )}
    </button>
  )
}
