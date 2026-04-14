import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5182,
    strictPort: true, // 포트 충돌 시 다른 포트로 넘어가지 않고 에러
  },
})
