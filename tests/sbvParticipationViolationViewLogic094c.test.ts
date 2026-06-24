import { describe, expect, it } from 'vitest';
import type { CaseRecord } from '../src/app/core/models/case.model';
import type { SbvParticipationViolationRecord } from '../src/app/core/models/sbv-participation-violation.model';
import {
  applyViolationCaseContext,
  buildViolationCaseOptions,
  buildViolationSummaryItems,
  createInitialViolationForm,
  getNextStatusActions,
  needsEscalationHint,
} from '../src/app/features/participation-violations/sbvParticipationViolationViewLogic';

function caseRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: 'case-1',
    caseNumber: 'SBV-2026-004',
    displayName: 'Fall SBV-2026-004',
    category: 'praevention',
    status: 'offen',
    priority: 'normal',
    openedAt: '2026-06-01',
    isPseudonymized: true,
    isLocked: false,
    ...overrides,
  };
}

function violation(overrides: Partial<SbvParticipationViolationRecord>): SbvParticipationViolationRecord {
  return {
    id: 'violation-1',
    stage: 'request',
    status: 'open',
    violationType: 'incomplete_information',
    sourceContextType: 'case',
    sourceContextId: 'case-1',
    caseId: 'case-1',
    subject: 'Unterlagen fehlen',
    measureDescription: 'Beteiligung unvollständig',
    wrongBehavior: 'Unterlagen nicht vollständig bereitgestellt',
    requiredBehavior: 'Vor Entscheidung vollständig unterrichten und anhören',
    legalBasis: '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('Beteiligungsverstoß-View-Logik', () => {
  it('vorbelegt fallbezogen datensparsam und fällt ohne Fall auf fallfreien Kontext zurück', () => {
    const withCase = createInitialViolationForm([caseRecord()]);
    const withoutCase = createInitialViolationForm([]);

    expect(withCase.sourceContextType).toBe('case');
    expect(withCase.sourceContextId).toBe('case-1');
    expect(withCase.caseId).toBe('case-1');
    expect(withCase.requiredBehavior).toContain('§ 178 Abs. 2 Satz 1 SGB IX');

    expect(withoutCase.sourceContextType).toBe('activity_journal');
    expect(withoutCase.sourceContextId).toBe('');
    expect(withoutCase.caseId).toBeUndefined();
  });

  it('ändert Fallkontext ohne vorhandene manuelle Kontext-ID beim Abwählen zu überschreiben', () => {
    const form = createInitialViolationForm([]);
    const manuallyScoped = { ...form, sourceContextId: 'deadline-17' };

    expect(applyViolationCaseContext(form, 'case-1')).toMatchObject({
      sourceContextType: 'case',
      sourceContextId: 'case-1',
      caseId: 'case-1',
    });
    expect(applyViolationCaseContext(manuallyScoped, '')).toMatchObject({
      sourceContextType: 'activity_journal',
      sourceContextId: 'deadline-17',
      caseId: undefined,
    });
  });

  it('zeigt anwaltlichen Hinweis nur bei scharfen Eskalationsstufen und liefert erlaubte Statusaktionen', () => {
    expect(needsEscalationHint('request')).toBe(false);
    expect(needsEscalationHint('formal_objection')).toBe(false);
    expect(needsEscalationHint('abmahnung')).toBe(true);
    expect(needsEscalationHint('suspension_request')).toBe(true);
    expect(needsEscalationHint('owi_preparation')).toBe(true);

    expect(getNextStatusActions('draft').map((action) => action.targetStatus)).toEqual(['open']);
    expect(getNextStatusActions('open').map((action) => action.targetStatus)).toEqual(['sent', 'closed']);
    expect(getNextStatusActions('sent').map((action) => action.targetStatus)).toEqual(['remedied', 'closed']);
    expect(getNextStatusActions('closed')).toEqual([]);
    expect(getNextStatusActions('withdrawn')).toEqual([]);
  });

  it('berechnet Summary und Falloptionen aus echten Records statt aus UI-Strings', () => {
    const summary = buildViolationSummaryItems([
      violation({ status: 'open' }),
      violation({ id: 'violation-2', stage: 'abmahnung', status: 'sent' }),
      violation({ id: 'violation-3', stage: 'suspension_request', status: 'closed' }),
    ]);
    const options = buildViolationCaseOptions([
      caseRecord(),
      caseRecord({ id: 'case-2', caseNumber: 'SBV-2026-005', displayName: 'Fall SBV-2026-005' }),
    ]);

    expect(summary).toEqual([
      { label: 'offen', value: 2 },
      { label: 'Abmahnstufe', value: 1 },
      { label: 'Aussetzung', value: 1 },
    ]);
    expect(options).toEqual([
      { value: '', label: 'Fallfrei / Kontext-ID manuell' },
      { value: 'case-1', label: 'SBV-2026-004 · Fall SBV-2026-004' },
      { value: 'case-2', label: 'SBV-2026-005 · Fall SBV-2026-005' },
    ]);
  });
});
