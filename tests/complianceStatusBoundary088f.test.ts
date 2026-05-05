import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const view = readFileSync('src/app/features/compliance/ComplianceView.tsx', 'utf8');
const css = readFileSync('src/app/complianceCenter.css', 'utf8');
const model = readFileSync('src/app/core/models/compliance.model.ts', 'utf8');

describe('0.8.8-f Compliance status boundaries', () => {
  it('separates technical status from organizational manual checks', () => {
    expect(model).toContain('ComplianceTechnicalStatusItem');
    expect(model).toContain('ComplianceManualCheckItem');
    expect(view).toContain('technicalItems');
    expect(view).toContain('manualItems');
    expect(view).toContain('Organisatorische Datenschutz-Prüfpunkte');
    expect(view).toContain('Nicht durch Software bewertbar');
  });

  it('does not compute or display a global compliance traffic light', () => {
    expect(view).not.toContain('buildOverallLevel');
    expect(view).not.toContain('overallLevel');
    expect(view).not.toContain('Gesamtstatus');
    expect(view).not.toContain('fachliche Freigabe durch DSB/IT-Security bleibt erforderlich');
  });

  it('keeps dark and light mode styling explicitly separated', () => {
    expect(css).toContain('background: linear-gradient(180deg, rgba(18, 18, 20, 0.94), rgba(9, 9, 11, 0.92))');
    expect(css).toContain("html[data-theme='light'] .compliance-status-panel");
    expect(css).toContain('background: linear-gradient(180deg, #eeeeea, #deded8)');
    expect(css).not.toContain('background: var(--surface-elevated, #ffffff)');
  });
});
