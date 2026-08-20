import { describe, expect, it } from 'vitest';
import {
  buildModuleRetentionCandidates,
  RETENTION_POLICY_CATALOG,
  retentionReviewDueAt,
} from '../../services/retentionPolicyCatalog';

describe('modulübergreifender Aufbewahrungskatalog', () => {
  it('enthält die verbindlichen Standardregeln für alle personenbezogenen Module', () => {
    const rules = Object.fromEntries(RETENTION_POLICY_CATALOG.map((policy) => [policy.module, policy.rule]));
    expect(rules.recruiting).toEqual({ kind: 'months_after_completion', months: 6 });
    expect(rules.termination_hearing).toEqual({ kind: 'months_after_completion_year_end', months: 36 });
    expect(rules.bem).toEqual({ kind: 'months_after_completion', months: 36 });
    expect(rules.prevention).toEqual({ kind: 'months_after_completion', months: 36 });
    expect(rules.case_file).toEqual({ kind: 'months_after_completion', months: 36 });
    expect(rules.election).toEqual({ kind: 'term_related', months: 48 });
    expect(rules.activity_journal).toEqual({ kind: 'permanent_anonymized' });
    expect(rules.protected_person).toEqual({ kind: 'purpose_linked' });
  });

  it('berechnet Kündigungsfristen ab Jahresende und markiert nur manuelle Prüfaufträge', () => {
    expect(retentionReviewDueAt('2023-05-15T12:00:00.000Z', { kind: 'months_after_completion_year_end', months: 36 }))
      .toBe('2026-12-31T23:59:59.999Z');
    const candidates = buildModuleRetentionCandidates([{
      module: 'termination_hearing', id: 't-1', title: 'Kündigungsanhörung', completedAt: '2023-05-15T12:00:00.000Z',
    }], new Date('2027-01-01T00:00:00.000Z'));
    expect(candidates[0]).toMatchObject({
      type: 'module_retention_review_due', recommendedAction: 'pruefen', privacyReviewRequired: true,
    });
  });

  it('markiert einen BEM-Einwilligungswiderruf sofort, löscht aber nicht automatisch', () => {
    const candidates = buildModuleRetentionCandidates([{
      module: 'bem', id: 'b-1', title: 'BEM-Verfahren', consentWithdrawnAt: '2026-03-01T00:00:00.000Z', purposeStillActive: true,
    }], new Date('2026-03-01T01:00:00.000Z'));
    expect(candidates[0]).toMatchObject({
      type: 'immediate_purpose_expiry_review', riskLevel: 'critical', recommendedAction: 'loeschen', privacyReviewRequired: true,
    });
  });
});
