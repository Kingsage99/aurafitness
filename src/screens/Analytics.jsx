import React, { useState, useEffect, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { fetchWorkoutHistory } from '../lib/social'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const DAILY_TARGETS = {
  lean_toned:  { calories: 1750, protein: 130, carbs: 180, fat: 55 },
  slim_thick:  { calories: 1900, protein: 150, carbs: 190, fat: 60 },
  hourglass:   { calories: 1800, protein: 135, carbs: 185, fat: 58 },
  athletic:    { calories: 2100, protein: 160, carbs: 220, fat: 65 },
  soft_curvy:  { calories: 1700, protein: 120, carbs: 175, fat: 55 },
  functional:  { calories: 2000, protein: 145, carbs: 210, fat: 62 },
}

const MUSCLE_TO_GROUP = {
  glutes: 'glutes', glute: 'glutes',
  hamstrings: 'legs', quads: 'legs', legs: 'legs',
  chest: 'chest', pecs: 'chest',
  shoulders: 'shoulders', delts: 'shoulders',
  back: 'back', lats: 'back', lat: 'back',
  core: 'core', abs: 'core',
  arms: 'arms', biceps: 'arms', triceps: 'arms',
  calves: 'calves',
}

function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return `${d.getFullYear()}-W${String(1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)).padStart(2, '0')}`
}

function weekLabel(isoWeek) {
  const [year, wStr] = isoWeek.split('-W')
  const w = parseInt(wStr)
  const jan4 = new Date(parseInt(year), 0, 4)
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7)
  return monday.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function buildMuscleCounts(history) {
  const counts = {}
  history.forEach(session => {
    ;(session.exercises || []).forEach(ex => {
      ;(ex.muscles?.primary || []).forEach(m => {
        const g = MUSCLE_TO_GROUP[m?.toLowerCase()]
        if (g) counts[g] = (counts[g] || 0) + 1
      })
    })
  })
  return counts
}

function buildSVGColors(muscleCounts, side) {
  const colors = {}
  Object.entries(muscleCounts).forEach(([group, count]) => {
    const color = count >= 6 ? NB.ink : count >= 3 ? NB.magenta : '#e5c9e5'
    ;(MUSCLE_SVG_IDS[group]?.[side] || []).forEach(id => { colors[id] = color })
  })
  return colors
}

export default function Analytics({ gamification, userProfile, loggedMacros, session, onNavigate }) {
  const [history, setHistory]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState(null)

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return }
    fetchWorkoutHistory(session.user.id, 90).then(data => {
      setHistory(data)
      setLoading(false)
    })
  }, [session])

  const targets = DAILY_TARGETS[userProfile?.physique] || DAILY_TARGETS.lean_toned
  const g = gamification || {}

  const LEVEL_XP = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5800, 8000]
  const curLvl   = Math.min(g.level || 1, 10)
  const xpStart  = LEVEL_XP[curLvl - 1] || 0
  const xpEnd    = LEVEL_XP[curLvl] || 8000
  const xpPct    = Math.min(1, ((g.xp || 0) - xpStart) / Math.max(1, xpEnd - xpStart))

  const weeklyData = useMemo(() => {
    const counts = {}
    history.forEach(s => {
      const wk = getISOWeek(s.completed_at)
      counts[wk] = (counts[wk] || 0) + 1
    })
    const now = new Date()
    const weeks = []
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i * 7)
      const wk = getISOWeek(d)
      weeks.push({ week: wk, count: counts[wk] || 0, label: weekLabel(wk) })
    }
    return weeks
  }, [history])

  const maxWeekly = Math.max(...weeklyData.map(w => w.count), 1)

  const muscleCounts = useMemo(() => buildMuscleCounts(history), [history])
  const frontColors  = useMemo(() => buildSVGColors(muscleCounts, 'front'), [muscleCounts])
  const backColors   = useMemo(() => buildSVGColors(muscleCounts, 'back'), [muscleCounts])

  const macroItems = [
    { label: 'Calories', value: loggedMacros?.calories || 0, target: targets.calories, color: NB.teal, unit: 'kcal' },
    { label: 'Protein',  value: loggedMacros?.protein  || 0, target: targets.protein,  color: NB.blue, unit: 'g' },
    { label: 'Carbs',    value: loggedMacros?.carbs    || 0, target: targets.carbs,    color: NB.yellow, unit: 'g' },
    { label: 'Fat',      value: loggedMacros?.fat      || 0, target: targets.fat,      color: NB.pink, unit: 'g' },
  ]

  return (
    <>
      <StatusBar />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '10px 22px 6px', flexShrink: 0 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 26, textTransform: 'uppercase', color: NB.ink }}>Analytics</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>Your fitness at a glance</div>
        </div>

        <div style={{ padding: '0 16px 24px' }}>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            <StatCard icon="💪" label="Total Workouts" value={g.totalWorkouts || 0} />
            <StatCard icon="🔥" label="Streak" value={`${g.workoutStreak || 0} days`} />
            <div style={{ border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(2), padding: '14px 16px', background: NB.white }}>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 700, marginBottom: 4 }}>⚡ Level {curLvl}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: NB.ink, marginBottom: 8 }}>{g.xp || 0} XP</div>
              <div style={{ height: 8, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${xpPct * 100}%`, background: NB.teal }} />
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{xpEnd - (g.xp || 0)} XP to next level</div>
            </div>
            <StatCard icon="💎" label="Gems" value={g.gems || 0} />
          </div>

          {/* Activity Chart */}
          <Section
            title="Activity"
            subtitle="Workouts per week"
            expandable
            expanded={expanded === 'activity'}
            onToggle={() => setExpanded(expanded === 'activity' ? null : 'activity')}
          >
            {loading ? (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 13, color: '#555' }}>Loading…</div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 100, paddingBottom: 20, position: 'relative' }}>
                {weeklyData.map((w, i) => {
                  const barH = maxWeekly === 0 ? 0 : Math.round((w.count / maxWeekly) * 72)
                  const isThisWeek = i === weeklyData.length - 1
                  return (
                    <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      {w.count > 0 && (
                        <div style={{ fontSize: 9, color: NB.ink, fontWeight: 800, marginBottom: 2 }}>{w.count}</div>
                      )}
                      <div style={{
                        width: '100%', height: barH || 3,
                        background: isThisWeek ? NB.magenta : w.count > 0 ? NB.teal : '#eee',
                        border: w.count > 0 ? `1.5px solid ${NB.ink}` : 'none',
                        borderRadius: 3,
                        minHeight: 3,
                      }} />
                      <div style={{ fontFamily: NB.fontMono, fontSize: 8, color: NB.ink, fontWeight: isThisWeek ? 800 : 600, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis' }}>
                        {i === weeklyData.length - 1 ? 'Now' : w.label.split(' ')[0]}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {expanded === 'activity' && !loading && history.slice(0, 8).map((s, i) => (
              <div key={i} style={{ border: `1.5px solid ${NB.ink}`, borderRadius: 12, padding: '10px 12px', background: NB.cream, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink }}>{s.label || 'Workout'}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{new Date(s.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>{Math.floor((s.elapsed || 0) / 60)} min</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{s.sets_completed || 0} sets</div>
                </div>
              </div>
            ))}
          </Section>

          {/* Muscle Coverage */}
          <Section title="Muscle Coverage" subtitle="Most-trained areas">
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <div style={{ flex: 1, maxWidth: 130, aspectRatio: '0.6' }}>
                <MuscleSVG url="/muscle_map_front.svg" muscleColors={frontColors} />
              </div>
              <div style={{ flex: 1, maxWidth: 130, aspectRatio: '0.6' }}>
                <MuscleSVG url="/muscle_map_back.svg" muscleColors={backColors} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
              {[['#e5c9e5', '1–2 sessions'], [NB.magenta, '3–5'], [NB.ink, '6+']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, border: `1.5px solid ${NB.ink}`, background: c }} />
                  <span style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{l}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Today's Nutrition */}
          <Section title="Today's Nutrition" subtitle="vs. your daily target">
            {macroItems.map(m => {
              const pct = Math.min(1, m.value / m.target)
              return (
                <div key={m.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>{m.label}</span>
                    <span style={{ fontSize: 12, color: '#555' }}>{m.value}{m.unit} / {m.target}{m.unit}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct * 100}%`, background: m.color, transition: 'width 0.6s' }} />
                  </div>
                </div>
              )
            })}
          </Section>

          {/* Achievements */}
          <Section title="Achievements">
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, border: `1.5px solid ${NB.ink}`, borderRadius: 12, padding: '12px 10px', background: NB.cream, textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🏅</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: NB.ink }}>{(g.badges || []).length}</div>
                <div style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>/ 16 badges</div>
              </div>
              <div style={{ flex: 1, border: `1.5px solid ${NB.ink}`, borderRadius: 12, padding: '12px 10px', background: NB.cream, textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🏆</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: NB.ink, textTransform: 'capitalize' }}>{g.rank || 'Bronze'}</div>
                <div style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{g.rankPoints || 0} pts</div>
              </div>
              <div style={{ flex: 1, border: `1.5px solid ${NB.ink}`, borderRadius: 12, padding: '12px 10px', background: NB.cream, textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🥗</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: NB.ink }}>{g.calorieGoalStreak || 0}</div>
                <div style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>cal streak</div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('medals')}
              style={{ marginTop: 12, width: '100%', padding: '10px', border: `2px solid ${NB.ink}`, borderRadius: 12, background: NB.white, color: NB.ink, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}
            >
              View all badges →
            </button>
          </Section>

        </div>
      </div>

      <BottomNav active="analytics" onNavigate={onNavigate} />
    </>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div style={{ border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(2), padding: '14px 16px', background: NB.white }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 700, marginBottom: 4 }}>{icon} {label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: NB.ink }}>{value}</div>
    </div>
  )
}

function Section({ title, subtitle, children, expandable, expanded, onToggle }) {
  return (
    <div style={{ border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(2), background: NB.white, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {expandable && (
          <button onClick={onToggle} style={{ background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '4px 10px', fontSize: 11, color: NB.ink, fontWeight: 700, cursor: 'pointer' }}>
            {expanded ? 'Less' : 'Details'}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
