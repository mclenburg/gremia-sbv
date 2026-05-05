import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const appSmoke = readFileSync('e2e/app-smoke.spec.ts', 'utf8');
const complianceTheme = readFileSync('e2e/compliance-theme.spec.ts', 'utf8');

describe('0.8.8-h.3 E2E selector and theme resilience', () => {
  it('does not hard-code the app version in the smoke test', () => {
    expect(appSmoke).toContain('packageVersion()');
    expect(appSmoke).not.toContain('0.8.8-g.2');
    expect(appSmoke).not.toContain('0.8.8-h.2');
  });

  it('uses strict, stable selectors for duplicated case text', () => {
    expect(appSmoke).toContain("getByRole('heading', { name: 'TEST-0001', exact: true })");
    expect(appSmoke).not.toContain("getByText('TEST-0001')).toBeVisible()");
  });

  it('checks the compliance heading without ambiguous text locators', () => {
    expect(complianceTheme).toContain("getByRole('heading', { name: /Technischer Datenschutzstatus/i })");
    expect(complianceTheme).not.toContain('getByText(/Technischer Datenschutz|Technischer Status');
  });

  it('evaluates an effective background color for transparent theme containers', () => {
    expect(complianceTheme).toContain('effectiveBackgroundColor');
    expect(complianceTheme).toContain('color(srgb');
  });
});
