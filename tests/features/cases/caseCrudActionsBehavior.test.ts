import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FormEvent } from 'react';
import { waitForBridge } from '../../../src/app/core/bridge/waitForBridge';
import { createCaseCrudActions } from '../../../src/app/features/cases/caseCrudActions';
import type { CaseDocumentRecord } from '../../../src/domain/models/case-document.model';
import type { CaseNoteRecord } from '../../../src/domain/models/case-note.model';

vi.mock('../../../src/app/core/bridge/waitForBridge', () => ({ waitForBridge: vi.fn() }));

const document: CaseDocumentRecord = {
  id: 'document-1', caseId: 'case-1', displayTitle: 'Bericht', filename: 'Diagnose.pdf',
  sha256: 'hash', containsHealthData: true, createdAt: '2024-01-01T00:00:00Z',
};
const note: CaseNoteRecord = {
  id: 'note-1', caseId: 'case-1', caseIds: ['case-1'], caseNumbers: ['SBV-42'], title: 'Gespräch',
  noteDate: '2024-01-01', noteType: 'gespraech', content: 'Anlass', containsHealthData: false,
  confidentialLevel: 'normal', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
};
type Deps = Parameters<typeof createCaseCrudActions>[0];

function setup(overrides: Partial<Deps> = {}) {
  const service = {
    selectAndImportDocuments: vi.fn().mockResolvedValue([document]),
    openDocument: vi.fn().mockResolvedValue({ opened: true }),
    exportDocument: vi.fn().mockResolvedValue(undefined),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
    deleteNote: vi.fn().mockResolvedValue(undefined),
  };
  const createAnonymousRequest = vi.fn().mockResolvedValue({ id: 'anonymous-1', pseudonymLabel: 'Anfrage 17' });
  vi.mocked(waitForBridge).mockResolvedValue({ cases: service, persons: { createAnonymousRequest } } as unknown as NonNullable<Window['gremiaSbv']>);
  const deps = {
    setError: vi.fn(), setIsCaseCreateModalOpen: vi.fn(), caseNumber: ' SBV-42 ', displayName: ' Beratung ',
    category: 'sonstiges' as const, summary: ' Anlass ', selectedProtectedPersonId: 'person-1', protectedPersons: [],
    onCreateCase: vi.fn().mockResolvedValue(undefined), onCasesChanged: vi.fn().mockResolvedValue(undefined),
    setCaseNumber: vi.fn(), setDisplayName: vi.fn(), setSummary: vi.fn(), setSelectedProtectedPersonId: vi.fn(),
    setNoteError: vi.fn(), editingNote: note, noteEditor: { resetNoteForm: vi.fn() },
    reloadSelectedCaseChildren: vi.fn().mockResolvedValue(undefined), setSelection: vi.fn(),
    searchQuery: 'Anlass', runSearch: vi.fn().mockResolvedValue(undefined), setDocumentError: vi.fn(),
    selectedCaseId: 'case-1', confirmDialog: vi.fn().mockResolvedValue(true), announce: vi.fn(), ...overrides,
  };
  return { actions: createCaseCrudActions(deps), deps, service, createAnonymousRequest };
}

describe('case CRUD workflows', () => {
  afterEach(() => vi.resetAllMocks());

  it('creates a linked case, trims inputs and closes and clears the confirmed form', async () => {
    const { actions, deps, createAnonymousRequest } = setup();
    const preventDefault = vi.fn();
    await actions.addCase({ preventDefault } as unknown as FormEvent<HTMLFormElement>);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(deps.onCreateCase).toHaveBeenCalledExactlyOnceWith({
      caseNumber: 'SBV-42', displayName: 'Beratung', category: 'sonstiges', summary: 'Anlass',
      protectedPersonId: 'person-1', personBindingState: 'active', isPseudonymized: false,
    });
    expect(createAnonymousRequest).not.toHaveBeenCalled();
    expect(deps.setCaseNumber).toHaveBeenCalledWith('');
    expect(deps.setIsCaseCreateModalOpen).toHaveBeenCalledWith(false);
    expect(deps.announce).toHaveBeenCalledWith(expect.any(String));
    expect(deps.onCasesChanged).toHaveBeenCalledOnce();
  });

  it('creates an anonymous case using the confirmed pseudonym without requiring a selected person', async () => {
    const { actions, deps, createAnonymousRequest } = setup({ displayName: '', selectedProtectedPersonId: '' });
    await actions.addAnonymousCase();
    expect(createAnonymousRequest).toHaveBeenCalledOnce();
    expect(deps.onCreateCase).toHaveBeenCalledWith(expect.objectContaining({
      protectedPersonId: 'anonymous-1', displayName: 'Anfrage 17', personBindingState: 'anonymous_request', isPseudonymized: true,
    }));
  });

  it.each([{ caseNumber: ' ' }, { selectedProtectedPersonId: '' }])('rejects an incomplete identified case without clearing its form', async (overrides) => {
    const { actions, deps } = setup(overrides);
    await actions.addCase({ preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>);
    expect(deps.onCreateCase).not.toHaveBeenCalled();
    expect(vi.mocked(deps.setError).mock.calls.at(-1)?.[0]).toBeTruthy();
    expect(deps.setCaseNumber).not.toHaveBeenCalled();
    expect(deps.setIsCaseCreateModalOpen).not.toHaveBeenCalled();
  });

  it('preserves the form and reports failed creation without announcing success', async () => {
    const { actions, deps } = setup();
    vi.mocked(deps.onCreateCase).mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    await actions.addAnonymousCase();
    expect(deps.setError).toHaveBeenLastCalledWith('Speichern fehlgeschlagen');
    expect(deps.setCaseNumber).not.toHaveBeenCalled();
    expect(deps.setIsCaseCreateModalOpen).not.toHaveBeenCalled();
    expect(deps.announce).not.toHaveBeenCalled();
  });

  it('keeps the modal open until creation is confirmed', async () => {
    const { actions, deps } = setup();
    let resolve!: () => void;
    vi.mocked(deps.onCreateCase).mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
    const pending = actions.addAnonymousCase();
    await vi.waitFor(() => expect(deps.onCreateCase).toHaveBeenCalled());
    expect(deps.setIsCaseCreateModalOpen).not.toHaveBeenCalled();
    expect(deps.announce).not.toHaveBeenCalled();
    resolve();
    await pending;
    expect(deps.setIsCaseCreateModalOpen).toHaveBeenCalledWith(false);
  });

  it('requires an explicit export decision and performs no bridge access after cancellation', async () => {
    const { actions, deps, service } = setup({ confirmDialog: vi.fn().mockResolvedValue(false) });
    await actions.exportDocument(document);
    expect(deps.confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ variant: 'warning' }));
    expect(waitForBridge).not.toHaveBeenCalled();
    expect(service.exportDocument).not.toHaveBeenCalled();
    expect(deps.announce).not.toHaveBeenCalled();
  });

  it('exports only after confirmation and announces the confirmed export', async () => {
    const { actions, deps, service } = setup();
    let resolve!: (confirmed: boolean) => void;
    vi.mocked(deps.confirmDialog).mockImplementation(() => new Promise<boolean>((done) => { resolve = done; }));
    const pending = actions.exportDocument(document);
    expect(service.exportDocument).not.toHaveBeenCalled();
    resolve(true);
    await pending;
    expect(service.exportDocument).toHaveBeenCalledExactlyOnceWith(document.id, document.filename);
    expect(deps.announce).toHaveBeenCalledWith(expect.any(String), 'polite');
  });

  it('reports failed export assertively and never announces success', async () => {
    const { actions, deps, service } = setup();
    service.exportDocument.mockRejectedValue(new Error('Export fehlgeschlagen'));
    await actions.exportDocument(document);
    expect(deps.setDocumentError).toHaveBeenLastCalledWith('Export fehlgeschlagen');
    expect(deps.announce).toHaveBeenCalledExactlyOnceWith('Export fehlgeschlagen', 'assertive');
  });

  it('reports a rejected external preview through an assertive live message', async () => {
    const { actions, deps, service } = setup();
    service.openDocument.mockResolvedValue({ opened: false, error: 'Vorschau nicht erreichbar' });
    await actions.openDocument(document);
    expect(service.openDocument).toHaveBeenCalledWith(document.id);
    expect(deps.setDocumentError).toHaveBeenLastCalledWith('Vorschau nicht erreichbar');
    expect(deps.announce).toHaveBeenCalledExactlyOnceWith('Vorschau nicht erreichbar', 'assertive');
  });

  it('imports into the selected case, refreshes children and selects the first imported document', async () => {
    const { actions, deps, service } = setup();
    await actions.importDocuments();
    expect(service.selectAndImportDocuments).toHaveBeenCalledExactlyOnceWith('case-1', true);
    expect(deps.reloadSelectedCaseChildren).toHaveBeenCalledOnce();
    expect(deps.setSelection).toHaveBeenCalledWith({ type: 'document', id: document.id });
    expect(deps.runSearch).toHaveBeenCalledOnce();
  });

  it('rejects import without a selected case and preserves selection after a cancelled file picker', async () => {
    const missing = setup({ selectedCaseId: '' });
    await missing.actions.importDocuments();
    expect(waitForBridge).not.toHaveBeenCalled();
    expect(missing.service.selectAndImportDocuments).not.toHaveBeenCalled();
    expect(missing.deps.setDocumentError).toHaveBeenLastCalledWith(expect.any(String));

    const cancelled = setup({ searchQuery: '   ' });
    cancelled.service.selectAndImportDocuments.mockResolvedValue([]);
    await cancelled.actions.importDocuments();
    expect(cancelled.deps.setSelection).not.toHaveBeenCalled();
    expect(cancelled.deps.runSearch).not.toHaveBeenCalled();
  });

  it('keeps another note in the editor when deleting an unrelated note', async () => {
    const { actions, deps } = setup({ editingNote: { ...note, id: 'other-note' }, searchQuery: '' });
    await actions.deleteNote(note);
    expect(deps.noteEditor.resetNoteForm).not.toHaveBeenCalled();
    expect(deps.runSearch).not.toHaveBeenCalled();
  });

  it('reports an unavailable case service without changing selection', async () => {
    const { actions, deps } = setup();
    vi.mocked(waitForBridge).mockResolvedValue(null);
    await actions.deleteDocument(document);
    expect(deps.setDocumentError).toHaveBeenLastCalledWith('Falldienst ist nicht erreichbar.');
    expect(deps.setSelection).not.toHaveBeenCalled();
    expect(deps.reloadSelectedCaseChildren).not.toHaveBeenCalled();
  });

  it.each(['deleteNote', 'deleteDocument'] as const)('refreshes the case and search only after successful %s', async (action) => {
    const { actions, deps, service } = setup();
    if (action === 'deleteNote') await actions.deleteNote(note);
    else await actions.deleteDocument(document);
    expect(service[action]).toHaveBeenCalledExactlyOnceWith(action === 'deleteNote' ? note.id : document.id);
    expect(deps.reloadSelectedCaseChildren).toHaveBeenCalledOnce();
    expect(deps.setSelection).toHaveBeenCalledWith({ type: 'overview' });
    expect(deps.runSearch).toHaveBeenCalledOnce();
    expect(deps.noteEditor.resetNoteForm).toHaveBeenCalledTimes(action === 'deleteNote' ? 1 : 0);
  });

  it.each(['deleteNote', 'deleteDocument'] as const)('preserves selection and editor on failed %s', async (action) => {
    const { actions, deps, service } = setup();
    service[action].mockRejectedValue(new Error('Löschen fehlgeschlagen'));
    if (action === 'deleteNote') await actions.deleteNote(note);
    else await actions.deleteDocument(document);
    expect(action === 'deleteNote' ? deps.setNoteError : deps.setDocumentError).toHaveBeenLastCalledWith('Löschen fehlgeschlagen');
    expect(deps.setSelection).not.toHaveBeenCalled();
    expect(deps.noteEditor.resetNoteForm).not.toHaveBeenCalled();
    expect(deps.reloadSelectedCaseChildren).not.toHaveBeenCalled();
  });
});
