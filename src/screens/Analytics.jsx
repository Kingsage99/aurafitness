import React, { useState, useEffect, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import MuscleSVG, { MUSCLE_SVG_IDS, MUSCLE_PRO_FILL } from '../components/MuscleSVG'
import RadarChart from '../components/RadarChart'
import { TrendChart, BarTrend, HBarList, StackedShareBar } from '../components/Charts'
import { fetchWorkoutHistory, fetchNutritionLog, fetchBodyWeightLog } from '../lib/social'
import { getDailyTargets, MACRO_META } from '../utils/nutrition'
import { xpProgress, RANKS, normalizeRankId } from '../utils/gamification'
import { renderIcon, MedalIcon } from '../components/Icons'
import { GROUP_LABELS, exerciseCountsByGroup } from '../utils/muscleGroups'
import { dateKeyFor } from '../utils/workoutBuilder'
import { toDisplayWeight, weightUnitLabel } from '../utils/units'
import {
  filterByPeriod, sessionVolume, sessionSetsDone, volumeSeries, frequencySeries,
  durationStats, consistency, topExercises, personalRecords, muscleGroupSeries,
  topExercisesForGroup, radarData, setsByGroup,
  dailyTotals, mergeToday, macroSeries, nutritionAverages, adherence, mealTypeSplit,
  weeklyAverageSeries, weightSeries,
} from '../utils/analytics'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW, NB_INTENSITY_RAMP } from '../styles/neoBrutalism'

const PERIODS = [
  { days: 7, label: '7D' },
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: null, label: 'ALL' },
]

const MEAL_SPLIT_COLORS = { breakfast: NB.yellow, lunch: NB.teal, dinner: NB.magenta, snacks: NB.pink, other: NB.lavender }
const MEAL_SPLIT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks', other: 'Other' }

export default function Analytics({ gamification, userProfile, loggedMacros, session, isProUser = false, onNavigate }) {
  const [tab, setTab] = useState('training')
  const [period, setPeriod] = useState(30)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedMacro, setSelectedMacro] = useState('calories')
  const [history, setHistory] = useState([])
  const [nutriRows, setNutriRows] = useState([])
  const [weightRows, setWeightRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null) // { title, body } — enlarged chart sheet

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return }
    const since = dateKeyFor(new Date(Date.now() - 365 * 86400000))
    Promise.all([
      fetchWorkoutHistory(session.user.id, 365),
      fetchNutritionLog(session.user.id, since),
      fetchBodyWeightLog(session.user.id),
    ]).then(([h, n, w]) => {
      setHistory(h)
      setNutriRows(n)
      setWeightRows(w)
      setLoading(false)
    })
  }, [session])

  const g = gamification || {}
  const targets = getDailyTargets(userProfile)
  const xp = xpProgress(g.xp || 0)

  // ── Training aggregations (period-filtered) ─────────────────────────────────
  const fHistory = useMemo(() => filterByPeriod(history, period), [history, period])
  const totalVolume = useMemo(() => fHistory.reduce((s, r) => s + sessionVolume(r), 0), [fHistory])
  const totalSetsDone = useMemo(() => fHistory.reduce((s, r) => s + sessionSetsDone(r), 0), [fHistory])
  const dur = useMemo(() => durationStats(fHistory), [fHistory])
  const volSeries = useMemo(() => volumeSeries(history, period), [history, period])
  const freqSeries = useMemo(() => frequencySeries(history, period), [history, period])
  const cons = useMemo(() => consistency(fHistory), [fHistory])
  const radar = useMemo(() => radarData(fHistory), [fHistory])
  const groupSets = useMemo(() => setsByGroup(fHistory), [fHistory])
  const groupItems = useMemo(() =>
    Object.entries(GROUP_LABELS)
      .map(([key, label]) => ({ key, label, value: groupSets[key] || 0 }))
      .sort((a, b) => b.value - a.value),
    [groupSets])
  const groupSeries = useMemo(() => selectedGroup ? muscleGroupSeries(history, selectedGroup, period) : null, [history, selectedGroup, period])
  const groupTop = useMemo(() => selectedGroup ? topExercisesForGroup(fHistory, selectedGroup, 3) : null, [fHistory, selectedGroup])
  const topExs = useMemo(() => topExercises(fHistory, 5), [fHistory])
  const prs = useMemo(() => personalRecords(fHistory, 6), [fHistory])

  const muscleCounts = useMemo(() => exerciseCountsByGroup(fHistory), [fHistory])
  const heatColors = useMemo(() => {
    const max = Math.max(1, ...Object.values(muscleCounts))
    const build = (side) => {
      const colors = {}
      Object.entries(muscleCounts).forEach(([group, count]) => {
        if (count <= 0) return
        const idx = Math.min(4, 1 + Math.floor((count / max) * 3.99))
        ;(MUSCLE_SVG_IDS[group]?.[side] || []).forEach(id => { colors[id] = isProUser ? MUSCLE_PRO_FILL : NB_INTENSITY_RAMP[idx] })
      })
      return colors
    }
    return { front: build('front'), back: build('back') }
  }, [muscleCounts, isProUser])

  // ── Nutrition aggregations ──────────────────────────────────────────────────
  const totals = useMemo(() => mergeToday(dailyTotals(nutriRows), loggedMacros || {}), [nutriRows, loggedMacros])
  const hasNutritionHistory = nutriRows.length > 0
  const calSeries = useMemo(() => macroSeries(totals, 'calories', period || 90), [totals, period])
  const macroTrend = useMemo(() => macroSeries(totals, selectedMacro, period || 90), [totals, selectedMacro, period])
  const avgs = useMemo(() => nutritionAverages(totals, targets, period), [totals, targets, period])
  const adh = useMemo(() => adherence(totals, targets, period), [totals, targets, period])
  const split = useMemo(() => mealTypeSplit(nutriRows, period), [nutriRows, period])
  const wSeries = useMemo(() => weightSeries(weightRows, period), [weightRows, period])
  const latestWeight = weightRows.length ? Number(weightRows[weightRows.length - 1].weight_kg) : null
  const selectedMeta = MACRO_META.find(m => m.key === selectedMacro) || MACRO_META[0]
  const units = userProfile?.units
  const unitSuffix = ` ${weightUnitLabel(units)}`
  const displayVolSeries = useMemo(() => volSeries.map(p => ({ ...p, value: toDisplayWeight(p.value, units) })), [volSeries, units])
  const displayWSeries = useMemo(() => wSeries.map(p => ({ ...p, value: toDisplayWeight(p.value, units) })), [wSeries, units])

  const chipStyle = (active) => ({
    flexShrink: 0, height: 32, padding: '0 13px', border: `2px solid ${NB.ink}`, borderRadius: 9,
    background: active ? NB.magenta : NB.white, color: active ? NB.white : NB.ink,
    fontFamily: NB.fontMono, fontWeight: 800, fontSize: 11, cursor: 'pointer',
  })

  return (
    <>
      <StatusBar />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '10px 22px 8px' }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 26, textTransform: 'uppercase', color: NB.ink }}>Analytics</div>
        </div>

        {/* Tab switch */}
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8 }}>
          {[['training', 'Training'], ['nutrition', 'Nutrition']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex: 1, height: 40, border: NB_BORDER, borderRadius: 12, boxShadow: tab === id ? hardShadow(3) : 'none', background: tab === id ? NB.magenta : NB.white, color: tab === id ? NB.white : NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Sticky period chips — one filter row above all charts */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: NB.bg, padding: '6px 16px 10px', display: 'flex', gap: 8 }}>
          {PERIODS.map(p => (
            <button key={p.label} onClick={() => setPeriod(p.days)} style={{ ...chipStyle(period === p.days), flex: 1 }}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '4px 16px 24px' }}>
          {loading ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#555' }}>Loading…</div>
          ) : tab === 'training' ? (
            <>
              {/* T1 — overview stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <StatCard icon="💪" label="Workouts" value={fHistory.length} />
                <StatCard icon="🏋️" label="Total Volume" value={`${toDisplayWeight(totalVolume, units).toLocaleString()}${unitSuffix}`} />
                <StatCard icon="✅" label="Sets Done" value={totalSetsDone} />
                <StatCard icon="⏱️" label="Avg Duration" value={`${dur.avgMin} min`} />
              </div>

              {/* T2 — streak & level (xpProgress shared with the rest of the app) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <StatCard icon="🔥" label="Streak" value={`${g.workoutStreak || 0} days`} />
                <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>{renderIcon('⚡', 12)} Level {xp.level}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: NB.ink, marginBottom: 8 }}>{g.xp || 0} XP</div>
                  <div style={{ height: 8, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.round((xp.current / Math.max(1, xp.needed)) * 100))}%`, background: NB.teal }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{Math.max(0, xp.needed - xp.current)} XP to next level</div>
                </div>
              </div>

              {/* T3 — volume trend */}
              <Section title="Volume Trend" subtitle="Weight × reps of completed sets"
                onExpand={fHistory.length === 0 ? null : () => setDetail({
                  title: 'Volume Trend',
                  body: (
                    <>
                      <TrendChart points={displayVolSeries} unit={unitSuffix} height={250} />
                      <StatsStrip points={displayVolSeries} unit={unitSuffix} />
                      <div style={{ fontSize: 11, color: '#555', marginTop: 12 }}>Tap any point on the chart to inspect it. Volume = weight × reps summed over every completed set.</div>
                    </>
                  ),
                })}>
                {fHistory.length === 0
                  ? <EmptyNote text="No workouts in this period yet." />
                  : <TrendChart points={displayVolSeries} unit={unitSuffix} />}
              </Section>

              {/* T4 — muscle balance radar */}
              <Section title="Muscle Balance" subtitle="Set volume by area — a rounder shape means more balanced training"
                onExpand={() => setDetail({
                  title: 'Muscle Balance',
                  body: (
                    <>
                      <RadarChart axes={radar} size={320} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                        {radar.map(a => (
                          <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', background: NB.lavenderMist, border: 'none', borderRadius: 10, padding: '8px 12px' }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: NB.ink }}>{a.label}</span>
                            <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, color: NB.ink }}>{a.raw} sets · {Math.round(a.value * 100)}% of top area</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ),
                })}>
                <RadarChart axes={radar} size={280} />
              </Section>

              {/* T5 — muscle groups + drilldown */}
              <Section title="Muscle Groups" subtitle="Completed sets per area (secondary muscles count half)">
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
                  <button onClick={() => setSelectedGroup(null)} style={chipStyle(selectedGroup === null)}>ALL</button>
                  {Object.entries(GROUP_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => setSelectedGroup(key)} style={chipStyle(selectedGroup === key)}>{label.toUpperCase()}</button>
                  ))}
                </div>
                {selectedGroup === null ? (
                  fHistory.length === 0
                    ? <EmptyNote text="No workouts in this period yet." />
                    : <HBarList items={groupItems} unit=" sets" onSelect={setSelectedGroup} />
                ) : (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 800, color: NB.ink, marginBottom: 6 }}>{GROUP_LABELS[selectedGroup]} — sets over time</div>
                    <TrendChart points={groupSeries} unit=" sets" />
                    {groupTop?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#555', marginBottom: 8 }}>TOP EXERCISES</div>
                        <HBarList items={groupTop.map(e => ({ key: e.id, label: e.name, value: toDisplayWeight(e.totalVolume, units), sublabel: `${e.sets} sets` }))} unit={unitSuffix} />
                      </div>
                    )}
                  </>
                )}
              </Section>

              {/* T6 — muscle heat map */}
              <Section title="Muscle Heat Map" subtitle="Training intensity by area in this period">
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <div style={{ flex: 1, maxWidth: 130, aspectRatio: '0.6' }}>
                    <MuscleSVG url="/muscle_map_front.svg" muscleColors={heatColors.front} />
                  </div>
                  <div style={{ flex: 1, maxWidth: 130, aspectRatio: '0.6' }}>
                    <MuscleSVG url="/muscle_map_back.svg" muscleColors={heatColors.back} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
                  {[[NB_INTENSITY_RAMP[1], 'Light'], [NB_INTENSITY_RAMP[2], 'Moderate'], [NB_INTENSITY_RAMP[3], 'High'], [NB_INTENSITY_RAMP[4], 'Max']].map(([c, l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, border: `1.5px solid ${NB.ink}`, background: c }} />
                      <span style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{l}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* T7 — frequency + consistency */}
              <Section title="Frequency" subtitle="Workouts per week"
                onExpand={fHistory.length === 0 ? null : () => setDetail({
                  title: 'Frequency',
                  body: (
                    <>
                      <BarTrend points={freqSeries} height={230} />
                      <StatsStrip points={freqSeries} showTotal={true} />
                      <div style={{ fontSize: 11, color: '#555', marginTop: 12 }}>Set completion {cons.completionRate}% · {cons.activeDays} active days · {cons.avgGapDays} days average gap between sessions.</div>
                    </>
                  ),
                })}>
                {fHistory.length === 0
                  ? <EmptyNote text="No workouts in this period yet." />
                  : (
                    <>
                      <BarTrend points={freqSeries} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {[[`${cons.completionRate}%`, 'sets completed'], [cons.activeDays, 'active days'], [`${cons.avgGapDays}d`, 'avg gap']].map(([v, l]) => (
                          <div key={l} style={{ flex: 1, background: NB.lavenderMist, border: 'none', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                            <div style={{ fontSize: 15, fontWeight: 900, color: NB.ink }}>{v}</div>
                            <div style={{ fontFamily: NB.fontMono, fontSize: 8, color: '#555', fontWeight: 700 }}>{l.toUpperCase()}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
              </Section>

              {/* T8 — top exercises */}
              <Section title="Top Exercises" subtitle="By total volume in this period">
                {topExs.length === 0
                  ? <EmptyNote text="Complete weighted sets to see your top exercises." />
                  : <HBarList items={topExs.map(e => ({ key: e.id, label: e.name, value: toDisplayWeight(e.totalVolume, units), sublabel: `${e.sets} sets` }))} unit={unitSuffix} />}
              </Section>

              {/* T9 — personal records */}
              <Section title="Personal Records" subtitle="Heaviest completed set per exercise">
                {prs.length === 0
                  ? <EmptyNote text="Log weights during workouts to start setting PRs." />
                  : prs.map(pr => (
                    <div key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: NB.lavenderMist, border: 'none', borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
                      <MedalIcon size={18} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.name}</div>
                        <div style={{ fontSize: 11, color: '#555' }}>{toDisplayWeight(pr.maxWeight, units)}{unitSuffix} × {pr.reps}</div>
                      </div>
                      <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink, background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '3px 7px', flexShrink: 0 }}>{pr.date.slice(5)}</span>
                    </div>
                  ))}
              </Section>
            </>
          ) : (
            <>
              {/* N1 — today vs targets, all 10 macros */}
              <Section title="Today vs Targets" subtitle="Every tracked macro">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {MACRO_META.map(meta => {
                    const val = Math.round(loggedMacros?.[meta.key] || 0)
                    const target = Math.round(targets[meta.key] || 0)
                    const pct = target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0
                    return (
                      <div key={meta.key} style={{ background: NB.lavenderMist, border: 'none', borderRadius: 11, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                          <span style={{ fontFamily: NB.fontMono, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', color: '#666' }}>{meta.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: NB.ink }}>{val}<span style={{ color: '#999', fontWeight: 700 }}>/{target}{meta.unit}</span></span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: meta.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>

              {/* N2 — calories trend */}
              <Section title="Calories Trend" subtitle="Daily intake vs target"
                onExpand={!calSeries.some(p => p.value > 0) ? null : () => setDetail({
                  title: 'Calories Trend',
                  body: (
                    <>
                      <BarTrend points={calSeries.length > 31 ? weeklyAverageSeries(calSeries) : calSeries} target={targets.calories} height={240} />
                      <StatsStrip points={calSeries.filter(p => p.logged)} unit="" showTotal={false} />
                      <div style={{ fontSize: 11, color: '#555', marginTop: 12 }}>Dashed line is your {targets.calories.toLocaleString()} kcal daily target. Stats count logged days only.</div>
                    </>
                  ),
                })}>
                {!hasNutritionHistory && !calSeries.some(p => p.value > 0)
                  ? <EmptyNote text="Log meals to build your history — today's meals are already being recorded." />
                  : <BarTrend points={calSeries.length > 31 ? weeklyAverageSeries(calSeries) : calSeries} target={targets.calories} />}
              </Section>

              {/* N3 — macro explorer */}
              <Section title="Macro Explorer" subtitle="Pick a macro to see its daily trend"
                onExpand={!macroTrend.some(p => p.value > 0) ? null : () => setDetail({
                  title: `${selectedMeta.label} Trend`,
                  body: (
                    <>
                      <TrendChart points={macroTrend.length > 31 ? weeklyAverageSeries(macroTrend) : macroTrend} target={targets[selectedMacro]} unit={selectedMeta.unit === 'kcal' ? '' : selectedMeta.unit} height={250} color={selectedMeta.color} />
                      <StatsStrip points={macroTrend.filter(p => p.logged)} unit={selectedMeta.unit === 'kcal' ? '' : selectedMeta.unit} showTotal={false} />
                      <div style={{ fontSize: 11, color: '#555', marginTop: 12 }}>Daily target: {Math.round(targets[selectedMacro] || 0).toLocaleString()}{selectedMeta.unit}. Stats count logged days only.</div>
                    </>
                  ),
                })}>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
                  {MACRO_META.map(meta => (
                    <button key={meta.key} onClick={() => setSelectedMacro(meta.key)}
                      style={{ flexShrink: 0, height: 32, padding: '0 12px', border: `2px solid ${NB.ink}`, borderRadius: 9, background: selectedMacro === meta.key ? meta.color : NB.white, fontFamily: NB.fontMono, fontWeight: 800, fontSize: 10.5, color: NB.ink, cursor: 'pointer' }}>
                      {meta.label.toUpperCase()}
                    </button>
                  ))}
                </div>
                {!macroTrend.some(p => p.value > 0)
                  ? <EmptyNote text="No data for this macro yet — it starts recording with each logged meal." />
                  : <TrendChart points={macroTrend.length > 31 ? weeklyAverageSeries(macroTrend) : macroTrend} target={targets[selectedMacro]} unit={selectedMeta.unit === 'kcal' ? '' : selectedMeta.unit} />}
              </Section>

              {/* N4 — averages vs targets */}
              <Section title="Averages vs Targets" subtitle="Per logged day in this period">
                {!Object.keys(avgs).length
                  ? <EmptyNote text="Averages appear once you have logged days on record." />
                  : MACRO_META.map(meta => {
                    const a = avgs[meta.key]
                    if (!a) return null
                    const over = meta.limit && a.avg > a.target
                    return (
                      <div key={meta.key} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>
                            {meta.label}
                            {over && <span style={{ fontFamily: NB.fontMono, fontSize: 8.5, fontWeight: 800, color: NB.white, background: NB.red, border: `1.5px solid ${NB.ink}`, borderRadius: 5, padding: '1px 5px', marginLeft: 6 }}>OVER</span>}
                          </span>
                          <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, color: NB.ink }}>{a.avg.toLocaleString()}<span style={{ color: '#999' }}>/{a.target.toLocaleString()}{meta.unit}</span></span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, a.pct)}%`, height: '100%', background: over ? NB.red : meta.color }} />
                        </div>
                      </div>
                    )
                  })}
              </Section>

              {/* N5 — adherence */}
              <Section title="Adherence" subtitle="How consistently you hit your plan">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    [`${adh.loggedDays}${period ? `/${adh.totalDays}` : ''}`, 'days logged'],
                    [adh.calorieHitDays, 'calorie goal hit (±10%)'],
                    [adh.proteinHitDays, 'protein goal hit'],
                    [adh.avgMealsPerDay, 'avg meals / day'],
                  ].map(([v, l]) => (
                    <div key={l} style={{ background: NB.lavenderMist, border: 'none', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: NB.ink }}>{v}</div>
                      <div style={{ fontFamily: NB.fontMono, fontSize: 8, color: '#555', fontWeight: 700, marginTop: 3 }}>{String(l).toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* N6 — meal split */}
              <Section title="Meal Split" subtitle="Where your calories come from">
                {split.total === 0
                  ? <EmptyNote text="Log meals to see how your calories split across the day." />
                  : <StackedShareBar
                      segments={split.segments.map(s => ({ ...s, label: MEAL_SPLIT_LABELS[s.key], value: s.kcal }))}
                      colors={MEAL_SPLIT_COLORS}
                      unit=" kcal"
                    />}
              </Section>

              {/* N7 — body progress */}
              <Section title="Body Progress" subtitle={latestWeight ? `Current: ${toDisplayWeight(latestWeight, units)}${unitSuffix}` : 'Track your weight & photos over time'}>
                {wSeries.length >= 2
                  ? <TrendChart points={displayWSeries} unit={unitSuffix} color={NB.magenta} baseline="auto" />
                  : <EmptyNote text="Log daily weight & photos to watch your body change over time." />}
                <button onClick={() => onNavigate('bodyProgress')}
                  style={{ width: '100%', marginTop: 12, height: 46, border: NB_BORDER, borderRadius: 13, boxShadow: hardShadow(3), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>
                  Open Body Progress →
                </button>
              </Section>

              {/* N8 — achievements */}
              <Section title="Achievements">
                <div style={{ display: 'flex', gap: 10 }}>
                  {(() => {
                    const tier = RANKS.find(r => r.id === normalizeRankId(g.rank)) || RANKS[0]
                    return [
                      ['🏅', (g.badges || []).length, '/ 16 badges', null],
                      [null, tier.label, `${g.rankPoints || 0} pts`, tier.image],
                      ['🥗', g.calorieGoalStreak || 0, 'cal streak', null],
                    ].map(([icon, v, l, img]) => (
                      <div key={l} style={{ flex: 1, background: NB.lavenderMist, border: 'none', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                        {img
                          ? <img src={img} alt="" style={{ width: 26, height: 26, objectFit: 'contain', marginBottom: 2 }} />
                          : <div style={{ fontSize: 20, marginBottom: 4 }}>{renderIcon(icon, 20)}</div>}
                        <div style={{ fontSize: 16, fontWeight: 900, color: NB.ink, textTransform: 'capitalize' }}>{v}</div>
                        <div style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{l}</div>
                      </div>
                    ))
                  })()}
                </div>
                <button
                  onClick={() => onNavigate('medals')}
                  style={{ marginTop: 12, width: '100%', padding: '10px', border: `2px solid ${NB.ink}`, borderRadius: 12, background: NB.white, color: NB.ink, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  View all badges →
                </button>
              </Section>
            </>
          )}
        </div>
      </div>

      {/* Enlarged chart detail sheet */}
      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={detail?.title} maxHeight="90%">
        {detail?.body}
      </BottomSheet>

      <BottomNav active="analytics" onNavigate={onNavigate} />
    </>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>{renderIcon(icon, 12)} {label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: NB.ink }}>{value}</div>
    </div>
  )
}

function Section({ title, subtitle, children, onExpand }) {
  return (
    <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {onExpand && (
          <button onClick={onExpand} style={{ width: 30, height: 30, flexShrink: 0, border: `2px solid ${NB.ink}`, borderRadius: 9, background: NB.yellow, boxShadow: hardShadow(2), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// Summary strip shown inside chart detail sheets
function StatsStrip({ points = [], unit = '', showTotal = true }) {
  const vals = points.map(p => p.value).filter(v => typeof v === 'number')
  if (!vals.length) return null
  const nonZero = vals.filter(v => v > 0)
  const min = nonZero.length ? Math.min(...nonZero) : 0
  const max = Math.max(...vals)
  const avg = nonZero.length ? Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length) : 0
  const total = Math.round(vals.reduce((a, b) => a + b, 0))
  const cells = [[`${min.toLocaleString()}${unit}`, 'MIN'], [`${avg.toLocaleString()}${unit}`, 'AVG'], [`${max.toLocaleString()}${unit}`, 'MAX']]
  if (showTotal) cells.push([`${total.toLocaleString()}${unit}`, 'TOTAL'])
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
      {cells.map(([v, l]) => (
        <div key={l} style={{ flex: 1, background: NB.lavenderMist, border: 'none', borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: NB.ink }}>{v}</div>
          <div style={{ fontFamily: NB.fontMono, fontSize: 8, color: '#555', fontWeight: 700, marginTop: 2 }}>{l}</div>
        </div>
      ))}
    </div>
  )
}

function EmptyNote({ text }) {
  return (
    <div style={{ padding: '18px 14px', background: NB.lavenderMist, border: 'none', borderRadius: 12, textAlign: 'center' }}>
      <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{text}</span>
    </div>
  )
}
