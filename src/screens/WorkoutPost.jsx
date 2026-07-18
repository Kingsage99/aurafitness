import React, { useState, useRef, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import MuscleSVG from '../components/MuscleSVG'
import { createPost, uploadPostMedia, top3Muscles } from '../lib/social'
import { buildMuscleIntensityColors, MUSCLE_TO_GROUP } from '../utils/muscleIntensity'
import { countsByGroup, buildIntensityRankColors } from '../utils/muscleRankColors'
import { MUSCLE_RANK_MIN_WORKOUTS } from '../utils/gamification'
import { dateKeyFor } from '../utils/workoutBuilder'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'
import { CameraIcon, StrengthArmIcon, StopwatchIcon } from '../components/Icons'

function fmt(s) {
  const m = Math.floor(s / 60)
  return m === 0 ? `${s}s` : `${m}m`
}

export default function WorkoutPost({ sessionData, userProfile, session, gamification, isProUser = false, onGamificationChange, onNavigate }) {
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

  // MissVfit Pro perk: color worked muscles by their real rank tier instead
  // of a flat "shiny" gradient — same treatment as WorkoutComplete's recap.
  const useRankColors = isProUser && (gamification?.totalWorkouts || 0) >= MUSCLE_RANK_MIN_WORKOUTS
  const sessionCounts = useMemo(() => countsByGroup(exercises, MUSCLE_TO_GROUP), [exercises])
  const sessionCountToLevel = count => count >= 3 ? 4 : count === 2 ? 3 : count === 1 ? 2 : 0
  const frontColors = useMemo(() => useRankColors
    ? buildIntensityRankColors(sessionCounts, gamification, 'front', sessionCountToLevel)
    : buildMuscleIntensityColors(exercises, 'front', false), [sessionCounts, gamification, useRankColors, exercises])
  const backColors = useMemo(() => useRankColors
    ? buildIntensityRankColors(sessionCounts, gamification, 'back', sessionCountToLevel)
    : buildMuscleIntensityColors(exercises, 'back', false), [sessionCounts, gamification, useRankColors, exercises])

  // Photos and videos post in their original, uncropped format — no forced
  // aspect ratio for this section.
  const handlePickMedia = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
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
      userProfile?.name || userProfile?.username || 'MissVfit user',
      'workout',
      { label: label.replace(/^Day \d+ — /, ''), elapsed, muscles, totalSets: sessionData?.totalSets, setsCompleted: sessionData?.setsCompleted },
      { caption: caption.trim(), mediaUrl, mediaType }
    )
    onGamificationChange?.(g => ({ ...g, lastPostDate: dateKeyFor() }))
    setPosting(false)
    onNavigate('home')
  }

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onNavigate('workoutComplete')} style={{ background: NB.white, border: NB_BORDER, borderRadius: 11, boxShadow: hardShadow(2), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, flex: 1 }}>Share Workout</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 24px' }}>

        {/* Media picker */}
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handlePickMedia} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{ overflow: 'hidden', marginBottom: 18, cursor: 'pointer', borderRadius: 18, minHeight: mediaPreview ? 0 : 120, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(mediaPreview ? { border: 'none' } : { ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}` }) }}
        >
          {mediaPreview ? (
            mediaIsVideo
              ? <video src={mediaPreview} autoPlay muted loop playsInline style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }} />
              : <img src={mediaPreview} alt="preview" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><CameraIcon size={28} /></div>
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
        <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 18, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily: NB.fontDisplay, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>
              {label.replace(/^Day \d+ — /, '')}
            </div>
            <span style={{ background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '3px 10px', fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink }}>WORKOUT</span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#555', marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><StopwatchIcon size={12} /> {fmt(elapsed)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><StrengthArmIcon size={12} /> {exercises.length} exercises</span>
            {sessionData?.setsCompleted > 0 && <span>🔥 {sessionData.setsCompleted} sets</span>}
          </div>
          {muscles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {muscles.map(m => (
                <span key={m} style={{ background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '3px 10px', fontFamily: NB.fontMono, fontSize: 11, color: NB.ink, fontWeight: 700, textTransform: 'uppercase' }}>{m}</span>
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
          style={{ width: '100%', padding: '15px', border: NB_BORDER, borderRadius: 16, boxShadow: posting ? 'none' : hardShadow(4), background: posting ? '#ccc' : NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: posting ? 'default' : 'pointer', marginBottom: 12 }}
        >
          {posting ? 'Posting…' : 'Post Workout'}
        </button>
        <button
          onClick={() => onNavigate('home')}
          style={{ width: '100%', padding: '13px', border: NB_BORDER, borderRadius: 16, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Skip
        </button>
      </div>
    </>
  )
}
