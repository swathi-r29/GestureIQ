import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
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
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/video_feed': 'http://127.0.0.1:5001',
      '/mudra_data': 'http://127.0.0.1:5001'
    }
  }
})