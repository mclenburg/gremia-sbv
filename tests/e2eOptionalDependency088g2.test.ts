import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const packageJson = readFileSync('package.json', 'utf8');
const runner = readFileSync('scripts/run-e2e.cjs', 'utf8');
const installer = readFileSync('scripts/install-e2e-browsers.cjs', 'utf8');

describe('0.8.8-g.2 optional E2E dependencies', () => {
  it('does not install Playwright during the normal project install', () => {
    expect(packageJson).not.toContain('"@playwright/test"');
    expect(packageJson).toContain('"test:e2e:setup"');
    expect(packageJson).toContain('npm install --no-save @playwright/test@1.59.1');
  });

  it('keeps the E2E runner isolated and explicit', () => {
    expect(runner).toContain('GREMIA_SBV_DATA_DIR');
    expect(runner).toContain('gremia-sbv-e2e-');
    expect(runner).toContain('npm run test:e2e:setup');
    expect(runner).not.toContain("spawnSync('npx'");
  });

  it('installs browsers only when Playwright is locally available', () => {
    expect(installer).toContain("localBin('playwright')");
    expect(installer).toContain('Playwright ist lokal nicht installiert');
    expect(installer).toContain("['install', 'chromium']");
  });
});
