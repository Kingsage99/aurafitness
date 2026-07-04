import React, { useState, useEffect } from 'react'
import { NB, NB_BORDER, hardShadow, NB_DOT_GRID } from '../styles/neoBrutalism'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

function StatusBar() {
  const isMobile = useIsMobile()
  if (isMobile) return null
  return (
    <div style={{
      height: 46,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 26px 0',
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: NB.fontMono, fontWeight: 700, fontSize: 15, color: NB.ink }}>9:41</span>
      <svg width="66" height="13" viewBox="0 0 66 13" fill={NB.ink}>
        <rect x="0" y="4" width="3" height="9"/>
        <rect x="5" y="2.5" width="3" height="10.5"/>
        <rect x="10" y="1" width="3" height="12"/>
        <rect x="15" y="0" width="3" height="13" opacity=".4"/>
        <path d="M26 3.6c3-2.7 7-2.7 10 0M28 6.1c1.6-1.4 3.4-1.4 5 0M30.5 8.5c.6-.6 1.4-.6 2 0" stroke={NB.ink} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <rect x="45" y="1.5" width="17" height="10" rx="1" fill="none" stroke={NB.ink} strokeWidth="1.3"/>
        <rect x="47" y="3.4" width="11" height="6.2"/>
        <rect x="63" y="4.5" width="2" height="4"/>
      </svg>
    </div>
  )
}

export default function PhoneFrame({ children, hideStatus }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div style={{
        width: '100%',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...NB_DOT_GRID,
      }}>
        {children}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: NB.bg,
      padding: '24px 0',
    }}>
      <div style={{
        width: 384,
        height: 832,
        borderRadius: 0,
        ...NB_DOT_GRID,
        boxShadow: hardShadow(10),
        border: NB_BORDER,
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
