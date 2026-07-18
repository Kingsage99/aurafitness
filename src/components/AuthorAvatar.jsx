import React from 'react'
import { Avatar } from './AvatarSilhouette'
import ProBorderRing from './ProBorderRing'
import { STORE_BORDERS } from '../screens/StoreScreen'
import { isPro } from '../lib/stripe'
import { NB } from '../styles/neoBrutalism'

// Small avatar + equipped ring-border block for another user (post author,
// squad activity, leaderboard row, etc.) — mirrors the Home header's own
// avatar treatment so borders show consistently anywhere someone else's
// profile picture appears.
export default function AuthorAvatar({ author, size = 42 }) {
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
