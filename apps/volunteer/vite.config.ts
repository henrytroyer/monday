import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4050,
    host: true,
    strictPort: true,
    proxy: {
      '/api/volunteer-identity': {
        target: 'http://127.0.0.1:4051',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/volunteer-identity/, '') || '/',
      },
    },
  },
  preview: {
    port: 4050,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
