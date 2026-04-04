import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name:             'GestureIQ',
        short_name:       'GestureIQ',
        description:      'Bharatanatyam Mudra Detection',
        theme_color:      '#0F0A08',
        background_color: '#0F0A08',
        display:          'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],

  server: {
    host: true,
    proxy: {
      // ── Flask mudra AI routes (port 5001) ─────────────────────────────
      // NOTE: more-specific rules MUST come before the generic '/api' rule.

      '/api/predict': {           // ← NEW — stateless Detect page endpoint
        target:       'http://127.0.0.1:5001',
        changeOrigin: true,
        secure:       false,
      },
      '/api/detect_frame': {
        target:       'http://127.0.0.1:5001',
        changeOrigin: true,
        secure:       false,
      },
      '/api/detect_landmarks': {  // ← Learn page still uses this
        target:       'http://127.0.0.1:5001',
        changeOrigin: true,
        secure:       false,
      },
      '/api/session_report': {
        target:       'http://127.0.0.1:5001',
        changeOrigin: true,
        secure:       false,
      },
      '/api/landmarks': {
        target:       'http://127.0.0.1:5001',
        changeOrigin: true,
        secure:       false,
      },
      '/video_feed': {
        target:       'http://127.0.0.1:5001',
        changeOrigin: true,
        secure:       false,
      },
      '/mudra_data': {
        target:       'http://127.0.0.1:5001',
        changeOrigin: true,
        secure:       false,
      },

      // ── Node / Express backend routes (port 5000) ─────────────────────
      // Generic '/api' catch-all — must be LAST so specific rules above win.
      '/api': {
        target:       'http://127.0.0.1:5000',
        changeOrigin: true,
        secure:       false,
      },
      '/socket.io': {
        target:       'http://127.0.0.1:5000',
        ws:           true,
        changeOrigin: true,
        secure:       false,
      },
      '/uploads': {
        target:       'http://127.0.0.1:5000',
        changeOrigin: true,
        secure:       false,
      },
    },
  },
})