import React, { useState } from 'react'

const MAIN_TABS = [
  {
    id: 'home',
    label: 'Home',
    icon: (active) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#7C3AED' : '#B6A8CE'} strokeWidth="2" strokeLinejoin="round">
        <path d="M3 11l9-7 9 7v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'workout',
    label: 'Workouts',
    icon: (active) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#7C3AED' : '#B6A8CE'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5l11 11M4 9l-2 2 3 3 2-2M20 15l2-2-3-3-2 2"/>
      </svg>
    ),
  },
  {
    id: 'meals',
    label: 'Meals',
    icon: (active) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#7C3AED' : '#B6A8CE'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 3v7a2 2 0 0 0 4 0V3M6 12v9M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5zM16 12v9"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (active) => (
      <svg width="21" height="21" viewBox="0 0 24 24"
        fill={active ? '#7C3AED' : 'none'}
        stroke={active ? '#7C3AED' : '#B6A8CE'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Ranks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      {/* Backdrop — closes menu on outside tap */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      )}

      {/* Floating menu chips above nav */}
      {menuOpen && (
        <div style={{
          position: 'absolute', bottom: 76, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 12,
          padding: '0 16px 12px', zIndex: 50,
        }}>
          {PLUS_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handlePlusItem(item.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                background: '#fff', border: '1.5px solid #EDE4F8', borderRadius: 18,
                padding: '10px 14px', cursor: 'pointer', minWidth: 70,
                boxShadow: '0 8px 24px rgba(76,36,120,.14)', position: 'relative',
              }}
            >
              {item.icon}
              <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED' }}>{item.label}</span>
              {item.id === 'discovery' && pendingRequests > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#EF4444', border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>{pendingRequests}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Nav bar */}
      <div style={{
        height: 76, background: '#fff', borderTop: '1px solid #F0E8FB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '8px 8px 16px', position: 'relative', zIndex: 41,
      }}>
        {LEFT_TABS.map(tab => <TabBtn key={tab.id} tab={tab} active={active} onNavigate={onNavigate} />)}

        {/* Centre + button */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: menuOpen
              ? 'linear-gradient(135deg,#5B21B6,#4C1D95)'
              : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(124,58,237,.45)',
            marginTop: -22, flexShrink: 0,
            transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s, background 0.18s',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        {RIGHT_TABS.map(tab => <TabBtn key={tab.id} tab={tab} active={active} onNavigate={onNavigate} />)}
      </div>
    </div>
  )
}

function TabBtn({ tab, active, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(tab.id)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
      }}
    >
      {tab.icon(active === tab.id)}
      <span style={{ fontSize: 10, fontWeight: active === tab.id ? 800 : 600, color: active === tab.id ? '#7C3AED' : '#B6A8CE' }}>
        {tab.label}
      </span>
    </button>
  )
}
