import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS, RANK_FILL } from '../components/MuscleSVG'
import {
  fetchGlobalFeed, fetchFriendsFeed, fetchFriendIds,
  fetchPendingRequests, fetchReactions, addReaction, removeReaction,
  sendFriendRequest, respondToRequest, searchUserByUsername, fetchProfilesByIds, timeAgo,
  uploadSticker,
} from '../lib/social'
import { isPro } from '../lib/stripe'
import { getMissFlags, RANKS, normalizeRankId, SUB_LEVEL_ROMAN, SUB_LEVELS_PER_TIER } from '../utils/gamification'
import { groupOf } from '../utils/muscleGroups'
import { tierForGroup } from '../utils/muscleRankColors'
import { Avatar } from '../components/AvatarSilhouette'
import { FireIcon } from '../components/Icons'
import { STORE_BORDERS } from './StoreScreen'
import ImageCropSheet from '../components/ImageCropSheet'
import ProBorderRing from '../components/ProBorderRing'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW, proTextStyle } from '../styles/neoBrutalism'

// The four stock stickers in public/sticker/ — the fallback set a brand-new
// user (no usage history, no custom stickers) sees in the reaction picker.
// heart.png stays first so it's always the default trigger icon on a post.
// Reactions are keyed by the sticker's own URL (not an opaque id) so the
// aggregate tally can render any user's reaction — default or a friend's
// custom upload — without needing to resolve whose sticker collection it
// came from.
const DEFAULT_STICKERS = ['/sticker/heart.png', '/sticker/peach.png', '/sticker/fire_sticker.png', '/sticker/slay.png']
const HEART_STICKER = DEFAULT_STICKERS[0]
const isDefaultSticker = url => DEFAULT_STICKERS.includes(url)

// The stock stickers are already icon-shaped art with a transparent
// background — a white circle behind them would just box them in. Only
// user-uploaded photos (arbitrary rectangles) get the circle-crop + white
// ring treatment, so they read as a matching sticker instead of a raw photo.
const STICKER_SIZE = 56

function stickerButtonStyle(url) {
  return isDefaultSticker(url)
    ? { width: STICKER_SIZE, height: STICKER_SIZE, background: 'none', border: 'none', boxShadow: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }
    : { width: STICKER_SIZE, height: STICKER_SIZE, borderRadius: '50%', border: `2.5px solid ${NB.white}`, boxShadow: '0 2px 8px rgba(0,0,0,.4)', overflow: 'hidden', background: NB.white, cursor: 'pointer', padding: 0, flexShrink: 0 }
}
function stickerImgStyle(url) {
  return { width: '100%', height: '100%', objectFit: isDefaultSticker(url) ? 'contain' : 'cover' }
}

// The picker's top-4, ranked by this viewer's lifetime usage count
// (gamification.stickerUsage) — ties (usage 0, i.e. a fresh account) keep
// DEFAULT_STICKERS' order via Array.sort's stability, so new users see the
// defaults first and heavy reactors gradually see their real favorites rise.
function topStickers(gamification, userProfile, max = 4) {
  const usage = gamification?.stickerUsage || {}
  const custom = (userProfile?.customStickers || []).map(s => s.url)
  const pool = [...DEFAULT_STICKERS, ...custom]
  return [...pool].sort((a, b) => (usage[b] || 0) - (usage[a] || 0)).slice(0, max)
}

// Colors a post's worked muscles by the author's own rank tier for that
// group (bronze glutes, platinum core, etc.) — same "rank colors" Pro perk as
// the Muscle Map and post-workout recap, always at full/shiny strength since
// a feed post only carries its top 3 worked muscles, not per-group counts.
// Non-Pro authors keep the plain flat-ink highlight.
function muscleColors(muscles, side, gamification, shiny = false) {
  const colors = {}
  ;(muscles || []).forEach(m => {
    const group = groupOf(m)
    if (!group) return
    const tier = shiny ? tierForGroup(gamification, group) : null
    ;(MUSCLE_SVG_IDS[group]?.[side] || []).forEach(id => { colors[id] = shiny ? RANK_FILL(tier.id) : NB.ink })
  })
  return colors
}

function fmtDuration(secs) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function Discovery({ session, userProfile, gamification = {}, onGamificationChange, onUpdateProfile, loggedMacros = { calories: 0 }, missState = null, onStartMakeup, onPendingChange, onViewProfile, onNavigate }) {
  const userId      = session?.user?.id
  const displayName = userProfile?.name || session?.user?.email?.split('@')[0] || 'You'
  const myUsername  = userProfile?.username || ''

  const [activeTab,    setActiveTab]    = useState('global')
  const [posts,        setPosts]        = useState([])
  const [authors,      setAuthors]      = useState({})
  const [loading,      setLoading]      = useState(true)
  const [friendIds,    setFriendIds]    = useState(new Set())
  const [pendingReqs,  setPendingReqs]  = useState([])
  const [sentReqs,     setSentReqs]     = useState(new Set())
  const [reactions,    setReactions]    = useState({})
  const [openStickerPost, setOpenStickerPost] = useState(null) // post id whose vertical sticker column is expanded
  const [cropFile,     setCropFile]     = useState(null) // File picked for a new custom sticker, pending crop
  const fileInputRef = useRef(null)
  const uploadForPostRef = useRef(null)

  const stickerOptions = useMemo(() => topStickers(gamification, userProfile), [gamification.stickerUsage, userProfile?.customStickers])

  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResult,   setSearchResult]   = useState(null)
  const [searchNoResult, setSearchNoResult] = useState(false)
  const [searching,      setSearching]      = useState(false)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [ids, reqs] = await Promise.all([fetchFriendIds(userId), fetchPendingRequests(userId)])
    setFriendIds(new Set(ids))
    setPendingReqs(reqs)
    onPendingChange?.(reqs)
    const feed = activeTab === 'global' ? await fetchGlobalFeed(30) : await fetchFriendsFeed(userId, 30)
    setPosts(feed)
    if (feed.length > 0) {
      const [rx, authorMap] = await Promise.all([
        fetchReactions(feed.map(p => p.id), userId),
        fetchProfilesByIds(feed.map(p => p.user_id)),
      ])
      setReactions(rx)
      setAuthors(authorMap)
    }
    setLoading(false)
  }, [userId, activeTab])

  useEffect(() => { loadData() }, [loadData])

  const handleReact = async (post, stickerUrl) => {
    if (!userId) return
    const postRx = reactions[post.id] || { mine: new Set() }
    const already = postRx.mine?.has(stickerUrl)
    setReactions(prev => {
      const cur = prev[post.id] || { mine: new Set() }
      const mine = new Set(cur.mine)
      const count = already ? Math.max(0, (cur[stickerUrl] || 1) - 1) : (cur[stickerUrl] || 0) + 1
      already ? mine.delete(stickerUrl) : mine.add(stickerUrl)
      return { ...prev, [post.id]: { ...cur, [stickerUrl]: count, mine } }
    })
    if (already) {
      await removeReaction(post.id, userId, stickerUrl)
    } else {
      await addReaction(post.id, userId, stickerUrl)
      // Lifetime usage count, never decremented on un-react, so the picker's
      // "most used" ranking survives toggling a reaction back off.
      onGamificationChange?.(g => ({ ...g, stickerUsage: { ...(g.stickerUsage || {}), [stickerUrl]: ((g.stickerUsage || {})[stickerUrl] || 0) + 1 } }))
    }
  }

  const handlePickSticker = (post, stickerUrl) => {
    handleReact(post, stickerUrl)
    setOpenStickerPost(null)
  }

  const handleAddCustomSticker = (post) => {
    uploadForPostRef.current = post
    fileInputRef.current?.click()
  }

  const handleStickerFileChosen = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) setCropFile(f)
  }

  const handleStickerCropped = async (croppedFile) => {
    setCropFile(null)
    if (!userId) return
    const url = await uploadSticker(userId, croppedFile)
    if (!url) return
    const nextCustom = [...(userProfile?.customStickers || []), { id: `custom_${Date.now()}`, url }]
    onUpdateProfile?.({ customStickers: nextCustom })
    const post = uploadForPostRef.current
    setOpenStickerPost(null)
    if (post) handleReact(post, url)
  }

  const handleRespondReq = async (req, status) => {
    await respondToRequest(req.id, status)
    const next = pendingReqs.filter(r => r.id !== req.id)
    setPendingReqs(next)
    onPendingChange?.(next)
    if (status === 'accepted') setFriendIds(prev => new Set(prev).add(req.sender_id))
  }

  const handleUsernameSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true); setSearchResult(null); setSearchNoResult(false)
    const result = await searchUserByUsername(searchQuery.trim())
    setSearching(false)
    if (result) setSearchResult(result); else setSearchNoResult(true)
  }

  const handleAddFriend = async (user) => {
    setSentReqs(prev => new Set(prev).add(user.id))
    await sendFriendRequest(userId, displayName, user.id)
  }

  const { showWorkoutMiss, showCalorieMiss, missedWorkoutEntry } = getMissFlags(missState, gamification, loggedMacros)

  if (showWorkoutMiss || showCalorieMiss) {
    return (
      <>
        <StatusBar />
        <DiscoveryLock
          showWorkoutMiss={showWorkoutMiss}
          showCalorieMiss={showCalorieMiss}
          missedWorkoutEntry={missedWorkoutEntry}
          onStartMakeup={onStartMakeup}
          onNavigate={onNavigate}
        />
        <BottomNav active="discovery" onNavigate={onNavigate} pendingRequests={pendingReqs.length} />
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <StatusBar />

      {/* Tabs header */}
      <div style={{ padding: '10px 22px 0', flexShrink: 0 }}>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 26, textTransform: 'uppercase', color: NB.ink }}>Discover</div>
        <div style={{ display: 'flex', marginTop: 12, borderBottom: `2.5px solid ${NB.ink}` }}>
          {['global', 'friends'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, paddingBottom: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: NB.ink, borderBottom: activeTab === tab ? `3px solid ${NB.magenta}` : '3px solid transparent', marginBottom: -2.5 }}>
              {tab === 'global' ? 'Global' : 'Friends'}
              {tab === 'friends' && pendingReqs.length > 0 && (
                <span style={{ marginLeft: 6, background: NB.red, color: NB.white, border: `1.5px solid ${NB.ink}`, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>{pendingReqs.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0 90px' }}>

        {/* Friends tab */}
        {activeTab === 'friends' && (
          <div style={{ padding: '0 16px' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Add Friends</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: NB.ink, fontWeight: 700, pointerEvents: 'none' }}>@</span>
                  <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchResult(null); setSearchNoResult(false) }} onKeyDown={e => e.key === 'Enter' && handleUsernameSearch()} placeholder="username" style={{ width: '100%', height: 44, border: NB_BORDER, borderRadius: 12, paddingLeft: 28, paddingRight: 12, fontSize: 14, color: NB.ink, background: NB.white, outline: 'none', boxSizing: 'border-box', fontFamily: NB.fontDisplay }} />
                </div>
                <button onClick={handleUsernameSearch} disabled={searching} style={{ height: 44, padding: '0 16px', border: NB_BORDER, borderRadius: 12, boxShadow: hardShadow(2), background: NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>
                  {searching ? '…' : 'Search'}
                </button>
              </div>
              {searchResult && (
                <div style={{ marginTop: 10, border: `2px solid ${NB.ink}`, borderRadius: 14, padding: '12px 14px', background: NB.cream, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${NB.ink}`, background: NB.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 15, fontWeight: 800, color: NB.ink }}>{(searchResult.username || 'U')[0].toUpperCase()}</span></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink }}>{searchResult.display_name}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>@{searchResult.username}</div>
                  </div>
                  {searchResult.id === userId ? <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>That's you</span>
                    : friendIds.has(searchResult.id) ? <span style={{ fontSize: 12, color: NB.ink, fontWeight: 700 }}>✓ Friends</span>
                    : <button onClick={() => handleAddFriend(searchResult)} disabled={sentReqs.has(searchResult.id)} style={{ background: sentReqs.has(searchResult.id) ? NB.white : NB.magenta, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '6px 12px', color: sentReqs.has(searchResult.id) ? NB.ink : NB.white, fontSize: 12, fontWeight: 700, cursor: sentReqs.has(searchResult.id) ? 'default' : 'pointer' }}>{sentReqs.has(searchResult.id) ? 'Pending ✓' : '+ Add'}</button>}
                </div>
              )}
              {searchNoResult && <div style={{ marginTop: 10, fontSize: 13, color: '#555', textAlign: 'center', padding: 8 }}>No user found with @{searchQuery}</div>}
              {myUsername && <div style={{ marginTop: 8, fontSize: 11, color: '#555', textAlign: 'center' }}>Your username: <strong>@{myUsername}</strong></div>}
            </div>

            {pendingReqs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Friend Requests</div>
                {pendingReqs.map(req => (
                  <div key={req.id} style={{ border: `2px solid ${NB.ink}`, borderRadius: 14, padding: '12px 14px', background: NB.white, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 15, fontWeight: 800, color: NB.ink }}>{(req.sender_name || 'U')[0].toUpperCase()}</span></div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: NB.ink }}>{req.sender_name || 'Someone'} wants to be friends</div>
                    <button onClick={() => handleRespondReq(req, 'accepted')} style={{ background: NB.teal, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '6px 12px', color: NB.ink, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginRight: 6 }}>Accept</button>
                    <button onClick={() => handleRespondReq(req, 'declined')} style={{ background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '6px 12px', color: NB.ink, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Decline</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? <SkeletonFeed /> : posts.length === 0 ? <EmptyState tab={activeTab} /> : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              author={authors[post.user_id]}
              postReactions={reactions[post.id] || { mine: new Set() }}
              stickerOptions={stickerOptions}
              isStickerOpen={openStickerPost === post.id}
              onToggleSticker={() => setOpenStickerPost(p => p === post.id ? null : post.id)}
              onPickSticker={(url) => handlePickSticker(post, url)}
              onAddCustomSticker={() => handleAddCustomSticker(post)}
              onViewProfile={() => post.user_id && post.user_id !== userId && onViewProfile?.(post.user_id)}
            />
          ))
        )}
      </div>

      <BottomNav active="discovery" onNavigate={onNavigate} pendingRequests={pendingReqs.length} />

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleStickerFileChosen} style={{ display: 'none' }} />
      <ImageCropSheet file={cropFile} shape="circle" onCancel={() => setCropFile(null)} onCropped={handleStickerCropped} />
    </div>
  )
}

// ── Discovery Lock ────────────────────────────────────────────────────────────
// Blocks the feed when yesterday's workout or calorie goal was missed. No dismiss
// button — only completing the make-up workout or logging a meal clears it.

function DiscoveryLock({ showWorkoutMiss, showCalorieMiss, missedWorkoutEntry, onStartMakeup, onNavigate }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
      <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink, marginBottom: 10 }}>Discover is locked</div>

      {showWorkoutMiss && (
        <div style={{ ...nbCardStyle(NB.orange, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px', marginBottom: 14, width: '100%' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink, marginBottom: 10 }}>You missed {missedWorkoutEntry?.label || 'a workout'} yesterday.</div>
          <button
            onClick={() => onStartMakeup?.()}
            style={{ width: '100%', height: 42, border: NB_BORDER, borderRadius: 10, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Do the missed workout
          </button>
        </div>
      )}

      {showCalorieMiss && (
        <div style={{ ...nbCardStyle(NB.yellow, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px', width: '100%' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink, marginBottom: 10 }}>You missed your calorie goal yesterday.</div>
          <button
            onClick={() => onNavigate('meals')}
            style={{ width: '100%', height: 42, border: NB_BORDER, borderRadius: 10, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Log a meal
          </button>
        </div>
      )}
    </div>
  )
}

// ── Post Card ─────────────────────────────────────────────────────────────────

// Small avatar + equipped ring-border block for a post author — mirrors the
// Home/Profile avatar treatment so borders show in the feed.
function AuthorAvatar({ author, size = 42 }) {
  const frameId = author?.gamification?.frame
  const equippedBorder = frameId ? STORE_BORDERS.find(b => b.id === `frame_${frameId}`) : null
  const off = equippedBorder?.frameOffset
  const scale = size / 46 // frameOffsets are calibrated for a 46px avatar
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, zIndex: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', border: equippedBorder?.id === 'frame_pro' && isPro(author) ? 'none' : `2px solid ${NB.ink}`, background: NB.lavender, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Avatar url={author?.profile_data?.avatarUrl} height={size} color={NB.ink} />
      </div>
      {equippedBorder?.image && off && (
        <img src={equippedBorder.image} alt="" style={{ position: 'absolute', top: off.top * scale, left: off.left * scale, width: off.size * scale, height: off.size * scale, pointerEvents: 'none' }} />
      )}
      {equippedBorder?.id === 'frame_pro' && isPro(author) && <ProBorderRing size={size} />}
    </div>
  )
}

// A compact labelled stat block used under the post author row.
function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: NB.ink }}>{value}</div>
    </div>
  )
}

function PostCard({ post, author, postReactions, stickerOptions, isStickerOpen, onToggleSticker, onPickSticker, onAddCustomSticker, onViewProfile }) {
  const isWorkout = post.type === 'workout'
  const content   = post.content || {}
  const ag        = author?.gamification || {}
  const authorIsPro = isPro(author)

  const frontColors = muscleColors(content.muscles, 'front', ag, authorIsPro)
  const backColors  = muscleColors(content.muscles, 'back', ag, authorIsPro)

  const allStickerUrls  = Object.keys(postReactions).filter(k => k !== 'mine' && (postReactions[k] || 0) > 0)
  const floatingStickers = allStickerUrls.slice(0, 4)
  const totalReactions  = allStickerUrls.reduce((s, e) => s + (postReactions[e] || 0), 0)

  const duration = fmtDuration(content.elapsed)
  const streak   = ag.workoutStreak || 0
  const rank     = RANKS.find(r => r.id === normalizeRankId(ag.rank)) || RANKS[0]
  const rankIsTop = rank.id === RANKS[RANKS.length - 1].id
  const rankRoman = rankIsTop ? '' : SUB_LEVEL_ROMAN[Math.min(ag.rankSubLevel || 0, SUB_LEVELS_PER_TIER - 1)]
  const streakValue = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FireIcon size={16} /> {streak}</span>

  return (
    <div style={{ marginBottom: 24 }}>

      {/* Header — tappable author */}
      <div onClick={onViewProfile} style={{ padding: '0 16px 6px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <AuthorAvatar author={author} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...(authorIsPro ? proTextStyle : { color: NB.ink }) }}>{post.display_name || 'MissVfit user'}</div>
          <div style={{ fontSize: 11, color: '#555' }}>{timeAgo(post.created_at)}</div>
        </div>
        <span style={{ background: isWorkout ? NB.magenta : NB.green, border: `1.5px solid ${NB.ink}`, borderRadius: 7, padding: '3px 10px', fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: isWorkout ? NB.white : NB.ink }}>
          {isWorkout ? 'WORKOUT' : 'MEAL'}
        </span>
      </div>

      {/* Caption */}
      {post.caption && (
        <div style={{ padding: '0 16px 6px', fontSize: 14, fontWeight: 600, color: NB.ink, lineHeight: 1.5 }}>
          {post.caption}
        </div>
      )}

      {/* Stats row under profile — workout: streak / duration / rank; meal: streak / calories */}
      {isWorkout ? (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <Stat label="Streak" value={streakValue} />
          {duration && <Stat label="Duration" value={<>⏱ {duration}</>} />}
          <div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.6 }}>Rank</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <img src={rank.image} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: NB.ink }}>{rank.label}{rankRoman ? ` ${rankRoman}` : ''}</span>
            </div>
          </div>
        </div>
      ) : content.macros ? (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 20 }}>
          <Stat label="Streak" value={streakValue} />
          <Stat label="Calories" value={<>🍽 {Math.round(content.macros.calories || 0)} kcal</>} />
        </div>
      ) : null}

      {/* Swipeable cards — alignItems:'flex-start' keeps each card at its own
          natural height (top-aligned), instead of flexbox's default 'stretch'
          forcing the shorter card (usually Card 1's now-variable-size media)
          to match the taller one, which was inflating/distorting the photo.
          paddingBottom gives the scrollport room for Card 2's bottom
          box-shadow: per the CSS overflow spec, overflowX:'auto' silently
          forces overflowY to 'auto' too (browsers disallow a mismatched
          visible/non-visible pair, even when overflowY is set explicitly to
          'visible') — so the shadow WILL get clipped at this row's own box
          edge unless that edge has enough padding to contain it. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 9, scrollSnapType: 'x mandatory', scrollPaddingLeft: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', gap: 10 }}>

        {/* Card 1: Media — real uploaded media shrink-wraps to its own actual
            size (not a fixed slot) and carries its own outline/shadow, so the
            row's `gap` to Card 2 is measured from the real photo edge no
            matter the media's shape. The emoji fallback (no media) keeps the
            old fixed-width card look since there's no photo to stand on its
            own. */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', flexShrink: 0, scrollSnapAlign: 'start', marginLeft: 16,
          maxWidth: 'calc(100% - 56px)',
          overflow: post.media_url ? 'visible' : 'hidden',
          ...(post.media_url ? {} : { width: 'calc(100% - 56px)', borderRadius: 27, ...nbCardStyle(NB.lavender, 6, NB_CARD_NEUTRAL_SHADOW), border: `4.5px solid ${NB.white}` }),
        }}>
          {post.media_url ? (
            post.media_type === 'video'
              ? <video src={post.media_url} autoPlay muted loop playsInline style={{ width: 'auto', maxWidth: '100%', height: 'auto', maxHeight: 330, display: 'block', borderRadius: 21, border: `3.75px solid ${NB.white}`, boxShadow: '4.5px 4.5px 0 #C3A6FF' }} />
              : <img src={post.media_url} alt="" style={{ width: 'auto', maxWidth: '100%', height: 'auto', maxHeight: 330, display: 'block', borderRadius: 21, border: `3.75px solid ${NB.white}`, boxShadow: '4.5px 4.5px 0 #C3A6FF' }} />
          ) : (
            <div style={{ width: '100%', height: 420, background: isWorkout ? NB.magenta : NB.green, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 72 }}>{isWorkout ? '💪' : '🥗'}</div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 30, textTransform: 'uppercase', color: NB.ink, marginTop: 15, textAlign: 'center', padding: '0 30px' }}>
                {isWorkout ? (content.label || 'Workout') : 'Meal'}
              </div>
            </div>
          )}

          {/* Floating reaction tally (bottom-left) — each key is the sticker's own URL, so any user's default or custom sticker renders without needing to resolve whose collection it came from */}
          {floatingStickers.length > 0 && (
            <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 4, alignItems: 'center' }}>
              {floatingStickers.map((url, i) => (
                <div key={i} style={isDefaultSticker(url)
                  ? { width: 38, height: 38, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.5))', flexShrink: 0 }
                  : { width: 40, height: 40, borderRadius: '50%', border: `2px solid ${NB.white}`, boxShadow: '0 1px 5px rgba(0,0,0,.35)', overflow: 'hidden', flexShrink: 0 }}
                >
                  <img src={url} alt="" style={stickerImgStyle(url)} />
                </div>
              ))}
              <span style={{ fontSize: 13, fontWeight: 800, color: NB.white, textShadow: '0 1px 4px rgba(0,0,0,.8)', marginLeft: 2 }}>{totalReactions}</span>
            </div>
          )}

          {/* Sticker reaction trigger (heart, always) + expandable vertical picker column, bottom-right */}
          {isStickerOpen && <div onClick={onToggleSticker} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
          <div style={{ position: 'absolute', bottom: 8, right: 12, zIndex: 2, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onToggleSticker}
              style={{ ...stickerButtonStyle(HEART_STICKER), filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.45))' }}
            >
              <img src={HEART_STICKER} alt="React" style={stickerImgStyle(HEART_STICKER)} />
            </button>
            {isStickerOpen && stickerOptions.map(url => (
              <button
                key={url}
                onClick={() => onPickSticker(url)}
                style={isDefaultSticker(url) ? { ...stickerButtonStyle(url), filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.45))' } : stickerButtonStyle(url)}
              >
                <img src={url} alt="" style={stickerImgStyle(url)} />
              </button>
            ))}
            {isStickerOpen && (
              <button
                onClick={onAddCustomSticker}
                style={{ width: STICKER_SIZE, height: STICKER_SIZE, borderRadius: '50%', border: `2.5px dashed ${NB.white}`, background: 'rgba(255,255,255,.28)', color: NB.white, fontSize: 24, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Muscle map or nutrition — height capped to line up with
            Card 1's own maxHeight (220) instead of growing to whatever its
            content naturally wants, which used to tower over the now much
            more compact media card. */}
        <div style={{ flex: '0 0 calc(100% - 56px)', scrollSnapAlign: 'start', overflow: 'hidden', flexShrink: 0, height: 330, ...nbCardStyle(NB.cream, 6), border: `4.5px solid ${NB.white}`, borderRadius: 27, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 21, marginRight: 16 }}>
          {isWorkout ? (
            <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flex: 1, alignItems: 'center', width: '100%' }}>
              <div style={{ flex: 1, maxWidth: 174 }}>
                <MuscleSVG url="/muscle_map_front.svg" muscleColors={frontColors} />
              </div>
              <div style={{ flex: 1, maxWidth: 174 }}>
                <MuscleSVG url="/muscle_map_back.svg" muscleColors={backColors} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: NB.fontMono, fontSize: 16.5, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 15 }}>Nutrition</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
                {[
                  ['Calories', content.macros?.calories, NB.teal, 'kcal'],
                  ['Protein',  content.macros?.protein,  NB.blue, 'g'],
                  ['Carbs',    content.macros?.carbs,    NB.yellow, 'g'],
                  ['Fat',      content.macros?.fat,      NB.pink, 'g'],
                ].map(([label, val, clr, unit]) => (
                  <div key={label} style={{ border: `2.25px solid ${NB.ink}`, borderRadius: 15, padding: '15px 12px', background: clr, textAlign: 'center' }}>
                    <div style={{ fontSize: 27, fontWeight: 900, color: NB.ink, lineHeight: 1 }}>{Math.round(val || 0)}<span style={{ fontSize: 15 }}>{unit}</span></div>
                    <div style={{ fontSize: 15, color: NB.ink, fontWeight: 700, marginTop: 4.5 }}>{label}</div>
                  </div>
                ))}
              </div>
              {content.ingredients?.length > 0 && (
                <div style={{ marginTop: 15, width: '100%' }}>
                  <div style={{ fontFamily: NB.fontMono, fontSize: 15, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Ingredients</div>
                  {content.ingredients.slice(0, 2).map((ing, i) => (
                    <div key={i} style={{ fontSize: 18, color: NB.ink, padding: '4.5px 0', borderBottom: `1px solid ${NB.ink}30`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SkeletonFeed() {
  return (
    <div style={{ padding: '0 16px' }}>
      {[1, 2].map(i => (
        <div key={i} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, border: `1.5px solid ${NB.ink}`, background: NB.cream, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 13, background: NB.cream, border: `1px solid ${NB.ink}`, borderRadius: 4, width: '40%', marginBottom: 6 }} />
              <div style={{ height: 11, background: NB.cream, width: '25%' }} />
            </div>
          </div>
          <div style={{ height: 300, background: NB.cream, border: 'none', borderRadius: 18 }} />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ tab }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>{tab === 'global' ? '🌍' : '👯‍♀️'}</div>
      <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, marginBottom: 8 }}>
        {tab === 'global' ? 'No posts yet' : 'No friend posts'}
      </div>
      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
        {tab === 'global' ? 'Complete a workout and share it to be first!' : 'Add friends using the search above to see their posts here.'}
      </div>
    </div>
  )
}
