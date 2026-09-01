import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Matches the "http" profile applicationUrl in Properties/launchSettings.json
const backendUrl = 'http://localhost:5192'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../wwwroot',
    emptyOutDir: true,
  },
})
