import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import './styles/global.css'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    const existing = document.getElementById('pwa-update-toast');
    if (existing) return;

    const toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '16px';
    toast.style.left = '16px';
    toast.style.zIndex = '9999';
    toast.style.background = '#1f2937';
    toast.style.color = '#e5e7eb';
    toast.style.padding = '10px 12px';
    toast.style.border = '1px solid #374151';
    toast.style.borderRadius = '8px';
    toast.style.display = 'flex';
    toast.style.gap = '10px';
    toast.style.alignItems = 'center';
    toast.innerHTML = '<span>New update available</span>';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Reload';
    btn.style.background = '#22c55e';
    btn.style.color = '#052e16';
    btn.style.border = 'none';
    btn.style.borderRadius = '999px';
    btn.style.padding = '4px 10px';
    btn.style.cursor = 'pointer';
    btn.onclick = () => updateSW(true);

    toast.appendChild(btn);
    document.body.appendChild(toast);
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
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
