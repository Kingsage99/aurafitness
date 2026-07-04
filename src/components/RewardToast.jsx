import React from 'react'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

export default function RewardToast({ notifications }) {
  if (!notifications.length) return null
  return (
    <div style={{
      position: 'absolute', top: 56, left: 14, right: 14,
      zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {notifications.map(n => (
        <div key={n.id} style={{
          background: NB.yellow, border: NB_BORDER, boxShadow: hardShadow(4),
          padding: '11px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'toastIn 0.28s ease',
        }}>
          <span style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, color: NB.ink, flex: 1, textTransform: 'uppercase' }}>{n.msg}</span>
        </div>
      ))}
      <style>{`@keyframes toastIn { from { transform: translateY(-14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}
