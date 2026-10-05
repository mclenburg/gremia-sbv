import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForBridge } from '../../../src/app/core/bridge/waitForBridge';
import { createCaseProcessActions } from '../../../src/app/features/cases/caseProcessActions';
import type { CaseProcessDraft, CaseProcessType } from '../../../src/app/features/cases/casesViewProcessUtils';
import type { CaseRecord } from '../../../src/domain/models/case.model';

vi.mock('../../../src/app/core/bridge/waitForBridge', () => ({ waitForBridge: vi.fn() }));

const selectedCase: CaseRecord = {
  id: 'case-1', caseNumber: 'SBV-42', displayName: 'Fallakte', category: 'sonstiges',
  status: 'offen', priority: 'normal', openedAt: '2024-01-01T00:00:00Z',
  isPseudonymized: true, isLocked: false,
};

function setup(processType: CaseProcessType, description = '  Anlass  ') {
  const service = () => ({ create: vi.fn().mockResolvedValue({ id: 'process-1' }) });
  const services = {
    prevention: service(), bem: service(), participation: service(), workplaceAccommodation: service(),
    termination: service(), equalization: service(),
  };
  const serviceKeys: Record<CaseProcessType, keyof typeof services> = {
    prevention: 'prevention', bem: 'bem', participation: 'participation',
    workplace_accommodation: 'workplaceAccommodation', termination_hearing: 'termination', equalization: 'equalization',
  };
  const create = services[serviceKeys[processType]].create;
  const createNote = vi.fn().mockResolvedValue({ id: 'note-1' });
  vi.mocked(waitForBridge).mockResolvedValue({
    ...services, cases: { createNote },
  } as unknown as NonNullable<Window['gremiaSbv']>);
  const draft: CaseProcessDraft = { processType, title: '  Verfahren  ', description, dueAt: '2030-05-01T12:00' };
  const setCaseProcessDraft = vi.fn();
  const setSelection = vi.fn();
  const setNoteError = vi.fn();
  const setNoteInfo = vi.fn();
  const reloadSelectedCaseChildren = vi.fn().mockResolvedValue(undefined);
  const onCasesChanged = vi.fn().mockResolvedValue(undefined);
  const actions = createCaseProcessActions({
    selectedCase, selectedCaseId: selectedCase.id, caseProcessDraft: draft,
    setCaseProcessDraft, setSelection, setNoteError, setNoteInfo, reloadSelectedCaseChildren, onCasesChanged,
  });
  return { actions, create, createNote, setCaseProcessDraft, setSelection, setNoteError, setNoteInfo, reloadSelectedCaseChildren, onCasesChanged };
}

describe('case process creation behavior', () => {
  afterEach(() => vi.resetAllMocks());

  it.each([
    ['prevention', 'employerResponseDueAt'], ['bem', 'responseDueAt'], ['participation', 'statementDueAt'],
    ['workplace_accommodation', 'implementationDueAt'], ['termination_hearing', 'sbvStatementDueAt'],
    ['equalization', 'objectionDueAt'],
  ] as const)('creates %s in the selected case and selects the confirmed record', async (processType, dueField) => {
    const state = setup(processType);
    await state.actions.createCaseProcessFromDraft();

    expect(state.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      caseId: selectedCase.id, [dueField]: new Date('2030-05-01T12:00').toISOString(),
    }));
    expect(state.setCaseProcessDraft).toHaveBeenCalledExactlyOnceWith(null);
    expect(state.setSelection).toHaveBeenCalledExactlyOnceWith({ type: 'process', processType, id: 'process-1' });
    expect(state.setNoteInfo.mock.calls.at(-1)?.[0]).toMatch(/angelegt/);
    expect(state.reloadSelectedCaseChildren).toHaveBeenCalledTimes(1);
    expect(state.onCasesChanged).toHaveBeenCalledTimes(1);
  });

  it('keeps equalization context in a sensitive linked note and omits blank notes', async () => {
    const described = setup('equalization');
    await described.actions.createCaseProcessFromDraft();
    expect(described.createNote).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      caseId: selectedCase.id, caseIds: [selectedCase.id], content: '[[equalization:process-1]]\nAnlass',
      containsHealthData: true, confidentialLevel: 'hoch_sensibel',
    }));
    const blank = setup('equalization', '   ');
    await blank.actions.createCaseProcessFromDraft();
    expect(blank.createNote).not.toHaveBeenCalled();
  });

  it('preserves the draft and selection when the service rejects creation', async () => {
    const state = setup('prevention');
    state.create.mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    await state.actions.createCaseProcessFromDraft();
    expect(state.setNoteError).toHaveBeenLastCalledWith('Speichern fehlgeschlagen');
    expect(state.setCaseProcessDraft).not.toHaveBeenCalled();
    expect(state.setSelection).not.toHaveBeenCalled();
    expect(state.reloadSelectedCaseChildren).not.toHaveBeenCalled();
    expect(state.onCasesChanged).not.toHaveBeenCalled();
  });

  it('does not close the draft or select a record before creation is confirmed', async () => {
    const state = setup('bem');
    let confirm!: (result: { id: string }) => void;
    state.create.mockImplementation(() => new Promise((resolve) => { confirm = resolve; }));
    const pending = state.actions.createCaseProcessFromDraft();
    await vi.waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.setCaseProcessDraft).not.toHaveBeenCalled();
    expect(state.setSelection).not.toHaveBeenCalled();
    confirm({ id: 'process-1' });
    await pending;
    expect(state.setCaseProcessDraft).toHaveBeenCalledWith(null);
  });
});
