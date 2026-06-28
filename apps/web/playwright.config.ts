// playwright.config.ts
import { defineConfig } from '@playwright/test';

const FRONTEND_URL = 'https://study-buddies-red.vercel.app/';
// const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: FRONTEND_URL,
  },
  webServer: {
    command: 'npm run dev',
    url: FRONTEND_URL,
    reuseExistingServer: true,
  },
  globalSetup: './e2e/global_setup.ts',
//   globalTeardown: './e2e/global-teardown.ts',
});