import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://dev318299.service-now.com',
        changeOrigin: true,
      },
      '/images': {
        target: 'https://dev318299.service-now.com',
        changeOrigin: true,
      },
      // ── OAuth endpoints (needed to avoid CORS on Google token exchange) ──
      '/oauth_token.do': {
        target: 'https://dev318299.service-now.com',
        changeOrigin: true,
      },
      '/oauth_auth.do': {
        target: 'https://dev318299.service-now.com',
        changeOrigin: true,
      },
    }
  }
})
