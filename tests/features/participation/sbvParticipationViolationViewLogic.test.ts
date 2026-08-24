import { describe, expect, it } from 'vitest';
import type { CaseRecord } from '../../../src/domain/models/case.model';
import type { ParticipationRecord } from '../../../src/domain/models/participation.model';
import type { CaseMeasureRecord } from '../../../src/domain/models/case-measure.model';
import type { SbvParticipationViolationRecord } from '../../../src/domain/models/sbv-participation-violation.model';
import {
  applyViolationCaseContext,
  applyViolationMeasureContext,
  applyViolationSourceContextType,
  buildParticipationViolationPrefillFromMeasure,
  buildViolationCaseOptions,
  buildViolationMeasureOptions,
  buildViolationSummaryItems,
  buildViolationFieldErrors,
  createInitialViolationForm,
  getNextStatusActions,
  needsEscalationHint,
  summarizeViolationDraftValidation,
  validateViolationDraft,
} from '../../../src/app/features/participation-violations/sbvParticipationViolationViewLogic';

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

function participation(overrides: Partial<ParticipationRecord> = {}): ParticipationRecord {
  return {
    id: 'measure-participation-1',
    caseId: 'case-1',
    title: 'SBV-Beteiligung ohne Klarnamen',
    measureType: 'versetzung',
    status: 'unterrichtung_pruefen',
    riskLevel: 'kritisch',
    personStatus: 'schwerbehindert',
    decisionStage: 'entscheidung_getroffen',
    informationComplete: false,
    hearingBeforeDecision: false,
    decisionNotified: true,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

function caseMeasure(overrides: Partial<CaseMeasureRecord> = {}): CaseMeasureRecord {
  return {
    id: 'measure-1',
    caseId: 'case-1',
    type: 'sbv_participation',
    title: 'Allgemeine Freistellungspraxis prüfen',
    status: 'open',
    riskLevel: 'kritisch',
    createdFrom: 'manual',
    openedAt: '2026-06-01',
    requiresFollowUp: true,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
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
  it('beginnt mit einem allgemeinen, fallfreien Arbeitgeberverstoß ohne technische Kontext-ID', () => {
    const form = createInitialViolationForm([]);
    expect(form).toMatchObject({ sourceContextType: 'general_employer_practice', sourceContextId: '' });
    expect(validateViolationDraft({
      ...form,
      subject: 'Allgemeine Freistellungspraxis',
      measureDescription: 'Arztbesuche sollen generell nicht mehr freigestellt werden.',
      wrongBehavior: 'Die Anordnung missachtet die Beteiligungsrechte der SBV.',
    })).toEqual([]);
  });
  it('startet unabhängig von vorhandenen Fällen im allgemeinen fallfreien Kontext', () => {
    const withCase = createInitialViolationForm([caseRecord()]);
    const withoutCase = createInitialViolationForm([]);

    expect(withCase.sourceContextType).toBe('general_employer_practice');
    expect(withCase.sourceContextId).toBe('');
    expect(withCase.caseId).toBeUndefined();
    expect(withCase.requiredBehavior).toContain('§ 178 Abs. 2 Satz 1 SGB IX');

    expect(withoutCase.sourceContextType).toBe('general_employer_practice');
    expect(withoutCase.sourceContextId).toBe('');
    expect(withoutCase.caseId).toBeUndefined();
  });

  it('setzt Fallkontext nur nach bewusster Auswahl und löscht Maßnahmensonderbezug', () => {
    const form = {
      ...createInitialViolationForm([]),
      sourceContextType: 'case_measure_participation' as const,
      sourceContextId: 'measure-participation-1',
      relatedCaseMeasureId: 'measure-participation-1',
    };

    expect(applyViolationCaseContext(form, 'case-1')).toMatchObject({
      sourceContextType: 'case',
      sourceContextId: 'case-1',
      caseId: 'case-1',
      relatedCaseMeasureId: undefined,
    });
    expect(applyViolationCaseContext(form, '')).toMatchObject({
      sourceContextType: 'case_measure_participation',
      sourceContextId: 'measure-participation-1',
      caseId: undefined,
    });
  });

  it('bietet nur echte SBV-Beteiligungsmaßnahmen mit verständlicher Fallreferenz an und übernimmt deren Relationen', () => {
    const measures = [
      caseMeasure(),
      caseMeasure({ id: 'measure-2', type: 'bem', title: 'Nicht auswählbares BEM' }),
    ];
    const options = buildViolationMeasureOptions(measures, [caseRecord()]);

    expect(options).toEqual([{
      value: 'measure-1',
      label: 'Allgemeine Freistellungspraxis prüfen · SBV-2026-004',
    }]);
    expect(applyViolationMeasureContext(createInitialViolationForm([]), 'measure-1', measures)).toMatchObject({
      sourceContextType: 'case_measure_participation',
      sourceContextId: 'measure-1',
      caseId: 'case-1',
      relatedCaseMeasureId: 'measure-1',
    });
  });

  it('wechselt Ausgangskontext ohne alte Relationen mitzuschleppen', () => {
    const form = {
      ...createInitialViolationForm([]),
      sourceContextId: 'measure-participation-1',
      caseId: 'case-1',
      relatedCaseMeasureId: 'measure-participation-1',
      relatedDeadlineId: 'deadline-1',
    };

    expect(applyViolationSourceContextType(form, 'deadline')).toMatchObject({
      sourceContextType: 'deadline',
      sourceContextId: '',
      caseId: undefined,
      relatedCaseMeasureId: undefined,
      relatedDeadlineId: undefined,
    });
  });

  it('baut aus der SBV-Beteiligungsmaßnahme einen nicht persistierten Entwurf mit Maßnahmekontext', () => {
    const prefill = buildParticipationViolationPrefillFromMeasure(participation(), caseRecord());

    expect(prefill.form).toMatchObject({
      sourceContextType: 'case_measure_participation',
      sourceContextId: 'measure-participation-1',
      relatedCaseMeasureId: 'measure-participation-1',
      caseId: 'case-1',
      violationType: 'incomplete_information',
    });
    expect(prefill.sourceLabel).toContain('SBV-2026-004');
    expect(prefill.privacyNotice).toContain('noch kein Beteiligungsverstoß gespeichert');
  });



  it('validiert den bewussten Entwurf branchbasiert vor Persistenz', () => {
    const emptyDraft = createInitialViolationForm([]);
    const issues = validateViolationDraft(emptyDraft);

    expect(issues.map((issue) => issue.code)).toEqual([
      'missing_subject',
      'missing_measure_description',
      'missing_wrong_behavior',
    ]);
    expect(buildViolationFieldErrors(issues)).toMatchObject({
      subject: expect.any(String),
      measureDescription: expect.any(String),
      wrongBehavior: expect.any(String),
    });
    expect(summarizeViolationDraftValidation(issues)).toContain('Pflichtfelder');
  });

  it('erkennt widersprüchlichen allgemeinen Fallkontext ohne Stringtest auf UI-Text', () => {
    const draft = {
      ...createInitialViolationForm([]),
      sourceContextType: 'case' as const,
      sourceContextId: 'case-1',
      caseId: 'case-2',
      subject: 'Verstoß',
      measureDescription: 'Maßnahme',
      wrongBehavior: 'Fehler',
      requiredBehavior: 'Richtiges Verfahren',
    };

    expect(validateViolationDraft(draft).map((issue) => issue.code)).toEqual(['case_context_mismatch']);
  });

  it('zeigt anwaltlichen Hinweis nur bei scharfen Eskalationsstufen und liefert erlaubte Statusaktionen', () => {
    expect(needsEscalationHint('request')).toBe(false);
    expect(needsEscalationHint('formal_objection')).toBe(false);
    expect(needsEscalationHint('abmahnung')).toBe(true);
    expect(needsEscalationHint('suspension_request')).toBe(true);
    expect(needsEscalationHint('owi_preparation')).toBe(true);

    expect(getNextStatusActions('draft').map((action) => action.targetStatus)).toEqual(['open', 'withdrawn']);
    expect(getNextStatusActions('open').map((action) => action.targetStatus)).toEqual(['sent', 'withdrawn', 'closed']);
    expect(getNextStatusActions('sent').map((action) => action.targetStatus)).toEqual(['remedied', 'escalated', 'closed']);
    expect(getNextStatusActions('remedied').map((action) => action.targetStatus)).toEqual(['escalated', 'closed']);
    expect(getNextStatusActions('escalated').map((action) => action.targetStatus)).toEqual(['remedied', 'closed']);
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
      { value: '', label: 'Kein Fall direkt gewählt' },
      { value: 'case-1', label: 'SBV-2026-004 · Fall SBV-2026-004' },
      { value: 'case-2', label: 'SBV-2026-005 · Fall SBV-2026-005' },
    ]);
  });
});
