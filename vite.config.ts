import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4040,
    host: true, // Allow external connections for monday.com tunneling
    hmr: {
      clientPort: 4040,
    },
    // Allow ngrok and other tunnel hosts
    allowedHosts: [
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok.app',
      'localhost',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
