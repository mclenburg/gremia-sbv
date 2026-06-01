import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireE2eTool } from './e2eToolResolver';

const { test: base, expect } = requireE2eTool<{
  test: { extend: (fixtures: Record<string, unknown>) => unknown };
  expect: unknown;
}>('@playwright/test');

const test = (base as { extend: (fixtures: Record<string, unknown>) => unknown }).extend({
  page: async ({ page }: { page: { addInitScript: (source: string) => Promise<void> } }, use: (page: unknown) => Promise<void>) => {
    const dataDir = process.env.GREMIA_SBV_E2E_DATA_DIR ?? 'unknown-e2e-dir';
    await page.addInitScript(mockBridgeSource.replace('__GREMIA_SBV_E2E_DATA_DIR__', dataDir.replace(/\\/g, '\\\\')));
    await use(page);
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const mockBridgeSource = readFileSync(join(__dirname, 'mockBridgeInit.js'), 'utf8');

export { test, expect };
