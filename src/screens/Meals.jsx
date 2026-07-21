import React, { useState, useRef, useEffect } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { suggestMeal, adjustMeal, identifyEatenFood, lookupFood } from '../utils/claudeApi'
import { getDailyTargets, MACRO_META, MACRO_DAILY_REF, MACRO_KEYS } from '../utils/nutrition'
import { AI_DAILY_LIMITS, getAiUsesRemaining, recordAiUsage } from '../utils/gamification'
import { diffMeal } from '../utils/mealDiff'
import { dateKeyFor } from '../utils/workoutBuilder'
import { COUNTRIES } from '../data/countries'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'
import { LockIcon, CookbookIcon, BurritoMealIcon } from '../components/Icons'
import { MealTypeIcon, MEAL_COLORS } from '../components/MealTypeIcon'

const CRAVING_TAGS = ['Pasta', 'Light & fresh', 'Sweet', 'Spicy', 'High-protein', 'Comfort food']
// Quick-log shortcuts for the "already ate" mode — common foods people log fast.
const EATEN_TAGS = ['Coffee', 'Banana', 'Eggs', 'Protein shake', 'Chicken & rice', 'Sandwich']

// A distinct color per tile (not just selected/unselected) makes the
// meal/snack count pickers easier to scan at a glance.
const COUNT_TILE_COLORS = [NB.red, NB.magenta, NB.teal, NB.yellow]

const MEAL_LABELS = {
  breakfast: 'BREAKFAST', lunch: 'LUNCH', dinner: 'DINNER', snack: 'SNACK',
  snack_1: 'SNACK 1', snack_2: 'SNACK 2', snack_3: 'SNACK 3', second_lunch: 'BRUNCH',
  suggested: 'SUGGESTED',
}
// Meal-type options shown when saving to the cookbook — the chosen one becomes
// the item's type (which drives cookbook grouping), so the user classifies the
// meal instead of it defaulting to "lunch".
const SAVE_TYPES = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snack']]
// Collections only get a search box once the list is long enough to need one —
// keeps the common case (a handful of collections) simple while still scaling.
const COLLECTION_SEARCH_THRESHOLD = 6

// ─── Macro tracking ───────────────────────────────────────────────────────────
// Canonical macro list/labels/targets live in utils/nutrition.js (MACRO_META,
// MACRO_DAILY_REF, MACRO_KEYS) — shared with Analytics.
const EXTRA_MACRO_FIELDS = MACRO_META.slice(4).map(m => ({ key: m.key, label: m.label.toUpperCase(), unit: m.unit }))
const addMacros = (a, b) => {
  const out = { ...a }
  MACRO_KEYS.forEach(k => { out[k] = (a?.[k] || 0) + (b?.[k] || 0) })
  return out
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const slotLabel = t => MEAL_LABELS[t] || t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`

// Stable key/identity for a cookbook item — legacy items saved before ids exist
// fall back to a savedAt+name+index composite.
const cookbookKey = (item, i) => item.id || `${item.savedAt || ''}-${item.name || ''}-${i}`

// Default cookbook structure: saved meals grouped by meal type. 'other' is the
// catch-all (snacks, eaten items, legacy 'cookbook' type…), so it must be last.
const COOKBOOK_SECTIONS = [
  { id: 'breakfast', label: 'Breakfast', match: t => t === 'breakfast' },
  { id: 'lunch', label: 'Lunch', match: t => t === 'lunch' || t === 'second_lunch' },
  { id: 'dinner', label: 'Dinner', match: t => t === 'dinner' },
  { id: 'other', label: 'Snacks & other', match: () => true },
]
const sectionForType = type => (COOKBOOK_SECTIONS.find(s => s.match(type || '')) || COOKBOOK_SECTIONS[3]).id

// MealTypeIcon + MEAL_COLORS now live in ../components/MealTypeIcon (shared with
// the Macros page's recently-logged list).

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
        <div style={{ position: 'absolute', inset: 0, ...nbCardStyle(NB.lavenderMist, 3, NB_CARD_NEUTRAL_SHADOW), borderRadius: 14, overflow: 'hidden', display: 'flex' }}>
          {segs.map((seg) => (
            <div key={seg.type} style={{
              width: `${seg.pct}%`, height: '100%',
              background: MEAL_COLORS[seg.type] || NB.teal,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {seg.pct > 11 && (
                <>
                  <div style={{ fontFamily: NB.fontMono, fontSize: 8, fontWeight: 800, color: NB.ink, letterSpacing: 0.3, lineHeight: 1.2 }}>{seg.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: NB.ink, lineHeight: 1.2 }}>{seg.calories}</div>
                  <div style={{ fontFamily: NB.fontMono, fontSize: 8, color: NB.ink, fontWeight: 700 }}>kcal</div>
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
            <div style={{ width: 4, height: '65%', background: NB.ink }} />
          </div>
        ))}
      </div>
      {/* Percentage labels row */}
      <div style={{ display: 'flex', marginTop: 4 }}>
        {segs.map(seg => (
          <div key={seg.type} style={{ width: `${seg.pct}%`, textAlign: 'center', overflow: 'hidden' }}>
            {seg.pct > 8 && <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 700, color: NB.ink }}>{Math.round(seg.pct)}%</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Components ──────────────────────────────────────────────────────────────
// (The old DailyMacroCard swipe card was replaced by the CompactMacroBar on the
// Meals home + the dedicated Macros page — see CompactMacroBar / MacrosScreen.)

// Shared "add to collection" control — a capped-height scrollable checklist,
// with a search box that only appears once the list is long enough to need
// one (COLLECTION_SEARCH_THRESHOLD). Used by both the save-to-cookbook flow
// and the existing item sheet, so a large collection list never turns either
// into a giant flat button wall.
function CollectionChecklist({ collections, selectedIds, onToggle, onCreateCollection }) {
  const [query, setQuery] = useState('')
  const [newCol, setNewCol] = useState('')
  const showSearch = collections.length > COLLECTION_SEARCH_THRESHOLD
  const q = query.trim().toLowerCase()
  const visible = showSearch && q ? collections.filter(c => c.name.toLowerCase().includes(q)) : collections

  return (
    <div>
      {showSearch && (
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search collections"
          style={{ width: '100%', height: 38, border: `2px solid ${NB.ink}`, borderRadius: 10, padding: '0 12px', fontSize: 13, color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
      )}
      {collections.length === 0 ? (
        <div style={{ fontSize: 12, color: '#777', marginBottom: 10 }}>No collections yet — create one below.</div>
      ) : (
        <div style={{ maxHeight: 200, overflowY: 'auto', border: `2px solid ${NB.ink}`, borderRadius: 12, marginBottom: 10 }}>
          {visible.length === 0 && <div style={{ fontSize: 12, color: '#777', padding: '12px' }}>No collections match &ldquo;{query}&rdquo;.</div>}
          {visible.map((col, i) => {
            const on = selectedIds.has(col.id)
            return (
              <button key={col.id} onClick={() => onToggle(col.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: on ? '#EDE7FA' : NB.white, border: 'none', borderBottom: i < visible.length - 1 ? `1px solid ${NB.ink}30` : 'none', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' }}>
                <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, border: `2px solid ${NB.ink}`, background: on ? NB.teal : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>}
                </span>
                <span style={{ fontSize: 14, fontWeight: on ? 700 : 600, color: NB.ink }}>{col.name}</span>
              </button>
            )
          })}
        </div>
      )}
      {onCreateCollection && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newCol} onChange={e => setNewCol(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newCol.trim()) { onCreateCollection(newCol); setNewCol('') } }}
            placeholder="New collection"
            style={{ flex: 1, height: 40, border: `2px solid ${NB.ink}`, borderRadius: 10, padding: '0 12px', fontSize: 13, color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', boxSizing: 'border-box' }} />
          <button onClick={() => { if (newCol.trim()) { onCreateCollection(newCol); setNewCol('') } }} disabled={!newCol.trim()}
            style={{ width: 48, border: `2px solid ${NB.ink}`, borderRadius: 10, background: newCol.trim() ? NB.teal : NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 20, cursor: newCol.trim() ? 'pointer' : 'default' }}>+</button>
        </div>
      )}
    </div>
  )
}

// Save sheet — shown when the user taps "Save to Cookbook". Combines meal-type
// selection (fixed 2×2 grid, never grows) with optional collection assignment
// (CollectionChecklist, capped/searchable so a long collection list never makes
// this a giant button wall). One Save commits both at once.
function SaveToCookbookSheet({ defaultType, collections, onCreateCollection, onConfirm, onClose }) {
  const [type, setType] = useState(defaultType)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const handleCreate = (name) => {
    const id = onCreateCollection(name)
    if (id) setSelectedIds(prev => new Set([...prev, id]))
  }
  const toggle = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,.45)' }} />
      <div style={{ background: NB.white, borderTop: NB_BORDER, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: `0 -6px 0 ${NB.ink}`, padding: '20px 22px 28px', maxHeight: '82%', overflowY: 'auto' }}>
        <div style={{ width: 38, height: 5, background: NB.ink, margin: '0 auto 18px' }} />
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, marginBottom: 18 }}>Save this meal</div>

        <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#555', marginBottom: 8 }}>Save as</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {SAVE_TYPES.map(([id, label]) => (
            <button key={id} onClick={() => setType(id)}
              style={{ padding: '12px 8px', border: `2.5px solid ${NB.ink}`, borderRadius: 12, background: id === type ? NB.teal : NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer', boxShadow: id === type ? hardShadow(2) : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MealTypeIcon type={id} size={16} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#555', marginBottom: 8 }}>Add to collection (optional)</div>
        <CollectionChecklist collections={collections} selectedIds={selectedIds} onToggle={toggle} onCreateCollection={handleCreate} />

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, border: NB_BORDER, borderRadius: 14, background: NB.white, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onConfirm({ type, collectionIds: [...selectedIds] })} style={{ flex: 1.6, height: 50, border: NB_BORDER, borderRadius: 14, boxShadow: hardShadow(4), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

// Ingredients/Method as a tab toggle instead of both stacked at once — halves
// how much a meal-detail view shows at a glance without losing either list.
// Shared by the cookbook item sheet and the generated-meal detail card so
// both flows look and behave the same way.
function RecipeTabs({ ingredients, instructions, diff = null }) {
  const hasMethod = instructions?.length > 0
  const [tab, setTab] = useState('ingredients')
  const ingDiff = diff?.ingredients
  const stepDiff = diff?.instructions
  const hasAnyDiff = !!(ingDiff?.added?.length || ingDiff?.removed?.length || stepDiff?.added?.length || stepDiff?.removed?.length)
  return (
    <div>
      <div style={{ display: 'flex', border: `2.5px solid ${NB.ink}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
        <button
          onClick={() => setTab('ingredients')}
          style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontFamily: NB.fontMono, fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', background: tab === 'ingredients' ? NB.ink : NB.white, color: tab === 'ingredients' ? NB.white : NB.ink }}
        >
          Ingredients
        </button>
        {hasMethod && (
          <button
            onClick={() => setTab('method')}
            style={{ flex: 1, padding: '10px 0', border: 'none', borderLeft: `2.5px solid ${NB.ink}`, cursor: 'pointer', fontFamily: NB.fontMono, fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', background: tab === 'method' ? NB.ink : NB.white, color: tab === 'method' ? NB.white : NB.ink }}
          >
            Method
          </button>
        )}
      </div>

      {hasAnyDiff && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, color: '#555' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, background: NB.yellow, borderRadius: 3, display: 'inline-block' }} /> Changed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, border: '1.5px dashed #999', borderRadius: 3, display: 'inline-block' }} /> Removed
          </span>
        </div>
      )}

      {tab === 'ingredients' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ingredients.map((ing, i) => {
            const changed = ingDiff?.added?.includes(ing)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `2.5px solid ${NB.ink}`, borderRadius: 12, padding: '9px 12px', background: changed ? NB.yellow : 'transparent' }}>
                <span style={{ width: 22, height: 22, border: `2.5px solid ${NB.ink}`, borderRadius: 6, background: NB.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
                </span>
                <span style={{ fontWeight: 700, fontSize: 14, color: NB.ink }}>{ing}</span>
              </div>
            )
          })}
          {ingDiff?.removed?.length > 0 && (
            <>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', marginTop: 4 }}>Removed</div>
              {ingDiff.removed.map((ing, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1.5px dashed #999', borderRadius: 12, padding: '9px 12px' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#999', textDecoration: 'line-through' }}>{ing}</span>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {instructions.map((step, i) => {
            const changed = stepDiff?.added?.includes(step)
            return (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: changed ? NB.yellow : 'transparent', borderRadius: 10, padding: changed ? '6px 8px' : 0 }}>
                <span style={{ width: 28, height: 28, border: `2.5px solid ${NB.ink}`, borderRadius: 9, background: NB.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: NB.ink, flexShrink: 0 }}>{i + 1}</span>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, paddingTop: 2, color: NB.ink }}>{step}</p>
              </div>
            )
          })}
          {stepDiff?.removed?.length > 0 && (
            <>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', marginTop: 4 }}>Removed</div>
              {stepDiff.removed.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', border: '1.5px dashed #999', borderRadius: 10, padding: '6px 8px' }}>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#999', textDecoration: 'line-through' }}>{step}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function CookbookItemSheet({ item, targets, collections = [], onToggleCollection, onCreateCollection, onRemove, onClose, onLog }) {
  const hasFullRecipe = item.ingredients?.length > 0
  const hasMethod = item.instructions?.length > 0
  const memberIds = new Set(item.collections || [])
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,.45)' }} />
      <div style={{ background: NB.white, borderTop: NB_BORDER, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: `0 -6px 0 ${NB.ink}`, padding: '20px 22px 32px', maxHeight: '82%', overflowY: 'auto' }}>
        <div style={{ width: 38, height: 5, background: NB.ink, margin: '0 auto 18px' }} />
        <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>{slotLabel(item.type)}</div>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink, marginBottom: 16, lineHeight: 1.2 }}>{item.name}</div>

        <div style={{ marginBottom: 20 }}>
          <MacroPageGrid macros={item.macros || { calories: item.calories || 0, protein: item.protein || 0 }} targets={targets} />
        </div>

        {hasFullRecipe ? (
          <RecipeTabs ingredients={item.ingredients} instructions={hasMethod ? item.instructions : null} />
        ) : (
          <div style={{ ...nbCardStyle(NB.cream, 2), border: `3px solid ${NB.white}`, borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: '#555' }}>Full recipe not saved for this item. Log it to track your macros.</div>
          </div>
        )}

        {/* Add to collection — organize saved meals the user's own way. Capped/
            searchable list (CollectionChecklist) so a large collection list
            never turns this into a giant button wall. */}
        {onToggleCollection && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 8 }}>Add to collection</div>
            <CollectionChecklist collections={collections} selectedIds={memberIds} onToggle={onToggleCollection} onCreateCollection={onCreateCollection} />
          </div>
        )}

        {onRemove && (
          <button onClick={onRemove} style={{ width: '100%', height: 44, marginBottom: 12, border: `2px solid ${NB.ink}`, borderRadius: 12, background: NB.white, fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            Remove from Cookbook
          </button>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, border: NB_BORDER, borderRadius: 14, background: NB.white, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}>Close</button>
          <button onClick={onLog} style={{ flex: 1.6, height: 50, border: NB_BORDER, borderRadius: 14, boxShadow: hardShadow(4), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', cursor: 'pointer' }}>Log this meal</button>
        </div>
      </div>
    </div>
  )
}

// Swipeable macro grid — pages of up to 4 tiles (name / value+unit / mini progress bar / % daily),
// with dot indicators. Matches the Fitness UI Kit v2 Meal Detail section.
function MacroPageGrid({ macros = {}, targets }) {
  const scrollRef = useRef()
  const [page, setPage] = useState(0)

  const mainTiles = [
    { key: 'calories', label: 'Calories', unit: '', color: NB.magenta, ref: targets?.calories },
    { key: 'protein', label: 'Protein', unit: 'g', color: NB.magenta, ref: targets?.protein },
    { key: 'carbs', label: 'Carbs', unit: 'g', color: NB.yellow, ref: targets?.carbs },
    { key: 'fat', label: 'Fat', unit: 'g', color: NB.pink, ref: targets?.fat },
  ]
  const extraTiles = EXTRA_MACRO_FIELDS.map(f => ({ key: f.key, label: f.label, unit: f.unit, color: NB.teal, ref: MACRO_DAILY_REF[f.key] }))
  const allTiles = [...mainTiles, ...extraTiles]
  const pages = []
  for (let i = 0; i < allTiles.length; i += 4) pages.push(allTiles.slice(i, i + 4))

  const onScroll = () => {
    const el = scrollRef.current
    if (!el || !el.clientWidth) return
    setPage(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Swipe →</span>
      </div>
      <div ref={scrollRef} onScroll={onScroll} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
        {pages.map((pg, pi) => (
          <div key={pi} style={{ minWidth: '100%', scrollSnapAlign: 'start', boxSizing: 'border-box', padding: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {pg.map(tile => {
                const val = Math.round(macros[tile.key] || 0)
                const pct = tile.ref ? Math.min(100, Math.round((val / tile.ref) * 100)) : 0
                return (
                  <div key={tile.key} style={{ border: `2.5px solid ${NB.ink}`, borderRadius: 14, background: '#F3ECFC', padding: 14 }}>
                    <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#666' }}>{tile.label}</div>
                    <div style={{ margin: '6px 0 10px' }}>
                      <span style={{ fontWeight: 900, fontSize: 28, lineHeight: 1, color: NB.ink }}>{val}</span>
                      <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, marginLeft: 3, color: NB.ink }}>{tile.unit}</span>
                    </div>
                    <div style={{ border: `2px solid ${NB.ink}`, borderRadius: 999, background: NB.white, height: 12, padding: 2, boxSizing: 'border-box' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: tile.color }} />
                    </div>
                    <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#888', marginTop: 6 }}>{pct}% daily</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
        {pages.map((_, i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${NB.ink}`, background: page === i ? NB.magenta : NB.white }} />
        ))}
      </div>
    </div>
  )
}

// Card with a labeled progress bar per free-tier AI quota — matches the
// existing "Calories" bar style in DailyMacroCard (pill track + fill).
// Pro users see a plain "unlimited" banner instead. This is a display-only
// mirror of the real, server-enforced quota (see gamification.js's
// getAiUsesRemaining/AI_DAILY_LIMITS).
// Compact tappable calorie/macro summary — replaces the big swipeable macro
// card on the Meals home. Tapping opens the full Macros page.
function CompactMacroBar({ macros, targets, onNavigate }) {
  const consumed = Math.round(macros.calories || 0)
  const target = Math.round(targets.calories || 0)
  return (
    <button
      onClick={() => onNavigate?.('macros')}
      style={{ flex: 1, minWidth: 0, ...nbCardStyle(NB.white, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.ink}`, borderRadius: 14, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: NB.fontMono, fontWeight: 700, fontSize: 12, color: NB.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 14 }}>{consumed.toLocaleString()}</span> / {target.toLocaleString()} kcal
        </div>
        <div style={{ display: 'flex', gap: 8, fontFamily: NB.fontMono, fontWeight: 700, fontSize: 10.5, marginTop: 2 }}>
          <span style={{ color: NB.magenta }}>P{Math.round(macros.protein || 0)}</span>
          <span style={{ color: '#C6A200' }}>C{Math.round(macros.carbs || 0)}</span>
          <span style={{ color: NB.pink }}>F{Math.round(macros.fat || 0)}</span>
        </div>
      </div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6" /></svg>
    </button>
  )
}

// Compact top-right AI-usage widget: Pro members get a "✦ PRO" pill; free users
// get a small dark meter of remaining daily uses (taps through to the paywall).
// Full quota logic still lives server-side (see gamification.js).
function CompactAiWidget({ isProUser, gamification, onNavigate }) {
  if (isProUser) {
    return (
      <div style={{ flexShrink: 0, background: NB.ink, borderRadius: 14, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6, boxShadow: hardShadow(3, NB.purpleDeep) }}>
        <span style={{ fontSize: 12, color: NB.yellow }}>✦</span>
        <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 13, letterSpacing: 1, color: NB.yellow, textTransform: 'uppercase' }}>Pro</span>
      </div>
    )
  }
  const todayKey = dateKeyFor()
  const mealGensLeft = getAiUsesRemaining(gamification, 'mealGens', todayKey)
  const lookupsLeft = getAiUsesRemaining(gamification, 'lookups', todayKey)
  const rows = [
    ['Meals', mealGensLeft, AI_DAILY_LIMITS.mealGens, NB.magenta],
    ['Lookup', lookupsLeft, AI_DAILY_LIMITS.lookups, NB.teal],
  ]
  return (
    <button onClick={() => onNavigate?.('proUpsell')} style={{ flexShrink: 0, background: NB.ink, border: 'none', borderRadius: 14, padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 5, cursor: 'pointer' }}>
      {rows.map(([label, left, cap, color]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: NB.fontMono, fontWeight: 700, fontSize: 8, letterSpacing: 0.5, textTransform: 'uppercase', color: '#aaa', width: 34 }}>{label}</span>
          <div style={{ width: 40, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, ((cap - left) / cap) * 100)}%`, background: left <= 0 ? NB.red : color }} />
          </div>
          <span style={{ fontFamily: NB.fontMono, fontWeight: 700, fontSize: 9, color: left <= 0 ? NB.red : NB.white }}>{left}/{cap}</span>
        </div>
      ))}
    </button>
  )
}

// Unified meal detail card — used for generated meals, adjusted meals, and "already ate" results.
// Matches the Fitness UI Kit v2 Meal Detail section 1:1: three separate cards (header photo/name,
// swipeable macro grid, ingredients/method) — Adjust/Log live outside in <MealActionBar>.
function MealDetailCard({ meal, mealType, name, userCraving, isEditingName, onEditNameStart, onNameChange, onSaveToCookbook, onViewCookbook, saved, targets, showIngredients = true, diff = null }) {
  const color = MEAL_COLORS[mealType] || NB.teal
  const nameInputRef = useRef()
  const recipeCardRef = useRef()
  // Pre-highlight a sensible default in the save sheet: the meal's own type, else lunch.
  const defaultType = ['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)
    ? mealType
    : (mealType?.startsWith('snack') ? 'snack' : 'lunch')

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus()
  }, [isEditingName])

  // A diff only ever appears right after an adjustment — scroll it into view
  // so the highlighted/struck-through changes are actually seen instead of
  // sitting below the photo header + macro grid, unnoticed.
  useEffect(() => {
    if (diff) recipeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [diff])

  const subtitleParts = [
    meal.macros?.calories ? `${Math.round(meal.macros.calories)} kcal` : null,
    meal.prepTimeMinutes ? `${meal.prepTimeMinutes} min` : null,
    MEAL_LABELS[mealType] || (mealType || '').toUpperCase(),
  ].filter(Boolean)

  const hasIngredients = showIngredients && meal.ingredients?.length > 0
  const hasMethod = showIngredients && meal.instructions?.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Card 1: photo header + name/rename + favorite */}
      <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 6, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ height: 150, background: color, borderBottom: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <MealTypeIcon type={mealType} size={68} />
          <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: NB.ink }}>{slotLabel(mealType)}</span>
        </div>

        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ minWidth: 0 }}>
            {userCraving && <div style={{ fontSize: 10, color: '#777', fontWeight: 600, marginBottom: 3 }}>for: &ldquo;{userCraving}&rdquo;</div>}
            {isEditingName ? (
              <input
                ref={nameInputRef}
                defaultValue={name}
                onBlur={e => onNameChange(e.target.value || name)}
                onKeyDown={e => { if (e.key === 'Enter') onNameChange(e.target.value || name) }}
                style={{ width: '100%', fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, color: NB.ink, textTransform: 'uppercase', border: 'none', borderBottom: `2px solid ${NB.ink}`, outline: 'none', background: 'transparent', padding: '2px 0', boxSizing: 'border-box' }}
              />
            ) : (
              <h3 style={{ margin: 0, fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.05 }}>{name}</h3>
            )}
            <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#666', marginTop: 6 }}>{subtitleParts.join(' · ')}</div>
          </div>

          {/* Save flow: tapping Save opens a sheet (meal type + collections);
              the parent owns that sheet since it needs cookbook-level data. */}
          {onSaveToCookbook && !saved && (
            <button onClick={() => onSaveToCookbook(defaultType)} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', padding: 12, border: `2.5px solid ${NB.ink}`, borderRadius: 12, background: NB.pink, color: NB.ink, boxShadow: hardShadow(3), cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              Save to Cookbook
            </button>
          )}
          {onSaveToCookbook && saved && (
            <div style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', padding: 12, border: `2.5px solid ${NB.ink}`, borderRadius: 12, background: NB.green, color: NB.ink, boxShadow: hardShadow(3) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
              Saved to Cookbook
            </div>
          )}
          {/* Post-save confirmation that teaches users where saved meals live. */}
          {saved && onViewCookbook && (
            <button onClick={onViewCookbook} style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', padding: 10, border: `2px solid ${NB.ink}`, borderRadius: 10, background: NB.lavender, color: NB.ink, cursor: 'pointer' }}>
              View in your Cookbook
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          )}
          {onEditNameStart && !isEditingName && (
            <button onClick={onEditNameStart} style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', padding: 12, border: `2.5px solid ${NB.ink}`, borderRadius: 12, background: NB.magenta, color: NB.white, boxShadow: hardShadow(3), cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Rename Meal
            </button>
          )}
        </div>
      </div>

      {/* Card 2: swipeable macro grid */}
      <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 6, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 20, padding: '18px 20px 6px' }}>
        <MacroPageGrid macros={meal.macros || {}} targets={targets} />
      </div>

      {/* Card 3: ingredients + method, tabbed so only one list shows at a time */}
      {(hasIngredients || hasMethod) && (
        <div ref={recipeCardRef} style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 6, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 20, padding: '18px 20px' }}>
          <RecipeTabs ingredients={hasIngredients ? meal.ingredients : []} instructions={hasMethod ? meal.instructions : null} diff={diff} />
        </div>
      )}
    </div>
  )
}

// Adjust/Log action row — deliberately rendered outside MealDetailCard's cards, sticky to the
// bottom of the scrolling viewport so it stays reachable no matter how far the meal is scrolled.
function MealActionBar({ onAdjust, onLog, logged }) {
  return (
    <div style={{ position: 'sticky', bottom: 0, display: 'flex', gap: 8, padding: '14px 0 4px', background: `linear-gradient(to top, ${NB.bg} 85%, transparent)` }}>
      <button onClick={onAdjust} style={{ flex: 1, height: 46, border: `2px solid ${NB.ink}`, borderRadius: 12, boxShadow: hardShadow(3), background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer' }}>
        Adjust
      </button>
      <button onClick={onLog} disabled={logged} style={{ flex: 1.4, height: 46, border: NB_BORDER, borderRadius: 12, boxShadow: logged ? 'none' : hardShadow(3), background: logged ? NB.green : NB.magenta, color: logged ? NB.ink : NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: logged ? 'default' : 'pointer' }}>
        {logged ? 'Logged ✓' : 'Log Meal'}
      </button>
    </div>
  )
}

// Free-text adjust sheet — replaces the old +/- stepper drawer.
function AdjustSheet({ onClose, onSubmit }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: NB.white, borderTop: NB_BORDER, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: `0 -6px 0 ${NB.ink}`, padding: '24px 22px 32px' }}>
        <div style={{ width: 38, height: 5, background: NB.ink, margin: '0 auto 20px' }} />
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>What would you like to change?</div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>e.g. "more protein" or "don't want the chicken grilled"</div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type your change…"
          style={{ width: '100%', height: 90, border: NB_BORDER, borderRadius: 14, padding: '12px 14px', fontSize: 14, color: NB.ink, background: NB.white, resize: 'none', boxSizing: 'border-box', fontFamily: NB.fontDisplay, outline: 'none', marginBottom: 20 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, border: NB_BORDER, borderRadius: 14, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={async () => {
              if (!text.trim() || loading) return
              setLoading(true)
              try {
                await onSubmit(text.trim())
                onClose()
              } catch {
                // Stays open on failure (e.g. Pro-gate) — handleAdjustMeal
                // already surfaced the reason via a toast.
              } finally {
                setLoading(false)
              }
            }}
            style={{ flex: 2, height: 50, border: NB_BORDER, borderRadius: 14, boxShadow: hardShadow(3), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {loading ? 'Adjusting…' : 'Adjust'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Meals({ userProfile = {}, loggedMacros, onUpdateLoggedMacros, cookbook = [], onUpdateCookbook, onUpdateProfile, onMealLogged, onNotify, onNavigate, gamification = {}, onGamificationChange, isProUser = false }) {
  const {
    physique = 'lean_toned', dietary = [], allergies = [], name = 'Maya',
    dailyCalorieTarget = null, fitnessGoal = 'tone_recomp', country = '',
    cookbookCollections = [],
  } = userProfile

  // Region context for the nutrition AI — the country name drives locale-aware
  // estimates; the ISO code scopes the "already ate" web-search lookup.
  const countryName = COUNTRIES.find(c => c.code === country)?.name || ''

  const safeLoggedMacros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, cholesterol: 0, potassium: 0, ...loggedMacros }

  const targets = getDailyTargets({ dailyCalorieTarget, fitnessGoal, physique })

  // ── Core state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState('home')
  const [mealMode, setMealMode] = useState('craving') // 'craving' | 'eaten'
  const [craving, setCraving] = useState('')
  const [mealCount, setMealCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [generatedMeals, setGeneratedMeals] = useState(null)
  const [cookbookSearch, setCookbookSearch] = useState('')
  const [viewingCookbookItem, setViewingCookbookItem] = useState(null)
  const [cookbookTab, setCookbookTab] = useState('type') // 'type' | 'collections'
  const [activeCollectionId, setActiveCollectionId] = useState(null) // drilled-into collection
  const [newCollectionName, setNewCollectionName] = useState('')
  const [renamingCollection, setRenamingCollection] = useState(false)
  // Which meal is mid-save (opens SaveToCookbookSheet): { kind: 'generated', type, defaultType } | { kind: 'eaten', defaultType }
  const [savingContext, setSavingContext] = useState(null)
  const inputRef = useRef()

  // ── Craving preview state ───────────────────────────────────────────────────
  const [cravingPreview, setCravingPreview] = useState(null)
  const [cravingPreviewLoading, setCravingPreviewLoading] = useState(false)
  const [cravingPreviewError, setCravingPreviewError] = useState('')

  // ── Already-ate state ───────────────────────────────────────────────────────
  const [eatenText, setEatenText] = useState('')
  const [eatenLoading, setEatenLoading] = useState(false)
  const [eatenResult, setEatenResult] = useState(null)
  const [eatenLogged, setEatenLogged] = useState(false)
  const [eatenSaved, setEatenSaved] = useState(false)
  const [adjustingEaten, setAdjustingEaten] = useState(false)

  // ── Full-day builder state ──────────────────────────────────────────────────
  const [builderMode, setBuilderMode] = useState('single')
  const [mealSlots, setMealSlots] = useState([])
  const [snackCount, setSnackCount] = useState(1)

  // ── Generated meal extras ───────────────────────────────────────────────────
  const [mealNames, setMealNames] = useState({})
  const [editingName, setEditingName] = useState(null)
  const [mealCravings, setMealCravings] = useState({})
  const [generatedTypes, setGeneratedTypes] = useState([])
  const [generatedFrom, setGeneratedFrom] = useState('builder')
  const [loggedTypes, setLoggedTypes] = useState(new Set())
  const [savedTypes, setSavedTypes] = useState(new Set())
  const [adjustingMeal, setAdjustingMeal] = useState(null)
  const [preAdjustMeals, setPreAdjustMeals] = useState({}) // { [type]: meal } — pre-adjust snapshot, for the diff view only

  // ── Craving preview debounce ────────────────────────────────────────────────
  // gamification/isProUser are deliberately NOT in the dep array — this effect
  // already recreates on every keystroke, and adding a frequently-changing prop
  // would restart the debounce timer on unrelated gamification writes. The
  // callback reads the latest closed-over value at fire time, accurate enough
  // for a 700ms window.
  useEffect(() => {
    if (mealMode !== 'craving' || !craving.trim()) { setCravingPreview(null); setCravingPreviewLoading(false); setCravingPreviewError(''); return }
    setCravingPreviewLoading(true)
    setCravingPreviewError('')
    const t = setTimeout(async () => {
      const todayKey = dateKeyFor()
      if (!isProUser && getAiUsesRemaining(gamification, 'lookups', todayKey) <= 0) {
        setCravingPreview(null)
        setCravingPreviewError(`Daily calorie-lookup limit reached (${AI_DAILY_LIMITS.lookups}/day) — go Pro for unlimited.`)
        setCravingPreviewLoading(false)
        return
      }
      try {
        const result = await lookupFood(craving, { countryName })
        setCravingPreview(result)
        if (!isProUser) onGamificationChange?.(g => recordAiUsage(g, 'lookups', todayKey))
      } catch (err) {
        setCravingPreview(null)
        if (err?.code === 'QUOTA_EXCEEDED') {
          setCravingPreviewError(`Daily calorie-lookup limit reached (${AI_DAILY_LIMITS.lookups}/day) — go Pro for unlimited.`)
          if (!isProUser) onGamificationChange?.(g => ({ ...g, aiUsageToday: { date: todayKey, ...g.aiUsageToday, lookups: AI_DAILY_LIMITS.lookups } }))
        } else {
          setCravingPreviewError(err?.code === 'PRO_REQUIRED' ? 'Upgrade to MissVfit Pro to estimate calories' : 'Could not estimate calories — try again')
        }
      } finally {
        setCravingPreviewLoading(false)
      }
    }, 700)
    return () => clearTimeout(t)
  }, [craving, mealMode])

  // ── Derived values ──────────────────────────────────────────────────────────
  const remaining = Math.max(0, targets.calories - safeLoggedMacros.calories)
  const remainingProtein = Math.max(0, targets.protein - safeLoggedMacros.protein)
  const remainingCarbs = Math.max(0, targets.carbs - safeLoggedMacros.carbs)
  const remainingFat = Math.max(0, targets.fat - safeLoggedMacros.fat)

  const mealTypes = mealCount === 1 ? ['lunch'] : mealCount === 2 ? ['lunch', 'dinner'] : ['breakfast', 'lunch', 'dinner']

  const splitCalories = (n) => {
    const base = Math.floor(remaining / n)
    return Array.from({ length: n }, (_, i) => i === n - 1 ? remaining - base * (n - 1) : base)
  }

  // Every AI call in this screen can now reject with a Pro-gate 402
  // (see claudeApi.js) instead of quietly resolving to null — surface it
  // instead of leaving whatever loading state was active stuck forever.
  const notifyAiError = (err) => {
    onNotify?.(err?.code === 'PRO_REQUIRED' ? '⭐ Upgrade to MissVfit Pro to use AI meal features' : 'Something went wrong — try again')
  }

  // ── Generate handler ─────────────────────────────────────────────────────────
  const handleGenerate = async (quickCount = null, quickCraving = null) => {
    const effectiveCraving = quickCraving !== null ? quickCraving : craving
    if (quickCraving !== null) setCraving(quickCraving)

    const isFullDayGen = builderMode === 'fullday' && quickCount === null
    const slotCount = isFullDayGen ? mealSlots.length : (quickCount ?? mealCount)
    const todayKey = dateKeyFor()

    if (!isProUser) {
      if (isFullDayGen) {
        // Defensive backstop -- the "Build my full day" entry point on Home is
        // Pro-gated, so this should be unreachable for a free user, but guard
        // here too in case builderMode is ever set another way.
        onNotify?.('⭐ Build My Full Day is a MissVfit Pro feature')
        onNavigate?.('proUpsell')
        return
      }
      if (getAiUsesRemaining(gamification, 'mealGens', todayKey) < slotCount) {
        onNotify?.(`You have ${getAiUsesRemaining(gamification, 'mealGens', todayKey)} of today's ${AI_DAILY_LIMITS.mealGens} free meal generations left — reduce your meal count, or go Pro for unlimited.`)
        return
      }
    }

    setGenerating(true)
    setView('generated')
    try {
    const results = {}
    const mealCravingsMap = {}
    const namesMap = {}

    const errorFallback = (type, calTarget, pTarget, cTarget, fTarget) => ({
      name: '⚠️ Generation failed',
      ingredients: ['Tap "Adjust" below to try again.'],
      macros: { calories: calTarget, protein: pTarget, carbs: cTarget, fat: fTarget },
      prepTimeMinutes: 0,
      instructions: ['The AI could not build this recipe. Tap Adjust to retry.'],
    })

    // Wraps suggestMeal so a mid-batch quota/Pro rejection on one slot (e.g.
    // client/server drift) shows a clear inline message on just that slot
    // instead of throwing and discarding the whole Promise.all batch.
    const safeSuggestMeal = async (params, calTarget, pTarget, cTarget, fTarget) => {
      try {
        return await suggestMeal(params)
      } catch (err) {
        if (err?.code === 'QUOTA_EXCEEDED') {
          return {
            name: '⚠️ Daily limit reached',
            ingredients: [],
            macros: { calories: calTarget, protein: pTarget, carbs: cTarget, fat: fTarget },
            prepTimeMinutes: 0,
            instructions: [`You've used today's ${AI_DAILY_LIMITS.mealGens} free generations — resets tomorrow, or go Pro for unlimited.`],
          }
        }
        if (err?.code === 'PRO_REQUIRED') {
          return {
            name: '⭐ MissVfit Pro required',
            ingredients: [],
            macros: { calories: calTarget, protein: pTarget, carbs: cTarget, fat: fTarget },
            prepTimeMinutes: 0,
            instructions: ['Upgrade to MissVfit Pro to generate this meal.'],
          }
        }
        return null // falls through to errorFallback below, same as a parse failure
      }
    }

    let orderedTypes = []

    // A quick craving-box call (explicit quickCount) always means "generate a single
    // quick meal", regardless of whatever builderMode was left over from a previous
    // full-day session — builderMode only drives this when the call came from the
    // builder screen itself (quickCount === null).
    if (builderMode === 'fullday' && quickCount === null) {
      orderedTypes = mealSlots.map(s => s.type)

      await Promise.all(mealSlots.map(async (slot) => {
        const isSnack = slot.type.startsWith('snack')
        const calTarget = slot.calories
        const ratio = calTarget / Math.max(remaining, 1)
        const pTarget = isSnack ? 10 : Math.round(remainingProtein * ratio)
        const cTarget = isSnack ? 15 : Math.round(remainingCarbs * ratio)
        const fTarget = isSnack ? 5 : Math.round(remainingFat * ratio)

        const meal = await safeSuggestMeal({
          mealType: isSnack ? 'snack' : slot.type,
          targetCalories: calTarget, targetProtein: pTarget, targetCarbs: cTarget, targetFat: fTarget,
          dietary, allergies, physique,
          craving: slot.craving || '',
          countryName,
        }, calTarget, pTarget, cTarget, fTarget)

        results[slot.type] = meal || errorFallback(slot.type, calTarget, pTarget, cTarget, fTarget)
        mealCravingsMap[slot.type] = slot.craving
        namesMap[slot.type] = meal ? meal.name : '⚠️ Generation failed'
      }))
    } else {
      const effectiveCount = quickCount ?? mealCount
      const isSingleCraving = quickCount === 1 && !!effectiveCraving
      const effectiveTypes = effectiveCount === 1 ? ['lunch']
        : effectiveCount === 2 ? ['lunch', 'dinner']
        : ['breakfast', 'lunch', 'dinner']
      orderedTypes = effectiveTypes

      const base = Math.floor(remaining / effectiveCount)
      const splits = Array.from({ length: effectiveCount }, (_, i) =>
        i === effectiveCount - 1 ? remaining - base * (effectiveCount - 1) : base)

      await Promise.all(effectiveTypes.map(async (type, i) => {
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

        const meal = await safeSuggestMeal({
          mealType: type, targetCalories: calTarget, targetProtein: pTarget,
          targetCarbs: cTarget, targetFat: fTarget,
          dietary, allergies, physique, craving: effectiveCraving,
          cravingOnly: isSingleCraving,
          countryName,
        }, calTarget, pTarget, cTarget, fTarget)

        results[type] = meal || errorFallback(type, calTarget, pTarget, cTarget, fTarget)
        mealCravingsMap[type] = effectiveCraving
        namesMap[type] = meal ? meal.name : '⚠️ Generation failed'
      }))

      if (quickCount !== null) setMealCount(quickCount)
    }

      setGeneratedMeals(results)
      setMealCravings(mealCravingsMap)
      setMealNames(namesMap)
      setGeneratedTypes(orderedTypes)
      setGeneratedFrom(quickCount !== null ? 'home' : 'builder')
      setLoggedTypes(new Set())
      setSavedTypes(new Set())
      setPreAdjustMeals({})
      if (!isProUser) onGamificationChange?.(g => recordAiUsage(g, 'mealGens', todayKey, slotCount))
    } catch (err) {
      notifyAiError(err)
      setView('builder')
    } finally {
      setGenerating(false)
    }
  }

  const handleAdjustMeal = async (type, instruction) => {
    const meal = generatedMeals?.[type]
    if (!meal) return
    if (!isProUser) {
      onNotify?.('⭐ Meal adjustments are a MissVfit Pro feature')
      onNavigate?.('proUpsell')
      throw new Error('PRO_REQUIRED') // AdjustSheet's catch keeps the sheet open, same as a failed adjust
    }
    try {
      const updated = await adjustMeal({ meal, instruction, dietary, allergies, countryName })
      if (updated) {
        setPreAdjustMeals(prev => ({ ...prev, [type]: meal })) // diff snapshot -- see mealDiff.js
        setGeneratedMeals(prev => ({ ...prev, [type]: updated }))
        setMealNames(prev => ({ ...prev, [type]: updated.name }))
      }
    } catch (err) {
      notifyAiError(err)
      throw err // let AdjustSheet's submit button know it failed, so it stays open
    }
  }

  const handleSaveToCookbook = (type, chosenType, collectionIds) => {
    const meal = generatedMeals?.[type]
    if (!meal || savedTypes.has(type)) return
    const n = mealNames[type] || meal.name
    if (onUpdateCookbook) onUpdateCookbook(prev => [{
      id: newId(), collections: collectionIds || [],
      name: n, type: chosenType || type,
      macros: meal.macros ?? {},
      protein: meal.macros?.protein ?? 0,
      calories: meal.macros?.calories ?? 0,
      ingredients: meal.ingredients ?? [],
      instructions: meal.instructions ?? [],
      prepTimeMinutes: meal.prepTimeMinutes ?? null,
      savedAt: new Date().toISOString().slice(0, 10),
    }, ...prev].slice(0, 100))
    setSavedTypes(prev => new Set([...prev, type]))
    // Stay on the review screen so the "Saved · View in Cookbook" confirmation is
    // visible — the user leaves via the header back button when ready.
  }

  const handleLogOneMeal = (type) => {
    const meal = generatedMeals?.[type]
    if (!meal || loggedTypes.has(type)) return
    const m = meal.macros || {}
    if (onUpdateLoggedMacros) onUpdateLoggedMacros(prev => addMacros(prev, m))
    const nextLogged = new Set([...loggedTypes, type])
    // Only offer to share once there's nothing left to log — either a single
    // generated meal, or the last one in a full-day batch — so sharing doesn't
    // interrupt logging the rest of the batch.
    const offerShare = nextLogged.size >= generatedTypes.length
    if (onMealLogged) onMealLogged({ name: mealNames[type] || meal.name, macros: m, ingredients: meal.ingredients || [], mealType: type }, { offerShare })
    setLoggedTypes(nextLogged)
  }

  // ── Already-ate handlers ─────────────────────────────────────────────────────
  const handleIdentifyEaten = async (overrideText) => {
    const text = (typeof overrideText === 'string' ? overrideText : eatenText).trim()
    if (!text) return
    if (typeof overrideText === 'string') setEatenText(overrideText)
    const todayKey = dateKeyFor()
    if (!isProUser && getAiUsesRemaining(gamification, 'eatenLookups', todayKey) <= 0) {
      setView('eaten')
      setEatenResult({ error: true, message: `Daily "already ate" limit reached (${AI_DAILY_LIMITS.eatenLookups}/day) — go Pro for unlimited.` })
      return
    }
    setView('eaten')
    setEatenResult(null)
    setEatenLogged(false)
    setEatenLoading(true)
    try {
      const result = await identifyEatenFood(text, { countryName, countryCode: country })
      setEatenResult(result)
      if (!isProUser) onGamificationChange?.(g => recordAiUsage(g, 'eatenLookups', todayKey))
    } catch (err) {
      if (err?.code === 'QUOTA_EXCEEDED') {
        setEatenResult({ error: true, message: `Daily "already ate" limit reached (${AI_DAILY_LIMITS.eatenLookups}/day) — go Pro for unlimited.` })
      } else {
        setEatenResult({ error: true, message: err?.code === 'PRO_REQUIRED' ? 'Upgrade to MissVfit Pro to identify meals' : undefined })
      }
    } finally {
      setEatenLoading(false)
    }
  }

  const handleAdjustEaten = async (instruction) => {
    const todayKey = dateKeyFor()
    if (!isProUser && getAiUsesRemaining(gamification, 'eatenLookups', todayKey) <= 0) {
      onNotify?.(`Daily "already ate" limit reached (${AI_DAILY_LIMITS.eatenLookups}/day) — go Pro for unlimited.`)
      return
    }
    const combined = `${eatenText.trim()}. Correction: ${instruction}`
    try {
      const result = await identifyEatenFood(combined, { countryName, countryCode: country })
      if (result) {
        setEatenResult(result)
        setEatenText(combined)
        if (!isProUser) onGamificationChange?.(g => recordAiUsage(g, 'eatenLookups', todayKey))
      }
    } catch (err) {
      notifyAiError(err)
    }
  }

  const handleLogEaten = () => {
    if (!eatenResult || eatenResult.error || eatenLogged) return
    const m = eatenResult.macros || {}
    if (onUpdateLoggedMacros) onUpdateLoggedMacros(prev => addMacros(prev, m))
    if (onMealLogged) onMealLogged({ name: eatenResult.identifiedAs, macros: m, mealType: 'eaten' })
    setEatenLogged(true)
  }

  const handleSaveEatenToCookbook = (chosenType, collectionIds) => {
    if (!eatenResult || eatenResult.error || eatenSaved) return
    const m = eatenResult.macros || {}
    if (onUpdateCookbook) onUpdateCookbook(prev => [{
      id: newId(), collections: collectionIds || [],
      name: eatenResult.identifiedAs, type: chosenType || 'snack',
      macros: m,
      protein: m.protein ?? 0,
      calories: m.calories ?? 0,
      ingredients: [],
      instructions: [],
      prepTimeMinutes: null,
      savedAt: new Date().toISOString().slice(0, 10),
    }, ...prev].slice(0, 100))
    setEatenSaved(true)
    // Stay on the result so the saved confirmation shows; back button returns home.
  }

  // ── Cookbook collections ──────────────────────────────────────────────────────
  // Collection definitions live in profile_data (via onUpdateProfile); per-item
  // membership lives on the cookbook item's `collections` array (via onUpdateCookbook).
  const persistCollections = (next) => { if (onUpdateProfile) onUpdateProfile({ cookbookCollections: next }) }

  const createCollection = (rawName) => {
    const nm = (rawName || '').trim()
    if (!nm) return null
    const existing = cookbookCollections.find(c => c.name.toLowerCase() === nm.toLowerCase())
    if (existing) return existing.id
    const id = newId()
    persistCollections([...cookbookCollections, { id, name: nm }])
    return id
  }
  const renameCollection = (id, rawName) => {
    const nm = (rawName || '').trim()
    if (!nm) return
    persistCollections(cookbookCollections.map(c => c.id === id ? { ...c, name: nm } : c))
  }
  const deleteCollection = (id) => {
    persistCollections(cookbookCollections.filter(c => c.id !== id))
    if (onUpdateCookbook) onUpdateCookbook(prev => prev.map(it => {
      const cur = Array.isArray(it.collections) ? it.collections : []
      return cur.includes(id) ? { ...it, collections: cur.filter(x => x !== id) } : it
    }))
    if (activeCollectionId === id) setActiveCollectionId(null)
  }
  const toggleItemCollection = (item, collectionId) => {
    if (!item?.id) return
    const cur = Array.isArray(item.collections) ? item.collections : []
    const collections = cur.includes(collectionId) ? cur.filter(x => x !== collectionId) : [...cur, collectionId]
    const updated = { ...item, collections }
    if (onUpdateCookbook) onUpdateCookbook(prev => prev.map(it => it.id === item.id ? updated : it))
    setViewingCookbookItem(updated) // keep the open sheet in sync for multiple toggles
  }
  const removeCookbookItem = (item) => {
    if (!item?.id) return
    if (onUpdateCookbook) onUpdateCookbook(prev => prev.filter(it => it.id !== item.id))
    setViewingCookbookItem(null)
  }

  // ═══ HOME VIEW ════════════════════════════════════════════════════════════════
  if (view === 'home') {
    const prevPct = cravingPreview && remaining > 0 ? cravingPreview.calories / remaining : 0
    const prevColor = prevPct > 0.7 ? NB.red : prevPct > 0.4 ? NB.yellow : NB.green
    const hr = new Date().getHours()
    const timeOfDay = hr < 12 ? 'Morning' : hr < 17 ? 'Afternoon' : 'Evening'
    const weekday = new Date().toLocaleDateString('en-GB', { weekday: 'long' })

    return (
      <>
        <StatusBar />
        {/* Compact top row — tappable calorie/macro bar + AI usage / Pro widget */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', padding: '6px 22px 0', flexShrink: 0 }}>
          <CompactMacroBar macros={safeLoggedMacros} targets={targets} onNavigate={onNavigate} />
          <CompactAiWidget isProUser={isProUser} gamification={gamification} onNavigate={onNavigate} />
        </div>

        <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '44px 22px 0', display: 'flex', flexDirection: 'column' }}>
        {/* Hero + craving/already-ate form. Fixed (not content-height-based)
            top position, so the greeting/heading/toggle sit at the exact same
            spot in both Craving and Already-ate mode — only the shorter/taller
            form content below the toggle differs, absorbed by the flexible
            spacer further down instead of shifting this block around. */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Hero — greeting + craving/already-ate */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 6, color: NB.purpleDeep }}>✦</div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#888', textTransform: 'uppercase' }}>
              {weekday} {timeOfDay}{name ? `, ${name}` : ''}
            </div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 27, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.08, marginTop: 5, textWrap: 'balance', minHeight: 62, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {mealMode === 'craving' ? 'What are you craving?' : 'What did you eat?'}
            </div>
          </div>

          {/* Craving / Already-ate switch — centered segmented control */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ display: 'inline-flex', gap: 4, background: NB.lavenderMist, borderRadius: 12, padding: 4, border: `2px solid ${NB.ink}`, boxShadow: hardShadow(2, NB_CARD_NEUTRAL_SHADOW) }}>
              {[['craving', 'Craving'], ['eaten', 'Already ate']].map(([id, label]) => (
                <button key={id} onClick={() => setMealMode(id)}
                  style={{ padding: '0 22px', height: 36, border: 'none', borderRadius: 9, background: mealMode === id ? NB.ink : 'transparent', fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', color: mealMode === id ? NB.white : NB.ink, cursor: 'pointer', transition: 'background 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mealMode === 'craving' ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  ref={inputRef}
                  value={craving}
                  onChange={e => { setCraving(e.target.value); if (!e.target.value.trim()) setCravingPreview(null) }}
                  onKeyDown={e => e.key === 'Enter' && craving.trim() && handleGenerate(1)}
                  placeholder="Type a food or meal…"
                  style={{ flex: 1, height: 46, border: `2.5px solid ${NB.ink}`, borderRadius: 12, padding: '0 14px', fontSize: 14, color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', background: NB.white }}
                />
                <button
                  onClick={() => craving.trim() && handleGenerate(1)}
                  style={{ width: 46, height: 46, borderRadius: 12, border: `2.5px solid ${NB.ink}`, background: craving.trim() ? NB.magenta : NB.lavenderMist, cursor: craving.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={craving.trim() ? NB.white : NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>

              {/* Calorie preview */}
              {cravingPreviewError && !cravingPreviewLoading && (
                <div style={{ ...nbCardStyle(NB.white, 2, NB_CARD_NEUTRAL_SHADOW), border: `2.5px solid ${NB.ink}`, borderRadius: 14, padding: '10px 12px', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: NB.ink, fontWeight: 600 }}>{cravingPreviewError}</span>
                </div>
              )}
              {(cravingPreviewLoading || cravingPreview) && (
                <div style={{ ...nbCardStyle(NB.white, 3, NB_CARD_NEUTRAL_SHADOW), border: `2.5px solid ${NB.ink}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
                  {cravingPreviewLoading && !cravingPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${NB.ink}`, borderTopColor: 'transparent', animation: 'mealSpin 0.7s linear infinite', flexShrink: 0 }} />
                      <style>{`@keyframes mealSpin { to { transform: rotate(360deg) } }`}</style>
                      <span style={{ fontSize: 13, color: NB.ink, fontWeight: 600 }}>Estimating calories…</span>
                    </div>
                  ) : cravingPreview ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{cravingPreview.name}</div>
                          <div style={{ fontSize: 11, color: '#777' }}>{cravingPreview.servingSize}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: NB.fontDisplay, fontSize: 20, fontWeight: 900, color: NB.ink, lineHeight: 1 }}>{cravingPreview.calories}</div>
                          <div style={{ fontFamily: NB.fontMono, fontSize: 9, color: '#999', fontWeight: 700 }}>KCAL</div>
                        </div>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, border: `1.5px solid ${NB.ink}`, background: NB.lavenderMist, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ width: `${Math.min(prevPct * 100, 100)}%`, height: '100%', background: prevColor, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>P {cravingPreview.protein}g · C {cravingPreview.carbs}g · F {cravingPreview.fat}g</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: NB.ink, background: prevColor, border: `1.5px solid ${NB.ink}`, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                          {remaining > 0 ? `${Math.round(prevPct * 100)}% left` : 'Budget full'}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* Quick tags */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {CRAVING_TAGS.map(tag => {
                  const sel = craving === tag
                  return (
                    <button key={tag} onClick={() => handleGenerate(1, tag)}
                      style={{ padding: '8px 16px', ...nbCardStyle(sel ? NB.magenta : NB.lavender, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 999, fontSize: 12.5, fontWeight: 800, color: sel ? NB.white : NB.ink, cursor: 'pointer' }}>
                      {tag}
                    </button>
                  )
                })}
              </div>

              {remaining > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#555', fontWeight: 600, textAlign: 'center' }}>
                  We&rsquo;ll fit meals to your <strong style={{ color: NB.ink }}>{remaining} kcal</strong> left today.
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 10, textAlign: 'center' }}>Tell us what you ate and we'll estimate the macros.</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={eatenText}
                  onChange={e => setEatenText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && eatenText.trim() && handleIdentifyEaten()}
                  placeholder="e.g. 'McDonald's medium fries'"
                  style={{ flex: 1, height: 46, border: `2.5px solid ${NB.ink}`, borderRadius: 12, padding: '0 14px', fontSize: 14, color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', background: NB.white }}
                />
                <button
                  onClick={() => eatenText.trim() && handleIdentifyEaten()}
                  style={{ width: 46, height: 46, borderRadius: 12, border: `2.5px solid ${NB.ink}`, background: eatenText.trim() ? NB.magenta : NB.lavenderMist, cursor: eatenText.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={eatenText.trim() ? NB.white : NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>

              {/* Quick-log shortcuts */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {EATEN_TAGS.map(tag => (
                  <button key={tag} onClick={() => handleIdentifyEaten(tag)}
                    style={{ padding: '8px 16px', ...nbCardStyle(NB.lavender, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 999, fontSize: 12.5, fontWeight: 800, color: NB.ink, cursor: 'pointer' }}>
                    {tag}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

          {/* Absorbs leftover height so the tiles stay pinned to the bottom
              without moving the fixed header/toggle block above. */}
          <div style={{ flex: 1, minHeight: 24 }} />

          {/* Bottom tiles — Plan my day + Cookbook */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button onClick={() => {
              if (!isProUser) { onNavigate?.('proUpsell'); return }
              const slots = buildMealSlots(mealCount, snackCount, [], remaining)
              setMealSlots(slots)
              setBuilderMode('fullday')
              setView('builder')
            }} style={{ flex: 1, minWidth: 0, ...nbCardStyle(NB.lavender, 4), border: `3px solid ${NB.ink}`, borderRadius: 18, padding: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isProUser
                  ? <BurritoMealIcon size={22} />
                  : <LockIcon size={18} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 13, textTransform: 'uppercase', color: NB.ink }}>Plan my day</span>
                  {!isProUser && <span style={{ fontFamily: NB.fontMono, fontSize: 8, fontWeight: 800, color: NB.white, background: NB.ink, borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase' }}>Pro</span>}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>All meals + snacks</div>
              </div>
            </button>

            <button onClick={() => setView('cookbook')} style={{ flex: 1, minWidth: 0, ...nbCardStyle(NB.pink, 4), border: `3px solid ${NB.ink}`, borderRadius: 18, padding: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CookbookIcon size={22} />
              </div>
              <div>
                <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 13, textTransform: 'uppercase', color: NB.ink }}>Cookbook</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{cookbook.length} favourite{cookbook.length === 1 ? '' : 's'}</div>
              </div>
            </button>
          </div>
        </div>

        <BottomNav active="meals" onNavigate={onNavigate} />

        {viewingCookbookItem && (
          <CookbookItemSheet
            item={viewingCookbookItem}
            targets={targets}
            collections={cookbookCollections}
            onToggleCollection={cid => toggleItemCollection(viewingCookbookItem, cid)}
            onCreateCollection={nm => { const id = createCollection(nm); if (id) toggleItemCollection(viewingCookbookItem, id) }}
            onRemove={() => removeCookbookItem(viewingCookbookItem)}
            onClose={() => setViewingCookbookItem(null)}
            onLog={() => {
              const m = viewingCookbookItem.macros || { calories: viewingCookbookItem.calories || 0, protein: viewingCookbookItem.protein || 0 }
              if (onUpdateLoggedMacros) onUpdateLoggedMacros(prev => addMacros(prev, m))
              if (onMealLogged) onMealLogged({ name: viewingCookbookItem.name || 'Meal', macros: m, ingredients: viewingCookbookItem.ingredients || [], mealType: viewingCookbookItem.type || 'cookbook' })
              setViewingCookbookItem(null)
            }}
          />
        )}
      </>
    )
  }

  // ═══ EATEN VIEW ═══════════════════════════════════════════════════════════════
  if (view === 'eaten') {
    return (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <StatusBar />
        <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, color: NB.ink, textTransform: 'uppercase' }}>Your meals</span>
          </button>
          {eatenResult && !eatenResult.error && (
            <span style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, color: NB.ink }}>{Math.round(eatenResult.macros?.calories || 0)} kcal</span>
          )}
        </div>

        <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 24px' }}>
          {eatenLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16 }}>
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div className="spinner"><div /><div /><div /><div /><div /><div /></div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: NB.ink, textAlign: 'center' }}>Identifying what you ate…</div>
            </div>
          ) : eatenResult?.error ? (
            <div style={{ ...nbCardStyle(NB.red, 2), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '12px 16px' }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{eatenResult.message || 'Couldn’t identify that — try being more specific.'}</span>
            </div>
          ) : eatenResult ? (
            <>
              <MealDetailCard
                meal={eatenResult}
                mealType="snack"
                name={eatenResult.identifiedAs}
                showIngredients={false}
                onSaveToCookbook={defaultType => setSavingContext({ kind: 'eaten', defaultType })}
                onViewCookbook={() => setView('cookbook')}
                saved={eatenSaved}
                targets={targets}
              />
              <MealActionBar onAdjust={() => setAdjustingEaten(true)} onLog={handleLogEaten} logged={eatenLogged} />
            </>
          ) : null}
        </div>

        {adjustingEaten && (
          <AdjustSheet onClose={() => setAdjustingEaten(false)} onSubmit={handleAdjustEaten} />
        )}

        {savingContext?.kind === 'eaten' && (
          <SaveToCookbookSheet
            defaultType={savingContext.defaultType}
            collections={cookbookCollections}
            onCreateCollection={createCollection}
            onConfirm={({ type, collectionIds }) => { handleSaveEatenToCookbook(type, collectionIds); setSavingContext(null) }}
            onClose={() => setSavingContext(null)}
          />
        )}
      </div>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, color: NB.ink, textTransform: 'uppercase' }}>{isFullDay ? 'Full day plan' : 'Build meals'}</span>
          </button>
        </div>

        <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 0' }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: NB.ink, marginBottom: 16 }}>
            {isFullDay ? 'Plan your full day' : 'How many meals today?'}
          </div>

          {!isFullDay && craving && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', border: 'none', borderRadius: 10, background: NB.yellow, marginBottom: 16 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: NB.ink }}>Craving: {craving}</span>
              <button onClick={() => setCraving('')} style={{ background: 'none', border: 'none', fontSize: 11, color: NB.ink, cursor: 'pointer', fontWeight: 800, textDecoration: 'underline' }}>edit</button>
            </div>
          )}

          {/* Meals count */}
          <div style={{ marginBottom: isFullDay ? 12 : 22 }}>
            {isFullDay && <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, marginBottom: 8 }}>NUMBER OF MEALS</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => isFullDay ? updateSlotCounts(n, undefined) : setMealCount(n)}
                  style={{ height: isFullDay ? 58 : 88, ...nbCardStyle(COUNT_TILE_COLORS[n - 1], mealCount === n ? 3 : 1), borderRadius: 14, position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {mealCount === n && <div style={{ position: 'absolute', top: 5, right: 7, fontSize: 10, fontWeight: 800, color: NB.white, background: NB.ink, borderRadius: 5, padding: '2px 5px' }}>✓</div>}
                  <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: isFullDay ? 24 : 32, color: NB.ink, lineHeight: 1 }}>{n}</span>
                  {!isFullDay && <span style={{ fontFamily: NB.fontMono, fontSize: 10, color: NB.ink, marginTop: 3, fontWeight: 700, textTransform: 'uppercase' }}>{n === 1 ? 'single' : 'meals'}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Snacks count (full-day only) */}
          {isFullDay && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, marginBottom: 8 }}>NUMBER OF SNACKS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[0, 1, 2, 3].map(n => (
                  <button key={n} onClick={() => updateSlotCounts(undefined, n)}
                    style={{ height: 58, ...nbCardStyle(COUNT_TILE_COLORS[n], snackCount === n ? 3 : 1), borderRadius: 14, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {snackCount === n && <div style={{ position: 'absolute', top: 5, right: 7, fontSize: 10, fontWeight: 800, color: NB.white, background: NB.ink, borderRadius: 5, padding: '2px 5px' }}>✓</div>}
                    <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, color: NB.ink }}>{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full-day: single draggable segment bar + per-slot craving inputs */}
          {isFullDay && mealSlots.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, marginBottom: 10 }}>CALORIE SPLIT — drag the dividers to adjust</div>

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
                  <div style={{ padding: '7px 12px', ...nbCardStyle(ok ? NB.green : NB.yellow, 2), border: `3px solid ${NB.white}`, borderRadius: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>
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
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, marginBottom: 8 }}>WHAT ARE YOU CRAVING FOR EACH?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mealSlots.map((slot, idx) => {
                  return (
                    <div key={slot.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MealTypeIcon type={slot.type} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink, letterSpacing: 0.5, marginBottom: 3 }}>{slot.label} · {slot.calories} kcal</div>
                        <input
                          value={slot.craving}
                          onChange={e => setMealSlots(prev => prev.map((s, i) => i === idx ? { ...s, craving: e.target.value } : s))}
                          placeholder={`Craving for ${slot.label.toLowerCase()}… (optional)`}
                          style={{ width: '100%', height: 38, border: 'none', borderRadius: 8, padding: '0 11px', fontSize: 12, color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', background: NB.white, boxSizing: 'border-box' }}
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
            <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', letterSpacing: 1, marginBottom: 4 }}>DAILY TARGET</div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 26, textTransform: 'uppercase', color: NB.ink, marginBottom: 8 }}>{remaining.toLocaleString()} kcal remaining</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['P', targets.protein + 'g', NB.blue], ['C', targets.carbs + 'g', NB.yellow], ['F', targets.fat + 'g', NB.pink]].map(([l, v, c]) => (
                  <div key={l} style={{ flex: 1, padding: '5px 8px', border: `1.5px solid ${NB.ink}`, borderRadius: 8, background: c, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: NB.ink }}>{l} {v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-split preview (single mode) */}
          {!isFullDay && (
            <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', letterSpacing: 1, marginBottom: 10 }}>AUTO-SPLIT PREVIEW</div>
              <div style={{ height: 10, borderRadius: 5, border: `1.5px solid ${NB.ink}`, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
                {mealTypes.map((t, i) => (
                  <div key={t} style={{ flex: 1, background: MEAL_COLORS[t] || NB.teal, marginRight: i < mealTypes.length - 1 ? 2 : 0 }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {mealTypes.map((type, i) => (
                  <div key={type} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NB.ink }}>{type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{splitCalories(mealCount)[i]} kcal</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '10px 22px 20px', flexShrink: 0 }}>
          <button onClick={() => handleGenerate()}
            style={{ width: '100%', height: 54, border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(4), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z" /></svg>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, color: NB.ink, textTransform: 'uppercase' }}>{generatedFrom === 'home' ? 'Your meals' : 'Back'}</span>
          </button>
          <span style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, color: NB.ink }}>{totalGenerated} kcal</span>
        </div>

        <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 24px' }}>
          {generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16 }}>
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div className="spinner"><div /><div /><div /><div /><div /><div /></div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: NB.ink, textAlign: 'center' }}>Building your personalised meals…</div>
              <div style={{ fontSize: 12, color: '#555', textAlign: 'center' }}>Fitting your targets, cravings & dietary needs</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 8 }}>
              {generatedTypes.map(type => generatedMeals?.[type] && (
                <div key={type} style={{ display: 'flex', flexDirection: 'column' }}>
                  <MealDetailCard
                    meal={generatedMeals[type]}
                    mealType={type}
                    name={mealNames[type] || generatedMeals[type].name}
                    userCraving={mealCravings[type]}
                    isEditingName={editingName === type}
                    onEditNameStart={() => setEditingName(type)}
                    onNameChange={(newName) => { setMealNames(prev => ({ ...prev, [type]: newName })); setEditingName(null) }}
                    onSaveToCookbook={defaultType => setSavingContext({ kind: 'generated', type, defaultType })}
                    onViewCookbook={() => setView('cookbook')}
                    saved={savedTypes.has(type)}
                    targets={targets}
                    diff={preAdjustMeals[type] ? diffMeal(preAdjustMeals[type], generatedMeals[type]) : null}
                  />
                  <MealActionBar onAdjust={() => setAdjustingMeal(type)} onLog={() => handleLogOneMeal(type)} logged={loggedTypes.has(type)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {adjustingMeal && generatedMeals?.[adjustingMeal] && (
          <AdjustSheet onClose={() => setAdjustingMeal(null)} onSubmit={(instruction) => handleAdjustMeal(adjustingMeal, instruction)} />
        )}

        {savingContext?.kind === 'generated' && (
          <SaveToCookbookSheet
            defaultType={savingContext.defaultType}
            collections={cookbookCollections}
            onCreateCollection={createCollection}
            onConfirm={({ type, collectionIds }) => { handleSaveToCookbook(savingContext.type, type, collectionIds); setSavingContext(null) }}
            onClose={() => setSavingContext(null)}
          />
        )}
      </div>
    )
  }

  // ═══ COOKBOOK VIEW ════════════════════════════════════════════════════════════
  const cbQuery = cookbookSearch.trim().toLowerCase()
  const filteredCookbook = cookbook.filter(it => !cbQuery || (it.name || '').toLowerCase().includes(cbQuery))
  const activeCollection = cookbookCollections.find(c => c.id === activeCollectionId) || null

  const renderCard = (item, i) => (
    <div key={cookbookKey(item, i)} onClick={() => setViewingCookbookItem(item)}
      style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '14px', cursor: 'pointer' }}>
      <div style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>{slotLabel(item.type)}</div>
      <div style={{ width: 36, height: 36, borderRadius: 9, border: `1.5px solid ${NB.ink}`, background: MEAL_COLORS[item.type] || NB.teal, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MealTypeIcon type={item.type} size={22} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink, lineHeight: 1.3, marginBottom: 4 }}>{item.name}</div>
      <div style={{ fontSize: 11, color: '#555' }}>{item.protein}g P · {item.calories} kcal</div>
    </div>
  )
  const grid = items => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{items.map(renderCard)}</div>
  const emptyState = msg => (
    <div style={{ padding: '28px 16px', textAlign: 'center', border: `2px dashed ${NB.ink}`, borderRadius: 14, background: NB.white }}>
      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{msg}</div>
    </div>
  )

  return (
    <>
      <StatusBar />
      <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => { if (activeCollectionId) { setActiveCollectionId(null); setRenamingCollection(false) } else setView('home') }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>Cookbook</span>
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 0' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input value={cookbookSearch} onChange={e => setCookbookSearch(e.target.value)} placeholder="Search saved meals"
            style={{ width: '100%', height: 44, border: NB_BORDER, borderRadius: 12, paddingLeft: 38, paddingRight: 14, fontSize: 14, color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {activeCollection ? (
          // ── Collection detail ──
          <div style={{ paddingBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              {renamingCollection ? (
                <input autoFocus defaultValue={activeCollection.name}
                  onBlur={e => { renameCollection(activeCollection.id, e.target.value); setRenamingCollection(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') { renameCollection(activeCollection.id, e.target.value); setRenamingCollection(false) } }}
                  style={{ flex: 1, fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, color: NB.ink, textTransform: 'uppercase', border: 'none', borderBottom: `2px solid ${NB.ink}`, outline: 'none', background: 'transparent', padding: '2px 0' }} />
              ) : (
                <span style={{ flex: 1, fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink }}>{activeCollection.name}</span>
              )}
              <button onClick={() => setRenamingCollection(r => !r)} title="Rename" style={{ width: 34, height: 34, border: `2px solid ${NB.ink}`, borderRadius: 9, background: NB.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onClick={() => deleteCollection(activeCollection.id)} title="Delete collection" style={{ width: 34, height: 34, border: `2px solid ${NB.ink}`, borderRadius: 9, background: NB.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </div>
            {(() => {
              const items = filteredCookbook.filter(it => (it.collections || []).includes(activeCollection.id))
              return items.length ? grid(items) : emptyState('No meals in this collection yet. Open any saved meal and tap "Add to collection".')
            })()}
          </div>
        ) : (
          <>
            {/* By type | Collections toggle */}
            <div style={{ display: 'flex', border: `2.5px solid ${NB.ink}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {[['type', 'By type'], ['collections', 'Collections']].map(([id, label]) => (
                <button key={id} onClick={() => setCookbookTab(id)} style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', background: cookbookTab === id ? NB.ink : NB.white, color: cookbookTab === id ? NB.white : NB.ink }}>{label}</button>
              ))}
            </div>

            {cookbookTab === 'type' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 16 }}>
                {COOKBOOK_SECTIONS.map(section => {
                  const items = filteredCookbook.filter(it => sectionForType(it.type) === section.id)
                  if (!items.length) return null
                  return (
                    <div key={section.id}>
                      <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#555', marginBottom: 10 }}>{section.label} · {items.length}</div>
                      {grid(items)}
                    </div>
                  )
                })}
                {filteredCookbook.length === 0 && emptyState(cbQuery ? `No saved meals match "${cookbookSearch}".` : 'No saved meals yet. Generate a meal and tap "Save to Cookbook".')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newCollectionName.trim()) { createCollection(newCollectionName); setNewCollectionName('') } }}
                    placeholder="New collection name"
                    style={{ flex: 1, height: 44, border: NB_BORDER, borderRadius: 12, padding: '0 14px', fontSize: 14, color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => { if (newCollectionName.trim()) { createCollection(newCollectionName); setNewCollectionName('') } }} disabled={!newCollectionName.trim()}
                    style={{ width: 56, border: NB_BORDER, borderRadius: 12, background: newCollectionName.trim() ? NB.teal : NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 22, cursor: newCollectionName.trim() ? 'pointer' : 'default', boxShadow: newCollectionName.trim() ? hardShadow(2) : 'none' }}>+</button>
                </div>
                {cookbookCollections.map(col => {
                  const count = cookbook.filter(it => (it.collections || []).includes(col.id)).length
                  return (
                    <button key={col.id} onClick={() => { setActiveCollectionId(col.id); setRenamingCollection(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, border: `2px solid ${NB.ink}`, background: NB.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, color: NB.ink }}>{col.name}</div>
                        <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#666', fontWeight: 700 }}>{count} meal{count !== 1 ? 's' : ''}</div>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  )
                })}
                {cookbookCollections.length === 0 && emptyState('No collections yet. Create one above (e.g. "Meal prep", "High protein"), then add meals from any saved meal.')}
              </div>
            )}
          </>
        )}

        {viewingCookbookItem && (
          <CookbookItemSheet
            item={viewingCookbookItem}
            targets={targets}
            collections={cookbookCollections}
            onToggleCollection={cid => toggleItemCollection(viewingCookbookItem, cid)}
            onCreateCollection={nm => { const id = createCollection(nm); if (id) toggleItemCollection(viewingCookbookItem, id) }}
            onRemove={() => removeCookbookItem(viewingCookbookItem)}
            onClose={() => setViewingCookbookItem(null)}
            onLog={() => {
              const m = viewingCookbookItem.macros || { calories: viewingCookbookItem.calories || 0, protein: viewingCookbookItem.protein || 0 }
              if (onUpdateLoggedMacros) onUpdateLoggedMacros(prev => addMacros(prev, m))
              if (onMealLogged) onMealLogged({ name: viewingCookbookItem.name || 'Meal', macros: m, ingredients: viewingCookbookItem.ingredients || [], mealType: viewingCookbookItem.type || 'cookbook' })
              setViewingCookbookItem(null)
            }}
          />
        )}
      </div>

      <BottomNav active="meals" onNavigate={onNavigate} />
    </>
  )
}
