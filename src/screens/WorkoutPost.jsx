import React, { useState, useRef, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { createPost, uploadPostMedia, top3Muscles } from '../lib/social'

const MUSCLE_TO_GROUP = {
  glutes: 'glutes', glute: 'glutes',
  hamstrings: 'legs', quads: 'legs', legs: 'legs',
  chest: 'chest', pecs: 'chest',
  shoulders: 'shoulders', delts: 'shoulders',
  back: 'back', lats: 'back', lat: 'back',
  core: 'core', abs: 'core',
  arms: 'arms', biceps: 'arms', triceps: 'arms',
  calves: 'calves',
}

function buildColors(exercises, side) {
  const counts = {}
  ;(exercises || []).forEach(ex => {
    ;(ex.muscles?.primary || []).forEach(m => {
      const group = MUSCLE_TO_GROUP[m?.toLowerCase()]
      if (!group) return
      MUSCLE_SVG_IDS[group]?.[side]?.forEach(id => { counts[id] = (counts[id] || 0) + 1 })
    })
  })
  const colors = {}
  Object.entries(counts).forEach(([id, n]) => { colors[id] = n >= 2 ? '#7C3AED' : '#C4B5FD' })
  return colors
}

function fmt(s) {
  const m = Math.floor(s / 60)
  return m === 0 ? `${s}s` : `${m}m`
}

export default function WorkoutPost({ sessionData, userProfile, session, onNavigate }) {
  const exercises = sessionData?.exercises ?? []
  const label     = sessionData?.workoutLabel ?? 'Workout'
  const elapsed   = sessionData?.elapsed ?? 0
  const muscles   = useMemo(() => top3Muscles(exercises), [exercises])

  const [caption,   setCaption]   = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaIsVideo, setMediaIsVideo] = useState(false)
  const [posting,   setPosting]   = useState(false)
  const [error,     setError]     = useState('')
  const fileRef = useRef()

  const frontColors = useMemo(() => buildColors(exercises, 'front'), [exercises])
  const backColors  = useMemo(() => buildColors(exercises, 'back'),  [exercises])

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
      'workout',
      { label: label.replace(/^Day \d+ — /, ''), elapsed, muscles, totalSets: sessionData?.totalSets, setsCompleted: sessionData?.setsCompleted },
      { caption: caption.trim(), mediaUrl, mediaType }
    )
    setPosting(false)
    onNavigate('home')
  }

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onNavigate('workoutComplete')} style={{ background: '#F0E8FF', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: '#2E1065', flex: 1 }}>Share Workout</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 24px' }}>

        {/* Media picker */}
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handlePickMedia} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 16, cursor: 'pointer', border: mediaPreview ? 'none' : '2px dashed #DDD0FA', background: mediaPreview ? 'transparent' : '#F8F4FF', minHeight: mediaPreview ? 0 : 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {mediaPreview ? (
            mediaIsVideo
              ? <video src={mediaPreview} autoPlay muted loop playsInline style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
              : <img src={mediaPreview} alt="preview" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED' }}>Add photo or video</div>
              <div style={{ fontSize: 12, color: '#A99BC4', marginTop: 4 }}>Tap to choose from your gallery</div>
            </div>
          )}
        </div>
        {mediaPreview && (
          <button onClick={() => fileRef.current?.click()} style={{ display: 'block', margin: '-8px auto 16px', fontSize: 12, color: '#7C3AED', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
            Change photo / video
          </button>
        )}

        {/* Workout summary */}
        <div style={{ borderRadius: 16, background: '#F8F4FF', border: '1.5px solid #EDE4F8', padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, color: '#2E1065' }}>
              {label.replace(/^Day \d+ — /, '')}
            </div>
            <span style={{ background: '#F0E8FF', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#7C3AED' }}>WORKOUT</span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#8478A0', marginBottom: 10 }}>
            <span>⏱ {fmt(elapsed)}</span>
            <span>💪 {exercises.length} exercises</span>
            {sessionData?.setsCompleted > 0 && <span>🔥 {sessionData.setsCompleted} sets</span>}
          </div>
          {muscles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {muscles.map(m => (
                <span key={m} style={{ background: '#EDE4F8', borderRadius: 99, padding: '3px 10px', fontSize: 11, color: '#7C3AED', fontWeight: 700, textTransform: 'capitalize' }}>{m}</span>
              ))}
            </div>
          )}
          {exercises.length > 0 && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', paddingTop: 8, borderTop: '1px solid #EDE4F8' }}>
              <div style={{ flex: 1, maxWidth: 100 }}>
                <MuscleSVG url="/muscle_map_front.svg" muscleColors={frontColors} />
              </div>
              <div style={{ flex: 1, maxWidth: 100 }}>
                <MuscleSVG url="/muscle_map_back.svg" muscleColors={backColors} />
              </div>
            </div>
          )}
        </div>

        {/* Caption */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Caption</div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="How did it feel? Share your victory…"
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
          style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', background: posting ? '#C4B0E0' : 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: posting ? 'default' : 'pointer', marginBottom: 10, boxShadow: posting ? 'none' : '0 8px 24px rgba(124,58,237,.3)' }}
        >
          {posting ? 'Posting…' : 'Post Workout'}
        </button>
        <button
          onClick={() => onNavigate('home')}
          style={{ width: '100%', padding: '13px', borderRadius: 16, border: '1.5px solid #EDE4F8', background: '#fff', color: '#8478A0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Skip
        </button>

      </div>
    </>
  )
}
