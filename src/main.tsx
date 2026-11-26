import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installMusicUnlock } from './session/music'
import './index.css'

function installViewportGuards() {
  const block = (event: Event) => {
    const target = event.target
    if (target instanceof Element && target.closest('.start-scroll, button, a, input, textarea, label')) return
    event.preventDefault()
  }
  document.addEventListener('touchmove', block, { passive: false })
  document.addEventListener('gesturestart', block)
}

installMusicUnlock()

installViewportGuards()

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
