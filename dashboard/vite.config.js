import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for the CART RESCUE dashboard.
// The /api proxy forwards dashboard calls to the FastAPI backend on :8000,
// so the frontend can call the same-origin /score endpoint in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
