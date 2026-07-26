import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './playwright',
    use: {
        baseURL: 'http://localhost:5173'
    },
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
    },
    globalSetup: './playwright/globalSetup.ts',
    // globalTeardown: './playwright/globalTeardown.ts'
});