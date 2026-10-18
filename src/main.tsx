import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// PWA: daftarkan service worker hanya di build produksi (di dev bisa mengganggu hot reload)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('Gagal mendaftarkan service worker:', err))
  })
}
