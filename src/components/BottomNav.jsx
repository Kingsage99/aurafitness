import React from 'react'

const tabs = [
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
    id: 'squad',
    label: 'Squad',
    icon: (active) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#7C3AED' : '#B6A8CE'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3"/>
        <circle cx="17" cy="9" r="2.2"/>
        <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M15 14c2.4 0 4.5 1.6 4.5 4.2"/>
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

export default function BottomNav({ active, onNavigate }) {
  return (
    <div style={{
      height: 76,
      flexShrink: 0,
      background: '#fff',
      borderTop: '1px solid #F0E8FB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '8px 12px 16px',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          {tab.icon(active === tab.id)}
          <span style={{
            fontSize: 10,
            fontWeight: active === tab.id ? 800 : 600,
            color: active === tab.id ? '#7C3AED' : '#B6A8CE',
          }}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  )
}
