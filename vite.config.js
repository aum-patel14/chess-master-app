import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isGitHub = process.env.npm_lifecycle_event === 'predeploy' || process.env.npm_lifecycle_event === 'deploy';
const basePath = isGitHub ? '/chess-master-app/' : '/';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: /stockfish\.js$/,
          handler: 'CacheFirst',
          options: { cacheName: 'stockfish-cache' }
        }]
      },
      manifest: {
        name: 'ChessMaster Pro',
        short_name: 'ChessMaster',
        theme_color: '#0f0f1a',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: basePath,
        scope: basePath,
        icons: [
          { src: `${basePath}icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${basePath}icon-512.png`, sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  base: basePath,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    host: true,
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
