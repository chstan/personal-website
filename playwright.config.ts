import { defineConfig, devices } from '@playwright/test';
import path from 'path';

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(import.meta.dirname, '.playwright');

export default defineConfig({
  testDir: './tests',
  reporter: 'list',
  timeout: 7500,
  fullyParallel: true,
  workers: '100%',
  use: {
    baseURL: 'http://localhost:8001',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm serve',
    url: 'http://localhost:8001',
    reuseExistingServer: false,
  },
});