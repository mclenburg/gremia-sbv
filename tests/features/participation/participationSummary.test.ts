import { describe, expect, it } from 'vitest';
import type { ParticipationRecord } from '../../../src/domain/models/participation.model';
import { getParticipationSummary } from '../../../src/app/features/participation/participationPolicy';

const now = new Date('2026-10-02T10:00:00.000Z');

function record(overrides: Partial<ParticipationRecord>): ParticipationRecord {
  return {
    id: 'participation-1',
    caseId: 'case-1',
    title: 'Anhörung',
    measureType: 'sonstiges',
    status: 'neu',
    riskLevel: 'normal',
    personStatus: 'unklar',
    decisionStage: 'vor_entscheidung',
    informationComplete: true,
    hearingBeforeDecision: true,
    decisionNotified: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('participation overview summary', () => {
  it('counts open, critical, suspension and violation records without double counting risks', () => {
    const summary = getParticipationSummary([
      record({ id: 'normal' }),
      record({ id: 'incomplete', informationComplete: false }),
      record({ id: 'decision', decisionStage: 'entscheidung_getroffen', hearingBeforeDecision: false }),
      record({ id: 'suspension', status: 'aussetzung_verlangt', suspensionDueAt: '2026-10-01T10:00:00.000Z' }),
      record({ id: 'risk', riskLevel: 'kritisch', informationComplete: false }),
      record({ id: 'violation', status: 'pflichtverstoss_dokumentiert' }),
      record({ id: 'closed', status: 'abgeschlossen' }),
    ], now);

    expect(summary).toEqual({ open: 5, critical: 4, suspensionOpen: 1, violations: 1 });
  });

  it('does not flag a suspension before its due time', () => {
    expect(getParticipationSummary([
      record({ status: 'aussetzung_verlangt', suspensionDueAt: '2026-10-02T10:00:01.000Z' }),
    ], now)).toEqual({ open: 1, critical: 0, suspensionOpen: 1, violations: 0 });
  });
});
