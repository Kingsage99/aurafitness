import React, { useState, useEffect, useCallback } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import {
  fetchGlobalFeed, fetchFriendsFeed, fetchFriendIds,
  fetchPendingRequests, fetchReactions, addReaction, removeReaction,
  sendFriendRequest, respondToRequest, searchUserByUsername, timeAgo,
} from '../lib/social'

const CUSTOM_EMOJI_GRID = [
  '💪','🔥','⚡','🙌','❤️','🌟','😍','🤩','🎯','💯',
  '🙏','✨','🎉','👏','🥵','💥','🏋️','🧠','🫶','😤',
]

const MUSCLE_TO_GROUP = {
  glutes:'glutes', glute:'glutes',
  hamstrings:'legs', quads:'legs', legs:'legs',
  chest:'chest', pecs:'chest',
  shoulders:'shoulders', delts:'shoulders',
  back:'back', lats:'back', lat:'back',
  core:'core', abs:'core',
  arms:'arms', biceps:'arms', triceps:'arms',
  calves:'calves',
}

function muscleColors(muscles, side) {
  const colors = {}
  ;(muscles || []).forEach(m => {
    const group = MUSCLE_TO_GROUP[m?.toLowerCase()]
    if (!group) return
    ;(MUSCLE_SVG_IDS[group]?.[side] || []).forEach(id => { colors[id] = '#7C3AED' })
  })
  return colors
}

export default function Discovery({ session, userProfile, onNavigate }) {
  const userId      = session?.user?.id
  const displayName = userProfile?.name || session?.user?.email?.split('@')[0] || 'You'
  const myUsername  = userProfile?.username || ''

  const [activeTab,    setActiveTab]    = useState('global')
  const [posts,        setPosts]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [friendIds,    setFriendIds]    = useState(new Set())
  const [pendingReqs,  setPendingReqs]  = useState([])
  const [sentReqs,     setSentReqs]     = useState(new Set())
  const [reactions,    setReactions]    = useState({})

  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResult,   setSearchResult]   = useState(null)
  const [searchNoResult, setSearchNoResult] = useState(false)
  const [searching,      setSearching]      = useState(false)

  // Reaction sheet
  const [reactionSheet, setReactionSheet] = useState(null) // { post } | null

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [ids, reqs] = await Promise.all([
      fetchFriendIds(userId),
      fetchPendingRequests(userId),
    ])
    setFriendIds(new Set(ids))
    setPendingReqs(reqs)

    const feed = activeTab === 'global'
      ? await fetchGlobalFeed(30)
      : await fetchFriendsFeed(userId, 30)
    setPosts(feed)

    if (feed.length > 0) {
      const rx = await fetchReactions(feed.map(p => p.id), userId)
      setReactions(rx)
    }
    setLoading(false)
  }, [userId, activeTab])

  useEffect(() => { loadData() }, [loadData])

  const handleReact = async (post, emoji) => {
    if (!userId) return
    const postRx = reactions[post.id] || { mine: new Set() }
    const alreadyReacted = postRx.mine?.has(emoji)

    setReactions(prev => {
      const cur  = prev[post.id] || { mine: new Set() }
      const mine = new Set(cur.mine)
      const newCount = alreadyReacted ? Math.max(0, (cur[emoji] || 1) - 1) : (cur[emoji] || 0) + 1
      alreadyReacted ? mine.delete(emoji) : mine.add(emoji)
      return { ...prev, [post.id]: { ...cur, [emoji]: newCount, mine } }
    })

    // Update the open sheet's snapshot so it re-renders
    if (reactionSheet?.post?.id === post.id) {
      setReactionSheet(prev => ({ ...prev, refreshKey: Date.now() }))
    }

    if (alreadyReacted) await removeReaction(post.id, userId, emoji)
    else await addReaction(post.id, userId, emoji)
  }

  const handleRespondReq = async (req, status) => {
    await respondToRequest(req.id, status)
    setPendingReqs(prev => prev.filter(r => r.id !== req.id))
    if (status === 'accepted') setFriendIds(prev => new Set(prev).add(req.sender_id))
  }

  const handleUsernameSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResult(null)
    setSearchNoResult(false)
    const result = await searchUserByUsername(searchQuery.trim())
    setSearching(false)
    if (result) setSearchResult(result)
    else setSearchNoResult(true)
  }

  const handleAddFriendByUsername = async (user) => {
    setSentReqs(prev => new Set(prev).add(user.id))
    await sendFriendRequest(userId, displayName, user.id)
  }

  const sheetPost     = reactionSheet ? posts.find(p => p.id === reactionSheet.post.id) || reactionSheet.post : null
  const sheetReactions = sheetPost ? (reactions[sheetPost.id] || { mine: new Set() }) : { mine: new Set() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <StatusBar />

      {/* Header + tabs */}
      <div style={{ padding: '10px 22px 0', flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: '#2E1065' }}>Discover</div>
        <div style={{ display: 'flex', marginTop: 10, borderBottom: '1.5px solid #EDE4F8' }}>
          {['global', 'friends'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingBottom: 10, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                color: activeTab === tab ? '#7C3AED' : '#8478A0',
                borderBottom: activeTab === tab ? '2.5px solid #7C3AED' : '2.5px solid transparent',
                marginBottom: -1.5,
              }}
            >
              {tab === 'global' ? 'Global' : 'Friends'}
              {tab === 'friends' && pendingReqs.length > 0 && (
                <span style={{ marginLeft: 6, background: '#EF4444', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
                  {pendingReqs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>

        {/* Friends tab extras */}
        {activeTab === 'friends' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#8478A0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Add Friends</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#A99BC4', fontWeight: 700, pointerEvents: 'none' }}>@</span>
                  <input
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSearchResult(null); setSearchNoResult(false) }}
                    onKeyDown={e => e.key === 'Enter' && handleUsernameSearch()}
                    placeholder="username"
                    style={{ width: '100%', height: 42, borderRadius: 12, border: '1.5px solid #EDE4F8', paddingLeft: 28, paddingRight: 12, fontSize: 14, color: '#2E1065', background: '#FAFAFF', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
                <button onClick={handleUsernameSearch} disabled={searching} style={{ height: 42, padding: '0 16px', borderRadius: 12, border: 'none', background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>
                  {searching ? '…' : 'Search'}
                </button>
              </div>

              {searchResult && (
                <div style={{ marginTop: 10, borderRadius: 14, padding: '12px 14px', background: '#F8F4FF', border: '1.5px solid #DDD0FA', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{(searchResult.username || 'U')[0].toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2E1065' }}>{searchResult.display_name}</div>
                    <div style={{ fontSize: 11, color: '#8478A0' }}>@{searchResult.username}</div>
                  </div>
                  {searchResult.id === userId ? (
                    <span style={{ fontSize: 12, color: '#8478A0', fontWeight: 600 }}>That's you</span>
                  ) : friendIds.has(searchResult.id) ? (
                    <span style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>✓ Friends</span>
                  ) : (
                    <button
                      onClick={() => handleAddFriendByUsername(searchResult)}
                      disabled={sentReqs.has(searchResult.id)}
                      style={{ background: sentReqs.has(searchResult.id) ? '#F0E8FF' : '#7C3AED', border: 'none', borderRadius: 10, padding: '6px 12px', color: sentReqs.has(searchResult.id) ? '#7C3AED' : '#fff', fontSize: 12, fontWeight: 700, cursor: sentReqs.has(searchResult.id) ? 'default' : 'pointer' }}
                    >
                      {sentReqs.has(searchResult.id) ? 'Pending ✓' : '+ Add'}
                    </button>
                  )}
                </div>
              )}
              {searchNoResult && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#8478A0', textAlign: 'center', padding: 8 }}>No user found with @{searchQuery}</div>
              )}
              {myUsername && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#A99BC4', textAlign: 'center' }}>
                  Your username: <strong>@{myUsername}</strong>
                </div>
              )}
            </div>

            {pendingReqs.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#8478A0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Friend Requests</div>
                {pendingReqs.map(req => (
                  <div key={req.id} style={{ borderRadius: 16, padding: '12px 14px', background: '#F8F4FF', border: '1.5px solid #DDD0FA', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{(req.sender_name || 'U')[0].toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#2E1065' }}>{req.sender_name || 'Someone'} wants to be friends</div>
                    <button onClick={() => handleRespondReq(req, 'accepted')} style={{ background: '#7C3AED', border: 'none', borderRadius: 10, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginRight: 6 }}>Accept</button>
                    <button onClick={() => handleRespondReq(req, 'declined')} style={{ background: '#F0E8FF', border: 'none', borderRadius: 10, padding: '6px 12px', color: '#7C3AED', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Decline</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {loading ? <SkeletonFeed /> : posts.length === 0 ? <EmptyState tab={activeTab} /> : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              postReactions={reactions[post.id] || { mine: new Set() }}
              onOpenReactionSheet={() => setReactionSheet({ post })}
            />
          ))
        )}
      </div>

      <BottomNav active="discovery" onNavigate={onNavigate} pendingRequests={pendingReqs.length} />

      {/* Reaction sheet overlay */}
      {reactionSheet && sheetPost && (
        <ReactionSheet
          post={sheetPost}
          postReactions={sheetReactions}
          onReact={(emoji) => handleReact(sheetPost, emoji)}
          onClose={() => setReactionSheet(null)}
        />
      )}
    </div>
  )
}

// ── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post, postReactions, onOpenReactionSheet }) {
  const isWorkout = post.type === 'workout'
  const content   = post.content || {}

  const frontColors = muscleColors(content.muscles, 'front')
  const backColors  = muscleColors(content.muscles, 'back')

  const allEmojis      = Object.keys(postReactions).filter(k => k !== 'mine' && (postReactions[k] || 0) > 0)
  const floatingEmojis = allEmojis.slice(0, 4)
  const totalReactions = allEmojis.reduce((s, e) => s + (postReactions[e] || 0), 0)

  return (
    <div style={{ borderRadius: 20, background: '#fff', border: '1.5px solid #EDE4F8', marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(76,36,120,.06)' }}>

      {/* Header */}
      <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{(post.display_name || 'U')[0].toUpperCase()}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#2E1065' }}>{post.display_name || 'Aura user'}</div>
          <div style={{ fontSize: 11, color: '#8478A0' }}>{timeAgo(post.created_at)}</div>
        </div>
        <span style={{ background: isWorkout ? '#F0E8FF' : '#ECFDF5', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: isWorkout ? '#7C3AED' : '#059669' }}>
          {isWorkout ? 'WORKOUT' : 'MEAL'}
        </span>
      </div>

      {/* Split layout — media left, map/macros right */}
      <div style={{ display: 'flex', height: 230 }}>

        {/* Left: media */}
        <div style={{ width: '58%', position: 'relative', overflow: 'hidden', flexShrink: 0, background: '#1a1a2e' }}>
          {post.media_url ? (
            post.media_type === 'video'
              ? <video src={post.media_url} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <img src={post.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: isWorkout ? 'linear-gradient(160deg,#7C3AED,#4C1D95)' : 'linear-gradient(160deg,#10B981,#059669)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 32 }}>{isWorkout ? '💪' : '🥗'}</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 13, color: '#fff', marginTop: 6, textAlign: 'center', padding: '0 10px', lineHeight: 1.3 }}>
                {isWorkout ? (content.label || 'Workout') : (content.name || 'Meal')}
              </div>
            </div>
          )}

          {/* Floating reaction circles */}
          {floatingEmojis.length > 0 && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 4, alignItems: 'center' }}>
              {floatingEmojis.map((emoji, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '0 1px 6px rgba(0,0,0,.25)', flexShrink: 0 }}>
                  {emoji}
                </div>
              ))}
              {totalReactions > 0 && (
                <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{totalReactions}</span>
              )}
            </div>
          )}
        </div>

        {/* Right: muscle map or macro grid */}
        <div style={{ flex: 1, background: isWorkout ? '#F8F4FF' : '#F0FDF4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '8px 4px' }}>
          {isWorkout ? (
            <>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#A99BC4', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' }}>Muscles</div>
              <div style={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'center' }}>
                <div style={{ flex: 1, maxWidth: 60 }}>
                  <MuscleSVG url="/muscle_map_front.svg" muscleColors={frontColors} />
                </div>
                <div style={{ flex: 1, maxWidth: 60 }}>
                  <MuscleSVG url="/muscle_map_back.svg" muscleColors={backColors} />
                </div>
              </div>
              {content.elapsed > 0 && (
                <div style={{ fontSize: 10, color: '#A99BC4', marginTop: 4, textAlign: 'center' }}>
                  {Math.floor(content.elapsed / 60)}m
                </div>
              )}
            </>
          ) : (
            <div style={{ width: '100%', padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['Cal', content.macros?.calories, '#7C3AED', 'kcal'],
                ['Protein', content.macros?.protein, '#10B981', 'g'],
                ['Carbs', content.macros?.carbs, '#F59E0B', 'g'],
                ['Fat', content.macros?.fat, '#EC4899', 'g'],
              ].map(([label, val, clr, unit]) => (
                <div key={label} style={{ borderRadius: 8, padding: '5px 6px', background: clr + '18', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: clr, lineHeight: 1 }}>{Math.round(val || 0)}<span style={{ fontSize: 8 }}>{unit}</span></div>
                  <div style={{ fontSize: 8, color: '#8478A0', fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      {post.caption ? (
        <div style={{ padding: '9px 14px 4px', fontSize: 13, color: '#2E1065', lineHeight: 1.5 }}>
          {post.caption}
        </div>
      ) : null}

      {/* Compact macro bar for meal posts */}
      {!isWorkout && content.macros && (
        <div style={{ padding: '2px 14px 4px', fontSize: 11, color: '#8478A0' }}>
          {Math.round(content.macros.calories || 0)} cal · {Math.round(content.macros.protein || 0)}g P · {Math.round(content.macros.carbs || 0)}g C · {Math.round(content.macros.fat || 0)}g F
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding: '8px 14px 12px', borderTop: '1px solid #F5F0FF', display: 'flex', gap: 10 }}>
        <button
          onClick={onOpenReactionSheet}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: totalReactions > 0 ? '#F0E8FF' : '#F8F4FF', border: `1.5px solid ${totalReactions > 0 ? '#C4B5FD' : '#EDE4F8'}`, borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: totalReactions > 0 ? '#7C3AED' : '#8478A0' }}
        >
          <span style={{ fontSize: 16 }}>😊</span>
          React{totalReactions > 0 ? ` · ${totalReactions}` : ''}
        </button>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8F4FF', border: '1.5px solid #EDE4F8', borderRadius: 20, padding: '6px 14px', cursor: 'default', fontSize: 13, fontWeight: 700, color: '#8478A0' }}
        >
          <span style={{ fontSize: 16 }}>💬</span>
          Comment
        </button>
      </div>
    </div>
  )
}

// ── Reaction Sheet ────────────────────────────────────────────────────────────

function ReactionSheet({ post, postReactions, onReact, onClose }) {
  const [showPicker, setShowPicker]     = useState(false)
  const [customEmoji, setCustomEmoji]   = useState('')

  const myReactions  = [...(postReactions.mine || new Set())]
  const allReactions = Object.entries(postReactions)
    .filter(([k]) => k !== 'mine')
    .filter(([, v]) => (v || 0) > 0)
    .sort((a, b) => b[1] - a[1])

  const handleCustomAdd = () => {
    const e = customEmoji.trim()
    if (!e) return
    onReact(e)
    setCustomEmoji('')
    setShowPicker(false)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} />

      {/* Sheet */}
      <div style={{ position: 'relative', background: '#fff', borderRadius: '22px 22px 0 0', padding: '0 20px 28px', zIndex: 1, maxHeight: '75%', overflowY: 'auto' }}>

        {/* Handle */}
        <div style={{ width: 38, height: 4, background: '#EDE4F8', borderRadius: 2, margin: '12px auto 0' }} />

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 14px' }}>
          <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: '#2E1065' }}>Reactions</span>
          <button onClick={onClose} style={{ background: '#F0E8FF', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 14, color: '#7C3AED', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✕</button>
        </div>

        {/* Your reactions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8478A0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Your Reactions</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {myReactions.map(emoji => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                title="Tap to remove"
                style={{ width: 46, height: 46, borderRadius: '50%', background: '#F0E8FF', border: '2px solid #7C3AED', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowPicker(p => !p)}
              style={{ width: 46, height: 46, borderRadius: '50%', background: showPicker ? '#F0E8FF' : '#F8F4FF', border: '2px dashed #C4B5FD', fontSize: 22, cursor: 'pointer', color: '#7C3AED', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              +
            </button>
          </div>
        </div>

        {/* Custom emoji picker */}
        {showPicker && (
          <div style={{ background: '#F8F4FF', borderRadius: 16, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', marginBottom: 10 }}>Choose or type a reaction</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                value={customEmoji}
                onChange={e => setCustomEmoji(e.target.value)}
                placeholder="Type any emoji…"
                maxLength={4}
                style={{ flex: 1, height: 38, borderRadius: 10, border: '1.5px solid #EDE4F8', padding: '0 12px', fontSize: 18, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleCustomAdd}
                disabled={!customEmoji.trim()}
                style={{ padding: '0 16px', borderRadius: 10, background: customEmoji.trim() ? '#7C3AED' : '#EDE4F8', color: customEmoji.trim() ? '#fff' : '#A99BC4', border: 'none', fontWeight: 700, fontSize: 13, cursor: customEmoji.trim() ? 'pointer' : 'default' }}
              >
                Add
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CUSTOM_EMOJI_GRID.map(e => (
                <button
                  key={e}
                  onClick={() => { onReact(e); setShowPicker(false) }}
                  style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: (postReactions.mine || new Set()).has(e) ? '#F0E8FF' : '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All reactions */}
        {allReactions.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#8478A0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>All Reactions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allReactions.map(([emoji, count]) => (
                <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F8F4FF', borderRadius: 20, padding: '6px 12px', border: '1.5px solid #EDE4F8' }}>
                  <span style={{ fontSize: 18 }}>{emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#8478A0' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allReactions.length === 0 && myReactions.length === 0 && !showPicker && (
          <div style={{ textAlign: 'center', padding: '12px 0 4px', fontSize: 13, color: '#A99BC4' }}>
            Be the first to react! Tap + to add yours.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Skeleton + empty state ────────────────────────────────────────────────────

function SkeletonFeed() {
  return (
    <>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ borderRadius: 20, background: '#fff', border: '1.5px solid #EDE4F8', marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ padding: 14, display: 'flex', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0E8FF' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, background: '#F0E8FF', borderRadius: 6, width: '40%', marginBottom: 6 }} />
              <div style={{ height: 10, background: '#F8F4FF', borderRadius: 6, width: '25%' }} />
            </div>
          </div>
          <div style={{ height: 230, background: '#F0E8FF' }} />
          <div style={{ padding: '10px 14px' }}>
            <div style={{ height: 10, background: '#F8F4FF', borderRadius: 6, width: '60%' }} />
          </div>
        </div>
      ))}
    </>
  )
}

function EmptyState({ tab }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>{tab === 'global' ? '🌍' : '👯‍♀️'}</div>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: '#2E1065', marginBottom: 8 }}>
        {tab === 'global' ? 'No posts yet' : 'No friend posts'}
      </div>
      <div style={{ fontSize: 13, color: '#8478A0', lineHeight: 1.6 }}>
        {tab === 'global'
          ? 'Complete a workout and share it to be first!'
          : 'Add friends using the search above to see their posts here.'}
      </div>
    </div>
  )
}
