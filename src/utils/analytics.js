// Pure aggregation functions for the Analytics screen. Inputs are Supabase
// rows (workout_history / nutrition_log / body_weight_log) — no fetching here.
import { GROUP_LABELS, groupOf, setsByGroup } from './muscleGroups'
import { dateKeyFor } from './workoutBuilder'

const DAY_MS = 86400000

// ─── Period filtering ─────────────────────────────────────────────────────────

// periodDays: number of days back from now, or null for everything.
export function filterByPeriod(rows, periodDays, dateField = 'completed_at') {
  if (!periodDays) return rows || []
  const cutoff = Date.now() - periodDays * DAY_MS
  return (rows || []).filter(r => {
    const v = r[dateField]
    // 'YYYY-MM-DD' date keys compare fine lexically; timestamps parse
    const t = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T12:00:00').getTime() : new Date(v).getTime()
    return t >= cutoff
  })
}

// ─── Workout aggregations ─────────────────────────────────────────────────────

// loggedSets store weight as a string ('42.5', '' for bodyweight)
export const setVolume = (set) => (parseFloat(set.weight) || 0) * (set.reps || 0)

export function sessionVolume(session) {
  let vol = 0
  ;(session.exercises || []).forEach(ex => {
    ;(ex.loggedSets || []).forEach(s => { if (s.done) vol += setVolume(s) })
  })
  return Math.round(vol)
}

export function sessionSetsDone(session) {
  return session.sets_completed ?? (session.exercises || []).reduce(
    (n, ex) => n + (ex.loggedSets || []).filter(s => s.done).length, 0)
}

export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return `${d.getUTCFullYear()}-W${String(Math.ceil((((d - yearStart) / DAY_MS) + 1) / 7)).padStart(2, '0')}`
}

export const weekLabel = (isoWeek) => isoWeek.slice(5)
export const dayLabel = (dateKey) => `${Number(dateKey.slice(8, 10))}/${Number(dateKey.slice(5, 7))}`

// Buckets rows into day buckets (short periods) or ISO weeks (long), zero-filled.
function buildBuckets(periodDays, firstDate) {
  const byDay = periodDays && periodDays <= 14
  const buckets = []
  if (byDay) {
    for (let i = periodDays - 1; i >= 0; i--) {
      const key = dateKeyFor(new Date(Date.now() - i * DAY_MS))
      buckets.push({ key, label: dayLabel(key) })
    }
  } else {
    const start = periodDays ? Date.now() - periodDays * DAY_MS : (firstDate || Date.now())
    const weeks = Math.max(1, Math.ceil((Date.now() - start) / (7 * DAY_MS)))
    for (let i = weeks - 1; i >= 0; i--) {
      const key = getISOWeek(new Date(Date.now() - i * 7 * DAY_MS))
      if (!buckets.find(b => b.key === key)) buckets.push({ key, label: weekLabel(key) })
    }
  }
  return { buckets, byDay }
}

const bucketKeyOf = (dateValue, byDay) => {
  const d = new Date(dateValue)
  return byDay ? dateKeyFor(d) : getISOWeek(d)
}

// Σ weight×reps of done sets per day/week bucket
export function volumeSeries(history, periodDays) {
  const rows = filterByPeriod(history, periodDays)
  const firstDate = rows.length ? Math.min(...rows.map(r => new Date(r.completed_at).getTime())) : null
  const { buckets, byDay } = buildBuckets(periodDays, firstDate)
  const sums = {}
  rows.forEach(r => { const k = bucketKeyOf(r.completed_at, byDay); sums[k] = (sums[k] || 0) + sessionVolume(r) })
  return buckets.map(b => ({ label: b.label, value: sums[b.key] || 0 }))
}

// Workouts per bucket
export function frequencySeries(history, periodDays) {
  const rows = filterByPeriod(history, periodDays)
  const firstDate = rows.length ? Math.min(...rows.map(r => new Date(r.completed_at).getTime())) : null
  const { buckets, byDay } = buildBuckets(periodDays, firstDate)
  const counts = {}
  rows.forEach(r => { const k = bucketKeyOf(r.completed_at, byDay); counts[k] = (counts[k] || 0) + 1 })
  return buckets.map(b => ({ label: b.label, value: counts[b.key] || 0 }))
}

export function durationStats(history) {
  const rows = (history || []).filter(r => r.elapsed > 0)
  if (!rows.length) return { avgMin: 0, totalMin: 0 }
  const totalMin = Math.round(rows.reduce((s, r) => s + r.elapsed, 0) / 60)
  return { avgMin: Math.round(totalMin / rows.length), totalMin }
}

export function consistency(history) {
  const rows = history || []
  const totalSets = rows.reduce((s, r) => s + (r.total_sets || 0), 0)
  const doneSets = rows.reduce((s, r) => s + (r.sets_completed || 0), 0)
  const days = new Set(rows.map(r => dateKeyFor(new Date(r.completed_at))))
  const sorted = [...days].sort()
  let gapSum = 0
  for (let i = 1; i < sorted.length; i++) {
    gapSum += (new Date(sorted[i]) - new Date(sorted[i - 1])) / DAY_MS
  }
  return {
    completionRate: totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0,
    activeDays: days.size,
    avgGapDays: sorted.length > 1 ? Math.round((gapSum / (sorted.length - 1)) * 10) / 10 : 0,
  }
}

export function topExercises(history, n = 5) {
  const byId = {}
  ;(history || []).forEach(session => {
    ;(session.exercises || []).forEach(ex => {
      const key = ex.id || ex.name
      if (!key) return
      const entry = byId[key] || (byId[key] = { id: key, name: ex.name || key, totalVolume: 0, sets: 0 })
      ;(ex.loggedSets || []).forEach(s => {
        if (!s.done) return
        entry.totalVolume += setVolume(s)
        entry.sets += 1
      })
    })
  })
  return Object.values(byId)
    .map(e => ({ ...e, totalVolume: Math.round(e.totalVolume) }))
    .filter(e => e.sets > 0)
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, n)
}

export function personalRecords(history, n = 6) {
  const best = {}
  ;(history || []).forEach(session => {
    ;(session.exercises || []).forEach(ex => {
      const key = ex.id || ex.name
      if (!key) return
      ;(ex.loggedSets || []).forEach(s => {
        if (!s.done) return
        const w = parseFloat(s.weight) || 0
        if (w <= 0) return
        if (!best[key] || w > best[key].maxWeight) {
          best[key] = { id: key, name: ex.name || key, maxWeight: w, reps: s.reps || 0, date: dateKeyFor(new Date(session.completed_at)) }
        }
      })
    })
  })
  return Object.values(best).sort((a, b) => b.maxWeight - a.maxWeight).slice(0, n)
}

// Sets-per-bucket trend for one display group
export function muscleGroupSeries(history, group, periodDays) {
  const rows = filterByPeriod(history, periodDays)
  const firstDate = rows.length ? Math.min(...rows.map(r => new Date(r.completed_at).getTime())) : null
  const { buckets, byDay } = buildBuckets(periodDays, firstDate)
  const sums = {}
  rows.forEach(r => {
    const k = bucketKeyOf(r.completed_at, byDay)
    ;(r.exercises || []).forEach(ex => {
      const doneSets = (ex.loggedSets || []).filter(s => s.done).length
      if (!doneSets) return
      const hit = (ex.muscles?.primary || []).some(m => groupOf(m) === group)
      const hitSecondary = !hit && (ex.muscles?.secondary || []).some(m => groupOf(m) === group)
      if (hit) sums[k] = (sums[k] || 0) + doneSets
      else if (hitSecondary) sums[k] = (sums[k] || 0) + doneSets * 0.5
    })
  })
  return buckets.map(b => ({ label: b.label, value: Math.round(sums[b.key] || 0) }))
}

// Top exercises that hit one display group (by primary muscle)
export function topExercisesForGroup(history, group, n = 3) {
  const filtered = (history || []).map(session => ({
    ...session,
    exercises: (session.exercises || []).filter(ex =>
      (ex.muscles?.primary || []).some(m => groupOf(m) === group)),
  }))
  return topExercises(filtered, n)
}

// Pentagon axes: Glutes / Legs(+calves) / Core / Back / Upper (chest+shoulders+arms).
// Values normalized to the max axis so the polygon shape reads as balance.
export function radarData(history) {
  const counts = setsByGroup(history)
  const axes = [
    { label: 'Glutes', raw: counts.glutes || 0 },
    { label: 'Legs', raw: (counts.legs || 0) + (counts.calves || 0) },
    { label: 'Core', raw: counts.core || 0 },
    { label: 'Back', raw: counts.back || 0 },
    { label: 'Upper', raw: (counts.chest || 0) + (counts.shoulders || 0) + (counts.arms || 0) },
  ]
  const max = Math.max(1, ...axes.map(a => a.raw))
  return axes.map(a => ({ ...a, value: a.raw / max }))
}

export { GROUP_LABELS, setsByGroup }

// ─── Nutrition aggregations ───────────────────────────────────────────────────

// nutrition_log rows → { [dateKey]: { ...10 macro sums, mealCount } }
export function dailyTotals(rows) {
  const byDate = {}
  ;(rows || []).forEach(r => {
    const day = byDate[r.date] || (byDate[r.date] = { mealCount: 0 })
    day.mealCount += 1
    Object.entries(r.macros || {}).forEach(([k, v]) => {
      if (typeof v === 'number') day[k] = (day[k] || 0) + v
    })
  })
  return byDate
}

// Today's truth is the live loggedMacros state (covers meals logged before
// per-meal recording shipped); history rows keep todays mealCount.
export function mergeToday(totals, loggedMacros) {
  const todayKey = dateKeyFor()
  const hasLive = Object.values(loggedMacros || {}).some(v => v > 0)
  if (!hasLive) return totals
  return { ...totals, [todayKey]: { mealCount: totals[todayKey]?.mealCount || 0, ...loggedMacros } }
}

// Continuous daily series for one macro (zero-filled, logged flag for gaps)
export function macroSeries(totals, key, periodDays) {
  const dates = Object.keys(totals).sort()
  if (!dates.length) return []
  const days = periodDays || Math.max(1, Math.round((Date.now() - new Date(dates[0] + 'T12:00:00')) / DAY_MS) + 1)
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const dk = dateKeyFor(new Date(Date.now() - i * DAY_MS))
    const day = totals[dk]
    out.push({ dateKey: dk, label: dayLabel(dk), value: Math.round(day?.[key] || 0), logged: !!day })
  }
  return out
}

// Collapse a daily macro series into ISO-week buckets (average of logged days
// only) — used when a period is too long to show one bar per day.
export function weeklyAverageSeries(series) {
  const weeks = []
  const byWeek = {}
  series.forEach(p => {
    const wk = getISOWeek(new Date(p.dateKey + 'T12:00:00'))
    if (!byWeek[wk]) { byWeek[wk] = { sum: 0, days: 0, label: p.label }; weeks.push(wk) }
    if (p.logged) { byWeek[wk].sum += p.value; byWeek[wk].days += 1 }
  })
  return weeks.map(wk => ({
    label: byWeek[wk].label,
    value: byWeek[wk].days ? Math.round(byWeek[wk].sum / byWeek[wk].days) : 0,
  }))
}

// Per-macro averages over logged days only
export function nutritionAverages(totals, targets, periodDays) {
  const cutoffKey = periodDays ? dateKeyFor(new Date(Date.now() - periodDays * DAY_MS)) : null
  const days = Object.entries(totals).filter(([dk]) => !cutoffKey || dk >= cutoffKey)
  if (!days.length) return {}
  const avgs = {}
  Object.keys(targets || {}).forEach(k => {
    const sum = days.reduce((s, [, d]) => s + (d[k] || 0), 0)
    const avg = Math.round(sum / days.length)
    avgs[k] = { avg, target: targets[k], pct: targets[k] > 0 ? Math.round((avg / targets[k]) * 100) : 0 }
  })
  return avgs
}

export function adherence(totals, targets, periodDays) {
  const cutoffKey = periodDays ? dateKeyFor(new Date(Date.now() - periodDays * DAY_MS)) : null
  const days = Object.entries(totals).filter(([dk]) => !cutoffKey || dk >= cutoffKey)
  const loggedDays = days.length
  let calorieHitDays = 0, proteinHitDays = 0, meals = 0
  days.forEach(([, d]) => {
    if (targets?.calories && Math.abs((d.calories || 0) - targets.calories) <= targets.calories * 0.1) calorieHitDays++
    if (targets?.protein && (d.protein || 0) >= targets.protein) proteinHitDays++
    meals += d.mealCount || 0
  })
  return {
    loggedDays,
    totalDays: periodDays || loggedDays,
    calorieHitDays,
    proteinHitDays,
    avgMealsPerDay: loggedDays ? Math.round((meals / loggedDays) * 10) / 10 : 0,
  }
}

// Calories share by meal-type bucket
export function mealTypeSplit(rows, periodDays) {
  const cutoffKey = periodDays ? dateKeyFor(new Date(Date.now() - periodDays * DAY_MS)) : null
  const bucketOf = (t) => {
    if (!t) return 'other'
    if (t === 'breakfast' || t === 'second_lunch') return 'breakfast'
    if (t === 'lunch') return 'lunch'
    if (t === 'dinner') return 'dinner'
    if (t.startsWith('snack')) return 'snacks'
    return 'other'
  }
  const sums = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0, other: 0 }
  ;(rows || []).forEach(r => {
    if (cutoffKey && r.date < cutoffKey) return
    sums[bucketOf(r.meal_type)] += r.macros?.calories || 0
  })
  const total = Object.values(sums).reduce((a, b) => a + b, 0)
  return { total: Math.round(total), segments: Object.entries(sums).map(([key, kcal]) => ({ key, kcal: Math.round(kcal), pct: total > 0 ? (kcal / total) * 100 : 0 })).filter(s => s.kcal > 0) }
}

// ─── Body weight ──────────────────────────────────────────────────────────────

export function weightSeries(rows, periodDays) {
  const cutoffKey = periodDays ? dateKeyFor(new Date(Date.now() - periodDays * DAY_MS)) : null
  return (rows || [])
    .filter(r => !cutoffKey || r.date >= cutoffKey)
    .map(r => ({ dateKey: r.date, label: dayLabel(r.date), value: Number(r.weight_kg) }))
}
