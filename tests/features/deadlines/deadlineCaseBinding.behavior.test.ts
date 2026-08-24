import { describe, expect, it } from 'vitest';
import { validateCaseBinding } from '../../../services/deadlineSupport';
import type { CreateDeadlineInput } from '../../../src/domain/models/deadline.model';

function standaloneDeadline(overrides: Partial<CreateDeadlineInput> = {}): CreateDeadlineInput {
  return {
    processType: 'custom',
    deadlineType: 'legal_deadline',
    title: 'Stellungnahme zu einer allgemeinen Regelung',
    dueAt: '2026-09-01T10:00:00.000Z',
    isLegalDeadline: true,
    ...overrides,
  };
}

describe('Fallbindung von Fristen', () => {
  it('erlaubt bewusst fallfrei angelegte rechtliche Fristen', () => {
    expect(() => validateCaseBinding(standaloneDeadline())).not.toThrow();
  });

  it('erlaubt bewusst fallfreie Workflow-Schritte', () => {
    expect(() => validateCaseBinding(standaloneDeadline({
      deadlineType: 'workflow_step',
      isLegalDeadline: false,
    }))).not.toThrow();
  });
});
