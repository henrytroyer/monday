import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // main.tsx registers via virtual:pwa-register — avoid double inject.
      injectRegister: false,
      includeAssets: [
        'icons/apple-touch-icon.png',
        'icons/pwa-192.png',
        'icons/pwa-512.png',
        'brand/i58-logo-color.png',
        'vite.svg',
      ],
      manifest: {
        name: 'Volunteer Portal',
        short_name: 'Volunteers',
        description:
          'i58 Volunteer CRM — contacts, applications, and coordination',
        theme_color: '#4a6478',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/monday') ||
              url.pathname.startsWith('/api/private-notes') ||
              url.pathname.startsWith('/api/quickbooks'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        // Keep SW off in Vite dev so HMR stays simple; install via build/preview or production.
        enabled: false,
      },
    }),
  ],
  server: {
    port: 4040,
    host: true,
    proxy: {
      '/api/quickbooks': {
        target: 'http://localhost:4041',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/quickbooks/, ''),
      },
      '/api/monday': {
        target: 'http://localhost:4042',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/monday/, ''),
      },
      '/api/private-notes': {
        target: 'http://localhost:4043',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/private-notes/, ''),
      },
    },
    hmr: {
      clientPort: 4040,
    },
    allowedHosts: [
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok.app',
      'localhost',
      '.loca.lt',
      '.trycloudflare.com',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
