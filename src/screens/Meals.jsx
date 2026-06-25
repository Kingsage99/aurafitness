import React, { useState, useRef, useEffect } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { suggestMeal, lookupFood } from '../utils/claudeApi'

// ─── Daily targets ────────────────────────────────────────────────────────────
const DAILY_TARGETS = {
  lean_toned:  { calories: 1750, protein: 130, carbs: 180, fat: 55 },
  slim_thick:  { calories: 1900, protein: 150, carbs: 190, fat: 60 },
  hourglass:   { calories: 1800, protein: 135, carbs: 185, fat: 58 },
  athletic:    { calories: 2100, protein: 160, carbs: 220, fat: 65 },
  soft_curvy:  { calories: 1700, protein: 120, carbs: 175, fat: 55 },
  functional:  { calories: 2000, protein: 145, carbs: 210, fat: 62 },
}

const CRAVING_TAGS = ['Pasta', 'Light & fresh', 'Sweet', 'Spicy', 'High-protein', 'Comfort food']

const MODIFIER_CHIPS = [
  { id: 'more_protein',   label: '+ More protein' },
  { id: 'less_calories',  label: '- Less calories' },
  { id: 'more_calories',  label: '+ More calories' },
  { id: 'higher_fibre',   label: '+ Higher fibre' },
  { id: 'lower_carbs',    label: '- Lower carbs' },
  { id: 'higher_volume',  label: '+ Higher volume' },
  { id: 'quick_prep',     label: 'Quick prep' },
]

const MEAL_COLORS = {
  breakfast: '#7C3AED', lunch: '#F59E0B', dinner: '#10B981',
  snack: '#EC4899', snack_1: '#EC4899', snack_2: '#F97316', snack_3: '#0EA5E9',
  second_lunch: '#8B5CF6',
}
const MEAL_LABELS = {
  breakfast: 'BREAKFAST', lunch: 'LUNCH', dinner: 'DINNER', snack: 'SNACK',
  snack_1: 'SNACK 1', snack_2: 'SNACK 2', snack_3: 'SNACK 3', second_lunch: 'BRUNCH',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const slotLabel = t => MEAL_LABELS[t] || t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

const buildMealSlots = (meals, snacks, existing = [], totalCalories = 1750) => {
  const mainTypes = ['breakfast', 'lunch', 'dinner', 'second_lunch'].slice(0, meals)
  const snackTypes = Array.from({ length: snacks }, (_, i) => `snack_${i + 1}`)
  const snackCal = 150
  const mainCal = Math.max(200, Math.round((totalCalories - snacks * snackCal) / Math.max(meals, 1)))
  return [...mainTypes, ...snackTypes].map(t => {
    const prev = existing.find(s => s.type === t)
    const isSnack = t.startsWith('snack')
    return {
      type: t, label: slotLabel(t),
      craving: prev?.craving ?? '',
      calories: prev?.calories ?? (isSnack ? snackCal : mainCal),
    }
  })
}

// ─── Calorie split bar (single draggable segment bar) ────────────────────────
function CalorieSplitBar({ slots, remaining, onSlotsChange }) {
  const barRef = useRef()
  const dragging = useRef(null)

  const total = Math.max(1, slots.reduce((s, sl) => s + (sl.calories || 0), 0))

  let cum = 0
  const segs = slots.map(slot => {
    const pct = (slot.calories / total) * 100
    const left = cum
    cum += pct
    return { ...slot, pct, left }
  })

  const onPointerDown = (e, handleIdx) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    dragging.current = { handleIdx, lastX: e.clientX }
  }

  const onPointerMove = (e) => {
    if (!dragging.current) return
    const bar = barRef.current
    if (!bar) return
    const { handleIdx, lastX } = dragging.current
    const barWidth = bar.getBoundingClientRect().width
    const dx = e.clientX - lastX
    if (Math.abs(dx) < 0.5) return
    const deltaCal = Math.round((dx / barWidth) * total)
    if (deltaCal === 0) return
    const newSlots = slots.map((s, i) => {
      if (i === handleIdx) return { ...s, calories: Math.max(50, s.calories + deltaCal) }
      if (i === handleIdx + 1) return { ...s, calories: Math.max(50, s.calories - deltaCal) }
      return s
    })
    onSlotsChange(newSlots)
    dragging.current.lastX = e.clientX
  }

  const onPointerUp = () => { dragging.current = null }

  return (
    <div style={{ marginBottom: 10 }}>
      <div ref={barRef} style={{ position: 'relative', height: 60, userSelect: 'none', touchAction: 'none' }}
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        {/* Coloured segments */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden', display: 'flex' }}>
          {segs.map((seg) => (
            <div key={seg.type} style={{
              width: `${seg.pct}%`, height: '100%',
              background: MEAL_COLORS[seg.type] || '#7C3AED',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {seg.pct > 11 && (
                <>
                  <div style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,.85)', letterSpacing: '.3px', lineHeight: 1.2 }}>{seg.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{seg.calories}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,.7)', fontWeight: 700 }}>kcal</div>
                </>
              )}
            </div>
          ))}
        </div>
        {/* Draggable handles between segments */}
        {segs.slice(0, -1).map((seg, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: `${seg.left + seg.pct}%`,
            transform: 'translateX(-50%)', width: 20, height: '100%',
            zIndex: 10, cursor: 'ew-resize', touchAction: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onPointerDown={e => onPointerDown(e, i)}>
            <div style={{ width: 4, height: '65%', background: 'rgba(255,255,255,.9)', borderRadius: 2, boxShadow: '0 1px 6px rgba(0,0,0,.3)' }} />
          </div>
        ))}
      </div>
      {/* Percentage labels row */}
      <div style={{ display: 'flex', marginTop: 4 }}>
        {segs.map(seg => (
          <div key={seg.type} style={{ width: `${seg.pct}%`, textAlign: 'center', overflow: 'hidden' }}>
            {seg.pct > 8 && <span style={{ fontSize: 9, fontWeight: 700, color: MEAL_COLORS[seg.type] || '#7C3AED' }}>{Math.round(seg.pct)}%</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Components ──────────────────────────────────────────────────────────────

function MacroRing({ consumed, total, size = 130 }) {
  const r = 48
  const circ = 2 * Math.PI * r
  const pct = Math.min(consumed / total, 1)
  const offset = circ - pct * circ
  return (
    <svg width={size} height={size} viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(124,58,237,.15)" strokeWidth="11" />
      <circle cx="55" cy="55" r={r} fill="none" stroke="#7C3AED" strokeWidth="11"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 55 55)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="55" y="48" textAnchor="middle" fill="#2E1065" fontSize="18" fontWeight="800" fontFamily="'Plus Jakarta Sans',sans-serif">{consumed}</text>
      <text x="55" y="63" textAnchor="middle" fill="#A99BC4" fontSize="10" fontWeight="600" fontFamily="'Plus Jakarta Sans',sans-serif">/ {total} kcal</text>
    </svg>
  )
}

function MacroBar({ label, consumed, total, color }) {
  const pct = Math.min((consumed / total) * 100, 100)
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8478A0' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#2E1065' }}>{consumed}<span style={{ color: '#A99BC4' }}>/{total}g</span></span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: '#EDE4F8', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function RecipeDrawer({ meal, mealName, mealType, onClose, onSaveToCookbook }) {
  const color = MEAL_COLORS[mealType] || '#7C3AED'
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 55 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(46,16,101,.45)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '28px 28px 0 0', padding: '20px 22px 32px', boxShadow: '0 -16px 50px rgba(46,16,101,.22)', maxHeight: '88%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#EDE4F8', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '.5px' }}>{MEAL_LABELS[mealType] || 'MEAL'}</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, color: '#2E1065', lineHeight: 1.15 }}>{mealName}</div>
          </div>
          {meal.prepTimeMinutes && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 10, background: '#F3EEFF', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>{meal.prepTimeMinutes} min</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexShrink: 0 }}>
          {[
            { l: 'Protein', v: meal.macros.protein + 'g', c: '#7C3AED' },
            { l: 'Carbs', v: meal.macros.carbs + 'g', c: '#F59E0B' },
            { l: 'Fat', v: meal.macros.fat + 'g', c: '#DB2777' },
            { l: 'Calories', v: String(meal.macros.calories), c: '#2E1065' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ flex: 1, padding: '7px 6px', borderRadius: 12, background: c + '12', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: c }}>{v}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: c + 'AA' }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 8 }}>INGREDIENTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 18 }}>
            {meal.ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#2E1065', lineHeight: 1.4 }}>{ing}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 8 }}>METHOD</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {meal.instructions.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: 13, color: '#2E1065', lineHeight: 1.5, flex: 1 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0, paddingTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, borderRadius: 16, border: '1.5px solid #EDE4F8', background: '#FAF5FF', color: '#7C3AED', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Close</button>
          <button onClick={onSaveToCookbook} style={{ flex: 2, height: 50, borderRadius: 16, border: 'none', background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>
            Save to cookbook
          </button>
        </div>
      </div>
    </div>
  )
}

function MealCard({ meal, mealType, name, userCraving, isEditingName, onEditNameStart, onNameChange, onEdit, onRegenerate, onViewRecipe, expanded, onToggle }) {
  const color = MEAL_COLORS[mealType] || '#7C3AED'
  const nameInputRef = useRef()

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus()
  }, [isEditingName])

  return (
    <div style={{ borderRadius: 20, background: '#fff', border: '1.5px solid #EDE4F8', boxShadow: '0 4px 16px rgba(76,36,120,.06)', overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '.5px' }}>{MEAL_LABELS[mealType] || mealType.toUpperCase()}</span>
            {userCraving && <span style={{ fontSize: 10, color: '#A99BC4', fontWeight: 600 }}>for: &ldquo;{userCraving}&rdquo;</span>}
          </div>

          {isEditingName ? (
            <input
              ref={nameInputRef}
              defaultValue={name}
              onBlur={e => onNameChange(e.target.value || name)}
              onKeyDown={e => { if (e.key === 'Enter') onNameChange(e.target.value || name) }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', fontSize: 15, fontWeight: 700, color: '#2E1065', border: 'none', borderBottom: '2px solid #7C3AED', outline: 'none', background: 'transparent', padding: '2px 0', fontFamily: 'inherit', marginTop: 2 }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#2E1065', lineHeight: 1.2 }}>{name}</span>
              <button onClick={e => { e.stopPropagation(); onEditNameStart() }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', opacity: 0.45 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {[
              { l: meal.macros.protein + 'g P', c: '#7C3AED' },
              { l: meal.macros.carbs + 'g C', c: '#F59E0B' },
              { l: meal.macros.fat + 'g F', c: '#DB2777' },
              { l: meal.macros.calories + ' kcal', c: '#6D5B8E' },
            ].map(({ l, c }) => (
              <span key={l} style={{ fontSize: 11, fontWeight: 700, color: c, background: c + '15', padding: '2px 8px', borderRadius: 999 }}>{l}</span>
            ))}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4B0E0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginTop: 8 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #F3EEFF' }}>
          {meal.prepTimeMinutes && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, marginBottom: 12 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A99BC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <span style={{ fontSize: 12, color: '#A99BC4', fontWeight: 600 }}>Prep time: {meal.prepTimeMinutes} min</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onViewRecipe} style={{ flex: 1.2, height: 38, borderRadius: 12, border: 'none', background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
              View Recipe
            </button>
            <button onClick={onEdit} style={{ flex: 1, height: 38, borderRadius: 12, border: '1.5px solid #EDE4F8', background: '#FAF5FF', color: '#7C3AED', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Adjust
            </button>
            <button onClick={onRegenerate} style={{ flex: 1, height: 38, borderRadius: 12, border: '1.5px solid #EDE4F8', background: '#FAF5FF', color: '#7C3AED', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              Redo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EditDrawer({ meal, mealType, onClose, onRegenerate }) {
  const [protein, setProtein] = useState(meal?.macros?.protein ?? 30)
  const [fat, setFat] = useState(meal?.macros?.fat ?? 14)
  const [calories, setCalories] = useState(meal?.macros?.calories ?? 500)
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(46,16,101,.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '28px 28px 0 0', padding: '24px 22px 32px', boxShadow: '0 -12px 40px rgba(46,16,101,.18)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#EDE4F8', margin: '0 auto 20px' }} />
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#2E1065', marginBottom: 4 }}>Adjust this meal</div>
        <div style={{ fontSize: 13, color: '#8478A0', marginBottom: 20 }}>Nudge a macro and we'll re-balance the recipe.</div>

        {[
          { label: 'Protein', val: protein, set: setProtein, unit: 'g' },
          { label: 'Fat', val: fat, set: setFat, unit: 'g' },
          { label: 'Calories', val: calories, set: setCalories, unit: '' },
        ].map(({ label, val, set, unit }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#2E1065' }}>{label}</span>
            <button onClick={() => set(v => Math.max(0, v - (label === 'Calories' ? 50 : 5)))}
              style={{ padding: '4px 12px', borderRadius: 8, background: '#FAF5FF', border: '1.5px solid #7C3AED', color: '#7C3AED', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginRight: 8 }}>Less</button>
            <button onClick={() => set(v => v + (label === 'Calories' ? 50 : 5))}
              style={{ padding: '4px 12px', borderRadius: 8, background: '#7C3AED', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginRight: 12 }}>More</button>
            <span style={{ width: 52, fontSize: 16, fontWeight: 800, color: '#2E1065', textAlign: 'right' }}>{val}{unit}</span>
          </div>
        ))}

        <div style={{ fontSize: 11, color: '#A99BC4', marginBottom: 20, padding: '10px 14px', background: '#FAF5FF', borderRadius: 12 }}>
          Re-generation always respects your diet & allergies.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, borderRadius: 16, border: '1.5px solid #EDE4F8', background: '#FAF5FF', color: '#7C3AED', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Cancel</button>
          <button onClick={async () => {
            setLoading(true)
            await onRegenerate(mealType, { protein, fat, calories })
            setLoading(false)
            onClose()
          }}
            style={{ flex: 2, height: 50, borderRadius: 16, border: 'none', background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? 'Regenerating…' : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                Regenerate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Meals({ userProfile = {}, loggedMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 }, onUpdateLoggedMacros, onNavigate }) {
  const {
    physique = 'lean_toned', dietary = [], allergies = [], name = 'Maya',
    dailyCalorieTarget = null, fitnessGoal = 'tone_recomp',
  } = userProfile

  const targets = (() => {
    if (dailyCalorieTarget && dailyCalorieTarget > 0) {
      const kcal = dailyCalorieTarget
      const highProtein = ['lose_weight', 'tone_recomp'].includes(fitnessGoal)
      const building = ['build_muscle', 'athletic_performance'].includes(fitnessGoal)
      const [pp, cp, fp] = highProtein ? [0.35, 0.35, 0.30] : building ? [0.30, 0.45, 0.25] : [0.30, 0.40, 0.30]
      return {
        calories: kcal,
        protein: Math.round((kcal * pp) / 4),
        carbs: Math.round((kcal * cp) / 4),
        fat: Math.round((kcal * fp) / 9),
      }
    }
    return DAILY_TARGETS[physique] || DAILY_TARGETS.lean_toned
  })()

  // ── Core state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState('home')
  const [craving, setCraving] = useState('')
  const [mealCount, setMealCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [generatedMeals, setGeneratedMeals] = useState(null)
  const [expandedMeal, setExpandedMeal] = useState(null)
  const [editingMeal, setEditingMeal] = useState(null)
  const [cookbook, setCookbook] = useState([
    { name: 'Berry protein bowl', protein: 32, calories: 410, type: 'breakfast' },
    { name: 'Tofu stir-fry', protein: 28, calories: 520, type: 'lunch' },
    { name: 'Green power salad', protein: 19, calories: 330, type: 'lunch' },
    { name: 'Lentil veg curry', protein: 34, calories: 590, type: 'dinner' },
  ])
  const [cookbookSearch, setCookbookSearch] = useState('')
  const inputRef = useRef()

  // ── Craving preview state ───────────────────────────────────────────────────
  const [cravingPreview, setCravingPreview] = useState(null)
  const [cravingPreviewLoading, setCravingPreviewLoading] = useState(false)
  const [selectedModifiers, setSelectedModifiers] = useState(new Set())

  // ── Full-day builder state ──────────────────────────────────────────────────
  const [builderMode, setBuilderMode] = useState('single')
  const [mealSlots, setMealSlots] = useState([])
  const [snackCount, setSnackCount] = useState(1)

  // ── Generated meal extras ───────────────────────────────────────────────────
  const [mealNames, setMealNames] = useState({})
  const [editingName, setEditingName] = useState(null)
  const [viewingRecipe, setViewingRecipe] = useState(null)
  const [mealCravings, setMealCravings] = useState({})
  const [generatedTypes, setGeneratedTypes] = useState([])
  const [generatedFrom, setGeneratedFrom] = useState('builder')

  // ── Craving preview debounce ────────────────────────────────────────────────
  useEffect(() => {
    if (!craving.trim()) { setCravingPreview(null); setCravingPreviewLoading(false); return }
    setCravingPreviewLoading(true)
    const t = setTimeout(async () => {
      const result = await lookupFood(craving)
      setCravingPreview(result)
      setCravingPreviewLoading(false)
    }, 700)
    return () => clearTimeout(t)
  }, [craving])

  // ── Derived values ──────────────────────────────────────────────────────────
  const remaining = Math.max(0, targets.calories - loggedMacros.calories)
  const remainingProtein = Math.max(0, targets.protein - loggedMacros.protein)
  const remainingCarbs = Math.max(0, targets.carbs - loggedMacros.carbs)
  const remainingFat = Math.max(0, targets.fat - loggedMacros.fat)

  const mealTypes = mealCount === 1 ? ['lunch'] : mealCount === 2 ? ['lunch', 'dinner'] : ['breakfast', 'lunch', 'dinner']
  const currentMealTypes = builderMode === 'fullday' ? mealSlots.map(s => s.type) : mealTypes

  const splitCalories = (n) => {
    const base = Math.floor(remaining / n)
    return Array.from({ length: n }, (_, i) => i === n - 1 ? remaining - base * (n - 1) : base)
  }

  const toggleModifier = (id) => {
    setSelectedModifiers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ── Generate handler ─────────────────────────────────────────────────────────
  // quickCount: override mealCount (direct-from-craving flow)
  // quickCraving: override craving state (for tag buttons where state hasn't settled yet)
  const handleGenerate = async (quickCount = null, quickCraving = null) => {
    const effectiveCraving = quickCraving !== null ? quickCraving : craving
    // Update displayed craving state so cards show the right text
    if (quickCraving !== null) setCraving(quickCraving)

    setGenerating(true)
    setView('generated')
    const results = {}
    const mealCravingsMap = {}
    const namesMap = {}

    const errorFallback = (type, calTarget, pTarget, cTarget, fTarget) => ({
      name: '⚠️ Generation failed',
      ingredients: ['Tap "Redo" below to try again.'],
      macros: { calories: calTarget, protein: pTarget, carbs: cTarget, fat: fTarget },
      prepTimeMinutes: 0,
      instructions: ['The AI could not build this recipe. Tap Redo to retry.'],
    })

    let orderedTypes = []

    if (builderMode === 'fullday') {
      orderedTypes = mealSlots.map(s => s.type)
      const mainSlots = mealSlots.filter(s => !s.type.startsWith('snack'))

      await Promise.all(mealSlots.map(async (slot) => {
        const isSnack = slot.type.startsWith('snack')
        // Use the per-slot calorie value the user set (or auto-calculated default)
        const calTarget = slot.calories
        const ratio = calTarget / Math.max(remaining, 1)
        const pTarget = isSnack ? 10 : Math.round(remainingProtein * ratio)
        const cTarget = isSnack ? 15 : Math.round(remainingCarbs * ratio)
        const fTarget = isSnack ? 5 : Math.round(remainingFat * ratio)

        const meal = await suggestMeal({
          mealType: isSnack ? 'snack' : slot.type,
          targetCalories: calTarget, targetProtein: pTarget, targetCarbs: cTarget, targetFat: fTarget,
          dietary, allergies, physique,
          craving: slot.craving || '',
          modifiers: [...selectedModifiers],
        })

        results[slot.type] = meal || errorFallback(slot.type, calTarget, pTarget, cTarget, fTarget)
        mealCravingsMap[slot.type] = slot.craving
        namesMap[slot.type] = meal ? meal.name : slot.label
      }))
    } else {
      const effectiveCount = quickCount ?? mealCount
      const isSingleCraving = quickCount === 1 && !!effectiveCraving
      // Always use the same type list as mealTypes so currentMealTypes matches
      const effectiveTypes = effectiveCount === 1 ? ['lunch']
        : effectiveCount === 2 ? ['lunch', 'dinner']
        : ['breakfast', 'lunch', 'dinner']
      orderedTypes = effectiveTypes

      const base = Math.floor(remaining / effectiveCount)
      const splits = Array.from({ length: effectiveCount }, (_, i) =>
        i === effectiveCount - 1 ? remaining - base * (effectiveCount - 1) : base)

      await Promise.all(effectiveTypes.map(async (type, i) => {
        // For single-craving mode: use lookup preview if available, else a sensible 1-meal portion
        // (never send the full-day remaining as a target — that would cause padding)
        const singleMealCal = Math.min(remaining, Math.round(targets.calories / 3))
        const calTarget = isSingleCraving
          ? (cravingPreview ? cravingPreview.calories : singleMealCal)
          : splits[i]
        const pTarget = isSingleCraving
          ? (cravingPreview ? cravingPreview.protein : Math.round(targets.protein / 3))
          : Math.round(remainingProtein / effectiveCount)
        const cTarget = isSingleCraving
          ? (cravingPreview ? cravingPreview.carbs : Math.round(targets.carbs / 3))
          : Math.round(remainingCarbs / effectiveCount)
        const fTarget = isSingleCraving
          ? (cravingPreview ? cravingPreview.fat : Math.round(targets.fat / 3))
          : Math.round(remainingFat / effectiveCount)

        const meal = await suggestMeal({
          mealType: type, targetCalories: calTarget, targetProtein: pTarget,
          targetCarbs: cTarget, targetFat: fTarget,
          dietary, allergies, physique, craving: effectiveCraving,
          cravingOnly: isSingleCraving,
          modifiers: [...selectedModifiers],
        })

        results[type] = meal || errorFallback(type, calTarget, pTarget, cTarget, fTarget)
        mealCravingsMap[type] = effectiveCraving
        namesMap[type] = meal ? meal.name : type
      }))

      if (quickCount !== null) setMealCount(quickCount)
    }

    setGeneratedMeals(results)
    setMealCravings(mealCravingsMap)
    setMealNames(namesMap)
    setGeneratedTypes(orderedTypes)
    setGeneratedFrom(quickCount !== null ? 'home' : 'builder')
    setGenerating(false)
    setExpandedMeal(orderedTypes[0] ?? null)
  }

  const handleRegenerateMeal = async (type, adjustments) => {
    const n = Math.max(currentMealTypes.length, 1)
    const calTarget = adjustments?.calories ?? Math.round(remaining / n)
    const pTarget = adjustments?.protein ?? Math.round(remainingProtein / n)
    const fTarget = adjustments?.fat ?? Math.round(remainingFat / n)
    const cTarget = Math.round(remainingCarbs / n)

    const meal = await suggestMeal({
      mealType: type.startsWith('snack') ? 'snack' : type,
      targetCalories: calTarget, targetProtein: pTarget, targetCarbs: cTarget, targetFat: fTarget,
      dietary, allergies, physique,
      craving: mealCravings[type] || craving,
      modifiers: [...selectedModifiers],
    })

    if (meal) {
      setGeneratedMeals(prev => ({ ...prev, [type]: meal }))
      setMealNames(prev => ({ ...prev, [type]: meal.name }))
    }
  }

  const handleLogMeals = () => {
    if (!generatedMeals) return
    const totals = Object.values(generatedMeals).reduce((acc, m) => ({
      calories: acc.calories + (m.macros?.calories ?? 0),
      protein: acc.protein + (m.macros?.protein ?? 0),
      carbs: acc.carbs + (m.macros?.carbs ?? 0),
      fat: acc.fat + (m.macros?.fat ?? 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

    const newFaves = Object.entries(generatedMeals).map(([type, m]) => ({
      name: mealNames[type] || m.name, protein: m.macros?.protein ?? 0,
      calories: m.macros?.calories ?? 0, type,
    }))
    setCookbook(prev => [...newFaves, ...prev].slice(0, 12))
    if (onUpdateLoggedMacros) {
      onUpdateLoggedMacros(prev => ({
        calories: prev.calories + totals.calories, protein: prev.protein + totals.protein,
        carbs: prev.carbs + totals.carbs, fat: prev.fat + totals.fat,
      }))
    }
    setView('home')
    setGeneratedMeals(null)
    setCraving('')
    setBuilderMode('single')
    setSelectedModifiers(new Set())
  }

  // ═══ HOME VIEW ════════════════════════════════════════════════════════════════
  if (view === 'home') {
    const prevPct = cravingPreview && remaining > 0 ? cravingPreview.calories / remaining : 0
    const prevColor = prevPct > 0.7 ? '#EF4444' : prevPct > 0.4 ? '#F59E0B' : '#10B981'

    return (
      <>
        <StatusBar />
        <div style={{ padding: '4px 22px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#A99BC4' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#2E1065', lineHeight: 1.1 }}>Meals</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 0' }}>
          {/* Macro summary */}
          <div style={{ borderRadius: 24, padding: '18px 20px', background: '#fff', border: '1.5px solid #EDE4F8', boxShadow: '0 8px 24px rgba(76,36,120,.08)', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <MacroRing consumed={loggedMacros.calories} total={targets.calories} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <MacroBar label="Protein" consumed={loggedMacros.protein} total={targets.protein} color="#7C3AED" />
                <MacroBar label="Carbs" consumed={loggedMacros.carbs} total={targets.carbs} color="#F59E0B" />
                <MacroBar label="Fat" consumed={loggedMacros.fat} total={targets.fat} color="#DB2777" />
              </div>
            </div>
          </div>

          {/* Craving input card */}
          <div style={{ borderRadius: 20, background: '#fff', border: '1.5px solid #EDE4F8', boxShadow: '0 4px 16px rgba(76,36,120,.06)', padding: '16px', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2E1065', marginBottom: 12 }}>What are you craving?</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                ref={inputRef}
                value={craving}
                onChange={e => { setCraving(e.target.value); if (!e.target.value.trim()) setCravingPreview(null) }}
                onKeyDown={e => e.key === 'Enter' && craving.trim() && handleGenerate(1)}
                placeholder="Type a food or meal…"
                style={{ flex: 1, height: 42, borderRadius: 12, border: '1.5px solid #EDE4F8', padding: '0 14px', fontSize: 14, color: '#2E1065', fontFamily: 'inherit', outline: 'none' }}
              />
              <button
                onClick={() => craving.trim() && handleGenerate(1)}
                style={{ width: 42, height: 42, borderRadius: 12, background: craving.trim() ? '#7C3AED' : '#EDE4F8', border: 'none', cursor: craving.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={craving.trim() ? '#fff' : '#A99BC4'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>

            {/* Calorie preview */}
            {(cravingPreviewLoading || cravingPreview) && (
              <div style={{ borderRadius: 14, background: cravingPreview ? prevColor + '0E' : '#F3EEFF', border: `1.5px solid ${cravingPreview ? prevColor + '35' : '#EDE4F8'}`, padding: '10px 12px', marginBottom: 10 }}>
                {cravingPreviewLoading && !cravingPreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #EDE4F8', borderTopColor: '#7C3AED', animation: 'mealSpin 0.7s linear infinite', flexShrink: 0 }} />
                    <style>{`@keyframes mealSpin { to { transform: rotate(360deg) } }`}</style>
                    <span style={{ fontSize: 13, color: '#A99BC4', fontWeight: 600 }}>Estimating calories…</span>
                  </div>
                ) : cravingPreview ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2E1065' }}>{cravingPreview.name}</div>
                        <div style={{ fontSize: 11, color: '#8478A0' }}>{cravingPreview.servingSize}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: prevColor, lineHeight: 1 }}>{cravingPreview.calories}</div>
                        <div style={{ fontSize: 9, color: '#A99BC4', fontWeight: 700 }}>KCAL</div>
                      </div>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: '#EDE4F8', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ width: `${Math.min(prevPct * 100, 100)}%`, height: '100%', background: prevColor, borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#8478A0' }}>P {cravingPreview.protein}g · C {cravingPreview.carbs}g · F {cravingPreview.fat}g</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: prevColor }}>
                        {remaining > 0 ? `${Math.round(prevPct * 100)}% of ${remaining} kcal left` : 'Budget full'}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* Modifier chips */}
            {cravingPreview && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#A99BC4', letterSpacing: '.4px', marginBottom: 7 }}>TWEAK THIS MEAL:</div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {MODIFIER_CHIPS.map(chip => {
                    const sel = selectedModifiers.has(chip.id)
                    return (
                      <button key={chip.id} onClick={() => toggleModifier(chip.id)}
                        style={{ padding: '6px 11px', borderRadius: 999, border: `1.5px solid ${sel ? '#7C3AED' : '#EDE4F8'}`, background: sel ? '#FAF5FF' : '#fff', fontSize: 12, fontWeight: sel ? 700 : 600, color: sel ? '#7C3AED' : '#5B3D8A', cursor: 'pointer' }}>
                        {chip.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick tags */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CRAVING_TAGS.map(tag => (
                <button key={tag} onClick={() => handleGenerate(1, tag)}
                  style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${craving === tag ? '#7C3AED' : '#EDE4F8'}`, background: craving === tag ? '#FAF5FF' : '#fff', fontSize: 13, fontWeight: 600, color: craving === tag ? '#7C3AED' : '#5B3D8A', cursor: 'pointer' }}>
                  {tag}
                </button>
              ))}
            </div>

            {remaining > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>
                We&rsquo;ll fit meals to your <strong>{remaining} kcal</strong> left today.
              </div>
            )}
          </div>

          {/* Build full day card */}
          <button onClick={() => {
            const slots = buildMealSlots(mealCount, snackCount, [], remaining)
            setMealSlots(slots)
            setBuilderMode('fullday')
            setView('builder')
          }} style={{ width: '100%', borderRadius: 20, background: '#2E1065', border: 'none', padding: '16px 18px', cursor: 'pointer', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4B0E0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Build my full day</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>Plan all your meals + snacks for today</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>

          {/* Cookbook favourites */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#2E1065' }}>Cookbook favourites</span>
              <button onClick={() => setView('cookbook')} style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer' }}>See all</button>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {cookbook.slice(0, 4).map((item, i) => (
                <div key={i} onClick={() => { handleGenerate(1, item.name) }}
                  style={{ flexShrink: 0, width: 120, borderRadius: 16, background: '#fff', border: '1.5px solid #EDE4F8', padding: '12px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: (MEAL_COLORS[item.type] || '#7C3AED') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: MEAL_COLORS[item.type] || '#7C3AED' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#2E1065', lineHeight: 1.3, marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#8478A0' }}>{item.protein}g P · {item.calories} kcal</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <BottomNav active="meals" onNavigate={onNavigate} />
      </>
    )
  }

  // ═══ BUILDER VIEW ═════════════════════════════════════════════════════════════
  if (view === 'builder') {
    const isFullDay = builderMode === 'fullday'

    const updateSlotCounts = (newMeals, newSnacks) => {
      const nm = newMeals !== undefined ? newMeals : mealCount
      const ns = newSnacks !== undefined ? newSnacks : snackCount
      if (newMeals !== undefined) setMealCount(newMeals)
      if (newSnacks !== undefined) setSnackCount(newSnacks)
      setMealSlots(buildMealSlots(nm, ns, mealSlots, remaining))
    }

    return (
      <>
        <StatusBar />
        <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => { setView('home'); setBuilderMode('single') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED' }}>{isFullDay ? 'Full day plan' : 'Build meals'}</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 0' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#2E1065', marginBottom: 14 }}>
            {isFullDay ? 'Plan your full day' : 'How many meals today?'}
          </div>

          {!isFullDay && craving && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: '#EDE4F8', marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#5B3D8A' }}>Craving: {craving}</span>
              <button onClick={() => setCraving('')} style={{ background: 'none', border: 'none', fontSize: 11, color: '#7C3AED', cursor: 'pointer', fontWeight: 700 }}>edit</button>
            </div>
          )}

          {/* Meals count */}
          <div style={{ marginBottom: isFullDay ? 10 : 20 }}>
            {isFullDay && <div style={{ fontSize: 11, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 8 }}>NUMBER OF MEALS</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => isFullDay ? updateSlotCounts(n, undefined) : setMealCount(n)}
                  style={{ height: isFullDay ? 58 : 88, borderRadius: 18, background: mealCount === n ? '#FAF5FF' : '#fff', border: `2px solid ${mealCount === n ? '#7C3AED' : '#EDE4F8'}`, boxShadow: mealCount === n ? '0 8px 20px rgba(124,58,237,.16)' : '0 4px 10px rgba(76,36,120,.05)', position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {mealCount === n && <div style={{ position: 'absolute', top: 5, right: 7, fontSize: 8, fontWeight: 800, color: '#fff', background: '#7C3AED', padding: '2px 5px', borderRadius: 999 }}>✓</div>}
                  <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: isFullDay ? 24 : 32, color: mealCount === n ? '#7C3AED' : '#2E1065', lineHeight: 1 }}>{n}</span>
                  {!isFullDay && <span style={{ fontSize: 10, color: mealCount === n ? '#7C3AED' : '#8478A0', marginTop: 3, fontWeight: 600 }}>{n === 1 ? 'single' : 'meals'}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Snacks count (full-day only) */}
          {isFullDay && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 8 }}>NUMBER OF SNACKS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[0, 1, 2, 3].map(n => (
                  <button key={n} onClick={() => updateSlotCounts(undefined, n)}
                    style={{ height: 58, borderRadius: 18, background: snackCount === n ? '#FAF5FF' : '#fff', border: `2px solid ${snackCount === n ? '#7C3AED' : '#EDE4F8'}`, boxShadow: snackCount === n ? '0 8px 20px rgba(124,58,237,.16)' : '0 4px 10px rgba(76,36,120,.05)', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {snackCount === n && <div style={{ position: 'absolute', top: 5, right: 7, fontSize: 8, fontWeight: 800, color: '#fff', background: '#7C3AED', padding: '2px 5px', borderRadius: 999 }}>✓</div>}
                    <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: snackCount === n ? '#7C3AED' : '#2E1065' }}>{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full-day: single draggable segment bar + per-slot craving inputs */}
          {isFullDay && mealSlots.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 10 }}>CALORIE SPLIT — drag the dividers to adjust</div>

              <CalorieSplitBar
                slots={mealSlots}
                remaining={remaining}
                onSlotsChange={setMealSlots}
              />

              {/* Budget status */}
              {(() => {
                const totalSlotCals = mealSlots.reduce((s, sl) => s + (sl.calories || 0), 0)
                const diff = totalSlotCals - remaining
                const ok = Math.abs(diff) < 50
                return (
                  <div style={{ padding: '7px 12px', borderRadius: 11, background: ok ? '#F0FDF4' : '#FEF9C3', border: `1.5px solid ${ok ? '#86EFAC' : '#FDE047'}`, marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ok ? '#15803D' : '#854D0E' }}>
                      {ok
                        ? `${totalSlotCals} kcal total ✓`
                        : diff > 0
                          ? `${totalSlotCals} kcal · ${diff} over ${remaining} kcal budget`
                          : `${totalSlotCals} kcal · ${-diff} under ${remaining} kcal budget`}
                    </span>
                  </div>
                )
              })()}

              {/* Per-slot craving inputs */}
              <div style={{ fontSize: 11, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 8 }}>WHAT ARE YOU CRAVING FOR EACH?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mealSlots.map((slot, idx) => {
                  const c = MEAL_COLORS[slot.type] || '#7C3AED'
                  return (
                    <div key={slot.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: c, letterSpacing: '.4px', marginBottom: 3 }}>{slot.label} · {slot.calories} kcal</div>
                        <input
                          value={slot.craving}
                          onChange={e => setMealSlots(prev => prev.map((s, i) => i === idx ? { ...s, craving: e.target.value } : s))}
                          placeholder={`Craving for ${slot.label.toLowerCase()}… (optional)`}
                          style={{ width: '100%', height: 36, borderRadius: 9, border: '1.5px solid #EDE4F8', padding: '0 11px', fontSize: 12, color: '#2E1065', fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Daily target card */}
          {!isFullDay && (
            <div style={{ borderRadius: 18, background: '#fff', border: '1.5px solid #EDE4F8', padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 4 }}>DAILY TARGET</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: '#2E1065', marginBottom: 8 }}>{remaining.toLocaleString()} kcal remaining</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['P', targets.protein + 'g', '#7C3AED'], ['C', targets.carbs + 'g', '#F59E0B'], ['F', targets.fat + 'g', '#DB2777']].map(([l, v, c]) => (
                  <div key={l} style={{ flex: 1, padding: '5px 8px', borderRadius: 10, background: c + '12', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: c }}>{l} {v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-split preview (single mode) */}
          {!isFullDay && (
            <div style={{ borderRadius: 18, background: '#fff', border: '1.5px solid #EDE4F8', padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 10 }}>AUTO-SPLIT PREVIEW</div>
              <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
                {mealTypes.map((t, i) => (
                  <div key={t} style={{ flex: 1, background: MEAL_COLORS[t] || '#7C3AED', marginRight: i < mealTypes.length - 1 ? 2 : 0 }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {mealTypes.map((type, i) => (
                  <div key={type} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2E1065' }}>{type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    <div style={{ fontSize: 11, color: '#8478A0' }}>{splitCalories(mealCount)[i]} kcal</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedModifiers.size > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 14, background: '#EDE4F8', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#5B3D8A' }}>
                {[...selectedModifiers].map(id => MODIFIER_CHIPS.find(c => c.id === id)?.label).join(' · ')}
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: '10px 22px 20px', flexShrink: 0 }}>
          <button onClick={handleGenerate}
            style={{ width: '100%', height: 54, borderRadius: 18, background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 12px 28px rgba(124,58,237,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z" /></svg>
            {isFullDay ? `Generate full day (${mealSlots.length} meals)` : 'Generate meals'}
          </button>
        </div>
      </>
    )
  }

  // ═══ GENERATED VIEW ═══════════════════════════════════════════════════════════
  if (view === 'generated') {
    const totalGenerated = generatedMeals
      ? Object.values(generatedMeals).reduce((s, m) => s + (m?.macros?.calories ?? 0), 0)
      : 0

    return (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <StatusBar />
        <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button onClick={() => setView(generatedFrom)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED' }}>{generatedFrom === 'home' ? 'Your meals' : 'Back'}</span>
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED' }}>{totalGenerated} kcal</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 0' }}>
          {generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #EDE4F8', borderTopColor: '#7C3AED', animation: 'mealSpin 0.8s linear infinite' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#6D5B8E', textAlign: 'center' }}>Building your personalised meals…</div>
              <div style={{ fontSize: 12, color: '#A99BC4', textAlign: 'center' }}>Fitting your targets, cravings & dietary needs</div>
              <style>{`@keyframes mealSpin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
              {generatedTypes.map(type => generatedMeals?.[type] && (
                <MealCard
                  key={type}
                  meal={generatedMeals[type]}
                  mealType={type}
                  name={mealNames[type] || generatedMeals[type].name}
                  userCraving={mealCravings[type]}
                  isEditingName={editingName === type}
                  onEditNameStart={() => setEditingName(type)}
                  onNameChange={(newName) => { setMealNames(prev => ({ ...prev, [type]: newName })); setEditingName(null) }}
                  expanded={expandedMeal === type}
                  onToggle={() => setExpandedMeal(expandedMeal === type ? null : type)}
                  onEdit={() => setEditingMeal(type)}
                  onViewRecipe={() => setViewingRecipe(type)}
                  onRegenerate={() => handleRegenerateMeal(type)}
                />
              ))}
            </div>
          )}
        </div>

        {!generating && (
          <div style={{ padding: '10px 22px 20px', flexShrink: 0 }}>
            <button onClick={handleLogMeals}
              style={{ width: '100%', height: 54, borderRadius: 18, background: '#2E1065', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 12px 28px rgba(46,16,101,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
              Log these meals
            </button>
          </div>
        )}

        {editingMeal && generatedMeals?.[editingMeal] && (
          <EditDrawer
            meal={generatedMeals[editingMeal]}
            mealType={editingMeal}
            onClose={() => setEditingMeal(null)}
            onRegenerate={handleRegenerateMeal}
          />
        )}

        {viewingRecipe && generatedMeals?.[viewingRecipe] && (
          <RecipeDrawer
            meal={generatedMeals[viewingRecipe]}
            mealName={mealNames[viewingRecipe] || generatedMeals[viewingRecipe].name}
            mealType={viewingRecipe}
            onClose={() => setViewingRecipe(null)}
            onSaveToCookbook={() => {
              const m = generatedMeals[viewingRecipe]
              const n = mealNames[viewingRecipe] || m.name
              setCookbook(prev => [{ name: n, protein: m.macros.protein, calories: m.macros.calories, type: viewingRecipe }, ...prev].slice(0, 12))
              setViewingRecipe(null)
            }}
          />
        )}
      </div>
    )
  }

  // ═══ COOKBOOK VIEW ════════════════════════════════════════════════════════════
  return (
    <>
      <StatusBar />
      <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: '#2E1065' }}>Cookbook</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 0' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A99BC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={cookbookSearch}
            onChange={e => setCookbookSearch(e.target.value)}
            placeholder="Search saved meals"
            style={{ width: '100%', height: 42, borderRadius: 12, border: '1.5px solid #EDE4F8', paddingLeft: 38, paddingRight: 14, fontSize: 14, color: '#2E1065', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingBottom: 16 }}>
          {cookbook.filter(m => m.name.toLowerCase().includes(cookbookSearch.toLowerCase())).map((item, i) => (
            <div key={i} onClick={() => { handleGenerate(1, item.name) }}
              style={{ borderRadius: 18, background: '#fff', border: '1.5px solid #EDE4F8', padding: '14px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', cursor: 'pointer' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: MEAL_COLORS[item.type] || '#7C3AED', letterSpacing: '.5px', marginBottom: 6, textTransform: 'uppercase' }}>{item.type}</div>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: (MEAL_COLORS[item.type] || '#7C3AED') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: MEAL_COLORS[item.type] || '#7C3AED' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2E1065', lineHeight: 1.3, marginBottom: 4 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: '#8478A0' }}>{item.protein}g P · {item.calories} kcal</div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="meals" onNavigate={onNavigate} />
    </>
  )
}
