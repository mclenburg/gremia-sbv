import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ElectronApplication, Page } from 'playwright';
import { requireE2eTool } from '../../e2e/support/e2eToolResolver';

const { test: base, expect } = requireE2eTool<{
  test: {
    extend: <T, W>(fixtures: Record<string, unknown>) => unknown;
  };
  expect: unknown;
}>('@playwright/test');
const { _electron } = requireE2eTool<{ _electron: { launch: (options: Record<string, unknown>) => Promise<ElectronApplication> } }>('playwright');

const PRODUCT_PASSWORD = 'Gremia-SBV-E2E!2026';

type ProductFixtures = {
  productPage: Page;
  electronApp: ElectronApplication;
  workerDataDir: string;
  runtimeErrors: string[];
};

async function findMainWindow(app: ElectronApplication): Promise<Page> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const windows = app.windows();
    const match = windows.find((candidate) => {
      const url = candidate.url();
      return url.startsWith('file:') && url.includes('/dist/index.html');
    });
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Gremia.SBV Hauptfenster wurde innerhalb von 30 Sekunden nicht geladen.');
}

type StartupState = 'setup' | 'login' | 'ready' | 'unavailable';

async function waitForStartupState(page: Page): Promise<StartupState> {
  return page.waitForFunction(() => {
    if (document.querySelector('[aria-label="Hauptnavigation"]')) return 'ready';
    if (document.querySelector('input[aria-label="Initialpasswort"]')) return 'setup';
    if (document.querySelector('input[aria-label="App-Passwort"]')) return 'login';
    if (document.body.textContent?.includes('Start nicht abgeschlossen')) return 'unavailable';
    return null;
  }, undefined, { timeout: 45_000 }).then((handle) => handle.jsonValue() as Promise<StartupState>);
}

async function initializeVault(page: Page): Promise<void> {
  await page.getByLabel('Initialpasswort', { exact: true }).fill(PRODUCT_PASSWORD);
  await page.getByLabel('Initialpasswort wiederholen', { exact: true }).fill(PRODUCT_PASSWORD);
  await page.getByRole('button', { name: 'Initialpasswort speichern' }).click();
  await page.getByRole('button', { name: 'Ich habe den Recovery-Key sicher gespeichert' })
    .waitFor({ state: 'visible', timeout: 45_000 });
  await page.getByRole('button', { name: 'Ich habe den Recovery-Key sicher gespeichert' }).click();
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .waitFor({ state: 'visible', timeout: 45_000 });
}

async function unlockVault(page: Page): Promise<void> {
  await page.getByLabel('App-Passwort', { exact: true }).fill(PRODUCT_PASSWORD);
  await page.getByRole('button', { name: 'Entsperren' }).click();
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .waitFor({ state: 'visible', timeout: 45_000 });
}

async function prepareVault(page: Page): Promise<void> {
  const state = await waitForStartupState(page);
  if (state === 'setup') {
    await initializeVault(page);
    return;
  }
  if (state === 'login') {
    await unlockVault(page);
    return;
  }
  if (state === 'unavailable') {
    throw new Error('Gremia.SBV Sicherheitsbrücke ist beim Produkt-E2E-Start nicht verfügbar.');
  }
}

const test = (base as { extend: (fixtures: Record<string, unknown>) => unknown }).extend({
  workerDataDir: [async ({}, use: (value: string) => Promise<void>, workerInfo: { parallelIndex: number }) => {
    const root = process.env.GREMIA_SBV_FULL_E2E_ROOT;
    if (!root) throw new Error('GREMIA_SBV_FULL_E2E_ROOT fehlt. Nutze npm run test:e2e:full-product.');
    const dataDir = join(root, `worker-${workerInfo.parallelIndex}`, 'data');
    mkdirSync(dataDir, { recursive: true });
    await use(dataDir);
  }, { scope: 'worker' }],

  runtimeErrors: [async ({}, use: (value: string[]) => Promise<void>) => {
    const errors: string[] = [];
    await use(errors);
  }, { scope: 'worker' }],

  electronApp: [async ({ workerDataDir, runtimeErrors }: Pick<ProductFixtures, 'workerDataDir' | 'runtimeErrors'>, use: (value: ElectronApplication) => Promise<void>, workerInfo: { parallelIndex: number }) => {
    const executablePath = process.env.GREMIA_SBV_PRODUCT_EXECUTABLE;
    if (!executablePath) throw new Error('GREMIA_SBV_PRODUCT_EXECUTABLE fehlt.');
    const userDataDir = join(workerDataDir, '..', 'electron-profile');
    mkdirSync(userDataDir, { recursive: true });

    const app = await _electron.launch({
      executablePath,
      args: [`--user-data-dir=${userDataDir}`, `--full-product-e2e-worker=${workerInfo.parallelIndex}`],
      env: {
        ...process.env,
        GREMIA_SBV_E2E: '1',
        GREMIA_SBV_DATA_DIR: workerDataDir,
        GREMIA_SBV_SHOW_MENU: '0',
        ELECTRON_ENABLE_LOGGING: '1',
      },
      timeout: 45_000,
    });

    app.process().stderr?.on('data', (chunk) => {
      const message = String(chunk);
      if (/Gremia\.SBV .*error|SQLITE_ERROR|UnhandledPromiseRejection|preload error/i.test(message)) {
        runtimeErrors.push(message.trim());
      }
    });

    await use(app);
    await app.close();
  }, { scope: 'worker', timeout: 60_000 }],

  productPage: [async ({ electronApp, runtimeErrors }: Pick<ProductFixtures, 'electronApp' | 'runtimeErrors'>, use: (value: Page) => Promise<void>) => {
    const page = await findMainWindow(electronApp);
    page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (!/Download the React DevTools/i.test(text)) runtimeErrors.push(`console: ${text}`);
    });

    await prepareVault(page);
    await use(page);
  }, { scope: 'worker', timeout: 120_000 }],
});

async function assertNoRuntimeErrors(errors: string[]): Promise<void> {
  expect(errors).toEqual([]);
}

async function openModule(page: Page, name: string): Promise<void> {
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name, exact: true })
    .click();
}

async function reloadAndUnlock(page: Page): Promise<void> {
  await page.reload();
  if (await page.getByLabel('App-Passwort', { exact: true }).isVisible().catch(() => false)) {
    await page.getByLabel('App-Passwort', { exact: true }).fill(PRODUCT_PASSWORD);
    await page.getByRole('button', { name: 'Entsperren' }).click();
  }
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor({ state: 'visible' });
}

export { test, expect, assertNoRuntimeErrors, openModule, reloadAndUnlock, PRODUCT_PASSWORD };
