import React, { useState } from 'react'
import { COUNTRIES } from '../data/countries'
import { NB, NB_BORDER } from '../styles/neoBrutalism'

// Searchable country picker bottom-sheet. Shared by Leaderboard (regional
// scope) and Onboarding (region step for region-accurate nutrition).
// onSelect receives the ISO alpha-2 code.
export default function CountrySheet({ onSelect, onClose }) {
  const [q, setQ] = useState('')
  const results = q.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    : COUNTRIES

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} />
      <div style={{ position: 'relative', background: NB.white, borderTop: NB_BORDER, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: `0 -6px 0 ${NB.ink}`, padding: '0 20px 24px', zIndex: 1, maxHeight: '78%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 38, height: 5, background: NB.ink, margin: '14px auto 14px', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
          <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 19, textTransform: 'uppercase', color: NB.ink }}>Choose your country</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.white, cursor: 'pointer', color: NB.ink, fontSize: 16, fontWeight: 700 }}>✕</button>
        </div>
        <input
          value={q} onChange={e => setQ(e.target.value)} placeholder="Search country"
          style={{ width: '100%', height: 44, border: `2px solid ${NB.ink}`, borderRadius: 12, padding: '0 14px', fontSize: 14, color: NB.ink, background: NB.white, outline: 'none', boxSizing: 'border-box', fontFamily: NB.fontDisplay, marginBottom: 10, flexShrink: 0 }}
        />
        <div style={{ overflowY: 'auto' }}>
          {results.map(c => (
            <button key={c.code} onClick={() => onSelect(c.code)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px', background: 'none', border: 'none', borderBottom: `1px solid ${NB.ink}30`, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 18 }}>{c.flag}</span>
              <span style={{ fontSize: 14, color: NB.ink, fontWeight: 600 }}>{c.name}</span>
            </button>
          ))}
          {results.length === 0 && <div style={{ padding: '16px 6px', fontSize: 13, color: '#555' }}>No countries match "{q}"</div>}
        </div>
      </div>
    </div>
  )
}
