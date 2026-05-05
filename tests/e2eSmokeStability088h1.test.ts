import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const appSmoke = readFileSync('tests/e2e/app-smoke.spec.ts', 'utf8');
const complianceTheme = readFileSync('tests/e2e/compliance-theme.spec.ts', 'utf8');

describe('0.8.8-h.1 E2E smoke stability', () => {
  it('does not pin E2E version assertions to a historical patch version', () => {
    expect(appSmoke).toContain('packageVersion()');
    expect(appSmoke).not.toContain('0.8.8-g.2');
  });

  it('scopes navigation clicks to the real sidebar buttons', () => {
    expect(appSmoke).toContain("getByRole('navigation').getByRole('button', { name: 'Fallakte', exact: true })");
    expect(complianceTheme).toContain("getByRole('navigation').getByRole('button', { name: 'Compliance', exact: true })");
  });

  it('sets the theme directly in isolated localStorage instead of relying on settings UI text', () => {
    expect(complianceTheme).toContain("localStorage.setItem('gremia.sbv.theme', 'light')");
    expect(complianceTheme).toContain("localStorage.setItem('gremia.sbv.theme', 'dark')");
    expect(complianceTheme).not.toContain("getByRole('button', { name: /Hell|Light/i })");
  });
});
