import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Use the local browser path we set up
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm serve',
    url: 'http://localhost:8001',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
