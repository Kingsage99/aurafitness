import EbookLanding from './screens/EbookLanding'
import EbookLegal from './screens/EbookLegal'
import DesktopGate from './screens/DesktopGate'
import App from './App'
import { useIsMobile } from './hooks/useIsMobile'

// Everything under /app is the real phone-frame fitness product; /legal is
// the ebook sales page's own public Terms/Privacy/Refund page; everything
// else is the Shape Shift Playbook ebook sales page itself (no link between
// the sales page and /app — it doesn't promote the app at all). This is a
// plain pathname check, not a router — nav between these is always a real
// <a href> page load, so reading window.location.pathname once per mount is
// accurate. Desktop visitors to /app are hard-gated (no bypass) since the
// app's UI is built for a phone-sized viewport only; the ebook pages have no
// such constraint and render the same way on any device.
export default function Root() {
  const path = window.location.pathname
  const isAppRoute = path === '/app' || path.startsWith('/app/')
  const isMobile = useIsMobile()

  if (path === '/legal') return <EbookLegal />
  if (!isAppRoute) return <EbookLanding />
  if (!isMobile) return <DesktopGate />
  return <App />
}
