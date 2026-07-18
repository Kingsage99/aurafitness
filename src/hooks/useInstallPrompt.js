import { useState, useEffect, useCallback } from 'react'

// Captures the browser's native "Add to Home Screen" prompt (Android/Chrome/
// Edge only — iOS Safari never fires this event, see isIOSDevice() in
// pushNotifications.js for that platform's manual-instructions fallback).
// preventDefault() suppresses the browser's own mini-infobar so a page's own
// "Install" button can trigger the exact same native prompt on tap instead.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome === 'accepted'
  }, [deferredPrompt])

  return { canInstall: !!deferredPrompt, promptInstall }
}
