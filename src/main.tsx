/**
 * main.tsx — App bootstrap. PWA service worker is production-only; in Vite
 * dev we unregister any leftover SW so it cannot abort API fetches.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function setupPwa(): Promise<void> {
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    return
  }
  const { registerSW } = await import('virtual:pwa-register')
  registerSW({ immediate: true })
}

void setupPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
