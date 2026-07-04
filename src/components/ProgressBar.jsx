import React from 'react'
import { NB, NB_BORDER } from '../styles/neoBrutalism'

export default function ProgressBar({ step, total = 8 }) {
  return (
    <div style={{
      padding: '8px 22px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      flexShrink: 0,
    }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: 6,
            border: NB_BORDER,
            background: i < step ? NB.teal : NB.white,
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  )
}
