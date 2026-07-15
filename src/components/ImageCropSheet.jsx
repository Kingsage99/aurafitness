import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { NB, NB_BORDER } from '../styles/neoBrutalism'

const STAGE_PAD = 28 // px of dimmed image visible around the mask, inside the stage

// Full-screen "move to crop" step for any image upload — shows the picked file
// inside a fixed mask the user can drag/zoom to position, then bakes the
// current view into a plain (uncropped-looking, actually-cropped) JPEG File
// via canvas so it drops straight into the existing upload functions.
export default function ImageCropSheet({ file, shape = 'circle', aspect = 1, outputSize = 640, onCancel, onCropped }) {
  const [imgEl, setImgEl] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [stageSize, setStageSize] = useState({ w: 280, h: 280 })
  const stageRef = useRef(null)
  const dragRef = useRef(null)

  const maskW = stageSize.w - STAGE_PAD * 2
  const maskH = shape === 'circle' ? maskW : maskW / aspect

  // Load the picked file into an Image element to read natural dimensions.
  useEffect(() => {
    if (!file) { setImgEl(null); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => setImgEl(img)
    img.src = url
    setZoom(1)
    setTranslate({ x: 0, y: 0 })
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Measure the stage so the mask fits the phone-frame width.
  useLayoutEffect(() => {
    if (!stageRef.current) return
    const w = stageRef.current.clientWidth
    setStageSize({ w, h: w })
  }, [file])

  const baseScale = imgEl ? Math.max(maskW / imgEl.naturalWidth, maskH / imgEl.naturalHeight) : 1
  const renderedScale = baseScale * zoom
  const renderedW = imgEl ? imgEl.naturalWidth * renderedScale : 0
  const renderedH = imgEl ? imgEl.naturalHeight * renderedScale : 0
  const maxOffsetX = Math.max(0, (renderedW - maskW) / 2)
  const maxOffsetY = Math.max(0, (renderedH - maskH) / 2)

  const clamp = useCallback((t, mx, my) => ({
    x: Math.min(mx, Math.max(-mx, t.x)),
    y: Math.min(my, Math.max(-my, t.y)),
  }), [])

  useEffect(() => {
    setTranslate(t => clamp(t, maxOffsetX, maxOffsetY))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, imgEl])

  const onPointerDown = e => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: translate }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = e => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setTranslate(clamp({ x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy }, maxOffsetX, maxOffsetY))
  }
  const onPointerUp = () => { dragRef.current = null }

  const handleUsePhoto = () => {
    if (!imgEl) return
    const outW = shape === 'circle' ? outputSize : outputSize
    const outH = shape === 'circle' ? outputSize : Math.round(outputSize / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    const sw = maskW / renderedScale
    const sh = maskH / renderedScale
    const sx = imgEl.naturalWidth / 2 - translate.x / renderedScale - sw / 2
    const sy = imgEl.naturalHeight / 2 - translate.y / renderedScale - sh / 2
    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, outW, outH)
    canvas.toBlob(blob => {
      if (!blob) return
      onCropped(new File([blob], 'crop.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  }

  if (!file) return null

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: NB.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', flexShrink: 0 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
        <span style={{ color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase' }}>Move to Crop</span>
        <button onClick={handleUsePhoto} style={{ background: 'none', border: 'none', color: NB.teal, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer' }}>Use Photo</button>
      </div>

      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ position: 'relative', width: '100%', height: stageSize.h, overflow: 'hidden', background: '#000', touchAction: 'none', flexShrink: 0, cursor: 'grab' }}
      >
        {imgEl && (
          <img
            src={imgEl.src}
            alt=""
            draggable={false}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              width: renderedW, height: renderedH,
              transform: `translate(calc(-50% + ${translate.x}px), calc(-50% + ${translate.y}px))`,
              maxWidth: 'none', maxHeight: 'none', pointerEvents: 'none',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%', width: maskW, height: maskH,
            transform: 'translate(-50%,-50%)',
            borderRadius: shape === 'circle' ? '50%' : 16,
            boxShadow: '0 0 0 2000px rgba(0,0,0,.55)',
            border: `3px solid ${NB.white}`,
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 10 }}>
        <span style={{ color: 'rgba(255,255,255,.7)', fontFamily: NB.fontMono, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Zoom</span>
        <input
          type="range"
          min={1} max={3} step={0.01}
          value={zoom}
          onChange={e => setZoom(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: NB.magenta }}
        />
      </div>
    </div>
  )
}
