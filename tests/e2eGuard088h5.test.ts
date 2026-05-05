import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const appSmoke = readFileSync('e2e/app-smoke.spec.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

describe('0.8.8-h.5 E2E case workbench selector hardening', () => {
  it('uses the current package version and no fixed historic version in the smoke test', () => {
    expect(packageJson.version).toBe('0.8.8-h.5');
    expect(appSmoke).toContain('packageVersion()');
    expect(appSmoke).not.toContain('0.8.8-g.2');
  });

  it('scopes the synthetic case description to the table row to avoid strict-mode duplicates', () => {
    expect(appSmoke).toContain("page.getByRole('row', { name: /TEST-0001\\s+Testperson Alpha/ })");
    expect(appSmoke).toContain("alphaRow.getByRole('cell', { name: 'Synthetischer E2E-Testfall ohne Echtdaten.' })");
    expect(appSmoke).not.toContain("page.getByText('Synthetischer E2E-Testfall ohne Echtdaten.')");
  });
});
