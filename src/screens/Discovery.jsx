import React, { useState, useEffect, useCallback } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import {
  fetchGlobalFeed, fetchFriendsFeed, fetchFriendIds,
  fetchPendingRequests, fetchReactions, addReaction, removeReaction,
  sendFriendRequest, respondToRequest, searchUserByUsername, timeAgo,
} from '../lib/social'
import { getMissFlags } from '../utils/gamification'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

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
    ;(MUSCLE_SVG_IDS[group]?.[side] || []).forEach(id => { colors[id] = NB.ink })
  })
  return colors
}

function fmtDuration(secs) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function Discovery({ session, userProfile, gamification = {}, loggedMacros = { calories: 0 }, missState = null, onStartMakeup, onPendingChange, onNavigate }) {
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
  const [reactionSheet, setReactionSheet] = useState(null)

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
      const rx = await fetchReactions(feed.map(p => p.id), userId)
      setReactions(rx)
    }
    setLoading(false)
  }, [userId, activeTab])

  useEffect(() => { loadData() }, [loadData])

  const handleReact = async (post, emoji) => {
    if (!userId) return
    const postRx = reactions[post.id] || { mine: new Set() }
    const already = postRx.mine?.has(emoji)
    setReactions(prev => {
      const cur = prev[post.id] || { mine: new Set() }
      const mine = new Set(cur.mine)
      const count = already ? Math.max(0, (cur[emoji] || 1) - 1) : (cur[emoji] || 0) + 1
      already ? mine.delete(emoji) : mine.add(emoji)
      return { ...prev, [post.id]: { ...cur, [emoji]: count, mine } }
    })
    if (already) await removeReaction(post.id, userId, emoji)
    else await addReaction(post.id, userId, emoji)
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

  const sheetPost      = reactionSheet ? posts.find(p => p.id === reactionSheet.id) || reactionSheet : null
  const sheetReactions = sheetPost ? (reactions[sheetPost.id] || { mine: new Set() }) : { mine: new Set() }

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
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0 16px' }}>

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
              postReactions={reactions[post.id] || { mine: new Set() }}
              onOpenReactionSheet={() => setReactionSheet(post)}
              onReact={(emoji) => handleReact(post, emoji)}
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

// ── Discovery Lock ────────────────────────────────────────────────────────────
// Blocks the feed when yesterday's workout or calorie goal was missed. No dismiss
// button — only completing the make-up workout or logging a meal clears it.

function DiscoveryLock({ showWorkoutMiss, showCalorieMiss, missedWorkoutEntry, onStartMakeup, onNavigate }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
      <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink, marginBottom: 10 }}>Discover is locked</div>

      {showWorkoutMiss && (
        <div style={{ border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.orange, padding: '16px', marginBottom: 14, width: '100%' }}>
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
        <div style={{ border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: NB.yellow, padding: '16px', width: '100%' }}>
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

function PostCard({ post, postReactions, onOpenReactionSheet }) {
  const isWorkout = post.type === 'workout'
  const content   = post.content || {}

  const frontColors = muscleColors(content.muscles, 'front')
  const backColors  = muscleColors(content.muscles, 'back')

  const allEmojis      = Object.keys(postReactions).filter(k => k !== 'mine' && (postReactions[k] || 0) > 0)
  const floatingEmojis = allEmojis.slice(0, 4)
  const totalReactions = allEmojis.reduce((s, e) => s + (postReactions[e] || 0), 0)

  const duration = fmtDuration(content.elapsed)
  const sets     = content.setsCompleted > 0 ? `${content.setsCompleted} sets` : null

  return (
    <div style={{ marginBottom: 24 }}>

      {/* Header */}
      <div style={{ padding: '0 16px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, border: `2px solid ${NB.ink}`, background: NB.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: NB.ink }}>{(post.display_name || 'U')[0].toUpperCase()}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: NB.ink }}>{post.display_name || 'Aura user'}</div>
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

      {/* Stats row under profile */}
      {isWorkout && (duration || sets) && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 20 }}>
          {duration && (
            <div>
              <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.6 }}>Duration</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: NB.ink }}>⏱ {duration}</div>
            </div>
          )}
          {sets && (
            <div>
              <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.6 }}>Sets Done</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: NB.ink }}>💪 {sets}</div>
            </div>
          )}
        </div>
      )}
      {!isWorkout && content.macros && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 20 }}>
          <div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.6 }}>Calories</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: NB.ink }}>🍽 {Math.round(content.macros.calories || 0)} kcal</div>
          </div>
          {content.name && (
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.6 }}>Meal</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{content.name}</div>
            </div>
          )}
        </div>
      )}

      {/* Swipeable cards */}
      <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingLeft: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', gap: 10 }}>

        {/* Card 1: Media */}
        <div style={{ flex: '0 0 calc(100% - 56px)', scrollSnapAlign: 'start', overflow: 'hidden', position: 'relative', background: NB.lavender, flexShrink: 0, border: `2.5px solid ${NB.ink}`, borderRadius: 18, boxShadow: hardShadow(4), marginLeft: 16 }}>
          {post.media_url ? (
            post.media_type === 'video'
              ? <video src={post.media_url} autoPlay muted loop playsInline style={{ width: '100%', height: 'auto', display: 'block', minHeight: 160 }} />
              : <img src={post.media_url} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: 280, background: isWorkout ? NB.magenta : NB.green, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 48 }}>{isWorkout ? '💪' : '🥗'}</div>
              <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, marginTop: 10, textAlign: 'center', padding: '0 20px' }}>
                {isWorkout ? (content.label || 'Workout') : (content.name || 'Meal')}
              </div>
            </div>
          )}

          {/* Floating reaction circles */}
          {floatingEmojis.length > 0 && (
            <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 4, alignItems: 'center' }}>
              {floatingEmojis.map((emoji, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: 9, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {emoji}
                </div>
              ))}
              <span style={{ fontSize: 13, fontWeight: 800, color: NB.white, textShadow: '0 1px 4px rgba(0,0,0,.8)', marginLeft: 2 }}>{totalReactions}</span>
            </div>
          )}
        </div>

        {/* Card 2: Muscle map or nutrition */}
        <div style={{ flex: '0 0 calc(100% - 56px)', scrollSnapAlign: 'start', overflow: 'hidden', background: isWorkout ? NB.cream : NB.cream, flexShrink: 0, border: `2.5px solid ${NB.ink}`, borderRadius: 18, boxShadow: hardShadow(4), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, marginRight: 16 }}>
          {isWorkout ? (
            <>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Muscles Worked</div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flex: 1, alignItems: 'center', width: '100%' }}>
                <div style={{ flex: 1, maxWidth: 120 }}>
                  <MuscleSVG url="/muscle_map_front.svg" muscleColors={frontColors} />
                </div>
                <div style={{ flex: 1, maxWidth: 120 }}>
                  <MuscleSVG url="/muscle_map_back.svg" muscleColors={backColors} />
                </div>
              </div>
              {content.muscles?.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
                  {content.muscles.map(m => (
                    <span key={m} style={{ background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 7, padding: '3px 10px', fontSize: 10, color: NB.ink, fontWeight: 700, textTransform: 'uppercase' }}>{m}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>Nutrition</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
                {[
                  ['Calories', content.macros?.calories, NB.teal, 'kcal'],
                  ['Protein',  content.macros?.protein,  NB.blue, 'g'],
                  ['Carbs',    content.macros?.carbs,    NB.yellow, 'g'],
                  ['Fat',      content.macros?.fat,      NB.pink, 'g'],
                ].map(([label, val, clr, unit]) => (
                  <div key={label} style={{ border: `1.5px solid ${NB.ink}`, borderRadius: 10, padding: '12px 8px', background: clr, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: NB.ink, lineHeight: 1 }}>{Math.round(val || 0)}<span style={{ fontSize: 10 }}>{unit}</span></div>
                    <div style={{ fontSize: 10, color: NB.ink, fontWeight: 700, marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
              {content.ingredients?.length > 0 && (
                <div style={{ marginTop: 14, width: '100%' }}>
                  <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Ingredients</div>
                  {content.ingredients.slice(0, 3).map((ing, i) => (
                    <div key={i} style={{ fontSize: 12, color: NB.ink, padding: '4px 0', borderBottom: `1px solid ${NB.ink}30` }}>{ing}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Compact macro text for meal posts */}
      {!isWorkout && content.macros && (
        <div style={{ padding: '2px 16px 4px', fontSize: 11, color: '#555' }}>
          {Math.round(content.macros.calories || 0)} cal · {Math.round(content.macros.protein || 0)}g P · {Math.round(content.macros.carbs || 0)}g C · {Math.round(content.macros.fat || 0)}g F
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding: '8px 16px 0', display: 'flex', gap: 10 }}>
        <button
          onClick={onOpenReactionSheet}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: totalReactions > 0 ? NB.yellow : NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 10, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: NB.ink }}
        >
          <span style={{ fontSize: 16 }}>😊</span>
          React{totalReactions > 0 ? ` · ${totalReactions}` : ''}
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 10, padding: '7px 16px', cursor: 'default', fontSize: 13, fontWeight: 700, color: '#555' }}>
          <span style={{ fontSize: 16 }}>💬</span>
          Comment
        </button>
      </div>
    </div>
  )
}

// ── Reaction Sheet ────────────────────────────────────────────────────────────

function ReactionSheet({ post, postReactions, onReact, onClose }) {
  const [showPicker,   setShowPicker]   = useState(false)
  const [customEmoji,  setCustomEmoji]  = useState('')

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
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} />
      <div style={{ position: 'relative', background: NB.white, borderTop: NB_BORDER, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: `0 -6px 0 ${NB.ink}`, padding: '0 20px 28px', zIndex: 1, maxHeight: '78%', overflowY: 'auto' }}>

        <div style={{ width: 38, height: 5, background: NB.ink, margin: '14px auto 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 16px' }}>
          <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink }}>Reactions</span>
          <button onClick={onClose} style={{ background: NB.white, border: `2px solid ${NB.ink}`, borderRadius: 10, width: 32, height: 32, fontSize: 13, color: NB.ink, cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>

        {/* Your reactions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Your Reactions</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {myReactions.map(emoji => (
              <button key={emoji} onClick={() => onReact(emoji)} title="Tap to remove" style={{ width: 48, height: 48, background: NB.yellow, border: `2.5px solid ${NB.ink}`, borderRadius: 13, fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {emoji}
              </button>
            ))}
            <button onClick={() => setShowPicker(p => !p)} style={{ width: 48, height: 48, background: showPicker ? NB.cream : NB.white, border: `2.5px dashed ${NB.ink}`, borderRadius: 13, fontSize: 22, cursor: 'pointer', color: NB.ink, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
          {myReactions.length > 0 && <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>Tap a reaction to remove it</div>}
        </div>

        {/* Custom emoji picker */}
        {showPicker && (
          <div style={{ background: NB.cream, border: NB_BORDER, borderRadius: 16, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: NB.ink, marginBottom: 10 }}>Choose or type your reaction</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} placeholder="Type any emoji…" maxLength={4} style={{ flex: 1, height: 42, border: `2px solid ${NB.ink}`, borderRadius: 10, padding: '0 12px', fontSize: 20, background: NB.white, outline: 'none', fontFamily: NB.fontDisplay, boxSizing: 'border-box' }} />
              <button onClick={handleCustomAdd} disabled={!customEmoji.trim()} style={{ padding: '0 16px', border: `2px solid ${NB.ink}`, borderRadius: 10, background: customEmoji.trim() ? NB.teal : NB.white, color: NB.ink, fontWeight: 700, fontSize: 13, cursor: customEmoji.trim() ? 'pointer' : 'default' }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CUSTOM_EMOJI_GRID.map(e => (
                <button key={e} onClick={() => { onReact(e); setShowPicker(false) }} style={{ width: 42, height: 42, border: `1.5px solid ${NB.ink}`, borderRadius: 11, background: (postReactions.mine || new Set()).has(e) ? NB.yellow : NB.white, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All reactions */}
        {allReactions.length > 0 && (
          <div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>All Reactions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allReactions.map(([emoji, count]) => (
                <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: 5, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 10, padding: '6px 14px' }}>
                  <span style={{ fontSize: 20 }}>{emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allReactions.length === 0 && myReactions.length === 0 && !showPicker && (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: '#555' }}>Be the first to react! Tap + to add yours.</div>
        )}
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
          <div style={{ height: 300, background: NB.cream, border: NB_BORDER, borderRadius: 18 }} />
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
