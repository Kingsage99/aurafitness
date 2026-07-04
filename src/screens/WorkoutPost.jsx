import React, { useState, useRef, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { createPost, uploadPostMedia, top3Muscles } from '../lib/social'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

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
  Object.entries(counts).forEach(([id, n]) => { colors[id] = n >= 2 ? NB.ink : '#999' })
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
        <button onClick={() => onNavigate('workoutComplete')} style={{ background: NB.white, border: NB_BORDER, boxShadow: hardShadow(2), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, flex: 1 }}>Share Workout</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 24px' }}>

        {/* Media picker */}
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handlePickMedia} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{ overflow: 'hidden', marginBottom: 18, cursor: 'pointer', border: mediaPreview ? NB_BORDER : `2.5px dashed ${NB.ink}`, background: mediaPreview ? 'transparent' : NB.cream, minHeight: mediaPreview ? 0 : 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {mediaPreview ? (
            mediaIsVideo
              ? <video src={mediaPreview} autoPlay muted loop playsInline style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
              : <img src={mediaPreview} alt="preview" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
              <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Add photo or video</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Tap to choose from your gallery</div>
            </div>
          )}
        </div>
        {mediaPreview && (
          <button onClick={() => fileRef.current?.click()} style={{ display: 'block', margin: '-10px auto 18px', fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Change photo / video
          </button>
        )}

        {/* Workout summary */}
        <div style={{ border: NB_BORDER, boxShadow: hardShadow(3), background: NB.white, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily: NB.fontDisplay, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>
              {label.replace(/^Day \d+ — /, '')}
            </div>
            <span style={{ background: NB.yellow, border: `1.5px solid ${NB.ink}`, padding: '3px 10px', fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink }}>WORKOUT</span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#555', marginBottom: 10 }}>
            <span>⏱ {fmt(elapsed)}</span>
            <span>💪 {exercises.length} exercises</span>
            {sessionData?.setsCompleted > 0 && <span>🔥 {sessionData.setsCompleted} sets</span>}
          </div>
          {muscles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {muscles.map(m => (
                <span key={m} style={{ background: NB.white, border: `1.5px solid ${NB.ink}`, padding: '3px 10px', fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700, textTransform: 'uppercase' }}>{m}</span>
              ))}
            </div>
          )}
          {exercises.length > 0 && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', paddingTop: 10, borderTop: `2px solid ${NB.ink}` }}>
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Caption</div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="How did it feel? Share your victory…"
            maxLength={280}
            style={{ width: '100%', height: 80, border: NB_BORDER, padding: '10px 14px', fontSize: 14, color: NB.ink, background: NB.white, resize: 'none', boxSizing: 'border-box', fontFamily: NB.fontDisplay, outline: 'none' }}
          />
          <div style={{ textAlign: 'right', fontFamily: NB.fontMono, fontSize: 10, color: '#555', marginTop: 4 }}>{caption.length}/280</div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', border: NB_BORDER, background: NB.red, marginBottom: 16 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <button
          onClick={handlePost}
          disabled={posting}
          style={{ width: '100%', padding: '15px', border: NB_BORDER, boxShadow: posting ? 'none' : hardShadow(4), background: posting ? '#ccc' : NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: posting ? 'default' : 'pointer', marginBottom: 12 }}
        >
          {posting ? 'Posting…' : 'Post Workout'}
        </button>
        <button
          onClick={() => onNavigate('home')}
          style={{ width: '100%', padding: '13px', border: NB_BORDER, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Skip
        </button>

      </div>
    </>
  )
}
