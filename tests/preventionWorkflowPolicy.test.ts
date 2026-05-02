import { describe, expect, it } from 'vitest';
import { defaultEmployerResponseDueAt, evaluatePreventionWarnings, PREVENTION_STEPS } from '../services/preventionWorkflowPolicy';
import type { PreventionProcessRecord } from '../src/app/core/models/prevention.model';

const baseProcess: PreventionProcessRecord = {
  id: 'prevention-1',
  caseId: 'case-1',
  status: 'angefordert',
  firstKnowledgeAt: '2026-05-02T08:00:00.000Z',
  requestedAt: '2026-05-02T09:00:00.000Z',
  employerResponseDueAt: '2026-05-09T09:00:00.000Z',
  difficultyType: 'gesundheitlich_arbeitsplatzbezogen',
  riskType: 'ueberlastung',
  personStatus: 'gleichgestellt',
  contactIds: [],
  createdAt: '2026-05-02T09:00:00.000Z',
  updatedAt: '2026-05-02T09:00:00.000Z'
};

describe('prevention workflow policy', () => {
  it('ships tooltip objectives for every workflow step', () => {
    expect(PREVENTION_STEPS.length).toBeGreaterThanOrEqual(8);
    expect(PREVENTION_STEPS.every((step) => step.title.length > 0 && step.objective.length > 20)).toBe(true);
  });

  it('defaults employer response due date to seven days after request', () => {
    expect(defaultEmployerResponseDueAt('2026-05-02T09:00:00.000Z')).toBe('2026-05-09T09:00:00.000Z');
  });

  it('warns when employer response is due within 48 hours', () => {
    const warnings = evaluatePreventionWarnings(baseProcess, new Date('2026-05-07T10:00:00.000Z'));
    expect(warnings.some((warning) => warning.message.includes('48 Stunden'))).toBe(true);
  });

  it('marks overdue employer response as critical', () => {
    const warnings = evaluatePreventionWarnings(baseProcess, new Date('2026-05-10T09:00:00.000Z'));
    expect(warnings.some((warning) => warning.level === 'critical' && warning.message.includes('überschritten'))).toBe(true);
  });

  it('requires integration office review for termination risk', () => {
    const warnings = evaluatePreventionWarnings({ ...baseProcess, riskType: 'kuendigung' }, new Date('2026-05-03T09:00:00.000Z'));
    expect(warnings.some((warning) => warning.level === 'critical' && warning.message.includes('Inklusionsamt'))).toBe(true);
  });
});
