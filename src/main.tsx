import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './app/App'

// Register the service worker and auto-apply updates.
// When a new version is deployed, the SW activates and the page reloads
// automatically so the installed PWA (iPhone/PC) never gets stuck on a
// stale cached build.
registerSW({
  immediate: true,
  onNeedRefresh() {
    // A new version is available — activate it and reload.
    window.location.reload()
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
