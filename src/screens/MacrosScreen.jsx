import React, { useState, useEffect } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { fetchNutritionLog } from '../lib/social'
import { getDailyTargets, MACRO_META } from '../utils/nutrition'
import { dailyTotals, mergeToday } from '../utils/analytics'
import { dateKeyFor, getWeekdayIndex } from '../utils/workoutBuilder'
import { MealTypeIcon, MEAL_COLORS } from '../components/MealTypeIcon'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

// Big "kcal left" ring — reuses the strokeDasharray idiom from Home's Build-a-meal card.
function CaloriesRing({ consumed, target, size = 116 }) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - circ * pct
  const left = Math.max(0, Math.round(target - consumed))
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="11" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={NB.ink} strokeWidth="11" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 50 50)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, color: NB.ink, lineHeight: 1 }}>{left.toLocaleString()}</span>
        <span style={{ fontFamily: NB.fontMono, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666', marginTop: 2 }}>kcal left</span>
      </div>
    </div>
  )
}

function MacroBar({ label, value, target, unit, color }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, color: NB.ink }}>{label}</span>
        <span style={{ fontFamily: NB.fontMono, fontWeight: 700, fontSize: 12, color: '#666' }}>{Math.round(value)}<span style={{ color: '#aaa' }}> / {Math.round(target)}{unit}</span></span>
      </div>
      <div style={{ height: 14, borderRadius: 999, border: `2px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

export default function MacrosScreen({ session, loggedMacros = {}, userProfile = {}, onNavigate }) {
  const today = dateKeyFor()
  const [selectedDate, setSelectedDate] = useState(today)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const targets = getDailyTargets(userProfile)

  // Monday-first week containing today.
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - getWeekdayIndex(now))
  monday.setHours(0, 0, 0, 0)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const key = dateKeyFor(d)
    return {
      key,
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: key === today,
      isFuture: key > today,
    }
  })

  useEffect(() => {
    let cancelled = false
    if (!session?.user?.id) { setLoading(false); return }
    const mondayKey = dateKeyFor(monday)
    fetchNutritionLog(session.user.id, mondayKey).then(data => {
      if (!cancelled) { setRows(data); setLoading(false) }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Per-day totals, with today overlaid by the live loggedMacros state.
  const byDay = mergeToday(dailyTotals(rows), loggedMacros)
  const dayTotals = byDay[selectedDate] || {}
  const consumed = Math.round(dayTotals.calories || 0)

  const dayMeals = rows.filter(r => r.date === selectedDate).slice().reverse()
  const primaryMacros = MACRO_META.filter(m => ['protein', 'carbs', 'fat'].includes(m.key))
  const extraMacros = MACRO_META.filter(m => !['calories', 'protein', 'carbs', 'fat'].includes(m.key))

  return (
    <>
      <StatusBar />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 20px 8px', flexShrink: 0 }}>
        <button onClick={() => onNavigate('meals')} style={{ width: 38, height: 38, borderRadius: 11, border: NB_BORDER, background: NB.white, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: NB.ink }}>Macros</div>
      </div>

      {/* Week selector */}
      <div style={{ display: 'flex', gap: 5, padding: '2px 16px 10px', flexShrink: 0 }}>
        {weekDays.map(d => {
          const selected = d.key === selectedDate
          return (
            <button
              key={d.key}
              disabled={d.isFuture}
              onClick={() => setSelectedDate(d.key)}
              style={{
                flex: 1, minWidth: 0, padding: '7px 0', borderRadius: 11,
                border: `2px solid ${selected ? NB.ink : (d.isToday ? NB.ink : 'transparent')}`,
                background: selected ? NB.ink : NB.white,
                opacity: d.isFuture ? 0.35 : 1,
                cursor: d.isFuture ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}
            >
              <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: selected ? 'rgba(255,255,255,0.7)' : '#888' }}>{d.label}</span>
              <span style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, color: selected ? NB.white : NB.ink }}>{d.dayNum}</span>
            </button>
          )
        })}
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 12px' }}>
        {/* Calories ring card */}
        <div style={{ ...nbCardStyle(NB.white, 5, NB_CARD_NEUTRAL_SHADOW), border: NB_BORDER, borderRadius: 20, padding: '18px 20px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 18 }}>
          <CaloriesRing consumed={consumed} target={targets.calories} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888' }}>{selectedDate === today ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 30, color: NB.ink, lineHeight: 1.05, marginTop: 4 }}>{consumed.toLocaleString()}</div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, color: '#666', marginTop: 2 }}>of {Math.round(targets.calories).toLocaleString()} kcal</div>
          </div>
        </div>

        {/* Primary macro bars */}
        <div style={{ ...nbCardStyle(NB.white, 4, NB_CARD_NEUTRAL_SHADOW), border: NB_BORDER, borderRadius: 20, padding: '18px 20px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {primaryMacros.map(m => (
            <MacroBar key={m.key} label={m.label} value={dayTotals[m.key] || 0} target={targets[m.key] || 0} unit={m.unit} color={m.color} />
          ))}
        </div>

        {/* Every other tracked macro */}
        <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 4, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 20, padding: '16px 18px', marginBottom: 14 }}>
          <div style={{ fontFamily: NB.fontMono, fontWeight: 700, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: NB.ink, marginBottom: 12 }}>Other nutrients</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {extraMacros.map(m => {
              const val = Math.round(dayTotals[m.key] || 0)
              const target = Math.round(targets[m.key] || 0)
              const pct = target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0
              return (
                <div key={m.key} style={{ borderRadius: 11, background: NB.white, border: `1.5px solid ${NB.ink}`, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                    <span style={{ fontFamily: NB.fontMono, fontSize: 8.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: '#666' }}>{m.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: NB.ink }}>{val}<span style={{ color: '#999', fontWeight: 700 }}>/{target}{m.unit}</span></span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: NB.lavenderMist, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: m.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recently logged */}
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: NB.ink, marginBottom: 10 }}>Recently logged</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: NB.fontMono, fontSize: 13, color: '#888' }}>Loading…</div>
        ) : dayMeals.length === 0 ? (
          <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '24px 18px', textAlign: 'center', fontFamily: NB.fontMono, fontSize: 13, color: '#666' }}>
            No meals logged {selectedDate === today ? 'yet today' : 'this day'}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayMeals.map((r, i) => (
              <div key={r.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, ...nbCardStyle(NB.white, 2, NB_CARD_NEUTRAL_SHADOW), border: `2.5px solid ${NB.ink}`, borderRadius: 14, padding: '10px 12px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, border: `2px solid ${NB.ink}`, background: MEAL_COLORS[r.meal_type] || NB.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MealTypeIcon type={r.meal_type} size={26} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, color: NB.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                  <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#666', marginTop: 2 }}>
                    {Math.round(r.macros?.calories || 0)} kcal · P{Math.round(r.macros?.protein || 0)} C{Math.round(r.macros?.carbs || 0)} F{Math.round(r.macros?.fat || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="meals" onNavigate={onNavigate} />
    </>
  )
}
