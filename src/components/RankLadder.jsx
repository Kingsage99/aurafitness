import React from 'react'
import { RANKS } from '../utils/gamification'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

// currentRankId: one of RANKS ids (ignored when unlocked===false)
export default function RankLadder({ unlocked, rank: currentRankId, rankPoints = 0, subLevelLabel = '', isTop = false }) {
  const rungs = [...RANKS].reverse() // Olympian first (top) -> Bronze last
  const currentIdx = RANKS.findIndex(r => r.id === currentRankId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rungs.map(tier => {
        const idx = RANKS.findIndex(r => r.id === tier.id)
        const isCurrent = unlocked && tier.id === currentRankId
        const achieved  = unlocked && idx <= currentIdx
        const tierIsTop = idx === RANKS.length - 1
        const label = isCurrent && !tierIsTop ? `${tier.label} ${subLevelLabel}` : tier.label

        return (
          <div key={tier.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
            border: NB_BORDER,
            background: isCurrent ? tier.bg : NB.white,
            boxShadow: isCurrent ? hardShadow(4) : 'none',
            opacity: achieved || isCurrent ? 1 : 0.5,
          }}>
            <span style={{ width: 28, height: 28, border: `2.5px solid ${NB.ink}`, background: tier.bg, transform: 'rotate(45deg)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 900, textTransform: 'uppercase', color: NB.ink }}>
                {label}{isCurrent ? ' ← You' : ''}
              </div>
              {isCurrent && !tierIsTop && (
                <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink }}>{rankPoints}/100 to next sub-level</div>
              )}
              {isCurrent && tierIsTop && (
                <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink }}>{rankPoints} pts</div>
              )}
            </div>
          </div>
        )
      })}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
        border: NB_BORDER,
        background: !unlocked ? NB.ink : NB.white,
        opacity: !unlocked ? 1 : 0.4,
      }}>
        <span style={{ fontSize: 20 }}>🔒</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 900, textTransform: 'uppercase', color: !unlocked ? NB.white : NB.ink }}>Unranked</div>
          {!unlocked && <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.white }}>Complete 5 total workouts to unlock</div>}
        </div>
        {!unlocked && <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.white }}>← YOU</span>}
      </div>
    </div>
  )
}
