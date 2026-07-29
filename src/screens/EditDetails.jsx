import React, { useState, useEffect, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import RulerSlider from '../components/RulerSlider'
import CountrySheet from '../components/CountrySheet'
import { COUNTRIES } from '../data/countries'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'
import { GlobeIcon, FeatherIcon, DumbbellIcon, HourglassIcon, BalanceScaleIcon, WingsIcon } from '../components/Icons'
import { calculateNutrition } from '../utils/nutrition'
import { kgToLbs } from '../utils/units'

// In-place editor for the onboarding-collected fields a user might legitimately
// want to change later, without wiping their account and re-running all 15
// onboarding steps (see Settings.jsx's old "Redo Onboarding", now removed).
// Deliberately excludes: physique (vestigial/hardcoded), injuries (Onboarding
// never actually collects it and every exercises.json injuries_avoid entry is
// an empty array today, so a picker here would be cosmetic), dislikedExercises
// (managed via the per-exercise swap flow), trainingStyle/units (already their
// own Settings sections), planningMode (bigger structural change, out of scope).

const cmToFtIn = (cm) => { const t = Math.round(cm / 2.54); return `${Math.floor(t / 12)}'${t % 12}"` }

const FITNESS_GOALS = [
  { id: 'lose_weight', label: 'Lose weight', sub: 'Burn fat & slim down', icon: <FeatherIcon size={22} /> },
  { id: 'build_muscle', label: 'Build muscle', sub: 'Lean bulk & strength', icon: <DumbbellIcon size={22} /> },
  { id: 'tone_recomp', label: 'Tone & recompose', sub: 'Lose fat, keep muscle', icon: <HourglassIcon size={22} /> },
  { id: 'maintain', label: 'Maintain weight', sub: 'Stay where I am', icon: <BalanceScaleIcon size={22} /> },
  { id: 'athletic_performance', label: 'Improve fitness', sub: 'Performance & endurance', icon: <WingsIcon size={22} /> },
]

const EXPERIENCE = [
  { id: 'starter', label: 'Just starting out', sub: 'New to training or coming back', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4"/></svg> },
  { id: 'some', label: 'Some experience', sub: 'Train on and off, know the basics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18V9M9 18V5M14 18v-7M19 18v-4"/></svg> },
  { id: 'active', label: 'Fairly active', sub: 'Train regularly, ready to push', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4.5 12.5h6L9 22l9-12h-6z"/></svg> },
]

const WEEK_DAYS = [
  { id: 'monday', label: 'Mon' }, { id: 'tuesday', label: 'Tue' }, { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' }, { id: 'friday', label: 'Fri' }, { id: 'saturday', label: 'Sat' }, { id: 'sunday', label: 'Sun' },
]

const EQUIPMENT = [
  { id: 'none', label: 'No equipment', sub: 'Bodyweight only', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg> },
  { id: 'dumbbells', label: 'Dumbbells', sub: 'Free weights at home', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11M4 9l-2 2 3 3 2-2M20 15l2-2-3-3-2 2"/></svg> },
  { id: 'bands', label: 'Resistance bands', sub: 'Light & portable', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12c0-4 3-7 8-7s8 3 8 7-3 7-8 7"/><circle cx="12" cy="12" r="2"/></svg> },
  { id: 'gym', label: 'Full gym', sub: 'Machines & racks', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9v6M21 9v6M6 7v10M18 7v10M6 12h12"/></svg> },
]

const TARGET_AREAS = ['Full body', 'Legs', 'Glutes', 'Core', 'Arms', 'Back']
const DIETARY = ['No preference', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Gluten-free', 'Dairy-free']
const ALLERGIES = ['None', 'Nuts', 'Soy', 'Eggs', 'Shellfish', 'Wheat', 'Lactose']

function SectionLabel({ children }) {
  return <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
}

function Chip({ label, selected, onToggle }) {
  return (
    <button onClick={onToggle} style={{ padding: '10px 16px', border: `2.5px solid ${NB.ink}`, borderRadius: 12, background: selected ? NB.teal : NB.white, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: selected ? 800 : 600, color: NB.ink, cursor: 'pointer', boxShadow: selected ? hardShadow(3) : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
      {selected && <CheckIcon />}
      {label}
    </button>
  )
}
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>

function OptionRow({ label, sub, icon, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `2.5px solid ${NB.ink}`, borderRadius: 14, background: selected ? NB.teal : NB.white, boxShadow: selected ? hardShadow(3) : 'none', cursor: 'pointer', textAlign: 'left' }}>
      {icon && (
        <div style={{ width: 38, height: 38, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{sub}</div>}
      </div>
      {selected && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>}
    </button>
  )
}

// Copied verbatim from Onboarding.jsx (kept local/unexported there, so kept
// local/unexported here too — same file-organization convention).
function getCalorieWarnings(target, tdee) {
  if (!target || !tdee) return []
  const warnings = []
  const deficit = tdee - target
  const surplus = target - tdee
  if (target < 1200) warnings.push({ level: 'red', text: 'Going below 1,200 kcal/day can cause nutrient deficiencies, muscle loss, and hormonal disruption.' })
  else if (target < 1400) warnings.push({ level: 'yellow', text: 'This is a very aggressive cut. It may affect energy and hormones.' })
  if (deficit > 1000) warnings.push({ level: 'red', text: 'This deficit is too extreme. Losing over 1 kg/week risks muscle loss.' })
  else if (deficit > 750) warnings.push({ level: 'yellow', text: 'Aggressive deficit. Sustainable fat loss is typically 0.5–0.75 kg/week.' })
  if (surplus > 700) warnings.push({ level: 'red', text: 'This surplus is very aggressive and will likely cause significant fat gain.' })
  else if (surplus > 500) warnings.push({ level: 'yellow', text: 'A large surplus may cause excess fat gain. Aim for 200–400 kcal above TDEE.' })
  return warnings
}

export default function EditDetails({ userProfile, onUpdateProfile, onNavigate }) {
  const units = userProfile?.units || 'metric'

  const [name, setName] = useState(userProfile?.name || '')
  const [nameError, setNameError] = useState('')
  const [fitnessGoal, setFitnessGoal] = useState(userProfile?.fitnessGoal || 'tone_recomp')
  const [experience, setExperience] = useState(userProfile?.experience || 'some')
  const [trainingDays, setTrainingDays] = useState(() => new Set(userProfile?.trainingDays || []))
  const [dayError, setDayError] = useState('')
  const [heightCm, setHeightCm] = useState(String(userProfile?.heightCm || 165))
  const [weightKg, setWeightKg] = useState(String(userProfile?.weightKg || 62))
  const [age, setAge] = useState(String(userProfile?.age || 25))
  const [equipment, setEquipment] = useState(() => new Set(userProfile?.equipment || []))
  const [targetAreas, setTargetAreas] = useState(() => new Set(userProfile?.targetAreas || []))
  const [dietary, setDietary] = useState(() => {
    const saved = userProfile?.dietary || []
    return new Set(saved.length ? saved : ['No preference'])
  })
  const [allergies, setAllergies] = useState(() => {
    const saved = userProfile?.allergies || []
    return new Set(saved.length ? saved : ['None'])
  })
  const [country, setCountry] = useState(userProfile?.country || '')
  const [countrySheet, setCountrySheet] = useState(false)
  const selectedCountry = COUNTRIES.find(c => c.code === country)

  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(userProfile?.dailyCalorieTarget ?? null)
  const [saving, setSaving] = useState(false)

  const toggleSet = (setter, value) => setter(prev => { const n = new Set(prev); n.has(value) ? n.delete(value) : n.add(value); return n })
  const toggleExclusive = (setter, value, sentinel) => setter(prev => {
    const n = new Set(prev)
    if (value === sentinel) return new Set([sentinel])
    n.delete(sentinel)
    n.has(value) ? n.delete(value) : n.add(value)
    if (n.size === 0) n.add(sentinel)
    return n
  })
  const toggleDay = (id) => { setDayError(''); setTrainingDays(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  // Live TDEE/goal-target math from the CURRENT form values — recomputes as
  // weight/height/age/training days/goal change, mirroring Onboarding step 14.
  // Never overwrites the dailyCalorieTarget STATE itself (see effect below) —
  // the stepper stays whatever it already was until the user explicitly moves
  // it (−/+/a preset), so editing weight and walking away leaves a previously
  // hand-tuned target completely untouched.
  const tdeeData = useMemo(() => {
    const h = parseFloat(heightCm)
    const w = parseFloat(weightKg)
    const a = parseInt(age)
    if (h > 0 && w > 0 && a > 0) return calculateNutrition(w, h, a, trainingDays.size, fitnessGoal)
    return null
  }, [heightCm, weightKg, age, trainingDays, fitnessGoal])

  // Only backfills the stepper when the profile had no saved target at all
  // (legacy/incomplete profile) — never re-fires once it holds a value.
  useEffect(() => {
    if (dailyCalorieTarget == null && tdeeData) setDailyCalorieTarget(tdeeData.goalTarget)
  }, [tdeeData]) // eslint-disable-line react-hooks/exhaustive-deps

  const warnings = getCalorieWarnings(dailyCalorieTarget, tdeeData?.tdee)
  const diff = (dailyCalorieTarget ?? 0) - (tdeeData?.tdee ?? 0)
  const weeklyKg = (Math.abs(diff) / 500 * 0.5).toFixed(2)
  const weeklyText = Math.abs(diff) < 50 ? 'Maintaining weight' : diff < 0 ? `~${weeklyKg} kg/week loss` : `~${weeklyKg} kg/week gain`
  const isCutting = ['lose_weight', 'tone_recomp'].includes(fitnessGoal)
  const isBuilding = ['build_muscle', 'athletic_performance'].includes(fitnessGoal)
  const presets = isCutting
    ? [{ label: 'Conservative', offset: -250 }, { label: 'Moderate', offset: -500 }, { label: 'Aggressive', offset: -750 }]
    : isBuilding
      ? [{ label: 'Conservative', offset: 150 }, { label: 'Moderate', offset: 300 }, { label: 'Aggressive', offset: 500 }]
      : [{ label: '−100 kcal', offset: -100 }, { label: 'Maintenance', offset: 0 }, { label: '+100 kcal', offset: 100 }]

  const handleSave = async () => {
    if (!name.trim()) { setNameError('Please enter your name.'); return }
    if (trainingDays.size < 2) { setDayError('Select at least 2 training days.'); return }

    const h = parseFloat(heightCm)
    const w = parseFloat(weightKg)
    const ageNum = parseInt(age)
    const driversChanged = (
      h !== userProfile?.heightCm ||
      w !== userProfile?.weightKg ||
      ageNum !== userProfile?.age ||
      trainingDays.size !== (userProfile?.daysPerWeek ?? 0) ||
      fitnessGoal !== userProfile?.fitnessGoal
    )

    const partial = {
      name: name.trim(),
      fitnessGoal,
      experience,
      trainingDays: [...trainingDays],
      daysPerWeek: trainingDays.size,
      heightCm: h,
      weightKg: w,
      age: ageNum,
      equipment: [...equipment],
      targetAreas: [...targetAreas],
      dietary: [...dietary].filter(d => d !== 'No preference'),
      allergies: [...allergies].filter(al => al !== 'None'),
      country,
    }

    if (driversChanged && tdeeData) {
      partial.tdee = tdeeData.tdee
      partial.dailyCalorieTarget = dailyCalorieTarget
    } else if (dailyCalorieTarget !== (userProfile?.dailyCalorieTarget ?? null)) {
      partial.dailyCalorieTarget = dailyCalorieTarget
    }

    setSaving(true)
    await onUpdateProfile?.(partial)
    setSaving(false)
    onNavigate('settings')
  }

  return (
    <>
      <StatusBar />

      <div style={{ padding: '10px 22px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onNavigate('settings')} style={{ width: 38, height: 38, borderRadius: 12, border: NB_BORDER, background: NB.white, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>Edit My Details</div>
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 20px' }}>

        {/* Name */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Name</SectionLabel>
          <div style={{ border: `2.5px solid ${nameError ? NB.red : NB.ink}`, borderRadius: 14, boxShadow: hardShadow(3), background: NB.white, padding: '12px 16px' }}>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setNameError('') }}
              placeholder="Your name or nickname"
              style={{ width: '100%', fontFamily: NB.fontDisplay, fontSize: 16, fontWeight: 700, color: NB.ink, border: 'none', outline: 'none', background: 'transparent', boxSizing: 'border-box' }}
            />
          </div>
          {nameError && <div style={{ marginTop: 6, fontFamily: NB.fontMono, fontSize: 11, color: NB.red, fontWeight: 700, paddingLeft: 4 }}>{nameError}</div>}
        </div>

        {/* Fitness Goal */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Fitness Goal</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FITNESS_GOALS.map(g => (
              <OptionRow key={g.id} label={g.label} sub={g.sub} icon={g.icon} selected={fitnessGoal === g.id} onClick={() => setFitnessGoal(g.id)} />
            ))}
          </div>
        </div>

        {/* Experience */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Experience</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {EXPERIENCE.map(e => (
              <OptionRow key={e.id} label={e.label} sub={e.sub} icon={e.icon} selected={experience === e.id} onClick={() => setExperience(e.id)} />
            ))}
          </div>
        </div>

        {/* Training Days */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Training Days</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 10 }}>
            {WEEK_DAYS.map(day => {
              const sel = trainingDays.has(day.id)
              return (
                <button key={day.id} onClick={() => toggleDay(day.id)} style={{ height: 60, border: `2.5px solid ${NB.ink}`, borderRadius: 12, background: sel ? NB.teal : NB.white, boxShadow: sel ? hardShadow(2) : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 0 }}>
                  <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{day.label}</span>
                  <div style={{ width: 8, height: 8, borderRadius: 3, border: `1.5px solid ${NB.ink}`, background: sel ? NB.ink : NB.white }} />
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 12, color: '#555' }}>{trainingDays.size} day{trainingDays.size !== 1 ? 's' : ''} selected — at least 2 required</div>
          {dayError && <div style={{ marginTop: 6, fontFamily: NB.fontMono, fontSize: 11, color: NB.red, fontWeight: 700 }}>{dayError}</div>}
        </div>

        {/* Height */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Height</SectionLabel>
          <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 30, color: NB.ink, textAlign: 'center' }}>
              {units === 'imperial' ? cmToFtIn(+heightCm) : Math.round(+heightCm)}
              {units !== 'imperial' && <span style={{ fontSize: 16, fontWeight: 700, color: '#888', marginLeft: 4 }}>cm</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <RulerSlider orientation="horizontal" min={120} max={220} value={Math.round(+heightCm)} onChange={v => setHeightCm(String(v))} length={300} thickness={54} pxPerUnit={9} majorEvery={5} labelEvery={10} formatLabel={v => units === 'imperial' ? cmToFtIn(v) : v} />
            </div>
          </div>
        </div>

        {/* Weight */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Weight</SectionLabel>
          <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 30, color: NB.ink, textAlign: 'center' }}>
              {units === 'imperial' ? Math.round(kgToLbs(+weightKg)) : Math.round(+weightKg)}
              <span style={{ fontSize: 16, fontWeight: 700, color: '#888', marginLeft: 4 }}>{units === 'imperial' ? 'lbs' : 'kg'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <RulerSlider orientation="horizontal" min={30} max={200} value={Math.round(+weightKg)} onChange={v => setWeightKg(String(v))} length={300} thickness={54} pxPerUnit={9} majorEvery={5} labelEvery={5} formatLabel={v => units === 'imperial' ? Math.round(kgToLbs(v)) : v} />
            </div>
          </div>
        </div>

        {/* Age */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Age</SectionLabel>
          <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 30, color: NB.ink, textAlign: 'center' }}>
              {Math.round(+age)}<span style={{ fontSize: 16, fontWeight: 700, color: '#888', marginLeft: 4 }}>yrs</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <RulerSlider orientation="horizontal" min={14} max={80} value={Math.round(+age)} onChange={v => setAge(String(v))} length={300} thickness={54} pxPerUnit={9} majorEvery={5} labelEvery={5} />
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Equipment</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {EQUIPMENT.map(eq => {
              const sel = equipment.has(eq.id)
              return (
                <button key={eq.id} onClick={() => toggleSet(setEquipment, eq.id)} style={{ height: 108, borderRadius: 14, padding: 14, cursor: 'pointer', position: 'relative', textAlign: 'left', border: `2.5px solid ${NB.ink}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', ...(sel ? nbCardStyle(NB.teal, 3) : nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW)) }}>
                  {sel && (
                    <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 6, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
                    </div>
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{eq.icon}</div>
                  <div>
                    <div style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{eq.label}</div>
                    <div style={{ fontSize: 10.5, color: '#444' }}>{eq.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Target Areas — chips only; deliberately no MuscleSVG tap-map here
            (that component's tap-coordinate logic is scoped to Onboarding). */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Target Areas</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {TARGET_AREAS.map(a => <Chip key={a} label={a} selected={targetAreas.has(a)} onToggle={() => toggleSet(setTargetAreas, a)} />)}
          </div>
        </div>

        {/* Dietary Preferences */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Dietary Preferences</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {DIETARY.map(d => <Chip key={d} label={d} selected={dietary.has(d)} onToggle={() => toggleExclusive(setDietary, d, 'No preference')} />)}
          </div>
        </div>

        {/* Allergies */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Allergies</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ALLERGIES.map(a => <Chip key={a} label={a} selected={allergies.has(a)} onToggle={() => toggleExclusive(setAllergies, a, 'None')} />)}
          </div>
        </div>

        {/* Country */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Country</SectionLabel>
          <button onClick={() => setCountrySheet(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}>
            {selectedCountry?.flag ? <span style={{ fontSize: 28 }}>{selectedCountry.flag}</span> : <GlobeIcon size={28} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: 1, textTransform: 'uppercase' }}>Your country</div>
              <div style={{ fontFamily: NB.fontDisplay, fontSize: 16, fontWeight: 800, color: NB.ink }}>{selectedCountry?.name || 'Select your country'}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Nutrition Target — mirrors Onboarding step 14's TDEE card, stepper,
            presets and warnings, fed by the live-recomputed calculateNutrition
            above; never auto-overwrites a previously saved dailyCalorieTarget. */}
        <div>
          <SectionLabel>Nutrition Target</SectionLabel>
          <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Your maintenance (TDEE)</div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 26, color: NB.ink, lineHeight: 1.1 }}>{tdeeData?.tdee?.toLocaleString() ?? '—'} <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: '#555', fontWeight: 700 }}>kcal/day</span></div>
            <div style={{ fontSize: 11.5, color: '#555', marginTop: 2 }}>Based on your height, weight, age & {trainingDays.size} training days/week</div>
          </div>

          <div style={{ ...nbCardStyle(NB.teal, 4), border: `3px solid ${NB.white}`, borderRadius: 18, padding: '16px', marginBottom: 10 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Your daily target</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => setDailyCalorieTarget(t => Math.max(1200, (t ?? 1500) - 50))} style={{ width: 46, height: 46, borderRadius: 12, border: `2.5px solid ${NB.ink}`, background: NB.white, fontSize: 20, fontWeight: 800, color: NB.ink, cursor: 'pointer', flexShrink: 0 }}>−</button>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 38, color: NB.ink, lineHeight: 1 }}>{dailyCalorieTarget?.toLocaleString() ?? '—'}</div>
                <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700 }}>kcal / day</div>
              </div>
              <button onClick={() => setDailyCalorieTarget(t => (t ?? 1500) + 50)} style={{ width: 46, height: 46, borderRadius: 12, border: `2.5px solid ${NB.ink}`, background: NB.white, fontSize: 20, fontWeight: 800, color: NB.ink, cursor: 'pointer', flexShrink: 0 }}>+</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {presets.map(({ label, offset }) => {
              const val = (tdeeData?.tdee ?? 0) + offset
              const sel = dailyCalorieTarget === val
              return <button key={label} onClick={() => setDailyCalorieTarget(val)} style={{ flex: 1, height: 38, borderRadius: 12, border: `2px solid ${NB.ink}`, background: sel ? NB.yellow : NB.white, boxShadow: sel ? hardShadow(2) : 'none', fontFamily: NB.fontMono, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}>{label}</button>
            })}
          </div>

          {tdeeData && dailyCalorieTarget && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', ...nbCardStyle(NB.lavender, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, marginBottom: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
              <span style={{ fontSize: 12.5, color: NB.ink, fontWeight: 700 }}>{weeklyText}</span>
            </div>
          )}

          {warnings.map((w, i) => (
            <div key={i} style={{ ...nbCardStyle(w.level === 'red' ? NB.red : NB.yellow, 3), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <svg width="16" height="16" style={{ flexShrink: 0, marginTop: 1 }} viewBox="0 0 24 24" fill="none" stroke={w.level === 'red' ? NB.white : NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
              <span style={{ fontSize: 11.5, color: w.level === 'red' ? NB.white : NB.ink, fontWeight: 700, lineHeight: 1.5 }}>{w.text}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Sticky Save footer — a deliberate deviation from Settings.jsx (where
          every toggle/action is independently immediate). This screen is one
          form; it needs a single commit action, same as Onboarding's own
          fixed footer. */}
      <div style={{ padding: '10px 22px 26px', flexShrink: 0 }}>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', height: 54, borderRadius: 16, border: NB_BORDER, boxShadow: hardShadow(4), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {countrySheet && (
        <CountrySheet
          onSelect={code => { setCountry(code); setCountrySheet(false) }}
          onClose={() => setCountrySheet(false)}
        />
      )}
    </>
  )
}
