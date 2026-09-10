import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['iPhone 13'],
    browserName:
      process.env.CI || process.env.FORM_E2E_WEBKIT === '1'
        ? 'webkit'
        : 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  webServer: [
    {
      command: 'npm run dev:roles',
      url: 'http://127.0.0.1:3100/api/coaching',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm --prefix mobile run web',
      url: 'http://127.0.0.1:8081',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
