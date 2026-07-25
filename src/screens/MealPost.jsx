import React, { useState, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomSheet from '../components/BottomSheet'
import { createPost, uploadPostMedia } from '../lib/social'
import { dateKeyFor } from '../utils/workoutBuilder'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'
import { SaladIcon, CameraIcon } from '../components/Icons'

export default function MealPost({ mealData, userProfile, session, onGamificationChange, onNavigate }) {
  const name        = mealData?.name || 'Meal'
  const macros      = mealData?.macros || {}
  const ingredients = mealData?.ingredients || []

  const [caption,     setCaption]     = useState('')
  const [mediaFile,   setMediaFile]   = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaIsVideo, setMediaIsVideo] = useState(false)
  const [posting,     setPosting]     = useState(false)
  const [error,       setError]       = useState('')
  const [showMediaSheet, setShowMediaSheet] = useState(false)
  const fileRef = useRef()
  const cameraPhotoRef = useRef()
  const cameraVideoRef = useRef()

  // Photos and videos post in their original, uncropped format — no forced
  // aspect ratio for this section.
  const handlePickMedia = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 100 * 1024 * 1024) { setError('File is too large (max 100 MB).'); return }
    setError('')
    setMediaFile(file)
    setMediaIsVideo(file.type.startsWith('video'))
    setMediaPreview(URL.createObjectURL(file))
  }

  const handlePost = async () => {
    if (!session?.user?.id) return
    setPosting(true)
    setError('')
    let mediaUrl = null
    let mediaType = null
    if (mediaFile) {
      const result = await uploadPostMedia(mediaFile)
      if (!result) { setError('Media upload failed. Try again.'); setPosting(false); return }
      mediaUrl = result.url
      mediaType = result.type
    }
    await createPost(
      session.user.id,
      userProfile?.name || userProfile?.username || 'MissVfit user',
      'meal',
      { name, macros, ingredients: ingredients.slice(0, 10) },
      { caption: caption.trim(), mediaUrl, mediaType }
    )
    onGamificationChange?.(g => ({ ...g, lastPostDate: dateKeyFor() }))
    setPosting(false)
    onNavigate('meals')
  }

  const macroItems = [
    { label: 'Cal', value: Math.round(macros.calories || 0), color: NB.teal, unit: '' },
    { label: 'Protein', value: Math.round(macros.protein || 0), color: NB.blue, unit: 'g' },
    { label: 'Carbs', value: Math.round(macros.carbs || 0), color: NB.yellow, unit: 'g' },
    { label: 'Fat', value: Math.round(macros.fat || 0), color: NB.pink, unit: 'g' },
  ]

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onNavigate('meals')} style={{ background: NB.white, border: NB_BORDER, borderRadius: 11, boxShadow: hardShadow(2), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, flex: 1 }}>Share Meal</div>
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '0 22px 24px' }}>

        {/* Media picker */}
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handlePickMedia} />
        {/* Two separate single-type capture inputs, not one accept="image/*,video/*"
            input — Android Chrome can't resolve which camera mode to launch for a
            mixed accept type and silently falls back to the file picker instead of
            opening the camera at all. */}
        <input ref={cameraPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePickMedia} />
        <input ref={cameraVideoRef} type="file" accept="video/*" capture="environment" style={{ display: 'none' }} onChange={handlePickMedia} />
        <div
          onClick={() => setShowMediaSheet(true)}
          style={{ overflow: 'hidden', marginBottom: 18, cursor: 'pointer', borderRadius: 18, minHeight: mediaPreview ? 0 : 120, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(mediaPreview ? { border: 'none' } : { ...nbCardStyle(NB.green, 3), border: `3px solid ${NB.white}` }) }}
        >
          {mediaPreview ? (
            mediaIsVideo
              ? <video src={mediaPreview} autoPlay muted loop playsInline style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }} />
              : <img src={mediaPreview} alt="preview" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><SaladIcon size={28} /></div>
              <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Add a photo of your meal</div>
              <div style={{ fontSize: 12, color: NB.ink, marginTop: 4 }}>Tap to take a photo or choose from your gallery</div>
            </div>
          )}
        </div>
        {mediaPreview && (
          <button onClick={() => setShowMediaSheet(true)} style={{ display: 'block', margin: '-10px auto 18px', fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Change photo / video
          </button>
        )}

        {/* Meal summary */}
        <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 18, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: NB.fontDisplay, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{name}</div>
            <span style={{ background: NB.green, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '3px 10px', fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink }}>MEAL</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {macroItems.map(({ label, value, color, unit }) => (
              <div key={label} style={{ border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '8px 4px', background: color, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: NB.ink }}>{value}{unit}</div>
                <div style={{ fontFamily: NB.fontMono, fontSize: 9, color: NB.ink, fontWeight: 700 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Caption</div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Tell everyone how it tasted…"
            maxLength={280}
            style={{ width: '100%', height: 80, border: NB_BORDER, borderRadius: 14, padding: '10px 14px', fontSize: 14, color: NB.ink, background: NB.white, resize: 'none', boxSizing: 'border-box', fontFamily: NB.fontDisplay, outline: 'none' }}
          />
          <div style={{ textAlign: 'right', fontFamily: NB.fontMono, fontSize: 10, color: '#555', marginTop: 4 }}>{caption.length}/280</div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', ...nbCardStyle(NB.red, 2), border: `3px solid ${NB.white}`, borderRadius: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
          </div>
        )}

      </div>

      {/* Pinned footer — stays on screen while the content above scrolls */}
      <div style={{ flexShrink: 0, padding: '10px 22px 20px' }}>
        <button
          onClick={handlePost}
          disabled={posting}
          style={{ width: '100%', padding: '15px', border: NB_BORDER, borderRadius: 16, boxShadow: posting ? 'none' : hardShadow(4), background: posting ? '#ccc' : NB.green, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: posting ? 'default' : 'pointer', marginBottom: 12 }}
        >
          {posting ? 'Posting…' : 'Share Meal'}
        </button>
        <button
          onClick={() => onNavigate('meals')}
          style={{ width: '100%', padding: '13px', border: NB_BORDER, borderRadius: 16, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Skip
        </button>
      </div>

      <BottomSheet open={showMediaSheet} onClose={() => setShowMediaSheet(false)} title="Add Photo or Video">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => { setShowMediaSheet(false); cameraPhotoRef.current?.click() }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.green, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}
          >
            <CameraIcon size={20} />
            Take Photo
          </button>
          <button
            onClick={() => { setShowMediaSheet(false); cameraVideoRef.current?.click() }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.green, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="6.5" width="13" height="11" rx="2.2"/>
              <path d="M15.5 10.5l6-3.5v10l-6-3.5"/>
            </svg>
            Record Video
          </button>
          <button
            onClick={() => { setShowMediaSheet(false); fileRef.current?.click() }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2.5"/>
              <circle cx="8.5" cy="9.5" r="1.6"/>
              <path d="M21 15l-5-5-9 9"/>
            </svg>
            Choose From Gallery
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
