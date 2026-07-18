import React from 'react'
import { NB, NB_BORDER, hardShadow, NB_DOT_GRID } from '../styles/neoBrutalism'
import { useIsMobile } from '../hooks/useIsMobile'

function StatusBar() {
  const isMobile = useIsMobile()
  if (isMobile) return null
  // Mock time/wifi/battery removed — was decorative phone-frame chrome only,
  // no real device data. Spacer div kept so every screen's existing layout
  // spacing stays unchanged.
  return <div style={{ height: 46, flexShrink: 0 }} />
}

export default function PhoneFrame({ children, hideStatus }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="phone-viewport" style={{
        position: 'relative',
        width: '100%',
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
