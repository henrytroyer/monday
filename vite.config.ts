import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
