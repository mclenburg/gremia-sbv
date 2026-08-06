import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

function loadPlaywrightTest() {
  const projectRequire = createRequire(join(process.cwd(), 'package.json'));
  try {
    return projectRequire('@playwright/test');
  } catch (projectError) {
    const isolatedToolsPackage = join(process.cwd(), '.e2e-tools', 'package.json');
    if (!existsSync(isolatedToolsPackage)) throw projectError;
    return createRequire(isolatedToolsPackage)('@playwright/test');
  }
}

const { defineConfig } = loadPlaywrightTest() as {
  defineConfig: (config: Record<string, unknown>) => unknown;
};

const configuredWorkers = Number(process.env.GREMIA_SBV_FULL_E2E_WORKERS ?? '2');
const workers = Number.isFinite(configuredWorkers) && configuredWorkers > 0
  ? Math.min(2, Math.floor(configuredWorkers))
  : 2;

export default defineConfig({
  testDir: './e2e-product',
  testMatch: '**/*.spec.ts',
  timeout: 25_000,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  workers,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  outputDir: process.env.PLAYWRIGHT_TEST_OUTPUT_DIR ?? 'test-results/full-product',
});
