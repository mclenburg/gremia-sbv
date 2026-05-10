import { describe, expect, it } from 'vitest';
import { normalizeAuditMetadata, sanitizeAuditActor, sanitizeAuditPurpose } from '../services/auditHashChain';
import { assertDestructivePrivacyConfirmation, assertRetentionDecision, decideLegacyBulkPrivacyReview, decidePrivacyReviewForContext } from '../services/privacyReviewPolicy';

describe('0.9.1 Datenschutz-Lifecycle und Audit-Härtung', () => {
  it('markiert Statusablauf und Beschäftigungsende als Datenschutzprüfung', () => {
    expect(decidePrivacyReviewForContext({ protectionStatus: 'expired', caseStatus: 'offen', openDeadlineCount: 1 })).toMatchObject({ required: true, reason: 'status_expired', priority: 'critical', freeTextReviewRequired: true });
    expect(decidePrivacyReviewForContext({ employmentState: 'left_company', caseStatus: 'offen', runningMeasureCount: 1 })).toMatchObject({ required: true, reason: 'employment_ended', priority: 'high', freeTextReviewRequired: true });
    expect(decidePrivacyReviewForContext({ protectionStatus: 'severely_disabled', caseStatus: 'abgeschlossen', freeTextReviewRequired: true })).toMatchObject({ required: false, priority: 'low', freeTextReviewRequired: true });
    expect(decidePrivacyReviewForContext({ protectionStatus: 'severely_disabled', caseStatus: 'offen' })).toMatchObject({ required: false, priority: 'normal', freeTextReviewRequired: false });
  });

  it('verlangt Grund und neuen Prüftermin für Fortspeicherung', () => {
    expect(() => assertRetentionDecision('', '2026-06-01')).toThrow(/Grund/);
    expect(() => assertRetentionDecision('laufendes Verfahren', '')).toThrow(/Prüftermin/);
    expect(() => assertRetentionDecision('laufendes Verfahren', '2026-06-01')).not.toThrow();
    expect(() => assertRetentionDecision('laufendes Verfahren', 'kein-datum')).toThrow(/gültiges Datum/);
  });



  it('priorisiert Datenschutzprüfung mit allen relevanten Kontextzweigen', () => {
    expect(decidePrivacyReviewForContext({ protectionStatus: 'expired', caseStatus: 'offen', openDeadlineCount: 2 })).toMatchObject({ required: true, reason: 'status_expired', priority: 'critical' });
    expect(decidePrivacyReviewForContext({ protectionStatus: 'expired', caseStatus: 'offen', runningMeasureCount: 1 })).toMatchObject({ required: true, priority: 'high' });
    expect(decidePrivacyReviewForContext({ employmentState: 'left_company', caseStatus: 'abgeschlossen' })).toMatchObject({ required: true, reason: 'employment_ended', priority: 'low' });
    expect(decidePrivacyReviewForContext({ protectionStatus: 'application_pending', caseStatus: 'ruhend' })).toMatchObject({ required: false, priority: 'normal', freeTextReviewRequired: false });
    expect(decidePrivacyReviewForContext({ protectionStatus: 'equivalent', caseStatus: 'abgeschlossen', freeTextReviewRequired: true })).toMatchObject({ required: false, priority: 'low', freeTextReviewRequired: true });
  });


  it('steuert Bulk-Aktionen für abgeschlossene Altakten ohne automatische Löschung', () => {
    expect(decideLegacyBulkPrivacyReview({ status: 'abgeschlossen', personBindingState: 'legacy_unlinked', hasOpenDeadlines: false })).toMatchObject({ eligible: true, priority: 'low', anonymizationRecommended: true });
    expect(decideLegacyBulkPrivacyReview({ status: 'abgeschlossen', personBindingState: 'legacy_unlinked', hasOpenDeadlines: true })).toMatchObject({ eligible: false, priority: 'critical', anonymizationRecommended: false });
    expect(decideLegacyBulkPrivacyReview({ status: 'offen', personBindingState: 'legacy_unlinked', hasOpenDeadlines: false })).toMatchObject({ eligible: false, priority: 'normal' });
    expect(decideLegacyBulkPrivacyReview({ status: 'abgeschlossen', personBindingState: 'active', hasOpenDeadlines: false })).toMatchObject({ eligible: false, priority: 'normal' });
  });

  it('erzwingt Sicherheitsbestätigung für Anonymisierung und Löschung', () => {
    expect(() => assertDestructivePrivacyConfirmation('anonymize', 'FALL ANONYMISIEREN')).not.toThrow();
    expect(() => assertDestructivePrivacyConfirmation('delete', 'FALL LÖSCHEN')).not.toThrow();
    expect(() => assertDestructivePrivacyConfirmation('anonymize', 'löschen')).toThrow(/FALL ANONYMISIEREN/);
    expect(() => assertDestructivePrivacyConfirmation('delete', 'FALL ANONYMISIEREN')).toThrow(/FALL LÖSCHEN/);
  });


  it('ersetzt nur vorgemerkte Freitextstellen im Privacy-Review-Anonymisierungspfad', async () => {
    const source = await import('node:fs').then((fs) => fs.readFileSync('services/privacyReviewService.ts', 'utf8'));
    expect(source).toContain('anonymizeCaseStructuredData');
    expect(source).toContain('replacePendingAnonymizationMarkersForCase');
    expect(source).toContain('applyPendingAnonymizationMarkers');
    expect(source).not.toMatch(/content\s*=\s*\?/);
    expect(source).not.toContain("case_notes SET participants = '[anonymisiert]', content = ?");
    expect(source).toContain('unmarkedFreeTextReviewRequired: true');
  });



  it('erfasst vorgemerkte Freitextstellen in Prozess- und Maßnahmentabellen der Fallakte', async () => {
    const source = await import('node:fs').then((fs) => fs.readFileSync('services/privacyReviewService.ts', 'utf8'));
    for (const table of ['bem_processes', 'bem_process_events', 'prevention_processes', 'prevention_process_events', 'equalization_processes', 'termination_hearings', 'sbv_participations', 'sbv_participation_events', 'case_measure_workplace_accommodation']) {
      expect(source).toContain(table);
    }
  });

  it('schützt Audit-Purpose und Actor vor direkten Identifikatoren', () => {
    expect(sanitizeAuditPurpose('Fall max.mustermann@example.invalid gelöscht')).toBe('SBV-Datenschutzereignis');
    expect(sanitizeAuditPurpose('Person P-12345 anonymisiert')).toBe('SBV-Datenschutzereignis');
    expect(sanitizeAuditPurpose('Fallakte strukturiert anonymisiert')).toBe('Fallakte strukturiert anonymisiert');
    expect(sanitizeAuditActor('max.mustermann@example.invalid')).toBe('local-sbv-user');
  });

  it('speichert Audit-Metadaten nur als harte Whitelist ohne Direktidentifikatoren', () => {
    const metadata = normalizeAuditMetadata({ name: 'Max Mustermann', email: 'max@example.invalid', personnelNumber: 'P-123', caseId: 'case-uuid', subjectId: 'person-uuid', timestamp: new Date('2026-05-01T00:00:00.000Z'), safe: ['ok', undefined], nested: { note: 'Diagnose Burnout' } });
    expect(metadata).not.toContain('Max Mustermann');
    expect(metadata).not.toContain('max@example.invalid');
    expect(metadata).not.toContain('P-123');
    expect(metadata).not.toContain('Burnout');
    expect(metadata).not.toContain('safe');
    expect(metadata).toContain('case-uuid');
    expect(metadata).toContain('person-uuid');
    expect(metadata).toContain('2026-05-01T00:00:00.000Z');
  });
});
