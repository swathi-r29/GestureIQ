import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // Load env file based on current mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Extract hostname from VITE_PUBLIC_URL (e.g., https://name.ngrok-free.dev -> name.ngrok-free.dev)
  const hmrHost = env.VITE_PUBLIC_URL 
    ? env.VITE_PUBLIC_URL.replace(/^https?:\/\//, '').split('/')[0] 
    : 'localhost';

  console.log(`[Vite Config] HMR Host: ${hmrHost}`);

  return {
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
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: true, 
      cors: true,
      hmr: {
        clientPort: 443,
        host: hmrHost,
      },
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Security-Policy': "frame-src * 'self' blob: data:;",
      },
      proxy: {
        // ── AI Services Priority Regex (Port 5001) ──
        '^/api/(predict|predict_double|detect_frame|detect_landmarks|detect_double_landmarks|evaluate_session|session_report|landmarks|mudra_data|clear_history|reset_registry|get_voice)': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('[PROXY ERROR AI]', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[PROXY AI] ${req.method} ${req.url} -> ${options.target}${proxyReq.path}`);
            });
          }
        },

        // ── Generic API (Port 5000) ──
        '^/api/.*': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[PROXY BACKEND] ${req.method} ${req.url} -> ${options.target}${proxyReq.path}`);
            });
          }
        },

        '/socket.io': { target: 'http://127.0.0.1:5000', ws: true, changeOrigin: true },
        '/uploads':   { target: 'http://127.0.0.1:5000', changeOrigin: true },
      },
    },
  };
})