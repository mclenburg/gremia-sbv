import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const runner = readFileSync('scripts/run-e2e.cjs', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

describe('0.8.8-g.1 E2E runner dependency guard', () => {
  it('uses only the locally installed Playwright binary', () => {
    expect(runner).toContain("localBin('playwright')");
    expect(runner).toContain('assertLocalPlaywrightInstalled');
    expect(runner).not.toContain("spawnSync('npx'");
  });

  it('fails with clear instructions instead of triggering npx auto-install', () => {
    expect(runner).toContain('Playwright ist nicht lokal installiert');
    expect(runner).toContain('npm install');
    expect(runner).toContain('npm run test:e2e:install');
    expect(runner).toContain('kein npx-Auto-Install');
  });

  it('keeps the browser installation command explicit and pinned', () => {
    expect(packageJson).toContain('"test:e2e:install"');
    expect(packageJson).toContain('playwright@1.59.1 install chromium');
  });
});
