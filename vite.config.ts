import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'KnightZero',
        short_name: 'KnightZero',
        description: 'A fast, installable chess app powered by Stockfish 18.',
        theme_color: '#262421',
        background_color: '#262421',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
      }
    })
  ]
});
