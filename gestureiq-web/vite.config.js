import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    // basicSsl() provides automatic self-signed HTTPS — required for
    // getUserMedia (camera) to work when accessing via a local network IP
    // (e.g. http://192.168.x.x:5173 won't allow camera; https:// will).
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GestureIQ',
        short_name: 'GestureIQ',
        description: 'Bharatanatyam Mudra Detection',
        theme_color: '#0F0A08',
        background_color: '#0F0A08',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    
    host: true,   // expose on local network
    proxy: {
      '/api/detect_frame': 'http://localhost:5001',
      '/api/session_report': 'http://localhost:5001',
      '/api': 'http://localhost:5000',
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true
      },
      '/video_feed': 'http://localhost:5001',
      '/mudra_data': 'http://localhost:5001',
      '/uploads': 'http://localhost:5000'
    }
  }
})