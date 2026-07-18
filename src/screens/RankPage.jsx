import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomSheet from '../components/BottomSheet'
import RankLadder from '../components/RankLadder'
import { RANKS, RANK_UP_AT, SUB_LEVEL_ROMAN, SUB_LEVELS_PER_TIER, normalizeRankId, getMuscleRankInfo, MUSCLE_RANK_MIN_WORKOUTS } from '../utils/gamification'
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../utils/muscleLabels'
import { NB, NB_BORDER, hardShadow, nbCardStyle, shade, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'
import { TrophyIcon, LockIcon } from '../components/Icons'

// Full rank page — overall rank hero + ladder, plus every body part's rank.
// Reached by tapping the big rank badge on the Profile screen.
export default function RankPage({ gamification = {}, onNavigate }) {
  const g = gamification
  const [ladderMuscle, setLadderMuscle] = useState(null)
  const [showInfo, setShowInfo] = useState(false)

  const rank = RANKS.find(r => r.id === normalizeRankId(g.rank)) || RANKS[0]
  const isTop = rank.id === RANKS[RANKS.length - 1].id
  const subLevel = Math.min(g.rankSubLevel || 0, SUB_LEVELS_PER_TIER - 1)
  const roman = isTop ? '' : SUB_LEVEL_ROMAN[subLevel]
  const rpPct = Math.round(((g.rankPoints || 0) / RANK_UP_AT) * 100)

  const muscleUnlocked = (g.totalWorkouts || 0) >= MUSCLE_RANK_MIN_WORKOUTS

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ position: 'relative', background: rank.bgGradient || rank.bg, borderBottom: NB_BORDER, padding: '12px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => onNavigate('profile')} style={{ width: 38, height: 38, borderRadius: 12, border: `1.5px solid ${NB.ink}`, background: 'rgba(255,255,255,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink }}>Your Rank</div>
          <button onClick={() => setShowInfo(v => !v)} aria-label="How ranks work" style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: '50%', border: `2px solid ${NB.ink}`, background: showInfo ? NB.ink : 'rgba(255,255,255,.6)', color: showInfo ? NB.white : NB.ink, fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>i</button>
        </div>

        {/* Info popover */}
        {showInfo && (
          <div style={{ position: 'absolute', top: 52, right: 16, zIndex: 20, width: 268, ...nbCardStyle(NB_CARD_NEUTRAL, 4, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 13, textTransform: 'uppercase', color: NB.ink, marginBottom: 8 }}>How ranks work</div>
            <div style={{ fontSize: 12, color: '#333', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 8px' }}><strong>Your rank</strong> climbs as you train. Each workout earns points — 100 points moves you up one level (III → II → I), then into the next tier.</p>
              <p style={{ margin: 0 }}><strong>Body-part ranks</strong> level up from the sets you do for each muscle. Training it heavier and more often ranks it up faster.</p>
            </div>
            <button onClick={() => setShowInfo(false)} style={{ marginTop: 10, width: '100%', height: 34, border: `2px solid ${NB.ink}`, borderRadius: 9, background: NB.yellow, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}>Got it</button>
          </div>
        )}

        {/* Hero: big badge + current tier */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
          <img src={rank.image} alt={rank.label} style={{ width: 130, height: 130, objectFit: 'contain', filter: `drop-shadow(${hardShadow(3)})` }} />
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 30, textTransform: 'uppercase', color: rank.color === '#fff' ? NB.ink : rank.color, marginTop: 6, lineHeight: 1 }}>
            {rank.label}{roman ? ` ${roman}` : ''}
          </div>
          {!isTop ? (
            <div style={{ width: '100%', maxWidth: 260, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink }}>{g.rankPoints || 0} / {RANK_UP_AT} RP</span>
                <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: NB.ink }}>NEXT SUB-LEVEL</span>
              </div>
              <div style={{ height: 10, border: `2px solid ${NB.ink}`, borderRadius: 6, background: 'rgba(255,255,255,.5)', overflow: 'hidden' }}>
                <div style={{ width: `${rpPct}%`, height: '100%', background: NB.ink }} />
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: NB.ink, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>{g.rankPoints || 0} RP · Top tier reached <TrophyIcon size={14} /></div>
          )}
        </div>
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 24px' }}>
        {/* Overall ladder */}
        <div style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 10 }}>All Ranks</div>
        <RankLadder unlocked rank={rank.id} rankPoints={g.rankPoints || 0} subLevelLabel={roman} isTop={isTop} />

        {/* Body-part ranks */}
        <div style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, margin: '22px 0 6px' }}>Body Part Ranks</div>
        {muscleUnlocked ? (
          <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>Tap a body part to see its rank ladder.</div>
        ) : (
          <div style={{ ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: NB.ink, display: 'flex', alignItems: 'center', gap: 5 }}><LockIcon size={13} /> Unlock body-part ranks</span>
              <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: NB.ink }}>{Math.min(g.totalWorkouts || 0, MUSCLE_RANK_MIN_WORKOUTS)} / {MUSCLE_RANK_MIN_WORKOUTS}</span>
            </div>
            <div style={{ height: 10, border: `2px solid ${NB.ink}`, borderRadius: 6, background: NB.white, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, ((g.totalWorkouts || 0) / MUSCLE_RANK_MIN_WORKOUTS) * 100)}%`, height: '100%', background: NB.magenta }} />
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
              {Math.max(0, MUSCLE_RANK_MIN_WORKOUTS - (g.totalWorkouts || 0))} more workout{MUSCLE_RANK_MIN_WORKOUTS - (g.totalWorkouts || 0) === 1 ? '' : 's'} to go.
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {MUSCLE_GROUPS.map(m => {
            const info = getMuscleRankInfo(g, m.id)
            const tier = info.tier
            const badge = info.unlocked && !info.isTop ? info.subLevelLabel : info.isTop ? 'MAX' : ''
            return (
              <button
                key={m.id}
                onClick={() => info.unlocked && setLadderMuscle(m.id)}
                disabled={!info.unlocked}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, ...nbCardStyle(info.unlocked ? (tier.bgGradient || tier.bg) : '#eee', info.unlocked ? 2 : 0, info.unlocked ? shade(tier.bg, -38) : undefined), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '12px 10px', cursor: info.unlocked ? 'pointer' : 'default', opacity: info.unlocked ? 1 : 0.6 }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={tier.image} alt="" style={{ width: 74, height: 74, objectFit: 'contain', filter: info.unlocked ? 'none' : 'grayscale(1)' }} />
                  {info.unlocked && badge && (
                    <span style={{ position: 'absolute', bottom: -2, right: -6, fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 900, color: NB.ink, background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 7, padding: '0 6px', lineHeight: '19px' }}>{badge}</span>
                  )}
                </div>
                <div style={{ fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, textAlign: 'center', lineHeight: 1.15 }}>{m.label}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Per-muscle ladder sheet */}
      <BottomSheet open={!!ladderMuscle} onClose={() => setLadderMuscle(null)} title={ladderMuscle ? `${MUSCLE_LABELS[ladderMuscle] || ladderMuscle} Rank` : ''}>
        {ladderMuscle && <RankLadder {...getMuscleRankInfo(g, ladderMuscle)} />}
      </BottomSheet>
    </>
  )
}
