import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Temporary HTTP-only config for local dev (no SSL).
// Used to preview the /store-journey page on localhost.
// Do NOT commit or use in production.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5175,
    allowedHosts: ['localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
