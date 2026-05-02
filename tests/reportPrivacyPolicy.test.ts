import { describe, expect, it } from 'vitest';
import { minimumReportGroupSize, reportPdfTheme, scanReportTextForPrivacyRisks } from '../services/reportPrivacyPolicy';

describe('report privacy policy', () => {
  it('forces the report minimum group size to at least three', () => {
    expect(minimumReportGroupSize(1)).toBe(3);
    expect(minimumReportGroupSize(5)).toBe(5);
  });

  it('uses a light print theme for generated PDFs', () => {
    expect(reportPdfTheme()).toBe('light-industrial-print');
  });

  it('detects identifiers that must not appear in anonymized activity reports', () => {
    const findings = scanReportTextForPrivacyRisks('Fall SBV-2026-0001 schrieb an max.mustermann@example.org wegen Attest.');
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'aktenzeichen', riskLevel: 'critical' }),
      expect.objectContaining({ type: 'email', riskLevel: 'critical' }),
      expect.objectContaining({ type: 'health_hint' })
    ]));
  });

  it('flags small groups as re-identification risk', () => {
    const findings = scanReportTextForPrivacyRisks('Tätigkeitsbericht', {
      minimumGroupSize: 3,
      groupCounts: { Kündigungsanhörungen: 1, BEM: 6 }
    });

    expect(findings).toEqual([expect.objectContaining({ type: 'small_group', value: 'Kündigungsanhörungen: 1', riskLevel: 'critical' })]);
  });
});
