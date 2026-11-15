// Isolated browser verification: never reuse or stop the user's running API.
import { defineConfig } from 'vite'
import base from './vite.config'
export default defineConfig({ ...base, server: { host: '127.0.0.1', port: 5174,
  strictPort: true, proxy: { '/api': { target: `http://127.0.0.1:${process.env.E2E_BACKEND_PORT || '8011'}`, changeOrigin: true } } } })
