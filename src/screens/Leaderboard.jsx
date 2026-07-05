import React, { useState, useEffect, useCallback } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { RANKS, getLevel, getMetricScore, compareByMetric, getMuscleRankInfo, MUSCLE_RANK_MIN_WORKOUTS } from '../utils/gamification'
import { fetchLeaderboardProfiles } from '../lib/social'
import { COUNTRIES } from '../data/countries'
import { MUSCLE_GROUPS } from '../utils/muscleLabels'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const SCOPES  = [['friends', 'Friends'], ['global', 'Global'], ['regional', 'Regional']]
const METRICS = [['streaks', 'Streaks'], ['ranks', 'Ranks'], ['levels', 'Levels']]

const INFO_COPY = {
  streaks: 'Ranked by your current workout streak — miss a day and it resets.',
  ranks:   'Ranked by tier (Bronze → Olympian) and rank points earned within it. Tap a muscle below to see rankings for that muscle group.',
  levels:  'Ranked by your XP level, earned from workouts, meals and badges.',
}

const LOCKED_COPY = {
  streaks: 'Complete a workout to join the Streaks leaderboard!',
  ranks:   'Log your first workout to earn Rank Points!',
  levels:  'Earn XP to appear on the Levels board!',
}

function displayName(row) {
  return row?.profile_data?.name || row?.username || 'Aura user'
}

function getRankDisplay(entry, rankMode) {
  const g = entry?.gamification || {}
  if (rankMode === 'overall') {
    return { tier: RANKS.find(r => r.id === (g.rank || 'bronze')) || RANKS[0], unranked: false }
  }
  const info = getMuscleRankInfo(g, rankMode)
  return { tier: info.tier, unranked: !info.unlocked }
}

function isZeroForMetric(entry, metric, rankMode) {
  const g = entry?.gamification || {}
  if (metric === 'streaks') return (g.workoutStreak || 0) === 0
  if (metric === 'levels')  return (g.xp || 0) === 0
  if (metric === 'ranks') {
    if (rankMode === 'overall') return (g.rank || 'bronze') === 'bronze' && (g.rankPoints || 0) === 0 && (g.totalWorkouts || 0) === 0
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
        {place === 1 && <div style={{ position: 'absolute', top: -16, fontSize: 22, zIndex: 2 }}>👑</div>}
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
      border: `2.5px solid ${NB.ink}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      background: entry.you ? NB.yellow : NB.white,
      boxShadow: entry.you ? hardShadow(3) : hardShadow(1),
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
            const { tier, unranked } = getRankDisplay(entry, rankMode)
            return unranked
              ? <span style={{ fontSize: 10, fontWeight: 800, color: NB.ink, background: '#e5e5e5', border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '1px 6px', flexShrink: 0 }}>Unranked</span>
              : <span style={{ fontSize: 10, fontWeight: 800, color: tier.color === '#fff' ? NB.ink : tier.color, background: tier.bg, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '1px 6px', flexShrink: 0 }}>{tier.label}</span>
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
      border: `2.5px solid ${NB.ink}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      background: NB.lavender,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, border: `1.5px solid ${NB.ink}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: NB.ink }}>N/A</div>
      <span style={{ fontSize: 18 }}>🔒</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>You</div>
        <div style={{ fontSize: 11, color: '#555', lineHeight: 1.4 }}>{copy}</div>
      </div>
    </div>
  )
}

function CountrySheet({ onSelect, onClose }) {
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

export default function Leaderboard({ session, userProfile = {}, gamification = {}, onUpdateCountry, onNavigate }) {
  const userId = session?.user?.id
  const country = userProfile?.country || ''
  const countryInfo = COUNTRIES.find(c => c.code === country)

  const [scope,   setScope]   = useState('global')
  const [metric,  setMetric]  = useState('streaks')
  const [rankMode, setRankMode] = useState('overall')
  const [board,   setBoard]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [countrySheet, setCountrySheet] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  const rankModeLabel = rankMode === 'overall' ? 'Overall' : (MUSCLE_GROUPS.find(m => m.id === rankMode)?.label || rankMode)

  const load = useCallback(async () => {
    if (scope === 'regional' && !country) { setBoard([]); setLoading(false); return }
    setLoading(true)

    // High cap, not a real page size — the board only ever displays the top 18 (+ pinned "you"),
    // but ranking has to be computed from every user, not an arbitrary slice fetched pre-sort.
    const rows = await fetchLeaderboardProfiles({ scope, userId, country, limit: 1000 })

    const youEntry = {
      id: userId,
      username: userProfile?.username,
      profile_data: { ...userProfile },
      gamification,
      you: true,
    }

    const others = rows.filter(r => r.id !== userId)
    const combined = [...others, youEntry]

    combined.sort((a, b) => {
      if (metric === 'ranks' && rankMode !== 'overall') {
        const sa = getMuscleRankInfo(a.gamification, rankMode).score
        const sb = getMuscleRankInfo(b.gamification, rankMode).score
        if (sb !== sa) return sb - sa
        return (b.gamification?.totalWorkouts || 0) - (a.gamification?.totalWorkouts || 0)
      }
      return compareByMetric(a, b, metric)
    })

    setBoard(combined.map((e, i) => ({ ...e, rank: i + 1 })))
    setLoading(false)
  }, [scope, metric, rankMode, country, userId, userProfile, gamification])

  useEffect(() => { load() }, [load])

  const youIndex = board.findIndex(e => e.you)
  const visible  = board.slice(0, 18)
  const youVisible = youIndex >= 0 && youIndex < 18

  const filtered = search.trim()
    ? board.filter(e => displayName(e).toLowerCase().includes(search.trim().toLowerCase()))
    : null

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
          <div style={{ position: 'relative' }}>
            <button onClick={() => setInfoOpen(o => !o)} style={{ width: 32, height: 32, borderRadius: 10, background: NB.yellow, border: `2px solid ${NB.ink}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NB.ink, fontSize: 13, fontWeight: 800 }}>i</button>
            {infoOpen && (
              <div style={{ position: 'absolute', right: 0, top: 38, width: 200, background: NB.lavender, color: NB.ink, border: `2px solid ${NB.ink}`, borderRadius: 12, boxShadow: hardShadow(3), padding: '10px 12px', fontSize: 11, lineHeight: 1.5, zIndex: 30 }}>
                {INFO_COPY[metric]}
              </div>
            )}
          </div>
        </div>

        {/* Scope pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {SCOPES.map(([id, label]) => (
            <button key={id} onClick={() => setScope(id)} style={{
              flex: 1, height: 40, border: `2.5px solid ${NB.ink}`, borderRadius: 12,
              background: scope === id ? NB.teal : NB.white,
              boxShadow: scope === id ? hardShadow(2) : 'none',
              fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase',
              color: NB.ink, cursor: 'pointer',
            }}>
              {label}{id === 'regional' && countryInfo ? ` ${countryInfo.flag}` : ''}
            </button>
          ))}
        </div>

        {scope === 'regional' && country && (
          <button onClick={() => setCountrySheet(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span style={{ fontSize: 12, color: '#555' }}>{countryInfo?.flag} {countryInfo?.name || country}</span>
            <span style={{ fontSize: 12, color: NB.ink, fontWeight: 700, textDecoration: 'underline' }}>change</span>
          </button>
        )}

        {/* Search */}
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Find someone…"
          style={{ width: '100%', height: 40, border: `2px solid ${NB.ink}`, borderRadius: 12, padding: '0 14px', fontSize: 13, color: NB.ink, background: NB.white, outline: 'none', boxSizing: 'border-box', fontFamily: NB.fontDisplay, marginTop: 10 }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 12px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#555' }}>Loading leaderboard…</div>
        )}

        {!loading && scope === 'regional' && !country && (
          <div style={{ border: `2.5px dashed ${NB.ink}`, borderRadius: 16, background: NB.cream, padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🌍</div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink, marginBottom: 6 }}>Pick your country</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 16 }}>Set your country to see how you rank regionally.</div>
            <button onClick={() => setCountrySheet(true)} style={{ height: 44, padding: '0 20px', border: `2px solid ${NB.ink}`, borderRadius: 12, boxShadow: hardShadow(3), background: NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer' }}>Choose country</button>
          </div>
        )}

        {!loading && !(scope === 'regional' && !country) && (
          <>
            {filtered ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: '#555' }}>No one matches "{search}"</div>}
                {filtered.map(entry => <BoardRow key={entry.id} entry={entry} rank={entry.rank} metric={metric} rankMode={rankMode} />)}
              </div>
            ) : (
              <>
                {visible.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, padding: '6px 4px 18px' }}>
                    <PodiumSlot entry={visible[1]} place={2} metric={metric} rankMode={rankMode} />
                    <PodiumSlot entry={visible[0]} place={1} metric={metric} rankMode={rankMode} />
                    <PodiumSlot entry={visible[2]} place={3} metric={metric} rankMode={rankMode} />
                  </div>
                )}

                {scope !== 'global' && board.length <= 1 && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: '#555', marginBottom: 12 }}>
                    {scope === 'friends' ? 'Add more friends to fill the podium 👯' : 'Invite people from your country to fill the podium 🌍'}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {visible.slice(3).map(entry => <BoardRow key={entry.id} entry={entry} rank={entry.rank} metric={metric} rankMode={rankMode} />)}
                </div>

                {!youVisible && board[youIndex] && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `2px dashed ${NB.ink}` }}>
                    <PinnedYouRow entry={board[youIndex]} rank={board[youIndex].rank} metric={metric} rankMode={rankMode} rankModeLabel={rankModeLabel} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Metric bar */}
      <div style={{ flexShrink: 0, padding: '0 22px', borderTop: `2.5px solid ${NB.ink}` }}>
        <div style={{ display: 'flex' }}>
          {METRICS.map(([id, label]) => (
            <button key={id} onClick={() => setMetric(id)} style={{
              flex: 1, paddingTop: 10, paddingBottom: 8, background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: NB.ink,
              borderBottom: metric === id ? `3px solid ${NB.magenta}` : '3px solid transparent', marginBottom: -2.5,
            }}>
              {label}
            </button>
          ))}
        </div>
        {metric === 'ranks' && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0 10px' }}>
            <button onClick={() => setRankMode('overall')} style={chipStyle(rankMode === 'overall')}>Overall</button>
            {MUSCLE_GROUPS.map(m => (
              <button key={m.id} onClick={() => setRankMode(m.id)} style={chipStyle(rankMode === m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {countrySheet && (
        <CountrySheet
          onClose={() => setCountrySheet(false)}
          onSelect={(code) => { onUpdateCountry?.(code); setCountrySheet(false) }}
        />
      )}
    </div>
  )
}
