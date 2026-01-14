import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/v1': {
        target: 'https://openapi.naver.com',
        changeOrigin: true,
      },
      '/map-place': {
        target: 'https://naveropenapi.apigw.ntruss.com',
        changeOrigin: true,
      }
    }
  }
})
