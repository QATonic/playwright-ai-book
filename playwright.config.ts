import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * Playwright config for the companion repo.
 * See chapter 7 of the book for the reasoning behind each setting.
 */
export default defineConfig({
  testDir: './tests',

  // Fail the build if `test.only` is left in source
  forbidOnly: !!process.env.CI,

  // Retry only on CI to catch genuine flakes
  retries: process.env.CI ? 2 : 0,

  // Run in parallel locally; halve workers on CI to keep noise down.
  // Local default capped at 2: launching 5 Chromium contexts at once
  // stalls `browserContext.newPage` past the 30s test timeout on many machines.
  workers: process.env.CI ? '50%' : 2,
  fullyParallel: true,

  // Capture traces for failed tests on retry
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Cost summary after every run
  globalTeardown: './global-teardown.ts',

  // For demo simplicity, just Chromium. Add Firefox/WebKit when ready.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
});
