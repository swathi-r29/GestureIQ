import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function ngrokBypassPlugin() {
  return {
    name: 'ngrok-bypass',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('ngrok-skip-browser-warning', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('ngrok-skip-browser-warning', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const proxyConfig = {
    // ── AI Services Priority Regex (Port 5001) ──
    '^/api/(predict|predict_double|predict_pose|detect_frame|detect_landmarks|detect_double_landmarks|evaluate_session|session_report|landmarks|mudra_data|clear_history|reset_registry|get_voice|sequence)': {
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
  };

  return {
    plugins: [
      react(),
      ngrokBypassPlugin()
    ],

    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: true, 
      cors: true,
      hmr: true,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Security-Policy': "frame-src * 'self' blob: data:;",
      },
      proxy: proxyConfig,
    },

    preview: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: true,
      cors: true,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Security-Policy': "frame-src * 'self' blob: data:;",
      },
      proxy: proxyConfig,
    }
  };
})