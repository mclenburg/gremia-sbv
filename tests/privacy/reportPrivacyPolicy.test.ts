import { describe, expect, it } from 'vitest';
import { minimumReportGroupSize, reportPdfTheme, scanReportTextForPrivacyRisks } from '../../services/reportPrivacyPolicy';
import { decryptReportArchive, encryptReportArchive } from '../../services/reports/reportArchiveCrypto';

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
  it('verschlüsselt Berichtsexporte authentifiziert und bindet Dateiname sowie Schlüssel an den Inhalt', () => {
    const databaseKey = Buffer.alloc(32, 7);
    const pdf = Buffer.from('%PDF-vertraulich', 'utf8');
    const envelope = encryptReportArchive(pdf, 'taetigkeitsbericht.pdf', databaseKey);
    const serialized = JSON.stringify(envelope);

    const decrypted = decryptReportArchive(serialized, databaseKey);
    expect(decrypted.originalFileName).toBe('taetigkeitsbericht.pdf');
    expect(decrypted.pdf.equals(pdf)).toBe(true);
    decrypted.pdf.fill(0);

    const manipulated = JSON.stringify({ ...envelope, originalFileName: 'anderer-name.pdf' });
    expect(() => decryptReportArchive(manipulated, databaseKey)).toThrow();
    expect(() => decryptReportArchive(serialized, Buffer.alloc(32, 8))).toThrow();
    databaseKey.fill(0);
    pdf.fill(0);
  });

  it('weist manipulierte oder strukturell ungültige Berichtshüllen vor der Ausgabe zurück', () => {
    const databaseKey = Buffer.alloc(32, 9);
    const envelope = encryptReportArchive(Buffer.from('%PDF-test'), 'bericht.pdf', databaseKey);
    expect(() => decryptReportArchive(JSON.stringify({ ...envelope, iv: '00' }), databaseKey)).toThrow(/IV-Metadaten/i);
    expect(() => decryptReportArchive(JSON.stringify({ ...envelope, tag: 'zz'.repeat(16) }), databaseKey)).toThrow(/Authentifizierungs-Metadaten/i);
    expect(() => decryptReportArchive(JSON.stringify({ ...envelope, version: 2 }), databaseKey)).toThrow(/unterstütztes/i);
    databaseKey.fill(0);
  });

});
