import { describe, expect, it } from 'vitest';
import { inspectVacationV5Scope } from '../../../../src/domain/transfer/vacationV5ScopePolicy';

const base = { caseIds: [], standaloneDeadlineIds: [], meetingIds: [], recruitingIds: [], employerObligationIds: [], inclusionAgreementIds: [], violationIds: [], assemblyIds: [] };

describe('Format-5-Umfang für fallfreie Arbeit', () => {
  it('akzeptiert eine rein übergreifende Auswahl mit aufgelöster Sitzungsfrist', () => {
    const result = inspectVacationV5Scope({ ...base, meetingIds: ['meeting-1'], standaloneDeadlineIds: ['deadline-1'] }, [{
      id: 'deadline-1', caseId: null, measureId: null, personId: null, processType: 'sbv_meeting', processId: 'meeting-1', status: 'open',
    }]);
    expect(result).toEqual({ selectedCount: 2, issues: [] });
  });

  it('sperrt verwaiste Verweise und fall- oder personenbezogene Fristen ohne passende Auswahl', () => {
    const result = inspectVacationV5Scope({ ...base, standaloneDeadlineIds: ['deadline-1', 'deadline-2'] }, [
      { id: 'deadline-1', caseId: null, measureId: null, personId: null, processType: 'sbv_meeting', processId: 'missing', status: 'open' },
      { id: 'deadline-2', caseId: null, measureId: null, personId: 'person-1', processType: 'custom', processId: null, status: 'open' },
    ]);
    expect(result.issues.map((issue) => issue.code)).toEqual(['missing_parent', 'person_reference']);
  });

  it('sperrt ausgeschlossene Journal- und Wahlbezüge sowie abgeschlossene oder fehlende Fristen', () => {
    const result = inspectVacationV5Scope({ ...base, standaloneDeadlineIds: ['journal', 'done', 'missing'] }, [
      { id: 'journal', caseId: null, measureId: null, personId: null, processType: 'activity_journal', processId: 'entry-1', status: 'open' },
      { id: 'done', caseId: null, measureId: null, personId: null, processType: 'custom', processId: null, status: 'done' },
    ]);
    expect(result.issues.map((issue) => issue.code)).toEqual(['excluded_process', 'closed_deadline', 'missing_deadline']);
  });

  it('verlangt mindestens einen Vorgang und sperrt doppelte Auswahl-IDs', () => {
    expect(inspectVacationV5Scope(base, []).issues.map((issue) => issue.code)).toEqual(['empty_scope']);
    expect(inspectVacationV5Scope({ ...base, meetingIds: ['same', 'same'] }, []).issues.map((issue) => issue.code)).toEqual(['duplicate_selection']);
  });
});
