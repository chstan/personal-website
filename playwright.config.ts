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
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8001',
  },
  expect: {
    // Absorb sub-pixel font/AA noise across machines without ignoring real diffs.
    toHaveScreenshot: { maxDiffPixelRatio: 0.005 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm serve',
        url: 'http://localhost:8001',
        reuseExistingServer: !process.env.CI,
      },
});