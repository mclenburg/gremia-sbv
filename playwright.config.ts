import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

function requirePlaywrightTest() {
  const projectRequire = createRequire(join(process.cwd(), 'package.json'));
  try {
    return projectRequire('@playwright/test');
  } catch (projectError) {
    const isolatedToolsPackage = join(process.cwd(), '.e2e-tools', 'package.json');
    if (!existsSync(isolatedToolsPackage)) {
      throw projectError;
    }
    return createRequire(isolatedToolsPackage)('@playwright/test');
  }
}

const { defineConfig, devices } = requirePlaywrightTest() as {
  defineConfig: (config: Record<string, unknown>) => unknown;
  devices: Record<string, unknown>;
};

const port = Number(process.env.GREMIA_SBV_E2E_PORT ?? 5174);
const baseURL = process.env.GREMIA_SBV_E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const useSystemChrome = process.env.GREMIA_SBV_E2E_USE_SYSTEM_CHROME === '1';
const configuredWorkers = Number(process.env.GREMIA_SBV_E2E_WORKERS ?? '2');
const workers = Number.isFinite(configuredWorkers) && configuredWorkers > 0 ? Math.floor(configuredWorkers) : 2;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers,
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
      use: {
        ...(devices['Desktop Chrome'] as Record<string, unknown>),
        ...(useSystemChrome ? { channel: 'chrome' } : {}),
      },
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
