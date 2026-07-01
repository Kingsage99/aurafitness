import React, { useState, useEffect, useMemo } from 'react'
import ProgressBar from '../components/ProgressBar'
import { StatusBar } from '../components/PhoneFrame'
import AvatarSilhouette from '../components/AvatarSilhouette'
import MuscleSVG, { TARGET_AREA_SVG, SVG_TO_TARGET_AREA } from '../components/MuscleSVG'

const ftInToCm = (ft, inches) => Math.round(parseInt(ft || 0) * 30.48 + parseFloat(inches || 0) * 2.54)
const lbsToKg = (lbs) => Math.round(parseFloat(lbs) / 2.2046 * 10) / 10

function calculateNutrition(weightKg, heightCm, age, daysCount, fitnessGoal) {
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161
  const mults = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.55, 5: 1.725, 6: 1.9, 7: 1.9 }
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
  { id: 'lose_weight', label: 'Lose weight', sub: 'Burn fat & slim down', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M8 12h8M12 8v8"/></svg> },
  { id: 'build_muscle', label: 'Build muscle', sub: 'Lean bulk & strength', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11M4 9l-2 2 3 3 2-2M20 15l2-2-3-3-2 2"/></svg> },
  { id: 'tone_recomp', label: 'Tone & recompose', sub: 'Lose fat, keep muscle', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10M20.49 9a9 9 0 10-2.13 9.36L23 14"/></svg> },
  { id: 'maintain', label: 'Maintain weight', sub: 'Stay where I am', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> },
  { id: 'athletic_performance', label: 'Improve fitness', sub: 'Performance & endurance', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4.5 12.5h6L9 22l9-12h-6z"/></svg> },
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
  { id: 'starter', label: 'Just starting out', sub: 'New to training or coming back', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4"/></svg> },
  { id: 'some', label: 'Some experience', sub: 'Train on and off, know the basics', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18V9M9 18V5M14 18v-7M19 18v-4"/></svg> },
  { id: 'active', label: 'Fairly active', sub: 'Train regularly, ready to push', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4.5 12.5h6L9 22l9-12h-6z"/></svg> },
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
  { id: 'none', label: 'No equipment', sub: 'Bodyweight only', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg> },
  { id: 'dumbbells', label: 'Dumbbells', sub: 'Free weights at home', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11M4 9l-2 2 3 3 2-2M20 15l2-2-3-3-2 2"/></svg> },
  { id: 'bands', label: 'Resistance bands', sub: 'Light & portable', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12c0-4 3-7 8-7s8 3 8 7-3 7-8 7"/><circle cx="12" cy="12" r="2"/></svg> },
  { id: 'gym', label: 'Full gym', sub: 'Machines & racks', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9v6M21 9v6M6 7v10M18 7v10M6 12h12"/></svg> },
]

const TARGET_AREAS = ['Full body', 'Legs', 'Glutes', 'Core', 'Arms', 'Back']
const DIETARY = ['No preference', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Gluten-free', 'Dairy-free']
const ALLERGIES = ['None', 'Nuts', 'Soy', 'Eggs', 'Shellfish', 'Wheat', 'Lactose']

function Chip({ label, selected, onToggle }) {
  return (
    <button onClick={onToggle} style={{ padding: '10px 16px', borderRadius: 999, border: `2px solid ${selected ? '#7C3AED' : '#EDE4F8'}`, background: selected ? '#FAF5FF' : '#fff', fontSize: 14, fontWeight: selected ? 700 : 600, color: selected ? '#7C3AED' : '#5B3D8A', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
      {selected && <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg></span>}
      {label}
    </button>
  )
}

function UnitToggle({ options, active, onToggle }) {
  return (
    <div style={{ display: 'flex', background: '#F3EEFF', borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onToggle(opt)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: active === opt ? '#7C3AED' : 'transparent', color: active === opt ? '#fff' : '#8478A0', transition: 'all 0.18s' }}>{opt}</button>
      ))}
    </div>
  )
}

const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
const ArrowRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
const ArrowLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)

  // Step 1
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')

  // Steps 2-4
  const [fitnessGoal, setFitnessGoal] = useState('tone_recomp')
  const [physique, setPhysique] = useState('lean')
  const [experience, setExperience] = useState('some')

  // Step 5 — Training days
  const [trainingDays, setTrainingDays] = useState(new Set())
  const [dayError, setDayError] = useState('')

  // Step 6 — Measurements
  const [heightCm, setHeightCm] = useState('')
  const [heightUnit, setHeightUnit] = useState('cm')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [weightUnit, setWeightUnit] = useState('kg')
  const [weightLbs, setWeightLbs] = useState('')
  const [age, setAge] = useState('')
  const [measurementError, setMeasurementError] = useState('')

  // Step 7 — Equipment (starts empty — user picks from scratch)
  const [equipment, setEquipment] = useState(new Set())

  // Steps 8-10
  const [targetAreas, setTargetAreas] = useState(new Set(['Full body']))
  const [dietary, setDietary] = useState(new Set(['No preference']))
  const [allergies, setAllergies] = useState(new Set(['None']))

  // Step 8 — muscle map colors derived from selected target areas
  const step8FrontColors = useMemo(() => {
    const colors = {}
    targetAreas.forEach(area => { TARGET_AREA_SVG[area]?.front?.forEach(id => { colors[id] = '#7C3AED' }) })
    return colors
  }, [targetAreas])
  const step8BackColors = useMemo(() => {
    const colors = {}
    targetAreas.forEach(area => { TARGET_AREA_SVG[area]?.back?.forEach(id => { colors[id] = '#7C3AED' }) })
    return colors
  }, [targetAreas])

  // Step 11 — Nutrition
  const [tdeeData, setTdeeData] = useState(null)
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(null)

  useEffect(() => {
    if (step === 11) {
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
  const toggleDay = (id) => { setDayError(''); setTrainingDays(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  const toggleHeightUnit = (unit) => {
    if (unit === 'ftin' && heightUnit === 'cm' && heightCm) { const t = parseFloat(heightCm) / 2.54; setHeightFt(String(Math.floor(t / 12))); setHeightIn(String(Math.round(t % 12))) }
    else if (unit === 'cm' && heightUnit === 'ftin' && (heightFt || heightIn)) { setHeightCm(String(ftInToCm(heightFt, heightIn))) }
    setHeightUnit(unit)
  }
  const toggleWeightUnit = (unit) => {
    if (unit === 'lbs' && weightUnit === 'kg' && weightKg) setWeightLbs(String(Math.round(parseFloat(weightKg) * 2.2046 * 10) / 10))
    else if (unit === 'kg' && weightUnit === 'lbs' && weightLbs) setWeightKg(String(lbsToKg(weightLbs)))
    setWeightUnit(unit)
  }

  const PHYSIQUE_MAP = { lean: 'lean_toned', athletic: 'athletic', hourglass: 'hourglass', slimthick: 'slim_thick', soft: 'soft_curvy', functional: 'functional' }

  const next = () => {
    if (step === 1 && !username.trim()) { setUsernameError('Please enter your name.'); return }
    if (step === 5 && trainingDays.size < 2) { setDayError('Select at least 2 training days.'); return }
    if (step === 6) {
      const h = heightUnit === 'cm' ? parseFloat(heightCm) : ftInToCm(heightFt, heightIn)
      const w = weightUnit === 'kg' ? parseFloat(weightKg) : lbsToKg(weightLbs)
      const a = parseInt(age)
      if (!h || h < 100 || h > 250) { setMeasurementError('height'); return }
      if (!w || w < 30 || w > 300) { setMeasurementError('weight'); return }
      if (!a || a < 14 || a > 80) { setMeasurementError('age'); return }
      setHeightCm(String(Math.round(h))); setWeightKg(String(Math.round(w * 10) / 10)); setMeasurementError('')
    }
    if (step < 11) { setStep(s => s + 1) } else {
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
      })
    }
  }

  const back = () => setStep(s => s - 1)

  const headerStyle = { padding: '14px 22px 6px', flexShrink: 0 }
  const stepLabel = { fontSize: 12, fontWeight: 700, color: '#A99BC4', letterSpacing: '.5px' }
  const stepTitle = { fontFamily: "'DM Serif Display', serif", fontSize: 25, color: '#2E1065', lineHeight: 1.12, marginTop: 4 }
  const stepSub = { fontSize: 13, color: '#8478A0', marginTop: 5 }
  const backBtn = { width: 54, height: 54, borderRadius: 18, background: '#F0E8FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }
  const nextBtn = { flex: 1, height: 54, borderRadius: 18, background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 16, boxShadow: '0 12px 26px rgba(124,58,237,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', cursor: 'pointer' }
  const content = { flex: 1, overflowY: 'auto', padding: '12px 22px 0' }
  const footer = { padding: '10px 22px 26px', flexShrink: 0, display: 'flex', gap: 12 }

  return (
    <>
      <StatusBar />
      <ProgressBar step={step} total={11} />

      {/* ── STEP 1: Username ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 1 OF 11</div>
            <div style={stepTitle}>What should we call you?</div>
            <div style={stepSub}>This is how Aura will greet you every day.</div>
          </div>
          <div style={content}>
            <div style={{ borderRadius: 20, background: '#fff', border: `1.5px solid ${usernameError ? '#FCA5A5' : '#EDE4F8'}`, padding: '18px 20px', marginBottom: 16 }}>
              <input
                value={username}
                onChange={e => { setUsername(e.target.value); setUsernameError('') }}
                onKeyDown={e => e.key === 'Enter' && next()}
                placeholder="Your name or nickname"
                autoFocus
                style={{ width: '100%', fontSize: 22, fontWeight: 700, color: '#2E1065', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              {usernameError && <div style={{ marginTop: 8, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{usernameError}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 16, background: 'linear-gradient(135deg,#FDF2FF,#F3E8FF)', border: '1.5px solid #EBD9FA' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span style={{ fontSize: 13, color: '#5B3D8A', fontWeight: 600 }}>Your personalised plan starts here.</span>
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
            <div style={stepLabel}>STEP 2 OF 11</div>
            <div style={stepTitle}>What's your main goal?</div>
            <div style={stepSub}>We'll build your entire plan around this.</div>
          </div>
          <div style={content}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {FITNESS_GOALS.map(g => {
                const sel = fitnessGoal === g.id
                return (
                  <button key={g.id} onClick={() => setFitnessGoal(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 20, textAlign: 'left', cursor: 'pointer', background: sel ? '#FAF5FF' : '#fff', border: `2px solid ${sel ? '#7C3AED' : '#EDE4F8'}`, boxShadow: sel ? '0 8px 18px rgba(124,58,237,.14)' : '0 4px 12px rgba(76,36,120,.05)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: sel ? '#EDE4FF' : '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{g.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#2E1065' }}>{g.label}</div>
                      <div style={{ fontSize: 12, color: '#8478A0' }}>{g.sub}</div>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: sel ? '#7C3AED' : 'none', border: sel ? 'none' : '2px solid #DCCDF0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{sel && <CheckIcon />}</div>
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

      {/* ── STEP 3: Physique ─────────────────────────────────────────────────── */}
      {step === 3 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 3 OF 11</div>
            <div style={stepTitle}>What's your dream physique?</div>
            <div style={stepSub}>Your entire path is built around this.</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 22px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              {PHYSIQUES.map(p => {
                const sel = physique === p.id
                return (
                  <button key={p.id} onClick={() => setPhysique(p.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px 11px', borderRadius: 18, background: sel ? '#FAF5FF' : '#fff', border: `2px solid ${sel ? '#7C3AED' : '#EDE4F8'}`, boxShadow: sel ? '0 8px 18px rgba(124,58,237,.16)' : '0 4px 12px rgba(76,36,120,.05)', position: 'relative', cursor: 'pointer' }}>
                    {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckIcon /></div>}
                    <AvatarSilhouette height={72} color={sel ? '#7C3AED' : '#A88BC8'} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2E1065' }}>{p.label}</div>
                    <div style={{ fontSize: 10.5, color: '#8478A0', textAlign: 'center', lineHeight: 1.2 }}>{p.sub}</div>
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 11, color: '#A99BC4', textAlign: 'center', margin: '10px 0' }}>All physiques are valid — this just shapes your training & nutrition.</div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 4: Experience ───────────────────────────────────────────────── */}
      {step === 4 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 4 OF 11</div>
            <div style={stepTitle}>How active are you right now?</div>
            <div style={stepSub}>No judgement — we meet you where you are.</div>
          </div>
          <div style={{ flex: 1, padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto' }}>
            {EXPERIENCE.map(e => {
              const sel = experience === e.id
              return (
                <button key={e.id} onClick={() => setExperience(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px', borderRadius: 20, textAlign: 'left', cursor: 'pointer', background: sel ? '#FAF5FF' : '#fff', border: `2px solid ${sel ? '#7C3AED' : '#EDE4F8'}`, boxShadow: sel ? '0 8px 18px rgba(124,58,237,.14)' : '0 4px 12px rgba(76,36,120,.05)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: sel ? '#EDE4FF' : '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{e.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#2E1065' }}>{e.label}</div>
                    <div style={{ fontSize: 12.5, color: '#8478A0' }}>{e.sub}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: sel ? '#7C3AED' : 'none', border: sel ? 'none' : '2px solid #DCCDF0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{sel && <CheckIcon />}</div>
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
            <div style={stepLabel}>STEP 5 OF 11</div>
            <div style={stepTitle}>Which days will you train?</div>
            <div style={stepSub}>Pick at least 2 days. Aura will schedule your sessions around these.</div>
          </div>
          <div style={content}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 16 }}>
              {WEEK_DAYS.map(day => {
                const sel = trainingDays.has(day.id)
                return (
                  <button key={day.id} onClick={() => toggleDay(day.id)}
                    style={{ height: 72, borderRadius: 16, background: sel ? '#FAF5FF' : '#fff', border: `2px solid ${sel ? '#7C3AED' : '#EDE4F8'}`, boxShadow: sel ? '0 6px 16px rgba(124,58,237,.2)' : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: sel ? '#7C3AED' : '#A99BC4' }}>{day.label}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sel ? '#7C3AED' : '#EDE4F8' }} />
                  </button>
                )
              })}
            </div>
            {trainingDays.size > 0 && (
              <div style={{ padding: '12px 16px', borderRadius: 16, background: '#FAF5FF', border: '1.5px solid #EDE4F8', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED' }}>{trainingDays.size} day{trainingDays.size !== 1 ? 's' : ''} selected</span>
                <span style={{ fontSize: 13, color: '#8478A0', marginLeft: 8 }}>
                  {[...trainingDays].map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                </span>
              </div>
            )}
            {dayError && <div style={{ padding: '10px 14px', borderRadius: 12, background: '#FEF2F2', border: '1.5px solid #FCA5A5' }}><span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{dayError}</span></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 16, background: '#EDE4FF' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <div style={{ fontSize: 13, color: '#5B3D8A', fontWeight: 600 }}>Aura builds your rest days automatically around your training days.</div>
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 6: Body measurements ────────────────────────────────────────── */}
      {step === 6 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 6 OF 11</div>
            <div style={stepTitle}>Your body measurements</div>
            <div style={stepSub}>Used to calculate your personal calorie target.</div>
          </div>
          <div style={{ flex: 1, padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
            {/* Height */}
            <div style={{ borderRadius: 18, background: '#fff', border: `1.5px solid ${measurementError === 'height' ? '#FCA5A5' : '#EDE4F8'}`, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: measurementError === 'height' ? '#DC2626' : '#A99BC4', letterSpacing: '.5px' }}>HEIGHT</span>
                <UnitToggle options={['cm', 'ft']} active={heightUnit === 'ftin' ? 'ft' : 'cm'} onToggle={u => toggleHeightUnit(u === 'ft' ? 'ftin' : 'cm')} />
              </div>
              {heightUnit === 'cm' ? (
                <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="170"
                  style={{ width: '100%', height: 52, borderRadius: 12, border: `1.5px solid ${measurementError === 'height' ? '#FCA5A5' : '#EDE4F8'}`, padding: '0 14px', fontSize: 24, fontWeight: 700, color: '#2E1065', fontFamily: 'inherit', outline: 'none', background: '#FAFAFF', boxSizing: 'border-box' }} />
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5"
                      style={{ width: '100%', height: 52, borderRadius: 12, border: `1.5px solid ${measurementError === 'height' ? '#FCA5A5' : '#EDE4F8'}`, padding: '0 36px 0 14px', fontSize: 24, fontWeight: 700, color: '#2E1065', fontFamily: 'inherit', outline: 'none', background: '#FAFAFF', boxSizing: 'border-box' }} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#8478A0' }}>ft</span>
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="5"
                      style={{ width: '100%', height: 52, borderRadius: 12, border: `1.5px solid ${measurementError === 'height' ? '#FCA5A5' : '#EDE4F8'}`, padding: '0 36px 0 14px', fontSize: 24, fontWeight: 700, color: '#2E1065', fontFamily: 'inherit', outline: 'none', background: '#FAFAFF', boxSizing: 'border-box' }} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#8478A0' }}>in</span>
                  </div>
                </div>
              )}
              {measurementError === 'height' && <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Please enter a valid height (100–250 cm)</div>}
            </div>

            {/* Weight */}
            <div style={{ borderRadius: 18, background: '#fff', border: `1.5px solid ${measurementError === 'weight' ? '#FCA5A5' : '#EDE4F8'}`, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: measurementError === 'weight' ? '#DC2626' : '#A99BC4', letterSpacing: '.5px' }}>WEIGHT</span>
                <UnitToggle options={['kg', 'lbs']} active={weightUnit} onToggle={u => toggleWeightUnit(u)} />
              </div>
              <div style={{ position: 'relative' }}>
                <input type="number" value={weightUnit === 'kg' ? weightKg : weightLbs}
                  onChange={e => weightUnit === 'kg' ? setWeightKg(e.target.value) : setWeightLbs(e.target.value)}
                  placeholder={weightUnit === 'kg' ? '62' : '137'}
                  style={{ width: '100%', height: 52, borderRadius: 12, border: `1.5px solid ${measurementError === 'weight' ? '#FCA5A5' : '#EDE4F8'}`, padding: '0 52px 0 14px', fontSize: 24, fontWeight: 700, color: '#2E1065', fontFamily: 'inherit', outline: 'none', background: '#FAFAFF', boxSizing: 'border-box' }} />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#8478A0' }}>{weightUnit}</span>
              </div>
              {measurementError === 'weight' && <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Please enter a valid weight (30–300 kg)</div>}
            </div>

            {/* Age */}
            <div style={{ borderRadius: 18, background: '#fff', border: `1.5px solid ${measurementError === 'age' ? '#FCA5A5' : '#EDE4F8'}`, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: measurementError === 'age' ? '#DC2626' : '#A99BC4', letterSpacing: '.5px', marginBottom: 10 }}>AGE</div>
              <div style={{ position: 'relative' }}>
                <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="26"
                  style={{ width: '100%', height: 52, borderRadius: 12, border: `1.5px solid ${measurementError === 'age' ? '#FCA5A5' : '#EDE4F8'}`, padding: '0 70px 0 14px', fontSize: 24, fontWeight: 700, color: '#2E1065', fontFamily: 'inherit', outline: 'none', background: '#FAFAFF', boxSizing: 'border-box' }} />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#8478A0' }}>years</span>
              </div>
              {measurementError === 'age' && <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Please enter a valid age (14–80)</div>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 14, background: '#F3EEFF' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span style={{ fontSize: 12, color: '#5B3D8A', fontWeight: 600 }}>Your data is private and never shared.</span>
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 7: Equipment ────────────────────────────────────────────────── */}
      {step === 7 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 7 OF 11</div>
            <div style={stepTitle}>What do you have access to?</div>
            <div style={stepSub}>Select all that apply.</div>
          </div>
          <div style={{ flex: 1, padding: '16px 22px 0', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              {EQUIPMENT.map(eq => {
                const sel = equipment.has(eq.id)
                return (
                  <button key={eq.id} onClick={() => toggleSet(setEquipment, eq.id)}
                    style={{ height: 140, borderRadius: 20, padding: 16, cursor: 'pointer', position: 'relative', background: sel ? '#FAF5FF' : '#fff', border: `2px solid ${sel ? '#7C3AED' : '#EDE4F8'}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', boxShadow: sel ? '0 10px 22px rgba(124,58,237,.16)' : '0 4px 12px rgba(76,36,120,.05)' }}>
                    {sel && <div style={{ position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 7, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckIcon /></div>}
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: sel ? '#EDE4FF' : '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{eq.icon}</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#2E1065' }}>{eq.label}</div>
                      <div style={{ fontSize: 11.5, color: '#8478A0' }}>{eq.sub}</div>
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

      {/* ── STEP 8: Target areas ─────────────────────────────────────────────── */}
      {step === 8 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 8 OF 11</div>
            <div style={stepTitle}>Any areas you want to focus on?</div>
            <div style={stepSub}>Tap the body or use the chips — we'll shape your focus.</div>
          </div>
          <div style={{ flex: 1, padding: '8px 22px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, overflowY: 'auto' }}>

            {/* Side-by-side muscle map */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <div style={{ width: 130, height: 220, borderRadius: 16, overflow: 'hidden', background: '#F8F4FF', border: '1.5px solid #EDE4F8' }}>
                <MuscleSVG
                  url="/muscle_map_front.svg"
                  muscleColors={step8FrontColors}
                  onMuscleClick={(area) => toggleSet(setTargetAreas, area)}
                />
              </div>
              <div style={{ width: 130, height: 220, borderRadius: 16, overflow: 'hidden', background: '#F8F4FF', border: '1.5px solid #EDE4F8' }}>
                <MuscleSVG
                  url="/muscle_map_back.svg"
                  muscleColors={step8BackColors}
                  onMuscleClick={(area) => toggleSet(setTargetAreas, area)}
                />
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#A99BC4', fontWeight: 600 }}>Tap a muscle to select — or use the chips below</div>

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

      {/* ── STEP 9: Dietary ──────────────────────────────────────────────────── */}
      {step === 9 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 9 OF 11</div>
            <div style={stepTitle}>Any dietary preferences?</div>
            <div style={stepSub}>We'll tailor your meal suggestions.</div>
          </div>
          <div style={{ flex: 1, padding: '16px 22px 0', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {DIETARY.map(d => <Chip key={d} label={d} selected={dietary.has(d)} onToggle={() => toggleSet(setDietary, d)} />)}
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 10: Allergies ───────────────────────────────────────────────── */}
      {step === 10 && (
        <>
          <div style={headerStyle}>
            <div style={stepLabel}>STEP 10 OF 11</div>
            <div style={stepTitle}>Any food allergies?</div>
            <div style={stepSub}>We'll keep these out of your meal plan.</div>
          </div>
          <div style={{ flex: 1, padding: '16px 22px 0', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {ALLERGIES.map(a => <Chip key={a} label={a} selected={allergies.has(a)} onToggle={() => toggleSet(setAllergies, a)} />)}
            </div>
            <div style={{ marginTop: 20, padding: '16px', borderRadius: 20, background: 'linear-gradient(135deg,#FDF2FF,#F3E8FF)', border: '1.5px solid #EBD9FA' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#5B3D8A', marginBottom: 6 }}>One last step!</div>
              <div style={{ fontSize: 12.5, color: '#8478A0', lineHeight: 1.4 }}>Next we'll calculate your personal calorie target based on your measurements and goal.</div>
            </div>
          </div>
          <div style={footer}>
            <button style={backBtn} onClick={back}><ArrowLeft /></button>
            <button style={nextBtn} onClick={next}>Next <ArrowRight /></button>
          </div>
        </>
      )}

      {/* ── STEP 11: Nutrition goal ──────────────────────────────────────────── */}
      {step === 11 && (() => {
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
              <div style={stepLabel}>STEP 11 OF 11</div>
              <div style={stepTitle}>Your nutrition target</div>
              <div style={stepSub}>Based on your body & goal — adjust to your comfort.</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 22px 0' }}>
              <div style={{ borderRadius: 18, background: '#fff', border: '1.5px solid #EDE4F8', padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 4 }}>YOUR MAINTENANCE (TDEE)</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#2E1065', lineHeight: 1.1 }}>{tdeeData?.tdee?.toLocaleString() ?? '—'} <span style={{ fontSize: 14, color: '#8478A0', fontWeight: 600, fontFamily: 'inherit' }}>kcal/day</span></div>
                <div style={{ fontSize: 12, color: '#8478A0', marginTop: 2 }}>Based on your height, weight, age & {trainingDays.size} training days/week</div>
              </div>

              <div style={{ borderRadius: 18, background: '#FAF5FF', border: '2px solid #7C3AED', padding: '16px', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', letterSpacing: '.5px', marginBottom: 8 }}>YOUR DAILY TARGET</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <button onClick={() => setDailyCalorieTarget(t => Math.max(800, (t ?? 1500) - 50))} style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', border: '1.5px solid #EDE4F8', fontSize: 22, fontWeight: 700, color: '#7C3AED', cursor: 'pointer', flexShrink: 0 }}>−</button>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: '#7C3AED', lineHeight: 1 }}>{dailyCalorieTarget?.toLocaleString() ?? '—'}</div>
                    <div style={{ fontSize: 12, color: '#8478A0', fontWeight: 600 }}>kcal / day</div>
                  </div>
                  <button onClick={() => setDailyCalorieTarget(t => (t ?? 1500) + 50)} style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', border: '1.5px solid #EDE4F8', fontSize: 22, fontWeight: 700, color: '#7C3AED', cursor: 'pointer', flexShrink: 0 }}>+</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {presets.map(({ label, offset }) => {
                  const val = (tdeeData?.tdee ?? 0) + offset
                  const sel = dailyCalorieTarget === val
                  return <button key={label} onClick={() => setDailyCalorieTarget(val)} style={{ flex: 1, height: 40, borderRadius: 12, border: `1.5px solid ${sel ? '#7C3AED' : '#EDE4F8'}`, background: sel ? '#FAF5FF' : '#fff', fontSize: 11, fontWeight: 700, color: sel ? '#7C3AED' : '#5B3D8A', cursor: 'pointer' }}>{label}</button>
                })}
              </div>

              {tdeeData && dailyCalorieTarget && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 14, background: '#EDE4F8', marginBottom: 12 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  <span style={{ fontSize: 13, color: '#5B3D8A', fontWeight: 700 }}>{weeklyText}</span>
                </div>
              )}

              {warnings.map((w, i) => (
                <div key={i} style={{ borderRadius: 14, padding: '10px 14px', marginBottom: 10, background: w.level === 'red' ? '#FEF2F2' : '#FFFBEB', border: `1.5px solid ${w.level === 'red' ? '#FCA5A5' : '#FCD34D'}`, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <svg width="16" height="16" style={{ flexShrink: 0, marginTop: 1 }} viewBox="0 0 24 24" fill="none" stroke={w.level === 'red' ? '#DC2626' : '#D97706'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                  <span style={{ fontSize: 12, color: w.level === 'red' ? '#DC2626' : '#D97706', lineHeight: 1.5 }}>{w.text}</span>
                </div>
              ))}
            </div>
            <div style={footer}>
              <button style={backBtn} onClick={back}><ArrowLeft /></button>
              <button onClick={next} style={{ ...nextBtn, background: 'linear-gradient(135deg,#7C3AED,#A855F7)' }}>
                Reveal my path
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z"/></svg>
              </button>
            </div>
          </>
        )
      })()}
    </>
  )
}
