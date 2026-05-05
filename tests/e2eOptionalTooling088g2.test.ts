import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};
const runner = readFileSync('scripts/run-e2e.cjs', 'utf8');
const config = readFileSync('playwright.config.ts', 'utf8');
const cleanupManifest = readFileSync('maintenance/source-cleanup/obsolete-files-0.8.8-g.2.json', 'utf8');

describe('0.8.8-g.2 optional E2E tooling', () => {
  it('does not install Playwright during normal npm install', () => {
    expect(packageJson.devDependencies?.['@playwright/test']).toBeUndefined();
  });

  it('keeps E2E installation explicit and separate', () => {
    expect(packageJson.scripts?.['test:e2e:deps']).toContain('npm install --no-save @playwright/test@1.59.1');
    expect(packageJson.scripts?.['test:e2e:install']).toBe('node scripts/run-e2e.cjs --install-browsers');
  });

  it('keeps E2E files outside the regular Vitest/TypeScript test tree', () => {
    expect(config).toContain("testDir: './e2e'");
    expect(cleanupManifest).toContain('tests/e2e');
  });

  it('keeps the database isolation guard in the E2E runner', () => {
    expect(runner).toContain('GREMIA_SBV_DATA_DIR: dataDir');
    expect(runner).toContain('gremia-sbv-e2e-');
    expect(runner).toContain('PLAYWRIGHT_CLI');
  });
});
