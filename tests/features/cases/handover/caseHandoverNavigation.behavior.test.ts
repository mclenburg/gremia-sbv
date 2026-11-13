import { describe, expect, it } from 'vitest';
import { consumeCaseHandoverEntry, peekCaseHandoverEntry, requestCaseHandoverEntry } from '../../../../src/app/features/case-handover/caseHandoverNavigation';

describe('Übergabeeinstieg aus der Fallakte', () => {
  it('übernimmt den ausgewählten Fall genau einmal in den zentralen Exportablauf', () => {
    requestCaseHandoverEntry({ tab: 'vacation', caseId: 'case-42' });
    expect(peekCaseHandoverEntry()).toEqual({ tab: 'vacation', caseId: 'case-42' });
    expect(peekCaseHandoverEntry()).toEqual({ tab: 'vacation', caseId: 'case-42' });
    expect(consumeCaseHandoverEntry()).toEqual({ tab: 'vacation', caseId: 'case-42' });
    expect(consumeCaseHandoverEntry()).toBeNull();
  });

  it('führt den Import ohne Fallbindung in den zentralen Importablauf', () => {
    requestCaseHandoverEntry({ tab: 'import' });
    expect(consumeCaseHandoverEntry()).toEqual({ tab: 'import' });
  });
});
