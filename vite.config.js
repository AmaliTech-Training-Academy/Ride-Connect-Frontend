import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, globalThis.process.cwd(), '')

  return {
    define: {
      'globalThis.__VITE_API_BASE_URL__': JSON.stringify(env.VITE_API_BASE_URL),
      'globalThis.__VITE_CLOUDINARY_CLOUD_NAME__': JSON.stringify(
        env.VITE_CLOUDINARY_CLOUD_NAME ?? '',
      ),
      'globalThis.__VITE_CLOUDINARY_UPLOAD_PRESET__': JSON.stringify(
        env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '',
      ),
    },
    plugins: [react()],
    server: {
      // The backend's auth only trusts http://localhost:5173. Without this,
      // a busy port makes Vite quietly move to 5174, where every login,
      // password change and picture save fails with 403 "Invalid origin".
      port: 5173,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      css: false,
    },
  }
})
