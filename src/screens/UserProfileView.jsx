import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { fetchProfileById, checkFriendshipStatus, sendFriendRequest, respondToRequest, removeFriend } from '../lib/social'
import { RANKS, normalizeRankId } from '../utils/gamification'
import { Avatar } from '../components/AvatarSilhouette'
import { STORE_BORDERS, bannerGradientFor, bannerImageFor } from './StoreScreen'
import { isPro } from '../lib/stripe'
import ProBorderRing from '../components/ProBorderRing'
import { NB, NB_BORDER, hardShadow, proTextStyle } from '../styles/neoBrutalism'

const AVATAR_SIZE = 64
const BANNER_H = 165

// Every /banner/*.png is a 1920x1080 canvas with the real artwork baked into
// roughly the same centred rectangle, but the exact bounds vary a few px per
// image (measured directly off each file's alpha channel). Using the
// intersection of all of them — the largest rect guaranteed to be painted
// pixels in every single banner — instead of the union avoids a sliver of
// the transparent margin (and the page's gradient behind it) bleeding
// through as a thin horizontal line on whichever banner has the smallest
// art rect.
const BANNER_SRC = { w: 1920, h: 1080 }
const BANNER_ART = { x: 380, y: 358, w: 1157, h: 379 }

// Renders just the banner's art rectangle, scaled+positioned (cover-style)
// to fill its container exactly — no letterbox ever visible.
function BannerImage({ src }) {
  const wrapRef = useRef(null)
  const [box, setBox] = useState(null)

  useLayoutEffect(() => {
    if (wrapRef.current) setBox({ w: wrapRef.current.clientWidth, h: wrapRef.current.clientHeight })
  }, [src])

  if (!src) return null

  const style = box ? (() => {
    const scale = Math.max(box.w / BANNER_ART.w, box.h / BANNER_ART.h)
    const renderedW = BANNER_SRC.w * scale
    const renderedH = BANNER_SRC.h * scale
    const artCenterX = (BANNER_ART.x + BANNER_ART.w / 2) * scale
    const artCenterY = (BANNER_ART.y + BANNER_ART.h / 2) * scale
    return {
      position: 'absolute',
      width: renderedW,
      height: renderedH,
      left: box.w / 2 - artCenterX,
      top: box.h / 2 - artCenterY,
      maxWidth: 'none',
    }
  })() : { opacity: 0 }

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <img src={src} alt="" style={style} onError={e => { e.currentTarget.style.display = 'none' }} />
    </div>
  )
}

// Avatar photo with the user's equipped ring-border overlaid. frameOffsets are
// calibrated for a 46px avatar, so they scale by AVATAR_SIZE/46 here.
function BigAvatar({ profile }) {
  const frameId = profile?.gamification?.frame
  const border = frameId ? STORE_BORDERS.find(b => b.id === `frame_${frameId}`) : null
  const off = border?.frameOffset
  const scale = AVATAR_SIZE / 46
  return (
    <div style={{ position: 'relative', width: AVATAR_SIZE, height: AVATAR_SIZE, flexShrink: 0, zIndex: 0 }}>
      <div style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: '50%', border: border?.id === 'frame_pro' && isPro(profile) ? 'none' : `3px solid ${NB.white}`, background: NB.lavender, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Avatar url={profile?.profile_data?.avatarUrl} height={AVATAR_SIZE} color={NB.ink} />
      </div>
      {border?.image && off && (
        <img src={border.image} alt="" style={{ position: 'absolute', top: off.top * scale, left: off.left * scale, width: off.size * scale, height: off.size * scale, pointerEvents: 'none' }} />
      )}
      {border?.id === 'frame_pro' && isPro(profile) && <ProBorderRing size={AVATAR_SIZE} />}
    </div>
  )
}

export default function UserProfileView({ userId, session, onNavigate }) {
  const myId = session?.user?.id
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friendReq, setFriendReq] = useState(null) // { id, status, sender_id, receiver_id } | null
  const [sending, setSending] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!userId) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      const [p, req] = await Promise.all([
        fetchProfileById(userId),
        myId && myId !== userId ? checkFriendshipStatus(myId, userId) : Promise.resolve(null),
      ])
      if (cancelled) return
      setProfile(p)
      setFriendReq(req)
      setConfirmingRemove(false)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [userId, myId])

  const g = profile?.gamification || {}
  const name = profile?.profile_data?.name || profile?.username || 'MissVfit user'
  const username = profile?.username
  const profileIsPro = isPro(profile)
  const rank = RANKS.find(r => r.id === normalizeRankId(g.rank)) || RANKS[0]
  const streak = g.workoutStreak || 0
  const isSelf = myId && myId === userId

  const handleAddFriend = async () => {
    if (sending || friendReq) return
    setSending(true)
    setFriendReq({ id: null, status: 'pending', sender_id: myId, receiver_id: userId })
    await sendFriendRequest(myId, session?.user?.email?.split('@')[0] || 'MissVfit user', userId)
    setSending(false)
  }

  const handleAccept = async () => {
    if (!friendReq) return
    setFriendReq({ ...friendReq, status: 'accepted' })
    await respondToRequest(friendReq.id, 'accepted')
  }

  const handleDecline = async () => {
    if (!friendReq) return
    const req = friendReq
    setFriendReq(null)
    await respondToRequest(req.id, 'declined')
  }

  const handleRemoveFriend = async () => {
    if (!friendReq) return
    const req = friendReq
    setFriendReq(null)
    setConfirmingRemove(false)
    await removeFriend(req.id)
  }

  const isPending  = friendReq?.status === 'pending'
  const theirTurn  = isPending && friendReq.sender_id === userId // they requested me — I can accept/decline
  const isFriends  = friendReq?.status === 'accepted'
  const bannerImg = bannerImageFor(g.activeBanner)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <StatusBar />

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Banner — art-rect-cropped image (gradient fallback), avatar + name
            laid directly on top of it in the bottom-left, matching the
            reference layout instead of stacking identity below the banner. */}
        <div style={{ position: 'relative', width: '100%', height: BANNER_H, background: bannerGradientFor(g.activeBanner), flexShrink: 0 }}>
          <BannerImage src={bannerImg} />
          <button
            onClick={() => onNavigate('discovery')}
            style={{ position: 'absolute', top: 12, left: 16, zIndex: 2, width: 36, height: 36, borderRadius: 11, background: NB.white, border: NB_BORDER, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {!loading && profile && (
            <div style={{ position: 'absolute', left: 18, bottom: 16, zIndex: 2, display: 'flex', alignItems: 'center', gap: 12, maxWidth: 'calc(100% - 36px)' }}>
              <BigAvatar profile={profile} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 17, textTransform: 'uppercase', textShadow: '0 2px 6px rgba(0,0,0,.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(profileIsPro ? proTextStyle : { color: NB.white }) }}>{name}</div>
                {username && <div style={{ fontSize: 12, fontFamily: NB.fontMono, color: 'rgba(255,255,255,.88)', textShadow: '0 1px 5px rgba(0,0,0,.5)', marginTop: 2 }}>@{username}</div>}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 14, color: '#555' }}>Loading…</div>
        ) : !profile ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 14, color: '#555' }}>Couldn't load this profile.</div>
        ) : (
          <div style={{ padding: '18px 22px 24px' }}>
            {/* Rank + streak */}
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: rank.bgGradient || rank.bg, color: rank.color, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '5px 12px', fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800 }}>
                <img src={rank.image} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />{rank.label}
              </span>
              <span style={{ background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '5px 12px', fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: NB.ink }}>🔥 {streak} day streak</span>
            </div>

            {/* Friend status / actions */}
            {!isSelf && (
              confirmingRemove ? (
                <div style={{ marginTop: 20, border: NB_BORDER, borderRadius: 16, padding: '14px 16px', background: NB.lavenderMist }}>
                  <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, color: NB.ink, marginBottom: 12 }}>Remove {name} as a friend?</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleRemoveFriend} style={{ flex: 1, height: 44, border: NB_BORDER, borderRadius: 12, background: NB.red, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>Remove</button>
                    <button onClick={() => setConfirmingRemove(false)} style={{ flex: 1, height: 44, border: NB_BORDER, borderRadius: 12, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : theirTurn ? (
                <div style={{ marginTop: 20, border: NB_BORDER, borderRadius: 16, padding: '14px 16px', background: NB.lavenderMist }}>
                  <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, color: NB.ink, marginBottom: 12 }}>{name} wants to be friends</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleAccept} style={{ flex: 1, height: 44, border: NB_BORDER, borderRadius: 12, background: NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>Accept</button>
                    <button onClick={handleDecline} style={{ flex: 1, height: 44, border: NB_BORDER, borderRadius: 12, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>Decline</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={isFriends ? () => setConfirmingRemove(true) : isPending ? undefined : handleAddFriend}
                  disabled={isPending}
                  style={{ marginTop: 20, width: '100%', height: 50, border: NB_BORDER, borderRadius: 16, boxShadow: isPending ? 'none' : hardShadow(4), background: isFriends ? NB.teal : isPending ? NB.white : NB.magenta, color: isFriends ? NB.ink : isPending ? NB.ink : NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', cursor: isPending ? 'default' : 'pointer' }}
                >
                  {isFriends ? 'Friends ✓' : isPending ? 'Requested' : '+ Add Friend'}
                </button>
              )
            )}
            {isSelf && <div style={{ marginTop: 20, fontSize: 13, color: '#555' }}>This is your profile.</div>}
          </div>
        )}
      </div>
    </div>
  )
}
