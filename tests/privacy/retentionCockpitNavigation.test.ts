import { describe, expect, it } from 'vitest';
import type { RetentionCandidate } from '../../src/domain/models/retention.model';
import { retentionCandidateCaseTarget, retentionCandidateTarget } from '../../src/app/features/privacy-review/PrivacyReviewCockpit';

function candidate(entityType: RetentionCandidate['entityType']): RetentionCandidate {
  return { id: `candidate-${entityType}`, type: 'module_retention_review_due', riskLevel: 'warning', title: 'Prüfung', description: 'Fällig', recommendedAction: 'pruefen', entityType };
}

describe('Navigation aus dem Datenschutz-Cockpit', () => {
  it('öffnet fallgebundene Module in der führenden Fallakte', () => {
    for (const entityType of ['case', 'case_file', 'bem', 'prevention', 'sbv_participation', 'workplace_accommodation', 'equalization_gdb'] as const) {
      expect(retentionCandidateTarget(candidate(entityType))).toBe('cases');
    }
  });

  it('verlinkt eine konkrete Fallprüfung exakt in die betroffene Fallakte', () => {
    const caseReview = { ...candidate('case'), entityId: 'case-4711' };

    expect(retentionCandidateCaseTarget(caseReview)).toEqual({ caseId: 'case-4711', nodeType: 'overview' });
    expect(retentionCandidateCaseTarget({ ...candidate('deadline'), entityId: 'deadline-1' })).toBeNull();
  });

  it('führt eigenständige Prüfobjekte in ihren zuständigen Arbeitsbereich', () => {
    expect(retentionCandidateTarget(candidate('protected_person'))).toBe('persons');
    expect(retentionCandidateTarget(candidate('deadline'))).toBe('deadlines');
    expect(retentionCandidateTarget(candidate('assembly'))).toBe('sbv_control');
    expect(retentionCandidateTarget(candidate('compliance_incident'))).toBe('compliance');
  });
});
