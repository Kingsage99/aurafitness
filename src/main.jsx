import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.jsx'
import { registerServiceWorker } from './utils/pushNotifications.js'

// Registered unconditionally (not just when a user opts into push) so the
// site qualifies as a real installable PWA — Chrome's "Install" menu item
// falls back to a plain bookmark-style shortcut without an active service worker.
registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
