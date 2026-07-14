import React from 'react'
import { RANKS } from '../utils/gamification'
import { NB } from '../styles/neoBrutalism'
import { LockIcon } from './Icons'

// currentRankId: one of RANKS ids (ignored when unlocked===false)
export default function RankLadder({ unlocked, rank: currentRankId, rankPoints = 0, subLevelLabel = '', isTop = false }) {
  const rungs = [...RANKS].reverse() // Goddess first (top) -> Rookie last
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
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
            border: 'none', borderRadius: 14,
            background: isCurrent ? tier.bg : NB.lavenderMist,
            opacity: achieved || isCurrent ? 1 : 0.5,
          }}>
            <img src={tier.image} alt={tier.label} style={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0, filter: achieved || isCurrent ? 'none' : 'grayscale(1)' }} />
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
        border: 'none', borderRadius: 14,
        background: !unlocked ? NB.ink : NB.lavenderMist,
        opacity: !unlocked ? 1 : 0.4,
      }}>
        <LockIcon size={20} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 900, textTransform: 'uppercase', color: !unlocked ? NB.white : NB.ink }}>Unranked</div>
          {!unlocked && <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.white }}>Complete 5 total workouts to unlock</div>}
        </div>
        {!unlocked && <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.white }}>← YOU</span>}
      </div>
    </div>
  )
}
