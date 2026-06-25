import React from 'react'

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
            height: 5,
            borderRadius: 3,
            background: i < step ? '#7C3AED' : '#E4D8F5',
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  )
}
