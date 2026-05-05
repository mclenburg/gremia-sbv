import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const config = readFileSync('playwright.config.ts', 'utf8');
const rootSmoke = readFileSync('e2e/app-smoke.spec.ts', 'utf8');
const rootCompliance = readFileSync('e2e/compliance-theme.spec.ts', 'utf8');

describe('0.8.8-h.2 active E2E path stability', () => {
  it('runs the active E2E suite from the repository-level e2e directory', () => {
    expect(config).toContain("testDir: './e2e'");
  });

  it('does not pin E2E version assertions to any historical patch version', () => {
    expect(rootSmoke).toContain('packageVersion()');
    expect(rootSmoke).not.toContain('0.8.8-g.2');
    expect(rootSmoke).not.toContain('0.8.8-h.1');
  });

  it('scopes navigation clicks to Hauptnavigation so dashboard cards cannot collide', () => {
    expect(rootSmoke).toContain("getByRole('navigation', { name: 'Hauptnavigation' })");
    expect(rootCompliance).toContain("getByRole('navigation', { name: 'Hauptnavigation' })");
  });
});
