import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Set global header so all API calls through ngrok bypass the warning interstitial page
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

// Unregister any legacy Service Workers from browser cache to prevent text/html MIME type errors
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
