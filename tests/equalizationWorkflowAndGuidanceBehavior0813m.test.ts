import { describe, expect, it } from 'vitest';
import type { EqualizationProcessRecord, EqualizationStatus } from '../src/app/core/models/equalization.model';
import { buildEqualizationGuidance, equalizationStatusObjective, suggestNextEqualizationStatus } from '../services/equalizationGuidancePolicy';
import { evaluateEqualizationWarnings, equalizationStatusLabel, isDoneEqualizationStatus } from '../services/equalizationWorkflowPolicy';

function process(status: EqualizationStatus, patch: Partial<EqualizationProcessRecord> = {}): EqualizationProcessRecord {
  return {
    id: 'eq-1',
    caseId: 'case-1',
    applicationStatus: status,
    createdAt: '2026-05-07T08:00:00.000Z',
    updatedAt: '2026-05-07T08:00:00.000Z',
    ...patch
  };
}

describe('equalization workflow and guidance behavior', () => {
  it('labels statuses and identifies done states', () => {
    expect(equalizationStatusLabel('widerspruch')).toBe('Widerspruch');
    expect(equalizationStatusLabel('custom')).toBe('custom');
    expect(isDoneEqualizationStatus('bewilligt')).toBe(true);
    expect(isDoneEqualizationStatus('abgelehnt')).toBe(false);
  });

  it('detects missing agency data, submitted date and objection deadlines', () => {
    expect(evaluateEqualizationWarnings(process('eingereicht')).map((warning) => warning.level)).toEqual(['info', 'warning']);
    expect(evaluateEqualizationWarnings(process('abgelehnt')).map((warning) => warning.level)).toEqual(['critical']);
    expect(evaluateEqualizationWarnings(process('widerspruch', { objectionDueAt: '2026-06-01', notes: '' })).map((warning) => warning.level)).toEqual(['warning']);
  });

  it('suggests next statuses from concrete process data and stops when no transition is justified', () => {
    expect(suggestNextEqualizationStatus(process('beratung', { notes: 'Klärung gestartet' }))).toBe('vorbereitung');
    expect(suggestNextEqualizationStatus(process('vorbereitung', { applicationSubmittedAt: '2026-05-01' }))).toBe('eingereicht');
    expect(suggestNextEqualizationStatus(process('eingereicht', { decisionReceivedAt: '2026-05-20', outcome: 'bewilligt' }))).toBe('bewilligt');
    expect(suggestNextEqualizationStatus(process('eingereicht', { decisionReceivedAt: '2026-05-20', outcome: 'Ablehnung' }))).toBe('abgelehnt');
    expect(suggestNextEqualizationStatus(process('abgelehnt', { objectionDueAt: '2026-06-20' }))).toBe('widerspruch');
    expect(suggestNextEqualizationStatus(process('beratung'))).toBeUndefined();
  });

  it('builds guidance from objective, warnings and next status', () => {
    const guidance = buildEqualizationGuidance(process('eingereicht', { decisionReceivedAt: '2026-05-20', outcome: 'bewilligt' }));

    expect(guidance.title).toBe('Gleichstellung-/GdB-Statusführung');
    expect(guidance.objective).toBe(equalizationStatusObjective('eingereicht'));
    expect(guidance.suggestedNextStatus).toBe('bewilligt');
    expect(guidance.warnings.length).toBeGreaterThan(0);
  });
});
