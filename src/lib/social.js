import { supabase } from './supabase'

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(userId, displayName, type, content, { caption = '', mediaUrl = null, mediaType = null } = {}) {
  const { error } = await supabase.from('posts').insert({
    user_id: userId,
    display_name: displayName || 'Aura user',
    type,
    content,
    caption,
    media_url: mediaUrl,
    media_type: mediaType,
  })
  if (error) console.error('createPost error:', error.message)
}

export async function uploadPostMedia(file) {
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage.from('post-media').upload(path, file)
  if (error) { console.error('uploadPostMedia error:', error.message); return null }
  const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(data.path)
  return { url: publicUrl, type: file.type.startsWith('video') ? 'video' : 'image' }
}

export async function fetchGlobalFeed(limit = 30) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('fetchGlobalFeed error:', error.message); return [] }
  return data || []
}

export async function fetchFriendsFeed(userId, limit = 30) {
  const ids = await fetchFriendIds(userId)
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('fetchFriendsFeed error:', error.message); return [] }
  return data || []
}

export async function toggleLike(postId, userId, currentlyLiked) {
  if (currentlyLiked) {
    const { error } = await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userId })
    if (error) console.error('toggleLike (unlike) error:', error.message)
  } else {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
    if (error) console.error('toggleLike (like) error:', error.message)
  }
}

export async function fetchUserLikes(userId) {
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
  if (error) return new Set()
  return new Set((data || []).map(r => r.post_id))
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function addReaction(postId, userId, emoji) {
  const { error } = await supabase.from('post_reactions')
    .insert({ post_id: postId, user_id: userId, emoji })
  if (error) console.error('addReaction error:', error.message)
}

export async function removeReaction(postId, userId, emoji) {
  const { error } = await supabase.from('post_reactions')
    .delete()
    .match({ post_id: postId, user_id: userId, emoji })
  if (error) console.error('removeReaction error:', error.message)
}

export async function fetchReactions(postIds, userId) {
  if (!postIds?.length) return {}
  const { data, error } = await supabase
    .from('post_reactions')
    .select('post_id, emoji, user_id')
    .in('post_id', postIds)
  if (error) { console.error('fetchReactions error:', error.message); return {} }
  const result = {}
  ;(data || []).forEach(r => {
    if (!result[r.post_id]) result[r.post_id] = { mine: new Set() }
    result[r.post_id][r.emoji] = (result[r.post_id][r.emoji] || 0) + 1
    if (r.user_id === userId) result[r.post_id].mine.add(r.emoji)
  })
  return result
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export async function sendFriendRequest(senderId, senderName, receiverId) {
  const { error } = await supabase.from('friend_requests').insert({
    sender_id: senderId,
    sender_name: senderName || 'Aura user',
    receiver_id: receiverId,
    status: 'pending',
  })
  if (error) console.error('sendFriendRequest error:', error.message)
}

export async function respondToRequest(requestId, status) {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status })
    .eq('id', requestId)
  if (error) console.error('respondToRequest error:', error.message)
}

export async function fetchPendingRequests(userId) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchPendingRequests error:', error.message); return [] }
  return data || []
}

export async function fetchFriendIds(userId) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('sender_id, receiver_id')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
  if (error) { console.error('fetchFriendIds error:', error.message); return [] }
  return (data || []).map(r => r.sender_id === userId ? r.receiver_id : r.sender_id)
}

export async function checkFriendshipStatus(currentUserId, targetUserId) {
  const { data } = await supabase
    .from('friend_requests')
    .select('status')
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`)
    .single()
  return data?.status || null
}

// ─── Username ─────────────────────────────────────────────────────────────────

export async function setUsername(userId, username) {
  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId)
  return { error }
}

export async function searchUserByUsername(query) {
  if (!query?.trim()) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, profile_data')
    .ilike('username', query.trim())
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return {
    id: data.id,
    username: data.username,
    display_name: data.profile_data?.name || data.username,
  }
}

// ─── Workout History ──────────────────────────────────────────────────────────

export async function saveWorkoutHistory(userId, sessionData) {
  const { error } = await supabase.from('workout_history').insert({
    user_id: userId,
    label: sessionData.workoutLabel || 'Workout',
    exercises: sessionData.exercises || [],
    elapsed: sessionData.elapsed || 0,
    total_sets: sessionData.totalSets || 0,
    sets_completed: sessionData.setsCompleted || 0,
  })
  if (error) console.error('saveWorkoutHistory error:', error.message)
}

export async function fetchWorkoutHistory(userId, limit = 90) {
  const { data, error } = await supabase
    .from('workout_history')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('fetchWorkoutHistory error:', error.message); return [] }
  return data || []
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function top3Muscles(exercises) {
  const counts = {}
  ;(exercises || []).forEach(ex => {
    ;(ex.muscles?.primary || []).forEach(m => { counts[m] = (counts[m] || 0) + 1 })
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => m)
}
