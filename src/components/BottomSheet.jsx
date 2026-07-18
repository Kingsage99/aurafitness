import React, { useState, useEffect } from 'react'
import { NB, NB_BORDER } from '../styles/neoBrutalism'

// Shared slide-up sheet: dark backdrop + white rounded-top card pinned to the
// bottom of the phone frame. Same pattern as the cookbook sheet in Meals and
// the reaction sheet in Discovery.
//
// Stays mounted for a beat after `open` goes false so the close transition
// (slide-down + fade) can actually play, instead of vanishing instantly.
export default function BottomSheet({ open, onClose, title, children, maxHeight = '82%' }) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const t = setTimeout(() => setMounted(false), 220)
    return () => clearTimeout(t)
  }, [open])

  if (!mounted) return null
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div
        onClick={onClose}
        style={{ flex: 1, background: 'rgba(0,0,0,.45)', opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease' }}
      />
      <div style={{
        background: NB.white, borderTop: NB_BORDER, borderTopLeftRadius: 22, borderTopRightRadius: 22,
        boxShadow: `0 -6px 0 ${NB.ink}`, padding: '16px 22px 32px', maxHeight, display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        <div style={{ width: 38, height: 5, background: NB.ink, borderRadius: 3, margin: '0 auto 14px', flexShrink: 0 }} />
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
            <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink }}>{title}</span>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.white, fontSize: 15, fontWeight: 800, color: NB.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        )}
        <div style={{ overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}
