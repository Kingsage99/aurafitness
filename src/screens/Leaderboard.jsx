import React, { useState, useEffect, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { RANKS, getLevel, getMetricScore, compareByMetric, getMuscleRankInfo, MUSCLE_RANK_MIN_WORKOUTS, normalizeRankId, SUB_LEVEL_ROMAN } from '../utils/gamification'
import { fetchLeaderboardProfiles } from '../lib/social'
import { COUNTRIES } from '../data/countries'
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../utils/muscleLabels'
import CountrySheet from '../components/CountrySheet'
import { Avatar as PhotoAvatar } from '../components/AvatarSilhouette'
import ProBorderRing from '../components/ProBorderRing'
import { STORE_BORDERS } from './StoreScreen'
import { isPro } from '../lib/stripe'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'
import { LockIcon, GlobeIcon, FireIcon, StarIcon, MedalIcon } from '../components/Icons'

const METRIC_ICON = { streaks: FireIcon, ranks: MedalIcon, levels: StarIcon }

const SCOPES  = [['friends', 'Friends'], ['global', 'Global'], ['regional', 'Regional']]
const METRICS = [['streaks', 'Streaks'], ['ranks', 'Ranks'], ['levels', 'Levels']]

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

// Sort comparator (descending) — extends compareByMetric with muscle-specific
// rank sorting, since getMetricScore/compareByMetric only know about the
// overall tier (g.rank), not per-muscle-group scores.
function compareEntries(a, b, metric, rankMode) {
  if (metric === 'ranks' && rankMode !== 'overall') {
    const sa = getMuscleRankInfo(a.gamification, rankMode).score
    const sb = getMuscleRankInfo(b.gamification, rankMode).score
    if (sb !== sa) return sb - sa
    return (b.gamification?.totalWorkouts || 0) - (a.gamification?.totalWorkouts || 0)
  }
  return compareByMetric(a, b, metric)
}

function chipStyle(active) {
  return {
    flexShrink: 0, padding: '6px 12px', border: `2px solid ${NB.ink}`, borderRadius: 10,
    background: active ? NB.teal : NB.white,
    color: NB.ink,
    fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
  }
}

// Real profile photo when the entry has one — same component/fallback every
// other screen already uses (falls back to the mascot character, not
// initials, when no avatarUrl is set) — plus the same equipped-border-ring
// treatment as Home/Profile/Discovery, so a Pro ring or an owned image frame
// actually shows up here instead of a plain circle.
function EntryAvatar({ entry, size = 40, ring, isProUser }) {
  const frameId = entry?.gamification?.frame
  const equippedBorder = frameId ? STORE_BORDERS.find(b => b.id === `frame_${frameId}`) : null
  const entryIsPro = entry?.you ? !!isProUser : isPro(entry)
  const off = equippedBorder?.frameOffset
  const scale = size / 46 // frameOffsets are calibrated for a 46px avatar

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, zIndex: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: equippedBorder?.id === 'frame_pro' && entryIsPro ? 'none' : `2px solid ${NB.ink}`,
        flexShrink: 0, background: NB.lavender, overflow: 'hidden',
        ...(ring ? { boxShadow: hardShadow(3, ring) } : {}),
      }}>
        <PhotoAvatar url={entry?.profile_data?.avatarUrl} height={size} />
      </div>
      {equippedBorder?.image && off && (
        <img src={equippedBorder.image} alt="" style={{ position: 'absolute', top: off.top * scale, left: off.left * scale, width: off.size * scale, height: off.size * scale, pointerEvents: 'none' }} />
      )}
      {equippedBorder?.id === 'frame_pro' && entryIsPro && <ProBorderRing size={size} />}
    </div>
  )
}

function PodiumSlot({ entry, place, metric, rankMode, isProUser }) {
  const size    = place === 1 ? 72 : 56
  const pedH    = place === 1 ? 76 : place === 2 ? 56 : 42
  const bg      = place === 1 ? '#FCD34D' : place === 2 ? '#B8C0CC' : '#CD7F32'
  const ring    = place === 1 ? NB.ink : null

  const avatarWrapSize = size + 20

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: place === 1 ? 108 : 90 }}>
      <div style={{ position: 'relative', width: avatarWrapSize, height: avatarWrapSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EntryAvatar entry={entry} size={size} ring={ring} isProUser={isProUser} />
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
        {entry && (
          <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: NB.ink, display: 'flex', alignItems: 'center', gap: 3 }}>
            {metric === 'streaks' && <FireIcon size={11} />}
            {metric === 'levels' && <StarIcon size={10} />}
            {formatScore(entry, metric, rankMode)} {scoreUnit(metric)}
          </span>
        )}
      </div>
    </div>
  )
}

function BoardRow({ entry, rank, metric, rankMode, isProUser }) {
  const badgeBg = rank === 1 ? '#FCD34D' : rank === 2 ? '#B8C0CC' : rank === 3 ? '#CD7F32' : NB.white
  const sub = secondaryLabel(entry, metric, rankMode)

  return (
    <div style={{
      ...nbCardStyle(entry.you ? NB.yellow : NB.lavenderMist, 2),
      border: `3px solid ${NB.white}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, border: `2px solid ${NB.ink}`, flexShrink: 0, background: badgeBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: NB.ink,
      }}>
        {rank}
      </div>
      <EntryAvatar entry={entry} size={36} isProUser={isProUser} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(entry)}</span>
          {entry.you && <span style={{ fontSize: 10, color: NB.ink, fontWeight: 800, flexShrink: 0 }}>(you)</span>}
          {metric === 'ranks' && (() => {
            const { tier, sub, unranked } = getRankDisplay(entry, rankMode)
            return unranked
              ? <span style={{ fontSize: 10, fontWeight: 700, color: '#888', flexShrink: 0 }}>Unranked</span>
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: NB.ink, flexShrink: 0 }}>
                  <img src={tier.image} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                  {tier.label}{sub ? ` ${sub}` : ''}
                </span>
          })()}
        </div>
        {sub && <div style={{ fontSize: 12, color: '#555' }}>{sub}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: NB.ink, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
          {metric === 'streaks' && <FireIcon size={15} />}
          {metric === 'levels' && <StarIcon size={14} />}
          {formatScore(entry, metric, rankMode)}
        </div>
        <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: '#555' }}>{scoreUnit(metric)}</div>
      </div>
    </div>
  )
}

function PinnedYouRow({ entry, rank, metric, rankMode, rankModeLabel, isProUser }) {
  const locked = isZeroForMetric(entry, metric, rankMode)
  if (!locked) return <BoardRow entry={entry} rank={rank} metric={metric} rankMode={rankMode} isProUser={isProUser} />

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
      ...nbCardStyle(NB.lavenderMist, 2),
      border: `3px solid ${NB.white}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
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

export default function Leaderboard({ session, userProfile, gamification, isProUser = false, onUpdateCountry, onNavigate }) {
  const [scope, setScope] = useState('friends')
  const [metric, setMetric] = useState('streaks')
  const [rankMode, setRankMode] = useState('overall')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [countrySheetOpen, setCountrySheetOpen] = useState(false)

  const userId = session?.user?.id
  const country = userProfile?.country

  useEffect(() => {
    let cancelled = false
    if (scope === 'regional' && !country) { setRows([]); setLoading(false); return }
    setLoading(true)
    fetchLeaderboardProfiles({ scope, userId, country })
      .then(data => { if (!cancelled) setRows(data) })
      .catch(err => { console.error('fetchLeaderboardProfiles failed:', err.message); if (!cancelled) setRows([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [scope, userId, country])

  // Always include "you" (built from already-loaded props, not a fetch) so
  // your own score sorts into its real position even in global/regional
  // scopes where you might not otherwise be among the fetched rows.
  const sorted = useMemo(() => {
    const meRow = { id: userId, username: userProfile?.username, profile_data: userProfile, gamification: gamification || {}, you: true }
    const withoutMe = rows.filter(r => r.id !== userId)
    const combined = userId ? [...withoutMe, meRow] : rows
    return [...combined].sort((a, b) => compareEntries(a, b, metric, rankMode))
  }, [rows, userId, userProfile, gamification, metric, rankMode])

  const youIndex = sorted.findIndex(r => r.id === userId || r.you)
  const youEntry = youIndex >= 0 ? sorted[youIndex] : null
  const rankModeLabel = rankMode === 'overall' ? 'overall' : (MUSCLE_LABELS[rankMode] || rankMode)

  const podium = [sorted[0] || null, sorted[1] || null, sorted[2] || null]
  const restRows = sorted.slice(3)

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

        {/* Scope selector — centered, equal-width segments */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          <div style={{ display: 'flex', border: `2px solid ${NB.ink}`, borderRadius: 12, overflow: 'hidden' }}>
            {SCOPES.map(([id, label]) => (
              <button key={id} onClick={() => id === 'regional' && !country ? setCountrySheetOpen(true) : setScope(id)} style={{
                padding: '8px 18px', border: 'none', background: scope === id ? NB.teal : NB.white,
                fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {id === 'regional' && <GlobeIcon size={11} />}
                {label}
              </button>
            ))}
          </div>
          {scope === 'regional' && country && (
            <button onClick={() => setCountrySheetOpen(true)} style={chipStyle(false)}>
              {COUNTRIES.find(c => c.code === country)?.flag} Change
            </button>
          )}
        </div>

        {/* Muscle picker — only for the Ranks metric */}
        {metric === 'ranks' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 10 }}>
            <button onClick={() => setRankMode('overall')} style={chipStyle(rankMode === 'overall')}>Overall</button>
            {MUSCLE_GROUPS.map(m => (
              <button key={m.id} onClick={() => setRankMode(m.id)} style={chipStyle(rankMode === m.id)}>{m.label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 20px' }}>
        {loading ? null : scope === 'regional' && !country ? (
          <div style={{ ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: NB.ink, fontWeight: 700, marginBottom: 10 }}>Pick your country to see regional rankings.</div>
            <button onClick={() => setCountrySheetOpen(true)} style={{ height: 38, padding: '0 18px', border: `2px solid ${NB.ink}`, borderRadius: 10, background: NB.teal, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}>Choose country</button>
          </div>
        ) : sorted.length <= 1 ? (
          <div style={{ ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: NB.ink, fontWeight: 700 }}>
              {scope === 'friends' ? 'Add some friends to see how you compare!' : 'No one here yet — check back soon.'}
            </div>
          </div>
        ) : (
          <>
            {/* Podium */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              <PodiumSlot entry={podium[1]} place={2} metric={metric} rankMode={rankMode} isProUser={isProUser} />
              <PodiumSlot entry={podium[0]} place={1} metric={metric} rankMode={rankMode} isProUser={isProUser} />
              <PodiumSlot entry={podium[2]} place={3} metric={metric} rankMode={rankMode} isProUser={isProUser} />
            </div>

            {/* Your rank — always visible here regardless of scope/metric/scroll
                position, so you never have to hunt for your own row below */}
            {youEntry && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Your rank</div>
                <PinnedYouRow entry={youEntry} rank={youIndex + 1} metric={metric} rankMode={rankMode} rankModeLabel={rankModeLabel} isProUser={isProUser} />
              </div>
            )}

            {/* Rest of the board — your own row (wherever it lands) gets the
                locked/guidance fallback instead of a blunt zero via PinnedYouRow,
                which degrades to a normal BoardRow once you have a real score */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {restRows.map((entry, i) => entry.you
                ? <PinnedYouRow key={entry.id || i} entry={entry} rank={i + 4} metric={metric} rankMode={rankMode} rankModeLabel={rankModeLabel} isProUser={isProUser} />
                : <BoardRow key={entry.id || i} entry={entry} rank={i + 4} metric={metric} rankMode={rankMode} isProUser={isProUser} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Metric tab bar — icon-over-label, matching how streaks/ranks/levels
          are switched, rather than a top pill row */}
      <div style={{ display: 'flex', borderTop: NB_BORDER, background: NB.white, flexShrink: 0 }}>
        {METRICS.map(([id, label]) => {
          const Icon = METRIC_ICON[id]
          const active = metric === id
          return (
            <button
              key={id}
              onClick={() => { setMetric(id); if (id !== 'ranks') setRankMode('overall') }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                padding: '10px 0 12px', border: 'none', background: active ? NB.lavenderMist : 'transparent', cursor: 'pointer',
              }}
            >
              <Icon size={20} />
              <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: active ? NB.purpleDeep : NB.ink }}>{label}</span>
            </button>
          )
        })}
      </div>

      {countrySheetOpen && (
        <CountrySheet
          onSelect={(code) => { onUpdateCountry?.(code); setCountrySheetOpen(false); setScope('regional') }}
          onClose={() => setCountrySheetOpen(false)}
        />
      )}
    </div>
  )
}
