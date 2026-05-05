import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.GREMIA_SBV_E2E_PORT ?? 5174);
const baseURL = process.env.GREMIA_SBV_E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-smoke',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:renderer:e2e',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ...process.env,
      GREMIA_SBV_E2E: '1',
      GREMIA_SBV_DATA_DIR: process.env.GREMIA_SBV_DATA_DIR ?? '',
    },
  },
});
