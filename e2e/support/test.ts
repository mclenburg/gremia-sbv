import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireE2eTool } from './e2eToolResolver';

type LocatorLike = {
  count(): Promise<number>;
  click(): Promise<void>;
  waitFor(options: { state: 'visible' }): Promise<void>;
};

type TracingLike = {
  start(options: { screenshots: boolean; snapshots: boolean; sources: boolean }): Promise<void>;
  stop(): Promise<void>;
  startChunk(options: { title: string }): Promise<void>;
  stopChunk(options?: { path: string }): Promise<void>;
};

type BrowserContextLike = {
  addInitScript(script: string): Promise<void>;
  close(): Promise<void>;
  newPage(): Promise<PageLike>;
  tracing: TracingLike;
};

type BrowserLike = {
  newContext(options: { baseURL: string }): Promise<BrowserContextLike>;
};

type ConsoleMessageLike = {
  text(): string;
  type(): string;
};

type PageLike = {
  close(): Promise<void>;
  emulateMedia(options: { colorScheme: 'light'; reducedMotion: 'no-preference'; forcedColors: 'none' }): Promise<void>;
  evaluate(pageFunction: () => void): Promise<void>;
  getByRole(role: string, options?: { name?: string | RegExp }): LocatorLike;
  goto(url: string): Promise<unknown>;
  isClosed(): boolean;
  keyboard: { press(key: string): Promise<void> };
  locator(selector: string): LocatorLike;
  off(event: 'console', listener: (message: ConsoleMessageLike) => void): void;
  on(event: 'console', listener: (message: ConsoleMessageLike) => void): void;
  screenshot(options: { path: string; fullPage: boolean }): Promise<unknown>;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
};

type TestInfoLike = {
  expectedStatus: string;
  outputPath(name: string): string;
  status?: string;
  title: string;
};

const { test: base, expect } = requireE2eTool<{
  test: { extend: (fixtures: Record<string, unknown>) => unknown };
  expect: unknown;
}>('@playwright/test');

const __dirname = dirname(fileURLToPath(import.meta.url));
const mockBridgeSource = readFileSync(join(__dirname, 'mockBridgeInit.js'), 'utf8');
const port = Number(process.env.GREMIA_SBV_E2E_PORT ?? 5174);
const baseURL = process.env.GREMIA_SBV_E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

type WorkerFixtures = {
  sharedContext: BrowserContextLike;
  sharedPage: PageLike;
};

type E2eWindow = Window & {
  __GREMIA_SBV_E2E_RESET?: () => void;
};

const REACT_RENDER_LOOP_ERROR = 'Maximum update depth exceeded';

async function closeTransientUi(page: PageLike) {
  for (let attempt = 0; attempt < 6 && await page.getByRole('dialog').count() > 0; attempt += 1) {
    await page.keyboard.press('Escape');
  }
}

async function prepareSharedApp(page: PageLike) {
  await closeTransientUi(page);
  await page.evaluate(() => {
    const e2eWindow = window as E2eWindow;
    e2eWindow.__GREMIA_SBV_E2E_RESET?.();
    window.localStorage.setItem('gremia.sbv.theme', 'light');
    window.localStorage.setItem('gremia-sbv-theme', 'light');
    document.documentElement.dataset.theme = 'light';
  });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference', forcedColors: 'none' });
  await page.setViewportSize({ width: 1440, height: 900 });

  const dashboardButton = page.locator('[data-e2e="main-nav-dashboard"]');
  if (await dashboardButton.count()) {
    await dashboardButton.click();
  }
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor({ state: 'visible' });
}

/**
 * Default Browser-E2E fixture.
 *
 * Ein Worker besitzt genau einen BrowserContext und eine Page. Fachtests teilen diese laufende
 * App-Instanz; vor jedem Test werden nur der synthetische Mock-Zustand und transiente UI-Zustände
 * zurückgesetzt. Dadurch entfallen die wiederholten Context/Page/React-Bootstraps.
 *
 * Tests, die einen echten Neu-Start/isolierten Context prüfen müssen, verwenden isolatedTest.ts.
 */
const test = (base as { extend: (fixtures: Record<string, unknown>) => unknown }).extend({
  sharedContext: [
    async ({ browser }: { browser: BrowserLike }, provideContext: (context: BrowserContextLike) => Promise<void>) => {
      const context = await browser.newContext({ baseURL });
      const dataDir = process.env.GREMIA_SBV_E2E_DATA_DIR ?? 'unknown-e2e-dir';
      await context.addInitScript(mockBridgeSource.replace('__GREMIA_SBV_E2E_DATA_DIR__', dataDir.replace(/\\/g, '\\\\')));
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      try {
        await provideContext(context);
      } finally {
        await context.tracing.stop().catch(() => undefined);
        await context.close();
      }
    },
    { scope: 'worker' },
  ],
  sharedPage: [
    async ({ sharedContext }: WorkerFixtures, provideSharedPage: (page: PageLike) => Promise<void>) => {
      const page = await sharedContext.newPage();
      await page.goto('/');
      await page.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor({ state: 'visible' });
      await provideSharedPage(page);
      await page.close();
    },
    { scope: 'worker' },
  ],
  page: async ({ sharedPage, sharedContext }: WorkerFixtures, providePage: (page: PageLike) => Promise<void>, testInfo: TestInfoLike) => {
    const renderLoopErrors: string[] = [];
    const collectRenderLoopError = (message: ConsoleMessageLike) => {
      if (message.type() === 'error' && message.text().includes(REACT_RENDER_LOOP_ERROR)) {
        renderLoopErrors.push(message.text());
      }
    };
    sharedPage.on('console', collectRenderLoopError);
    await sharedContext.tracing.startChunk({ title: testInfo.title });
    try {
      await prepareSharedApp(sharedPage);
      await providePage(sharedPage);
    } finally {
      sharedPage.off('console', collectRenderLoopError);
      const failed = testInfo.status !== testInfo.expectedStatus;
      if (failed && !sharedPage.isClosed()) {
        await sharedPage.screenshot({ path: testInfo.outputPath('test-failed.png'), fullPage: true }).catch(() => undefined);
      }
      await sharedContext.tracing.stopChunk(failed ? { path: testInfo.outputPath('trace.zip') } : undefined).catch(() => undefined);
      if (!sharedPage.isClosed()) {
        await closeTransientUi(sharedPage);
      }
      if (renderLoopErrors.length > 0) {
        throw new Error(`React-Render-Endlosschleife in „${testInfo.title}“ erkannt: ${renderLoopErrors[0]}`);
      }
    }
  },
});

export { test, expect };
