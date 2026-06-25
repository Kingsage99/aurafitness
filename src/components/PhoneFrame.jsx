import React from 'react'

function StatusBar() {
  return (
    <div style={{
      height: 46,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 26px 0',
      flexShrink: 0,
    }}>
      <span style={{ fontWeight: 700, fontSize: 15, color: '#2E1065' }}>9:41</span>
      <svg width="66" height="13" viewBox="0 0 66 13" fill="#2E1065">
        <rect x="0" y="4" width="3" height="9" rx="1"/>
        <rect x="5" y="2.5" width="3" height="10.5" rx="1"/>
        <rect x="10" y="1" width="3" height="12" rx="1"/>
        <rect x="15" y="0" width="3" height="13" rx="1" opacity=".4"/>
        <path d="M26 3.6c3-2.7 7-2.7 10 0M28 6.1c1.6-1.4 3.4-1.4 5 0M30.5 8.5c.6-.6 1.4-.6 2 0" stroke="#2E1065" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <rect x="45" y="1.5" width="17" height="10" rx="3" fill="none" stroke="#2E1065" strokeWidth="1.3"/>
        <rect x="47" y="3.4" width="11" height="6.2" rx="1.5"/>
        <rect x="63" y="4.5" width="2" height="4" rx="1"/>
      </svg>
    </div>
  )
}

export default function PhoneFrame({ children, hideStatus }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#E9E5F2',
      padding: '24px 0',
    }}>
      <div style={{
        width: 384,
        height: 832,
        borderRadius: 46,
        background: 'linear-gradient(180deg,#FBF7FF 0%,#F4ECFB 100%)',
        boxShadow: '0 24px 60px rgba(76,36,120,.18)',
        border: '1px solid rgba(255,255,255,.7)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flexShrink: 0,
      }}>
        {!hideStatus && <StatusBar />}
        {children}
      </div>
    </div>
  )
}

export { StatusBar }
