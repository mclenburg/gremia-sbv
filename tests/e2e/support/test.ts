import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mockBridgeSource = readFileSync(join(__dirname, 'mockBridgeInit.js'), 'utf8');

export const test = base.extend({
  page: async ({ page }, use) => {
    const dataDir = process.env.GREMIA_SBV_E2E_DATA_DIR ?? 'unknown-e2e-dir';
    await page.addInitScript(mockBridgeSource.replace('__GREMIA_SBV_E2E_DATA_DIR__', dataDir.replace(/\\/g, '\\\\')));
    await use(page);
  },
});

export { expect };
