import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (window.confirm('New update available! Click OK to refresh.')) {
      updateSW(true)
    }
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Fade out loader
const loader = document.getElementById('initial-loader');
if (loader) {
  loader.style.transition = 'opacity 0.4s ease-out';
  setTimeout(() => {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 400);
  }, 100);
}
