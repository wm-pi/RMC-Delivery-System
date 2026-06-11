import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      // 로컬 worker (Hono) 프록시 — 프론트는 항상 /api 상대경로만 호출한다
      '/api': 'http://localhost:8787',
    },
  },
});
