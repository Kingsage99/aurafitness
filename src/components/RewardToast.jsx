import React from 'react'

export default function RewardToast({ notifications }) {
  if (!notifications.length) return null
  return (
    <div style={{
      position: 'absolute', top: 56, left: 14, right: 14,
      zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 7,
      pointerEvents: 'none',
    }}>
      {notifications.map(n => (
        <div key={n.id} style={{
          background: 'linear-gradient(135deg,#2E1065,#5B21B6)',
          borderRadius: 14, padding: '11px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 24px rgba(46,16,101,.45)',
          animation: 'toastIn 0.28s ease',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', flex: 1 }}>{n.msg}</span>
        </div>
      ))}
      <style>{`@keyframes toastIn { from { transform: translateY(-14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}
