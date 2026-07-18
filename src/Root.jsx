import Landing from './screens/Landing'
import DesktopGate from './screens/DesktopGate'
import App from './App'
import { useIsMobile } from './hooks/useIsMobile'

// Everything under /app is the real phone-frame product; everything else is
// the marketing site. This is a plain pathname check, not a router — nav
// between the two is always a real <a href> page load, so reading
// window.location.pathname once per mount is accurate. Desktop visitors to
// /app are hard-gated (no bypass) since the app's UI is built for a
// phone-sized viewport only.
export default function Root() {
  const path = window.location.pathname
  const isAppRoute = path === '/app' || path.startsWith('/app/')
  const isMobile = useIsMobile()

  if (!isAppRoute) return <Landing />
  if (!isMobile) return <DesktopGate />
  return <App />
}
