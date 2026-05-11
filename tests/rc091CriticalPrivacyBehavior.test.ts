import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { normalizeAuditMetadata, sanitizeAuditActor, sanitizeAuditPurpose } from '../services/auditHashChain';
import { detectCsvEncoding } from '../services/csvEncodingDetection';
import { exportDeadlinesToIcal } from '../services/deadlineIcalExportService';
import { decideStructuredPersonAnonymization, decidePersonDeletion } from '../services/personAnonymizationPolicy';
import { decideLegacyCaseBindingMigration } from '../services/personCaseBindingPolicy';
import { assertRetentionDecision, decidePrivacyReviewForContext } from '../services/privacyReviewPolicy';
import { applyPendingAnonymizationMarkers, formatAnonymizationMarkerText } from '../services/textCommandPolicy';
import type { DeadlineRecord } from '../src/app/core/models/deadline.model';

function makeDeadline(overrides: Partial<DeadlineRecord> = {}): DeadlineRecord {
  return {
    id: 'deadline-1',
    caseId: 'case-sensitive-123456',
    title: 'BEM für Max Mustermann wegen Diagnose Burnout',
    confidentialTitle: 'Max Mustermann Personalnummer P-123 Diagnose Burnout',
    description: 'Bitte max.mustermann@example.invalid wegen Diagnose Burnout kontaktieren.',
    dueAt: '2026-06-01T09:00:00.000Z',
    status: 'open',
    severity: 'normal',
    calculationMode: 'manual',
    isLegalDeadline: false,
    isUserEditable: true,
    warningThresholdHours: 72,
    criticalThresholdHours: 24,
    deadlineType: 'follow_up',
    processType: 'bem',
    sourceEvent: 'bem.follow_up',
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
    ...overrides
  } as DeadlineRecord;
}

describe('0.9.1 kritische Datenschutz- und Fallakten-Verhaltenstests', () => {
  it('migriert Legacy-Fälle ausschließlich anhand vorhandener aktiver Links und niemals anhand Freitextannahmen', () => {
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: ['person-1'], status: 'offen' })).toMatchObject({
      protectedPersonId: 'person-1',
      personBindingState: 'migrated',
      privacyReviewRequired: false
    });
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: [], status: 'offen' })).toMatchObject({
      protectedPersonId: null,
      personBindingState: 'legacy_unlinked',
      privacyReviewRequired: true,
      privacyReviewReason: 'no_person_link'
    });
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: ['person-1', 'person-2'], status: 'offen' })).toMatchObject({
      protectedPersonId: null,
      personBindingState: 'legacy_unlinked',
      privacyReviewRequired: true,
      privacyReviewReason: 'multiple_person_links'
    });
  });

  it('markiert Statusablauf und Beschäftigungsende als prüfpflichtig und akzeptiert Fortspeicherung nur mit Grund und Prüftermin', () => {
    expect(decidePrivacyReviewForContext({ protectionStatus: 'expired', caseStatus: 'offen', openDeadlineCount: 1 })).toMatchObject({
      required: true,
      reason: 'status_expired',
      priority: 'critical',
      freeTextReviewRequired: true
    });
    expect(decidePrivacyReviewForContext({ employmentState: 'left_company', caseStatus: 'abgeschlossen' })).toMatchObject({
      required: true,
      reason: 'employment_ended',
      priority: 'low',
      freeTextReviewRequired: true
    });
    expect(() => assertRetentionDecision('', '2026-08-01')).toThrow(/Grund/);
    expect(() => assertRetentionDecision('laufendes Verfahren', '')).toThrow(/Prüftermin/);
    expect(() => assertRetentionDecision('laufendes Verfahren', '2026-08-01')).not.toThrow();
  });

  it('ersetzt bei bestätigter Anonymisierung nur vormerkte Freitextstellen und lässt nicht markierte Inhalte unverändert', () => {
    const pending = formatAnonymizationMarkerText('Max Mustermann');
    const text = `Gespräch mit ${pending}. Nicht markiert: Teamwechsel bleibt prüfpflichtig.`;
    expect(applyPendingAnonymizationMarkers(text)).toBe('Gespräch mit [anonymisiert]. Nicht markiert: Teamwechsel bleibt prüfpflichtig.');
    expect(applyPendingAnonymizationMarkers('Nicht markierter Name Max Mustermann bleibt zur manuellen Prüfung erhalten.'))
      .toBe('Nicht markierter Name Max Mustermann bleibt zur manuellen Prüfung erhalten.');
  });

  it('entfernt Direktidentifikatoren bei Personenanonymisierung und markiert Personenlöschung fallaktenprüfpflichtig', () => {
    expect(decideStructuredPersonAnonymization('person-abc')).toMatchObject({
      pseudonymLabel: expect.stringMatching(/^Anonymisierte Person #[0-9a-f]{12}$/),
      firstName: '',
      lastName: '',
      personnelNumber: null,
      workEmail: null,
      organizationalUnit: null,
      location: null,
      notes: null,
      lifecycleState: 'anonymized'
    });
    expect(decidePersonDeletion()).toEqual({
      caseBindingState: 'person_deleted',
      privacyReviewReason: 'linked_person_deleted',
      reviewRequired: true
    });
  });

  it('hält Audit-Payloads frei von Direktidentifikatoren und erlaubt nur datensparsame Referenzen', () => {
    const metadata = normalizeAuditMetadata({
      subjectId: 'person-uuid',
      caseId: 'case-uuid',
      timestamp: '2026-05-11T08:00:00.000Z',
      action: 'person_deleted',
      purpose: 'privacy_lifecycle',
      name: 'Max Mustermann',
      email: 'max.mustermann@example.invalid',
      personnelNumber: 'P-12345',
      diagnosis: 'Depression'
    });
    expect(metadata).toContain('person-uuid');
    expect(metadata).toContain('case-uuid');
    expect(metadata).not.toMatch(/Max Mustermann|max\.mustermann|P-12345|Depression/);
    expect(sanitizeAuditPurpose('Fall max.mustermann@example.invalid gelöscht')).toBe('SBV-Datenschutzereignis');
    expect(sanitizeAuditActor('Max Mustermann')).toBe('local-sbv-user');
  });

  it('erkennt CSV-Kodierungen mit Umlauten plattformunabhängig vor dem Import', () => {
    const cp1252 = Buffer.from([0x4e, 0x61, 0x63, 0x68, 0x6e, 0x61, 0x6d, 0x65, 0x3b, 0x56, 0x6f, 0x72, 0x6e, 0x61, 0x6d, 0x65, 0x0a, 0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72, 0x3b, 0x4a, 0xf6, 0x72, 0x67]);
    const cp850 = Buffer.from([0x4e, 0x61, 0x63, 0x68, 0x6e, 0x61, 0x6d, 0x65, 0x3b, 0x56, 0x6f, 0x72, 0x6e, 0x61, 0x6d, 0x65, 0x0a, 0x4d, 0x81, 0x6c, 0x6c, 0x65, 0x72, 0x3b, 0x4a, 0x94, 0x72, 0x67]);
    expect(detectCsvEncoding(cp1252).decodedText).toContain('Müller;Jörg');
    expect(detectCsvEncoding(cp850).decodedText).toContain('Müller;Jörg');
  });

  it('exportiert iCal im Standard process_type ohne Namen, Gesundheitsdetails, E-Mail oder Personalnummer', () => {
    const ical = exportDeadlinesToIcal([makeDeadline()], { now: new Date('2026-05-11T08:00:00.000Z') });
    expect(ical).toContain('SUMMARY:Gremia.SBV: BEM-Wiedervorlage');
    expect(ical).toContain('DESCRIPTION:Fristart: BEM-Wiedervorlage.');
    expect(ical).not.toMatch(/Max Mustermann|max\.mustermann@example\.invalid|P-123|Burnout|Diagnose/);
  });
});
