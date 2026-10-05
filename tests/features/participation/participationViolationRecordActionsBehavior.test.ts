import { afterEach, describe, expect, it, vi } from 'vitest';
import { createParticipationViolationRecordActions } from '../../../src/app/features/participation-violations/participationViolationRecordActions';
import type { SbvParticipationViolationRecord } from '../../../src/domain/models/sbv-participation-violation.model';
import type { ActivityJournalPrefill } from '../../../src/domain/models/activity-journal.model';

const record: SbvParticipationViolationRecord = {
  id: 'violation-1', stage: 'request', status: 'open', violationType: 'not_informed',
  sourceContextType: 'general_employer_practice', sourceContextId: '', subject: 'Beteiligung nachfordern',
  measureDescription: 'Arbeitgeberpraxis', wrongBehavior: 'Fehlende Unterrichtung', requiredBehavior: 'Unterlagen bereitstellen',
  legalBasis: '§ 178 Abs. 2 SGB IX', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
};
const prefill: ActivityJournalPrefill = { entry: { title: 'Beteiligungsverstoß', entryDate: '2024-01-01', category: 'documentation' }, sourceLabel: 'Verstoß', privacyNotice: 'Prüfen' };

function setup() {
  const service = {
    changeStatus: vi.fn().mockResolvedValue(record),
    generateDocument: vi.fn().mockResolvedValue({ filename: 'verstoß.pdf', previewStatus: 'requested' }),
    createFollowUp: vi.fn().mockResolvedValue({ dueAt: '2030-06-01T12:00:00Z' }),
    buildJournalPrefill: vi.fn().mockResolvedValue(prefill),
  };
  vi.stubGlobal('window', { gremiaSbv: { sbvParticipationViolations: service } });
  const reload = vi.fn().mockResolvedValue(undefined);
  const announce = vi.fn();
  const setBusy = vi.fn();
  const setMessage = vi.fn();
  const setError = vi.fn();
  const setDocumentBusyId = vi.fn();
  const setFollowUpBusyId = vi.fn();
  const onOpenJournalPrefill = vi.fn();
  const actions = createParticipationViolationRecordActions({ reload, announce, setBusy, setMessage, setError,
    setDocumentBusyId, setFollowUpBusyId, onOpenJournalPrefill });
  return { actions, service, reload, announce, setBusy, setMessage, setError, setDocumentBusyId, setFollowUpBusyId, onOpenJournalPrefill };
}

describe('participation violation record workflows', () => {
  afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });

  it('changes the selected violation status and refreshes only after confirmation', async () => {
    const state = setup();
    let changed!: (result: SbvParticipationViolationRecord) => void;
    state.service.changeStatus.mockImplementation(() => new Promise((resolve) => { changed = resolve; }));
    const pending = state.actions.changeStatus(record, 'sent');
    expect(state.service.changeStatus).toHaveBeenCalledExactlyOnceWith('violation-1', expect.objectContaining({ status: 'sent' }));
    expect(state.reload).not.toHaveBeenCalled();
    expect(state.announce).not.toHaveBeenCalled();
    changed({ ...record, status: 'sent' });
    await pending;
    expect(state.reload).toHaveBeenCalledOnce();
    expect(state.announce).toHaveBeenCalledExactlyOnceWith(expect.any(String));
    expect(state.setBusy.mock.calls.map(([busy]) => busy)).toEqual([true, false]);
  });

  it.each([
    ['request', false, false], ['owi_preparation', true, true],
  ] as const)('generates a document for %s using case references and the appropriate review hints', async (stage, legalReviewHint, owiHint) => {
    const state = setup();
    await state.actions.generateDocument({ ...record, stage });
    expect(state.service.generateDocument).toHaveBeenCalledExactlyOnceWith('violation-1', {
      privacyMode: 'case_reference', includeLegalReviewHint: legalReviewHint, includeOwiHint: owiHint,
    });
    expect(state.setDocumentBusyId.mock.calls.map(([id]) => id)).toEqual(['violation-1', null]);
    expect(state.reload).toHaveBeenCalledOnce();
    expect(state.setMessage).toHaveBeenLastCalledWith(expect.stringMatching(/verschlüsselt gespeichert.*Vorschau/));
  });

  it('reports confirmed encrypted storage and the preview problem separately', async () => {
    const state = setup();
    state.service.generateDocument.mockResolvedValue({ filename: 'verstoß.pdf', previewStatus: 'unavailable', previewMessage: 'Vorschau nicht verfügbar' });
    await state.actions.generateDocument(record);
    expect(state.setMessage).toHaveBeenLastCalledWith('PDF wurde verschlüsselt gespeichert: verstoß.pdf');
    expect(state.setError).toHaveBeenLastCalledWith('Vorschau nicht verfügbar');
    expect(state.reload).toHaveBeenCalledOnce();
    expect(state.setDocumentBusyId).toHaveBeenLastCalledWith(null);
  });

  it('creates a follow-up for the selected violation without changing document busy state', async () => {
    const state = setup();
    await state.actions.createFollowUp(record);
    expect(state.service.createFollowUp).toHaveBeenCalledExactlyOnceWith('violation-1');
    expect(state.setFollowUpBusyId.mock.calls.map(([id]) => id)).toEqual(['violation-1', null]);
    expect(state.setDocumentBusyId).not.toHaveBeenCalled();
    expect(state.reload).toHaveBeenCalledOnce();
    expect(state.announce).toHaveBeenCalledOnce();
  });

  it('opens the confirmed journal prefill without mutating or reloading violation data', async () => {
    const state = setup();
    await state.actions.openJournalPrefill(record);
    expect(state.service.buildJournalPrefill).toHaveBeenCalledExactlyOnceWith('violation-1');
    expect(state.onOpenJournalPrefill).toHaveBeenCalledExactlyOnceWith(prefill);
    expect(state.reload).not.toHaveBeenCalled();
    expect(state.setBusy).not.toHaveBeenCalled();
    expect(state.announce).toHaveBeenCalledOnce();
  });

  it.each(['changeStatus', 'generateDocument', 'createFollowUp', 'openJournalPrefill'] as const)('reports failed %s assertively and clears its busy state', async (action) => {
    const state = setup();
    state.service.changeStatus.mockRejectedValue(new Error('Vorgang fehlgeschlagen'));
    state.service.generateDocument.mockRejectedValue(new Error('Vorgang fehlgeschlagen'));
    state.service.createFollowUp.mockRejectedValue(new Error('Vorgang fehlgeschlagen'));
    state.service.buildJournalPrefill.mockRejectedValue(new Error('Vorgang fehlgeschlagen'));
    if (action === 'changeStatus') await state.actions.changeStatus(record, 'sent');
    else await state.actions[action](record);
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Vorgang fehlgeschlagen', 'assertive');
    expect(state.setError).toHaveBeenLastCalledWith('Vorgang fehlgeschlagen');
    expect(state.reload).not.toHaveBeenCalled();
    expect(state.onOpenJournalPrefill).not.toHaveBeenCalled();
    if (action === 'changeStatus') expect(state.setBusy).toHaveBeenLastCalledWith(false);
    if (action === 'generateDocument') expect(state.setDocumentBusyId).toHaveBeenLastCalledWith(null);
    if (action === 'createFollowUp') expect(state.setFollowUpBusyId).toHaveBeenLastCalledWith(null);
  });

  it('reads service availability at execution time and reports a missing bridge', async () => {
    const state = setup();
    vi.stubGlobal('window', { gremiaSbv: undefined });
    await state.actions.generateDocument(record);
    expect(state.service.generateDocument).not.toHaveBeenCalled();
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Beteiligungsverstoßdienst ist nicht erreichbar.', 'assertive');
    expect(state.setDocumentBusyId).toHaveBeenLastCalledWith(null);
  });

  it('retains confirmation of a saved document when the subsequent refresh fails', async () => {
    const state = setup();
    state.reload.mockRejectedValue(new Error('Daten konnten nicht aktualisiert werden'));
    await state.actions.generateDocument(record);
    expect(state.service.generateDocument).toHaveBeenCalledOnce();
    expect(state.setMessage).toHaveBeenLastCalledWith(expect.stringContaining('verschlüsselt gespeichert'));
    expect(state.setError).toHaveBeenLastCalledWith('Daten konnten nicht aktualisiert werden');
    expect(state.announce).toHaveBeenLastCalledWith('Daten konnten nicht aktualisiert werden', 'assertive');
    expect(state.setDocumentBusyId).toHaveBeenLastCalledWith(null);
  });

  it('provides a useful fallback when the service rejects without an Error', async () => {
    const state = setup();
    state.service.createFollowUp.mockRejectedValue(null);
    await state.actions.createFollowUp(record);
    expect(state.setError).toHaveBeenLastCalledWith('Wiedervorlage konnte nicht angelegt werden.');
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Wiedervorlage konnte nicht angelegt werden.', 'assertive');
    expect(state.setFollowUpBusyId).toHaveBeenLastCalledWith(null);
    expect(state.reload).not.toHaveBeenCalled();
  });
});
