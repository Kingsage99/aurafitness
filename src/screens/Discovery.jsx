import React, { useState, useEffect, useCallback, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import {
  fetchGlobalFeed, fetchFriendsFeed, fetchFriendIds,
  fetchPendingRequests, fetchReactions, addReaction, removeReaction,
  sendFriendRequest, respondToRequest, searchUserByUsername, timeAgo,
} from '../lib/social'

const REACTIONS = ['💪', '🔥', '⚡', '🙌']

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

  return (
    <>
      <StatusBar />

      <div style={{ padding: '10px 22px 0', flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: '#2E1065' }}>Discover</div>

        <div style={{ display: 'flex', gap: 0, marginTop: 10, borderBottom: '1.5px solid #EDE4F8' }}>
          {['global', 'friends'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingBottom: 10, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                color: activeTab === tab ? '#7C3AED' : '#8478A0',
                borderBottom: activeTab === tab ? '2.5px solid #7C3AED' : '2.5px solid transparent',
                marginBottom: -1.5, textTransform: 'capitalize',
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>

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
                <button
                  onClick={handleUsernameSearch}
                  disabled={searching}
                  style={{ height: 42, padding: '0 16px', borderRadius: 12, border: 'none', background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
                >
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
                <div style={{ marginTop: 10, fontSize: 13, color: '#8478A0', textAlign: 'center', padding: 8 }}>
                  No user found with @{searchQuery}
                </div>
              )}

              {myUsername && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#A99BC4', textAlign: 'center' }}>
                  Your username: <strong>@{myUsername}</strong>
                </div>
              )}
            </div>

            {pendingReqs.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#8478A0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Friend Requests
                </div>
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

        {loading ? (
          <SkeletonFeed />
        ) : posts.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              postReactions={reactions[post.id] || { mine: new Set() }}
              onReact={(emoji) => handleReact(post, emoji)}
            />
          ))
        )}
      </div>

      <BottomNav active="discovery" onNavigate={onNavigate} pendingRequests={pendingReqs.length} />
    </>
  )
}

function PostCard({ post, postReactions, onReact }) {
  const isWorkout = post.type === 'workout'
  const content   = post.content || {}
  const [panel, setPanel] = useState(0)
  const scrollRef = useRef()

  const frontColors = muscleColors(content.muscles, 'front')
  const backColors  = muscleColors(content.muscles, 'back')

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, offsetWidth } = scrollRef.current
    setPanel(scrollLeft > offsetWidth / 2 ? 1 : 0)
  }

  return (
    <div style={{ borderRadius: 20, background: '#fff', border: '1.5px solid #EDE4F8', marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(76,36,120,.05)' }}>

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

      {/* Swipeable panels */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Panel 1 — media, caption, chips */}
        <div style={{ flex: '0 0 100%', scrollSnapAlign: 'start' }}>
          {post.media_url ? (
            post.media_type === 'video'
              ? <video src={post.media_url} autoPlay muted loop playsInline style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
              : <img src={post.media_url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', aspectRatio: '4/3', background: isWorkout ? 'linear-gradient(135deg,#7C3AED,#4C1D95)' : 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 36 }}>{isWorkout ? '💪' : '🥗'}</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 15, color: '#fff', marginTop: 8, textAlign: 'center', padding: '0 16px' }}>
                {isWorkout ? (content.label || 'Workout') : (content.name || 'Meal')}
              </div>
              {isWorkout && content.elapsed > 0 && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>
                  {Math.floor(content.elapsed / 60)} min
                </div>
              )}
            </div>
          )}

          {post.caption ? (
            <div style={{ padding: '10px 14px 4px', fontSize: 13, color: '#2E1065', lineHeight: 1.5 }}>
              {post.caption}
            </div>
          ) : null}

          <div style={{ padding: '6px 14px 10px' }}>
            {isWorkout && content.muscles?.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {content.muscles.map(m => (
                  <span key={m} style={{ background: '#F0E8FF', borderRadius: 99, padding: '2px 8px', fontSize: 10, color: '#7C3AED', fontWeight: 700, textTransform: 'capitalize' }}>{m}</span>
                ))}
              </div>
            )}
            {!isWorkout && content.macros && (
              <div style={{ display: 'flex', gap: 14 }}>
                {[['Cal', content.macros.calories], ['P', `${content.macros.protein}g`], ['C', `${content.macros.carbs}g`], ['F', `${content.macros.fat}g`]].map(([k, v]) => (
                  <div key={k} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#2E1065' }}>{v}</div>
                    <div style={{ fontSize: 9, color: '#8478A0' }}>{k}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel 2 — muscle map or recipe */}
        <div style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '12px 16px 10px' }}>
          {isWorkout ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#8478A0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Muscles Worked</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <div style={{ flex: 1, maxWidth: 110 }}>
                  <MuscleSVG url="/muscle_map_front.svg" muscleColors={frontColors} />
                </div>
                <div style={{ flex: 1, maxWidth: 110 }}>
                  <MuscleSVG url="/muscle_map_back.svg" muscleColors={backColors} />
                </div>
              </div>
              {content.elapsed > 0 && (
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#8478A0' }}>
                  {Math.floor(content.elapsed / 60)} min · {content.setsCompleted || 0} sets done
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#8478A0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Nutrition</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  ['Calories', content.macros?.calories, '#7C3AED', 'kcal'],
                  ['Protein',  content.macros?.protein,  '#10B981', 'g'],
                  ['Carbs',    content.macros?.carbs,    '#F59E0B', 'g'],
                  ['Fat',      content.macros?.fat,      '#EC4899', 'g'],
                ].map(([label, val, clr, unit]) => (
                  <div key={label} style={{ borderRadius: 12, padding: '10px 8px', background: clr + '12', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: clr }}>{Math.round(val || 0)}{unit}</div>
                    <div style={{ fontSize: 10, color: '#8478A0', fontWeight: 700 }}>{label}</div>
                  </div>
                ))}
              </div>
              {content.ingredients?.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#8478A0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Ingredients</div>
                  {content.ingredients.slice(0, 5).map((ing, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#2E1065', padding: '4px 0', borderBottom: '1px solid #F5F0FF' }}>{ing}</div>
                  ))}
                  {content.ingredients.length > 5 && (
                    <div style={{ fontSize: 11, color: '#A99BC4', marginTop: 4 }}>+{content.ingredients.length - 5} more</div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingTop: 6, paddingBottom: 4 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: panel === i ? '#7C3AED' : '#EDE4F8', transition: 'background 0.2s' }} />
        ))}
      </div>

      {/* Reactions bar */}
      <div style={{ padding: '6px 14px 12px', borderTop: '1px solid #F5F0FF', display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
        {REACTIONS.map(emoji => {
          const count   = postReactions[emoji] || 0
          const reacted = postReactions.mine?.has(emoji)
          return (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: reacted ? '#F0E8FF' : '#F8F4FF',
                border: `1.5px solid ${reacted ? '#7C3AED' : '#EDE4F8'}`,
                borderRadius: 20, padding: '5px 10px',
                cursor: 'pointer', fontSize: 15, lineHeight: 1,
                transition: 'all 0.15s',
              }}
            >
              {emoji}
              {count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: reacted ? '#7C3AED' : '#8478A0' }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

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
          <div style={{ height: 160, background: '#F0E8FF' }} />
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
