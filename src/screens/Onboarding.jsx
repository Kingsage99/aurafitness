import React, { useState, useEffect, useMemo } from 'react'
import ProgressBar from '../components/ProgressBar'
import { StatusBar } from '../components/PhoneFrame'
import AvatarSilhouette from '../components/AvatarSilhouette'
import RulerSlider from '../components/RulerSlider'
import ArcDial from '../components/ArcDial'
import MuscleSVG, { TARGET_AREA_SVG, SVG_TO_TARGET_AREA } from '../components/MuscleSVG'
import CountrySheet from '../components/CountrySheet'
import { COUNTRIES } from '../data/countries'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'
import { GlobeIcon } from '../components/Icons'

const ftInToCm = (ft, inches) => Math.round(parseInt(ft || 0) * 30.48 + parseFloat(inches || 0) * 2.54)
const lbsToKg = (lbs) => Math.round(parseFloat(lbs) / 2.2046 * 10) / 10
const cmToFtIn = (cm) => { const t = Math.round(cm / 2.54); return `${Math.floor(t / 12)}'${t % 12}"` }
const kgToLbs = (kg) => Math.round(kg * 2.2046)
const MEASURE_AVATAR = '/avatar/avatar.png'

function calculateNutrition(weightKg, heightCm, age, daysCount, fitnessGoal) {
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161
  // Standard Mifflin-St Jeor activity factors keyed to training days/week:
  // 1.375 light (1-3d), 1.55 moderate (3-5d), 1.725 very active (6-7d).
  // 1.9 (extra active) is reserved for 2x/day athletes + physical jobs, so we
  // don't use it here — it would inflate targets for regular 6-7 day trainees.
  const mults = { 1: 1.375, 2: 1.375, 3: 1.55, 4: 1.55, 5: 1.55, 6: 1.725, 7: 1.725 }
  const tdee = Math.round(bmr * (mults[daysCount] ?? 1.55))
  const offsets = { lose_weight: -500, build_muscle: 300, tone_recomp: 0, maintain: 0, athletic_performance: 200 }
  return { bmr: Math.round(bmr), tdee, goalTarget: tdee + (offsets[fitnessGoal] ?? 0) }
}

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

const FITNESS_GOALS = [
  { id: 'lose_weight', label: 'Lose weight', sub: 'Burn fat & slim down', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M8 12h8M12 8v8"/></svg> },
  { id: 'build_muscle', label: 'Build muscle', sub: 'Lean bulk & strength', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11M4 9l-2 2 3 3 2-2M20 15l2-2-3-3-2 2"/></svg> },
  { id: 'tone_recomp', label: 'Tone & recompose', sub: 'Lose fat, keep muscle', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10M20.49 9a9 9 0 10-2.13 9.36L23 14"/></svg> },
  { id: 'maintain', label: 'Maintain weight', sub: 'Stay where I am', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> },
  { id: 'athletic_performance', label: 'Improve fitness', sub: 'Performance & endurance', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4.5 12.5h6L9 22l9-12h-6z"/></svg> },
]

const PHYSIQUES = [
  { id: 'lean', label: 'Lean & toned', sub: 'slim, visible definition' },
  { id: 'athletic', label: 'Athletic & strong', sub: 'muscular, broad' },
  { id: 'hourglass', label: 'Hourglass', sub: 'defined waist, curves' },
  { id: 'slimthick', label: 'Slim thick', sub: 'lean top, built legs' },
  { id: 'soft', label: 'Soft & curvy', sub: 'fuller, gentle tone' },
  { id: 'functional', label: 'Fit & functional', sub: 'strength over looks' },
]

const EXPERIENCE = [
  { id: 'starter', label: 'Just starting out', sub: 'New to training or coming back', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4"/></svg> },
  { id: 'some', label: 'Some experience', sub: 'Train on and off, know the basics', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18V9M9 18V5M14 18v-7M19 18v-4"/></svg> },
  { id: 'active', label: 'Fairly active', sub: 'Train regularly, ready to push', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4.5 12.5h6L9 22l9-12h-6z"/></svg> },
]

const PLANNING_MODES = [
  { id: 'guided', label: 'Get a personalized plan', sub: 'MissVfit auto-builds your weekly workout schedule', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/><path d="M8 14l2.5 2.5L16 11"/></svg> },
  { id: 'custom', label: 'Build my own', sub: 'Create and schedule your own workouts from scratch', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> },
]

const WEEK_DAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
]

const EQUIPMENT = [
  { id: 'none', label: 'No equipment', sub: 'Bodyweight only', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg> },
  { id: 'dumbbells', label: 'Dumbbells', sub: 'Free weights at home', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11M4 9l-2 2 3 3 2-2M20 15l2-2-3-3-2 2"/></svg> },
  { id: 'bands', label: 'Resistance bands', sub: 'Light & portable', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12c0-4 3-7 8-7s8 3 8 7-3 7-8 7"/><circle cx="12" cy="12" r="2"/></svg> },
  { id: 'gym', label: 'Full gym', sub: 'Machines & racks', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9v6M21 9v6M6 7v10M18 7v10M6 12h12"/></svg> },
]

const TARGET_AREAS = ['Full body', 'Legs', 'Glutes', 'Core', 'Arms', 'Back']
const DIETARY = ['No preference', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Gluten-free', 'Dairy-free']
const ALLERGIES = ['None', 'Nuts', 'Soy', 'Eggs', 'Shellfish', 'Wheat', 'Lactose']

function Chip({ label, selected, onToggle }) {
  return (
    <button onClick={onToggle} style={{ padding: '10px 16px', border: `2.5px solid ${NB.ink}`, borderRadius: 12, background: selected ? NB.teal : NB.white, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: selected ? 800 : 600, color: NB.ink, cursor: 'pointer', boxShadow: selected ? hardShadow(3) : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
      {selected && <CheckIcon />}
      {label}
    </button>
  )
}

function UnitToggle({ options, active, onToggle }) {
  return (
    <div style={{ display: 'flex', border: `2.5px solid ${NB.ink}`, borderRadius: 10, overflow: 'hidden', gap: 0 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onToggle(opt)} style={{ padding: '5px 12px', fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: active === opt ? NB.ink : 'transparent', color: active === opt ? NB.white : NB.ink, textTransform: 'uppercase' }}>{opt}</button>
      ))}
    </div>
  )
}

const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
const ArrowRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
const ArrowLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)

  // Step 1
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')

  // Steps 2-4
  const [fitnessGoal, setFitnessGoal] = useState('tone_recomp')
  const physique = 'lean_toned' // physique step removed; kept as a neutral default for workout/nutrition weighting
  const [experience, setExperience] = useState('some')

  // Step 5 — Planning mode
  const [planningMode, setPlanningMode] = useState('guided')

  // Step 6 — Training days
  const [trainingDays, setTrainingDays] = useState(new Set())
  const [dayError, setDayError] = useState('')

  // Measurements — sliders drive cm/kg directly; unit toggles only change display
  const [heightCm, setHeightCm] = useState('165')
  const [heightUnit, setHeightUnit] = useState('cm')
  const [weightKg, setWeightKg] = useState('62')
  const [weightUnit, setWeightUnit] = useState('kg')
  const [age, setAge] = useState('25')
  const [measurementError, setMeasurementError] = useState('')
  const [avatarFailed, setAvatarFailed] = useState(false)

  // Step 8 — Equipment (starts empty — user picks from scratch)
  const [equipment, setEquipment] = useState(new Set())

  // Steps 9-11
  const [targetAreas, setTargetAreas] = useState(new Set(['Full body']))
  const [dietary, setDietary] = useState(new Set(['No preference']))
  const [allergies, setAllergies] = useState(new Set(['None']))

  // Step 13 — Country (pre-filled from the browser locale so it's never empty;
  // drives region-accurate nutrition estimates). ISO alpha-2 code.
  const [country, setCountry] = useState(() => {
    try {
      const region = (navigator.language || '').split('-')[1]?.toUpperCase()
      return COUNTRIES.some(c => c.code === region) ? region : ''
    } catch { return '' }
  })
  const [countrySheet, setCountrySheet] = useState(false)
  const selectedCountry = COUNTRIES.find(c => c.code === country)

  // Step 9 — muscle map colors derived from selected target areas
  const step9FrontColors = useMemo(() => {
    const colors = {}
    targetAreas.forEach(area => { TARGET_AREA_SVG[area]?.front?.forEach(id => { colors[id] = NB.ink }) })
    return colors
  }, [targetAreas])
  const step9BackColors = useMemo(() => {
    const colors = {}
    targetAreas.forEach(area => { TARGET_AREA_SVG[area]?.back?.forEach(id => { colors[id] = NB.ink }) })
    return colors
  }, [targetAreas])

  // Step 12 — Nutrition
  const [tdeeData, setTdeeData] = useState(null)
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(null)

  useEffect(() => {
    if (step === 14) {
      const h = parseFloat(heightCm)
      const w = parseFloat(weightKg)
      const a = parseInt(age)
      if (h > 0 && w > 0 && a > 0) {
        const data = calculateNutrition(w, h, a, trainingDays.size, fitnessGoal)
        setTdeeData(data)
        setDailyCalorieTarget(data.goalTarget)
      }
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Sliders always store cm/kg; the toggle only switches how the value is shown.
  const toggleHeightUnit = (unit) => setHeightUnit(unit)
  const toggleWeightUnit = (unit) => setWeightUnit(unit)

  const PHYSIQUE_MAP = { lean: 'lean_toned', athletic: 'athletic', hourglass: 'hourglass', slimthick: 'slim_thick', soft: 'soft_curvy', functional: 'functional' }

  const next = () => {
    if (step === 1 && !username.trim()) { setUsernameError('Please enter your name.'); return }
    if (step === 5 && trainingDays.size < 2) { setDayError('Select at least 2 training days.'); return }
    // Steps 6–8 (height / weight / age) are slider-driven and always valid.
    if (step < 14) { setStep(s => s + 1) } else {
      onComplete({
        name: username.trim(),
        physique: PHYSIQUE_MAP[physique] || 'lean_toned',
        experience,
        trainingDays: [...trainingDays],
        daysPerWeek: trainingDays.size,
        equipment: [...equipment],
        targetAreas: [...targetAreas],
        injuries: [],
        dietary: [...dietary].filter(d => d !== 'No preference'),
        allergies: [...allergies].filter(a => a !== 'None'),
        trainingStyle: 'strength',
        dislikedExercises: [],
        fitnessGoal,
        heightCm: parseFloat(heightCm),
        weightKg: parseFloat(weightKg),
        age: parseInt(age),
        tdee: tdeeData?.tdee ?? null,
        dailyCalorieTarget,
        planningMode,
        country,
      })
    }
  }

  const back = () => setStep(s => s - 1)

  const headerStyle = { padding: '14px 22px 6px', flexShrink: 0 }
  const stepLabel = { fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase' }
  const stepTitle = { fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 25, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.12, marginTop: 4 }
  const stepSub = { fontSize: 13, color: '#555', marginTop: 5 }
  const backBtn = { width: 54, height: 54, borderRadius: 14, border: NB_BORDER, boxShadow: hardShadow(4), background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }
  const nextBtn = { flex: 1, height: 54, borderRadius: 16, border: NB_BORDER, boxShadow: hardShadow(4), background: NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }
  const content = { flex: 1, overflowY: 'auto', padding: '12px 22px 0' }
  const footer = { padding: '10px 22px 26px', flexShrink: 0, display: 'flex', gap: 12 }
  const optionCard = (sel) => ({ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 16, textAlign: 'left', cursor: 'pointer', ...(sel ? nbCardStyle(NB.teal, 4) : nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW)) })
  const optionIconBox = { width: 48, height: 48, borderRadius: 12, border: `2.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  const radioBox = (sel) => ({ width: 24, height: 24, borderRadius: 8, border: `2.5px solid ${NB.ink}`, background: sel ? NB.ink : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })

  return (
    <>
      <StatusBar />
      <ProgressBar step={step} total={14} />

      {/* ── STEP 1: Username ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 1 OF 14</div>
            <div style={stepTitle}>What should we call you?</div>
            <div style={stepSub}>This is how MissVfit will greet you every day.</div>
          </div>
          <div style={content}>
            <div style={{ border: `2.5px solid ${usernameError ? NB.red : NB.ink}`, borderRadius: 16, boxShadow: hardShadow(4), background: NB.white, padding: '18px 20px', marginBottom: 16 }}>
              <input
                value={username}
                onChange={e => { setUsername(e.target.value); setUsernameError('') }}
                onKeyDown={e => e.key === 'Enter' && next()}
                placeholder="Your name or nickname"
                autoFocus
                style={{ width: '100%', fontFamily: NB.fontDisplay, fontSize: 22, fontWeight: 800, color: NB.ink, border: 'none', outline: 'none', background: 'transparent', boxSizing: 'border-box' }}
              />
              {usernameError && <div style={{ marginTop: 8, fontFamily: NB.fontMono, fontSize: 12, color: NB.red, fontWeight: 700 }}>{usernameError}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', ...nbCardStyle(NB.yellow, 3), border: `3px solid ${NB.white}`, borderRadius: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span style={{ fontSize: 13, color: NB.ink, fontWeight: 700 }}>Your personalised plan starts here.</span>
            </div>
          </div>
          <div style={{ padding: '10px 22px 26px', flexShrink: 0 }}>
            <button style={nextBtn} onClick={next}>Let's go <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 2: Fitness goal ─────────────────────────────────────────────── */}
      {step === 2 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 2 OF 14</div>
            <div style={stepTitle}>What's your main goal?</div>
            <div style={stepSub}>We'll build your entire plan around this.</div>
          </div>
          <div style={content}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FITNESS_GOALS.map(g => {
                const sel = fitnessGoal === g.id
                return (
                  <button key={g.id} onClick={() => setFitnessGoal(g.id)} style={optionCard(sel)}>
                    <div style={optionIconBox}>{g.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: NB.fontDisplay, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{g.label}</div>
                      <div style={{ fontSize: 12, color: '#444' }}>{g.sub}</div>
                    </div>
                    <div style={radioBox(sel)}>{sel && <CheckIcon />}</div>
                  </button>
                )
              })}
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 3: Experience ───────────────────────────────────────────────── */}
      {step === 3 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 3 OF 14</div>
            <div style={stepTitle}>How active are you right now?</div>
            <div style={stepSub}>No judgement — we meet you where you are.</div>
          </div>
          <div style={{ flex: 1, padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto' }}>
            {EXPERIENCE.map(e => {
              const sel = experience === e.id
              return (
                <button key={e.id} onClick={() => setExperience(e.id)} style={optionCard(sel)}>
                  <div style={optionIconBox}>{e.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: NB.fontDisplay, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{e.label}</div>
                    <div style={{ fontSize: 12.5, color: '#444' }}>{e.sub}</div>
                  </div>
                  <div style={radioBox(sel)}>{sel && <CheckIcon />}</div>
                </button>
              )
            })}
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 4: Planning mode ────────────────────────────────────────────── */}
      {step === 4 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 4 OF 14</div>
            <div style={stepTitle}>How do you want to train?</div>
            <div style={stepSub}>You can always switch or add your own workouts later.</div>
          </div>
          <div style={{ flex: 1, padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto' }}>
            {PLANNING_MODES.map(m => {
              const sel = planningMode === m.id
              return (
                <button key={m.id} onClick={() => setPlanningMode(m.id)} style={optionCard(sel)}>
                  <div style={optionIconBox}>{m.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: NB.fontDisplay, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{m.label}</div>
                    <div style={{ fontSize: 12.5, color: '#444' }}>{m.sub}</div>
                  </div>
                  <div style={radioBox(sel)}>{sel && <CheckIcon />}</div>
                </button>
              )
            })}
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 5: Training days ────────────────────────────────────────────── */}
      {step === 5 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 5 OF 14</div>
            <div style={stepTitle}>Which days will you train?</div>
            <div style={stepSub}>
              {planningMode === 'custom'
                ? 'Pick at least 2 days. This helps us calculate your calorie needs.'
                : 'Pick at least 2 days. MissVfit will schedule your sessions around these.'}
            </div>
          </div>
          <div style={content}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 16 }}>
              {WEEK_DAYS.map(day => {
                const sel = trainingDays.has(day.id)
                return (
                  <button key={day.id} onClick={() => toggleDay(day.id)}
                    style={{ height: 72, border: `2.5px solid ${NB.ink}`, borderRadius: 12, background: sel ? NB.teal : NB.white, boxShadow: sel ? hardShadow(3) : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 0 }}>
                    <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{day.label}</span>
                    <div style={{ width: 10, height: 10, borderRadius: 3, border: `1.5px solid ${NB.ink}`, background: sel ? NB.ink : NB.white }} />
                  </button>
                )
              })}
            </div>
            {trainingDays.size > 0 && (
              <div style={{ padding: '12px 16px', ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, marginBottom: 12 }}>
                <span style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, color: NB.ink }}>{trainingDays.size} day{trainingDays.size !== 1 ? 's' : ''} selected</span>
                <span style={{ fontSize: 13, color: '#555', marginLeft: 8 }}>
                  {[...trainingDays].map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                </span>
              </div>
            )}
            {dayError && <div style={{ padding: '10px 14px', ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 12, marginBottom: 12 }}><span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{dayError}</span></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', ...nbCardStyle(NB.lavender, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <div style={{ fontSize: 13, color: NB.ink, fontWeight: 700 }}>
                {planningMode === 'custom'
                  ? "You'll build and schedule your own workouts for these days."
                  : 'MissVfit builds your rest days automatically around your training days.'}
              </div>
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 6: Height ───────────────────────────────────────────────────── */}
      {step === 6 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 6 OF 14</div>
            <div style={stepTitle}>Your height</div>
            <div style={stepSub}>Drag the ruler to set your height.</div>
          </div>
          {/* No separate footer row here — Back/Next float over the avatar so
              the crop can run all the way to the true bottom of the screen,
              like the reference, instead of stopping above a footer bar. */}
          <div style={{ flex: 1, padding: '10px 22px 0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <UnitToggle options={['cm', 'ft']} active={heightUnit === 'ftin' ? 'ft' : 'cm'} onToggle={u => toggleHeightUnit(u === 'ft' ? 'ftin' : 'cm')} />
            </div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 48, color: NB.ink, lineHeight: 1, textAlign: 'center', marginTop: 4 }}>
              {heightUnit === 'cm' ? Math.round(+heightCm) : cmToFtIn(+heightCm)}
              {heightUnit === 'cm' && <span style={{ fontSize: 20, fontWeight: 700, color: '#888', marginLeft: 4 }}>cm</span>}
            </div>

            {/* Fills every remaining pixel down to the literal screen edge —
                the avatar runs past that edge and legs/feet crop off there. */}
            <div style={{ position: 'absolute', top: 100, left: 22, right: 22, bottom: 0, display: 'flex', alignItems: 'flex-start', gap: 6, overflow: 'hidden' }}>
              {/* Sized by WIDTH (not height) so the arms are always fully
                  inside the frame — height is auto from the image's own
                  aspect ratio, and only overflows the box (cropping legs at
                  the bottom) when it naturally runs taller than the space. */}
              <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                {avatarFailed
                  ? <AvatarSilhouette height={330} color={NB.ink} />
                  : <img src={MEASURE_AVATAR} onError={() => setAvatarFailed(true)} alt="Your avatar" style={{ width: 235, height: 'auto', objectFit: 'contain', flexShrink: 0, transform: 'translateY(10%)' }} />}
              </div>
              <div style={{ alignSelf: 'center' }}>
                <RulerSlider orientation="vertical" min={120} max={220} value={Math.round(+heightCm)} onChange={v => setHeightCm(String(v))} length={600} thickness={54} pxPerUnit={7.4} />
              </div>
            </div>

            {/* Back/Next float on top of the avatar near the bottom */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 20, display: 'flex', gap: 12, zIndex: 4 }}>
              <button style={backBtn} onClick={back}><ArrowLeft /></button>
              <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
            </div>
          </div>
        </>
      )}

      {/* ── STEP 7: Weight ───────────────────────────────────────────────────── */}
      {step === 7 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 7 OF 14</div>
            <div style={stepTitle}>Your weight</div>
            <div style={stepSub}>Drag the dial to set your weight.</div>
          </div>
          <div style={{ flex: 1, padding: '10px 22px 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <UnitToggle options={['kg', 'lbs']} active={weightUnit} onToggle={u => toggleWeightUnit(u)} />
            </div>
            {/* Avatar shown whole (no crop from a box). A scale-platform plate
                sits under the dial — domed/round on top, straight rectangle
                sides that run down to the floor to fully cover the feet.
                Slightly darker than the page background so it reads as a
                distinct surface rather than blending in completely. */}
            <div style={{ position: 'relative', height: 470, marginTop: 6, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              {avatarFailed
                ? <AvatarSilhouette height={380} color={NB.ink} />
                : <img src={MEASURE_AVATAR} onError={() => setAvatarFailed(true)} alt="Your avatar" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />}
              <div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', width: 380, height: 95, borderTopLeftRadius: 190, borderTopRightRadius: 190, background: '#E6DEEE', zIndex: 1 }} />
              <div style={{ position: 'absolute', left: '50%', bottom: 52, transform: 'translateX(-50%)', zIndex: 2 }}>
                <ArcDial min={30} max={200} value={Math.round(+weightKg)} onChange={v => setWeightKg(String(v))} width={344} height={86} />
              </div>
            </div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 40, color: NB.ink, lineHeight: 1, textAlign: 'center', marginTop: 4 }}>
              {weightUnit === 'kg' ? Math.round(+weightKg) : kgToLbs(+weightKg)}
              <span style={{ fontSize: 18, fontWeight: 700, color: '#888', marginLeft: 4 }}>{weightUnit}</span>
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 8: Age ──────────────────────────────────────────────────────── */}
      {step === 8 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 8 OF 14</div>
            <div style={stepTitle}>Your age</div>
            <div style={stepSub}>Drag the ruler to set your age.</div>
          </div>
          <div style={{ flex: 1, padding: '10px 22px 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
              {avatarFailed
                ? <AvatarSilhouette height={340} color={NB.ink} />
                : <img src={MEASURE_AVATAR} onError={() => setAvatarFailed(true)} alt="Your avatar" style={{ height: 460, maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
              <RulerSlider orientation="horizontal" min={14} max={80} value={Math.round(+age)} onChange={v => setAge(String(v))} length={330} thickness={44} pxPerUnit={11} majorEvery={5} labelEvery={5} />
            </div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 40, color: NB.ink, lineHeight: 1, textAlign: 'center', marginTop: 6 }}>
              {Math.round(+age)}<span style={{ fontSize: 18, fontWeight: 700, color: '#888', marginLeft: 4 }}>yrs</span>
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 9: Equipment ────────────────────────────────────────────────── */}
      {step === 9 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 9 OF 14</div>
            <div style={stepTitle}>What do you have access to?</div>
            <div style={stepSub}>Select all that apply.</div>
          </div>
          <div style={{ flex: 1, padding: '16px 22px 0', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              {EQUIPMENT.map(eq => {
                const sel = equipment.has(eq.id)
                return (
                  <button key={eq.id} onClick={() => toggleSet(setEquipment, eq.id)}
                    style={{ height: 140, borderRadius: 16, padding: 16, cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', ...(sel ? nbCardStyle(NB.teal, 4) : nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW)) }}>
                    {sel && <div style={{ position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 7, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg></div>}
                    <div style={optionIconBox}>{eq.icon}</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{eq.label}</div>
                      <div style={{ fontSize: 11.5, color: '#444' }}>{eq.sub}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 10: Target areas ────────────────────────────────────────────── */}
      {step === 10 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 10 OF 14</div>
            <div style={stepTitle}>Any areas you want to focus on?</div>
            <div style={stepSub}>Tap the body or use the chips — we'll shape your focus.</div>
          </div>
          <div style={{ flex: 1, padding: '8px 22px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, overflowY: 'auto' }}>

            {/* Side-by-side muscle map */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <div style={{ width: 130, height: 220, ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 16, overflow: 'hidden' }}>
                <MuscleSVG
                  url="/muscle_map_front.svg"
                  muscleColors={step9FrontColors}
                  onMuscleClick={(area) => toggleSet(setTargetAreas, area)}
                />
              </div>
              <div style={{ width: 130, height: 220, ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 16, overflow: 'hidden' }}>
                <MuscleSVG
                  url="/muscle_map_back.svg"
                  muscleColors={step9BackColors}
                  onMuscleClick={(area) => toggleSet(setTargetAreas, area)}
                />
              </div>
            </div>

            <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Tap a muscle to select — or use the chips below</div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {TARGET_AREAS.map(a => <Chip key={a} label={a} selected={targetAreas.has(a)} onToggle={() => toggleSet(setTargetAreas, a)} />)}
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 11: Dietary ─────────────────────────────────────────────────── */}
      {step === 11 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 11 OF 14</div>
            <div style={stepTitle}>Any dietary preferences?</div>
            <div style={stepSub}>We'll tailor your meal suggestions.</div>
          </div>
          <div style={{ flex: 1, padding: '16px 22px 0', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {DIETARY.map(d => <Chip key={d} label={d} selected={dietary.has(d)} onToggle={() => toggleExclusive(setDietary, d, 'No preference')} />)}
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 12: Allergies ───────────────────────────────────────────────── */}
      {step === 12 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 12 OF 14</div>
            <div style={stepTitle}>Any food allergies?</div>
            <div style={stepSub}>We'll keep these out of your meal plan.</div>
          </div>
          <div style={{ flex: 1, padding: '16px 22px 0', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {ALLERGIES.map(a => <Chip key={a} label={a} selected={allergies.has(a)} onToggle={() => toggleExclusive(setAllergies, a, 'None')} />)}
            </div>
            <div style={{ marginTop: 20, padding: '16px', ...nbCardStyle(NB.yellow, 3), border: `3px solid ${NB.white}`, borderRadius: 16 }}>
              <div style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 6 }}>One last step!</div>
              <div style={{ fontSize: 12.5, color: NB.ink, lineHeight: 1.4 }}>Next we'll calculate your personal calorie target based on your measurements and goal.</div>
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 13: Country ─────────────────────────────────────────────────── */}
      {step === 13 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 13 OF 14</div>
            <div style={stepTitle}>Where are you based?</div>
            <div style={stepSub}>Food differs by country — this makes your calorie & macro estimates accurate for your region.</div>
          </div>
          <div style={content}>
            <button onClick={() => setCountrySheet(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', ...nbCardStyle(NB_CARD_NEUTRAL, 4, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, cursor: 'pointer', textAlign: 'left', marginBottom: 16 }}>
              {selectedCountry?.flag ? <span style={{ fontSize: 34 }}>{selectedCountry.flag}</span> : <GlobeIcon size={34} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1, textTransform: 'uppercase' }}>Your country</div>
                <div style={{ fontFamily: NB.fontDisplay, fontSize: 20, fontWeight: 800, color: NB.ink }}>{selectedCountry?.name || 'Select your country'}</div>
              </div>
              <ArrowRight />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', ...nbCardStyle(NB.lavender, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z"/></svg>
              <span style={{ fontSize: 13, color: NB.ink, fontWeight: 700 }}>The same fast-food item can differ by 50+ calories between countries — MissVfit uses your region to get it right.</span>
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 14: Nutrition goal ──────────────────────────────────────────── */}
      {step === 14 && (() => {
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

        return (
          <>
            <div style={headerStyle}>
              <div style={stepLabel}>STEP 14 OF 14</div>
              <div style={stepTitle}>Your nutrition target</div>
              <div style={stepSub}>Based on your body & goal — adjust to your comfort.</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 22px 0' }}>
              <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Your maintenance (TDEE)</div>
                <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 28, color: NB.ink, lineHeight: 1.1 }}>{tdeeData?.tdee?.toLocaleString() ?? '—'} <span style={{ fontFamily: NB.fontMono, fontSize: 14, color: '#555', fontWeight: 700 }}>kcal/day</span></div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Based on your height, weight, age & {trainingDays.size} training days/week</div>
              </div>

              <div style={{ ...nbCardStyle(NB.teal, 4), border: `3px solid ${NB.white}`, borderRadius: 18, padding: '16px', marginBottom: 14 }}>
                <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Your daily target</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <button onClick={() => setDailyCalorieTarget(t => Math.max(800, (t ?? 1500) - 50))} style={{ width: 48, height: 48, borderRadius: 12, border: `2.5px solid ${NB.ink}`, background: NB.white, fontSize: 22, fontWeight: 800, color: NB.ink, cursor: 'pointer', flexShrink: 0 }}>−</button>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 42, color: NB.ink, lineHeight: 1 }}>{dailyCalorieTarget?.toLocaleString() ?? '—'}</div>
                    <div style={{ fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 700 }}>kcal / day</div>
                  </div>
                  <button onClick={() => setDailyCalorieTarget(t => (t ?? 1500) + 50)} style={{ width: 48, height: 48, borderRadius: 12, border: `2.5px solid ${NB.ink}`, background: NB.white, fontSize: 22, fontWeight: 800, color: NB.ink, cursor: 'pointer', flexShrink: 0 }}>+</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {presets.map(({ label, offset }) => {
                  const val = (tdeeData?.tdee ?? 0) + offset
                  const sel = dailyCalorieTarget === val
                  return <button key={label} onClick={() => setDailyCalorieTarget(val)} style={{ flex: 1, height: 40, borderRadius: 12, border: `2px solid ${NB.ink}`, background: sel ? NB.yellow : NB.white, boxShadow: sel ? hardShadow(2) : 'none', fontFamily: NB.fontMono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}>{label}</button>
                })}
              </div>

              {tdeeData && dailyCalorieTarget && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', ...nbCardStyle(NB.lavender, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, marginBottom: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  <span style={{ fontSize: 13, color: NB.ink, fontWeight: 700 }}>{weeklyText}</span>
                </div>
              )}

              {warnings.map((w, i) => (
                <div key={i} style={{ ...nbCardStyle(w.level === 'red' ? NB.red : NB.yellow, 3), border: `3px solid ${NB.white}`, borderRadius: 14, padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <svg width="16" height="16" style={{ flexShrink: 0, marginTop: 1 }} viewBox="0 0 24 24" fill="none" stroke={w.level === 'red' ? NB.white : NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                  <span style={{ fontSize: 12, color: w.level === 'red' ? NB.white : NB.ink, fontWeight: 700, lineHeight: 1.5 }}>{w.text}</span>
                </div>
              ))}
            </div>
            <div style={footer}>
              <button style={backBtn} onClick={back}><ArrowLeft /></button>
              <button onClick={next} style={{ ...nextBtn, background: NB.magenta, color: NB.white }}>
                {planningMode === 'custom' ? 'Next: build my workout' : 'Reveal my path'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z"/></svg>
              </button>
            </div>
          </>
        )
      })()}

      {countrySheet && (
        <CountrySheet
          onSelect={code => { setCountry(code); setCountrySheet(false) }}
          onClose={() => setCountrySheet(false)}
        />
      )}
    </>
  )
}
