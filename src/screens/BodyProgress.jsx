import React, { useState, useEffect, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { TrendChart } from '../components/Charts'
import { fetchBodyWeightLog, logBodyWeight, uploadBodyProgressPhoto } from '../lib/social'
import ImageCropSheet from '../components/ImageCropSheet'
import { dateKeyFor } from '../utils/workoutBuilder'
import { weightSeries } from '../utils/analytics'
import { toDisplayWeight, fromDisplayWeight, weightUnitLabel } from '../utils/units'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

// Daily body-progress log — weight + an optional photo, so the trend chart and
// the photo timeline tell the same story side by side.
export default function BodyProgress({ session, userProfile, onNavigate }) {
  const units = userProfile?.units
  const unitLabel = weightUnitLabel(units)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [weightInput, setWeightInput] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [photoCropFile, setPhotoCropFile] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return }
    fetchBodyWeightLog(session.user.id).then(data => { setRows(data); setLoading(false) })
  }, [session])

  const todayKey = dateKeyFor()
  const todayEntry = rows.find(r => r.date === todayKey)
  const sorted = [...rows].sort((a, b) => a.date < b.date ? 1 : -1) // newest first
  const latest = sorted[0]
  const series = weightSeries(rows, null)
  const displaySeries = series.map(p => ({ ...p, value: toDisplayWeight(p.value, units) }))

  const handlePhotoPick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setPhotoCropFile(file)
  }

  const handlePhotoCropped = (croppedFile) => {
    setPhotoCropFile(null)
    setPhotoFile(croppedFile)
    setPhotoPreview(URL.createObjectURL(croppedFile))
  }

  const handleSave = async () => {
    const displayValue = parseFloat(weightInput || toDisplayWeight(todayEntry?.weight_kg, units))
    const w = fromDisplayWeight(displayValue, units)
    if (!w || w <= 0 || !session?.user?.id || saving) return
    setSaving(true)
    // photo_url is the raw value that gets persisted (a bare storage path for
    // new uploads, so fetchBodyWeightLog can re-sign it later); photo_display_url
    // is what's actually safe to put in an <img src> right now, without waiting
    // for a fresh signed URL round-trip.
    let photoUrl = todayEntry?.photo_url
    let photoDisplayUrl = todayEntry?.photo_display_url
    if (photoFile) {
      const uploaded = await uploadBodyProgressPhoto(session.user.id, photoFile)
      if (uploaded) { photoUrl = uploaded; photoDisplayUrl = photoPreview }
    }
    const ok = await logBodyWeight(session.user.id, { date: todayKey, weightKg: w, photoUrl })
    if (ok) {
      setRows(prev => [...prev.filter(r => r.date !== todayKey), { date: todayKey, weight_kg: w, photo_url: photoUrl, photo_display_url: photoDisplayUrl }])
      setWeightInput('')
      setPhotoFile(null)
      setPhotoPreview(null)
    }
    setSaving(false)
  }

  return (
    <>
      <StatusBar />

      <div style={{ background: NB.lavender, padding: '12px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => onNavigate('analytics')} style={{ width: 38, height: 38, borderRadius: 12, border: `1.5px solid ${NB.ink}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>Body Progress</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 1 }}>{latest ? `Current: ${toDisplayWeight(latest.weight_kg, units)} ${unitLabel}` : 'Log your first entry'}</div>
          </div>
        </div>
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px' }}>
        {/* Trend chart */}
        {series.length >= 2 && (
          <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 10 }}>Weight Trend</div>
            <TrendChart points={displaySeries} unit={` ${unitLabel}`} color={NB.magenta} baseline="auto" />
          </div>
        )}

        {/* Today's entry card */}
        <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 4, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 12 }}>
            {todayEntry ? "Update today's entry" : "Log today's entry"}
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoPick} />
            <button onClick={() => fileRef.current?.click()} style={{ width: 76, height: 76, borderRadius: 14, border: `2px solid ${NB.ink}`, background: NB.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, padding: 0 }}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : todayEntry?.photo_display_url ? (
                <img src={todayEntry.photo_display_url} alt="Today" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              )}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#555', marginBottom: 6 }}>WEIGHT ({unitLabel.toUpperCase()})</div>
              <input
                type="number"
                inputMode="decimal"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                placeholder={todayEntry ? String(toDisplayWeight(todayEntry.weight_kg, units)) : (units === 'imperial' ? 'e.g. 144' : 'e.g. 65.4')}
                style={{ width: '100%', height: 44, border: `2px solid ${NB.ink}`, borderRadius: 11, padding: '0 12px', fontSize: 15, color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', height: 46, border: NB_BORDER, borderRadius: 13, boxShadow: hardShadow(3), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : todayEntry ? 'Update Entry' : 'Save Entry'}
          </button>
        </div>

        {/* Timeline */}
        <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#555', marginBottom: 10 }}>TIMELINE</div>
        {loading ? (
          <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: 20 }}>Loading…</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: '18px 14px', ...nbCardStyle(NB.cream, 2), border: `3px solid ${NB.white}`, borderRadius: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>No entries yet — log your first weigh-in above.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((r, i) => {
              const prev = sorted[i + 1]
              const displayWeight = toDisplayWeight(r.weight_kg, units)
              const delta = prev ? Math.round((displayWeight - toDisplayWeight(prev.weight_kg, units)) * 10) / 10 : null
              return (
                <div key={r.date} style={{ display: 'flex', alignItems: 'center', gap: 12, border: 'none', borderRadius: 14, padding: '10px 12px', background: NB.lavenderMist }}>
                  <button
                    onClick={() => r.photo_url && setViewingPhoto(r)}
                    style={{ width: 52, height: 52, borderRadius: 12, border: `1.5px solid ${NB.ink}`, background: NB.cream, flexShrink: 0, overflow: 'hidden', padding: 0, cursor: r.photo_url ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {r.photo_display_url
                      ? <img src={r.photo_display_url} alt={r.date} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="1.8" opacity="0.35"><circle cx="12" cy="12" r="9"/></svg>}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{displayWeight} {unitLabel}</div>
                    <div style={{ fontSize: 11, color: '#777' }}>{new Date(r.date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  {delta !== null && (
                    <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: NB.ink, background: delta < 0 ? NB.teal : delta > 0 ? NB.pink : NB.cream, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '3px 8px' }}>
                      {delta > 0 ? '+' : ''}{delta} {unitLabel}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Full photo view */}
      {viewingPhoto && (
        <div onClick={() => setViewingPhoto(null)} style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'pointer' }}>
          <img src={viewingPhoto.photo_display_url} alt={viewingPhoto.date} style={{ maxWidth: '100%', maxHeight: '70%', borderRadius: 16, border: `2px solid ${NB.white}` }} />
          <div style={{ color: NB.white, marginTop: 14, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15 }}>
            {toDisplayWeight(viewingPhoto.weight_kg, units)} {unitLabel} · {new Date(viewingPhoto.date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      )}

      <ImageCropSheet file={photoCropFile} shape="rect" aspect={1} onCancel={() => setPhotoCropFile(null)} onCropped={handlePhotoCropped} />
    </>
  )
}
