import { defineConfig } from 'vite'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
