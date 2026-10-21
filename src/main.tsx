import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { Capacitor } from '@capacitor/core'
import { setupAndroidEntry } from './entry'
import './android.css'

if (Capacitor.getPlatform() === 'android') {
  document.documentElement.classList.add('android')
  setupAndroidEntry()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
