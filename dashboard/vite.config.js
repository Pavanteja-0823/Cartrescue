import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for the CART RESCUE dashboard.
// The /api proxy forwards dashboard calls to the FastAPI backend on :8001.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,   // if 5173 is busy, Vite quietly picks the next free port
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
