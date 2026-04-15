import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      filename: 'manifest.json',
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
    strictPort: true,
    allowedHosts: true,
    cors: true,
    hmr: {
      clientPort: 443,
    },
    headers: {
      'ngrok-skip-browser-warning': 'true',
      'Content-Security-Policy': "frame-src * 'self' blob: data:;",
    },
    proxy: {
      // ── Flask / AI Services (Port 5001) ──
      '/api/predict':          { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/api/predict_double':   { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/api/detect_frame':     { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/api/detect_landmarks': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/api/detect_double_landmarks': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/api/evaluate_session': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/api/session_report':   { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/api/landmarks':        { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/mudra_data':           { target: 'http://127.0.0.1:5001', changeOrigin: true },

      // ── Node.js Backend Services (Port 5000) ──
      // Generic /api rule must stay LAST to avoid intercepting AI routes
      '/api':       { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:5000', ws: true, changeOrigin: true },
      '/uploads':   { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
})