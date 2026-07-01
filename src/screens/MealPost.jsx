import React, { useState, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { createPost, uploadPostMedia } from '../lib/social'

export default function MealPost({ mealData, userProfile, session, onNavigate }) {
  const name        = mealData?.name || 'Meal'
  const macros      = mealData?.macros || {}
  const ingredients = mealData?.ingredients || []

  const [caption,     setCaption]     = useState('')
  const [mediaFile,   setMediaFile]   = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaIsVideo, setMediaIsVideo] = useState(false)
  const [posting,     setPosting]     = useState(false)
  const [error,       setError]       = useState('')
  const fileRef = useRef()

  const handlePickMedia = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { setError('File is too large (max 50 MB).'); return }
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
      userProfile?.name || userProfile?.username || 'Aura user',
      'meal',
      { name, macros, ingredients: ingredients.slice(0, 10) },
      { caption: caption.trim(), mediaUrl, mediaType }
    )
    setPosting(false)
    onNavigate('meals')
  }

  const macroItems = [
    { label: 'Cal', value: Math.round(macros.calories || 0), color: '#7C3AED', unit: '' },
    { label: 'Protein', value: Math.round(macros.protein || 0), color: '#10B981', unit: 'g' },
    { label: 'Carbs', value: Math.round(macros.carbs || 0), color: '#F59E0B', unit: 'g' },
    { label: 'Fat', value: Math.round(macros.fat || 0), color: '#EC4899', unit: 'g' },
  ]

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onNavigate('meals')} style={{ background: '#F0E8FF', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: '#2E1065', flex: 1 }}>Share Meal</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 24px' }}>

        {/* Media picker */}
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handlePickMedia} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 16, cursor: 'pointer', border: mediaPreview ? 'none' : '2px dashed #A7F3D0', background: mediaPreview ? 'transparent' : '#F0FDF4', minHeight: mediaPreview ? 0 : 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {mediaPreview ? (
            mediaIsVideo
              ? <video src={mediaPreview} autoPlay muted loop playsInline style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
              : <img src={mediaPreview} alt="preview" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🥗</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>Add a photo of your meal</div>
              <div style={{ fontSize: 12, color: '#A99BC4', marginTop: 4 }}>Tap to choose from your gallery</div>
            </div>
          )}
        </div>
        {mediaPreview && (
          <button onClick={() => fileRef.current?.click()} style={{ display: 'block', margin: '-8px auto 16px', fontSize: 12, color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
            Change photo / video
          </button>
        )}

        {/* Meal summary */}
        <div style={{ borderRadius: 16, background: '#F0FDF4', border: '1.5px solid #A7F3D0', padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, color: '#2E1065' }}>{name}</div>
            <span style={{ background: '#ECFDF5', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#059669' }}>MEAL</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {macroItems.map(({ label, value, color, unit }) => (
              <div key={label} style={{ borderRadius: 12, padding: '8px 4px', background: color + '15', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color }}>{value}{unit}</div>
                <div style={{ fontSize: 9, color: '#8478A0', fontWeight: 700 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Caption</div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Tell everyone how it tasted…"
            maxLength={280}
            style={{ width: '100%', height: 80, borderRadius: 14, border: '1.5px solid #EDE4F8', padding: '10px 14px', fontSize: 14, color: '#2E1065', background: '#FAFAFF', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
          />
          <div style={{ textAlign: 'right', fontSize: 10, color: '#A99BC4', marginTop: 4 }}>{caption.length}/280</div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 12, background: '#FEF2F2', border: '1.5px solid #FECACA', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <button
          onClick={handlePost}
          disabled={posting}
          style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', background: posting ? '#A7F3D0' : 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: posting ? 'default' : 'pointer', marginBottom: 10, boxShadow: posting ? 'none' : '0 8px 24px rgba(16,185,129,.3)' }}
        >
          {posting ? 'Posting…' : 'Share Meal'}
        </button>
        <button
          onClick={() => onNavigate('meals')}
          style={{ width: '100%', padding: '13px', borderRadius: 16, border: '1.5px solid #EDE4F8', background: '#fff', color: '#8478A0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Skip
        </button>

      </div>
    </>
  )
}
