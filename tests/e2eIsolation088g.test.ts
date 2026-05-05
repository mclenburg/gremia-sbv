import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const runner = readFileSync('scripts/run-e2e.cjs', 'utf8');
const config = readFileSync('playwright.config.ts', 'utf8');
const mockBridge = readFileSync('tests/e2e/support/mockBridgeInit.js', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

describe('0.8.8-g E2E isolation guard', () => {
  it('runs Playwright only with a temp data directory guard', () => {
    expect(runner).toContain('mkdtempSync(join(tmpdir(), \'gremia-sbv-e2e-\'))');
    expect(runner).toContain('GREMIA_SBV_DATA_DIR: dataDir');
    expect(runner).toContain('E2E-Schutzabbruch');
  });

  it('serves the renderer on a dedicated E2E port', () => {
    expect(config).toContain('5174');
    expect(packageJson).toContain('"dev:renderer:e2e"');
    expect(packageJson).toContain('"test:e2e"');
  });

  it('uses synthetic data and never depends on a productive vault', () => {
    expect(mockBridge).toContain('Synthetische Browser-E2E-Umgebung');
    expect(mockBridge).toContain('TEST-0001');
    expect(mockBridge).not.toContain('dwaesnigk');
  });
});
