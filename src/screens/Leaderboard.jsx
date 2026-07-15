import React, { useState, useEffect, useCallback } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { RANKS, getLevel, getMetricScore, compareByMetric, getMuscleRankInfo, MUSCLE_RANK_MIN_WORKOUTS, normalizeRankId, SUB_LEVEL_ROMAN } from '../utils/gamification'
import { fetchLeaderboardProfiles } from '../lib/social'
import { COUNTRIES } from '../data/countries'
import { MUSCLE_GROUPS } from '../utils/muscleLabels'
import CountrySheet from '../components/CountrySheet'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'
import { CrownIcon, LockIcon, GlobeIcon } from '../components/Icons'

const SCOPES  = [['friends', 'Friends'], ['global', 'Global'], ['regional', 'Regional']]
const METRICS = [['streaks', 'Streaks'], ['ranks', 'Ranks'], ['levels', 'Levels']]

const INFO_COPY = {
  streaks: 'Ranked by your current workout streak — miss a day and it resets.',
  ranks:   'Ranked by tier (Rookie → Goddess) and rank points earned within it. Tap a muscle below to see rankings for that muscle group.',
  levels:  'Ranked by your XP level, earned from workouts, meals and badges.',
}

const LOCKED_COPY = {
  streaks: 'Complete a workout to join the Streaks leaderboard!',
  ranks:   'Log your first workout to earn Rank Points!',
  levels:  'Earn XP to appear on the Levels board!',
}

function displayName(row) {
  return row?.profile_data?.name || row?.username || 'MissVfit user'
}

function getRankDisplay(entry, rankMode) {
  const g = entry?.gamification || {}
  if (rankMode === 'overall') {
    const tier = RANKS.find(r => r.id === normalizeRankId(g.rank)) || RANKS[0]
    const isTop = tier.id === RANKS[RANKS.length - 1].id
    const sub = isTop ? '' : SUB_LEVEL_ROMAN[Math.min(g.rankSubLevel || 0, SUB_LEVEL_ROMAN.length - 1)]
    return { tier, sub, unranked: false }
  }
  const info = getMuscleRankInfo(g, rankMode)
  return { tier: info.tier, sub: info.subLevelLabel, unranked: !info.unlocked }
}

function isZeroForMetric(entry, metric, rankMode) {
  const g = entry?.gamification || {}
  if (metric === 'streaks') return (g.workoutStreak || 0) === 0
  if (metric === 'levels')  return (g.xp || 0) === 0
  if (metric === 'ranks') {
    if (rankMode === 'overall') return normalizeRankId(g.rank) === 'rookie' && (g.rankPoints || 0) === 0 && (g.totalWorkouts || 0) === 0
    const info = getMuscleRankInfo(g, rankMode)
    return !info.unlocked || info.score <= 0
  }
  return true
}

function formatScore(entry, metric, rankMode) {
  const g = entry?.gamification || {}
  if (metric === 'streaks') return `${g.workoutStreak || 0}`
  if (metric === 'levels')  return `${getLevel(g.xp || 0)}`
  if (metric === 'ranks') {
    if (rankMode === 'overall') return `${getMetricScore(g, 'ranks')}`
    const info = getMuscleRankInfo(g, rankMode)
    return info.unlocked ? `${info.score}` : '—'
  }
  return '0'
}

function scoreUnit(metric) {
  if (metric === 'streaks') return 'days'
  if (metric === 'levels')  return 'lvl'
  if (metric === 'ranks')   return 'pts'
  return ''
}

function secondaryLabel(entry, metric, rankMode) {
  const g = entry?.gamification || {}
  if (metric === 'streaks') return `best: ${g.longestStreak || 0}d`
  if (metric === 'levels')  return `${(g.xp || 0).toLocaleString()} XP`
  if (metric === 'ranks' && rankMode !== 'overall') {
    const info = getMuscleRankInfo(g, rankMode)
    return info.unlocked ? `${info.rankPoints}/100 to next tier` : `${g.totalWorkouts || 0}/${MUSCLE_RANK_MIN_WORKOUTS} workouts to unlock`
  }
  return null
}

function chipStyle(active) {
  return {
    flexShrink: 0, padding: '6px 12px', border: `2px solid ${NB.ink}`, borderRadius: 10,
    background: active ? NB.teal : NB.white,
    color: NB.ink,
    fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
  }
}

function Avatar({ name, size = 40, ring }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28), border: `2px solid ${NB.ink}`, flexShrink: 0,
      background: NB.lavender,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...(ring ? { boxShadow: hardShadow(3, ring) } : {}),
    }}>
      <span style={{ fontFamily: NB.fontDisplay, fontSize: size * 0.4, fontWeight: 800, color: NB.ink }}>{initial}</span>
    </div>
  )
}

function PodiumSlot({ entry, place, metric, rankMode }) {
  const size    = place === 1 ? 60 : 46
  const pedH    = place === 1 ? 64 : place === 2 ? 46 : 34
  const bg      = place === 1 ? '#FCD34D' : place === 2 ? '#B8C0CC' : '#CD7F32'
  const ring    = place === 1 ? NB.ink : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: place === 1 ? 96 : 80 }}>
      <div style={{ position: 'relative', width: size + 20, height: size + 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {place === 1 && <div style={{ position: 'absolute', top: -16, zIndex: 2 }}><CrownIcon size={22} /></div>}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Avatar name={entry ? displayName(entry) : '?'} size={size} ring={ring} />
        </div>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 800, color: NB.ink, marginTop: 4, maxWidth: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
      }}>
        {entry ? displayName(entry) : '—'}{entry?.you ? ' (you)' : ''}
      </div>
      <div style={{
        marginTop: 6, width: '100%', height: pedH, borderRadius: 10, border: `2px solid ${NB.ink}`,
        background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
      }}>
        <span style={{ fontFamily: NB.fontDisplay, fontSize: place === 1 ? 18 : 14, fontWeight: 900, color: NB.ink }}>{place}</span>
        {entry && <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: NB.ink }}>{formatScore(entry, metric, rankMode)} {scoreUnit(metric)}</span>}
      </div>
    </div>
  )
}

function BoardRow({ entry, rank, metric, rankMode }) {
  const badgeBg = rank === 1 ? '#FCD34D' : rank === 2 ? '#B8C0CC' : rank === 3 ? '#CD7F32' : NB.white
  const sub = secondaryLabel(entry, metric, rankMode)

  return (
    <div style={{
      border: 'none', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      background: entry.you ? NB.yellow : NB.lavenderMist,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, border: `2px solid ${NB.ink}`, flexShrink: 0, background: badgeBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: NB.ink,
      }}>
        {rank}
      </div>
      <Avatar name={displayName(entry)} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(entry)}</span>
          {entry.you && <span style={{ fontSize: 10, color: NB.ink, fontWeight: 800, flexShrink: 0 }}>(you)</span>}
          {metric === 'ranks' && (() => {
            const { tier, sub, unranked } = getRankDisplay(entry, rankMode)
            return unranked
              ? <span style={{ fontSize: 10, fontWeight: 800, color: NB.ink, background: '#e5e5e5', border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '1px 6px', flexShrink: 0 }}>Unranked</span>
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: tier.color === '#fff' ? NB.ink : tier.color, background: tier.bg, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '1px 6px 1px 3px', flexShrink: 0 }}>
                  <img src={tier.image} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                  {tier.label}{sub ? ` ${sub}` : ''}
                </span>
          })()}
        </div>
        {sub && <div style={{ fontSize: 12, color: '#555' }}>{sub}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: NB.ink }}>{formatScore(entry, metric, rankMode)}</div>
        <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: '#555' }}>{scoreUnit(metric)}</div>
      </div>
    </div>
  )
}

function PinnedYouRow({ entry, rank, metric, rankMode, rankModeLabel }) {
  const locked = isZeroForMetric(entry, metric, rankMode)
  if (!locked) return <BoardRow entry={entry} rank={rank} metric={metric} rankMode={rankMode} />

  let copy = LOCKED_COPY[metric]
  if (metric === 'ranks' && rankMode !== 'overall') {
    const info = getMuscleRankInfo(entry.gamification, rankMode)
    if (!info.unlocked) {
      const remaining = Math.max(0, MUSCLE_RANK_MIN_WORKOUTS - (entry.gamification?.totalWorkouts || 0))
      copy = `Complete ${remaining} more workout${remaining === 1 ? '' : 's'} to unlock muscle ranks!`
    } else {
      copy = `Train ${rankModeLabel} to show up here!`
    }
  }

  return (
    <div style={{
      border: 'none', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      background: NB.lavenderMist,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, border: `1.5px solid ${NB.ink}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: NB.ink }}>N/A</div>
      <LockIcon size={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>You</div>
        <div style={{ fontSize: 11, color: '#555', lineHeight: 1.4 }}>{copy}</div>
      </div>
    </div>
  )
}

export default function Leaderboard({ onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '8px 22px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => onNavigate('home')} style={{ width: 32, height: 32, borderRadius: 10, background: NB.white, border: `2px solid ${NB.ink}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NB.ink }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>Leaderboards</div>
          <div style={{ width: 32 }} />
        </div>
      </div>

      {/* Placeholder — leaderboard not ready yet */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 28px' }}>
        <div style={{ ...nbCardStyle(NB.cream, 5), border: `3px solid ${NB.white}`, borderRadius: 20, padding: '34px 24px', textAlign: 'center', maxWidth: 320 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><CrownIcon size={40} /></div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, marginBottom: 8 }}>Working on the leaderboard</div>
          <div style={{ fontSize: 14, color: '#555', lineHeight: 1.5 }}>We're building something great here — check back soon to see how you rank against everyone.</div>
        </div>
      </div>
    </div>
  )
}
