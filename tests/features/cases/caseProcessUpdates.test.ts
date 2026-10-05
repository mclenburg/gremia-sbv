import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCaseProcessUpdates } from '../../../src/app/features/cases/useCaseProcessUpdates';
import type { CaseRecord } from '../../../src/domain/models/case.model';
import type { EqualizationProcessRecord } from '../../../src/domain/models/equalization.model';

const selectedCase: CaseRecord = {
  id: 'case-1', caseNumber: 'SYNTHETIC-1', displayName: 'Synthetischer Fall', category: 'gleichstellung',
  status: 'offen', priority: 'normal', openedAt: '2030-01-01T12:00:00Z', isPseudonymized: true, isLocked: false,
};
const equalization: EqualizationProcessRecord = {
  id: 'equalization-1', caseId: selectedCase.id, applicationStatus: 'beratung',
  createdAt: '2030-01-01T12:00:00Z', updatedAt: '2030-01-01T12:00:00Z',
};

afterEach(() => vi.unstubAllGlobals());

function dependencies() {
  return {
    setNoteError: vi.fn(),
    setNoteInfo: vi.fn(),
    reloadSelectedCaseChildren: vi.fn(async () => undefined),
  };
}

describe('case process updates', () => {
  it('confirms secure note storage with sensitive metadata and process association', async () => {
    const createNote = vi.fn().mockResolvedValue({ id: 'note-1' });
    vi.stubGlobal('window', { gremiaSbv: { security: {}, cases: { createNote } } });
    const deps = { ...dependencies(), selectedCase };
    const saved = await useCaseProcessUpdates(deps).createEqualizationSecureNote(equalization, 'Synthetische vertrauliche Notiz');
    expect(saved).toBe(true);
    expect(createNote).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      caseId: selectedCase.id, caseIds: [selectedCase.id],
      content: '[[equalization:equalization-1]]\nSynthetische vertrauliche Notiz',
      containsHealthData: true, confidentialLevel: 'hoch_sensibel',
    }));
    expect(deps.reloadSelectedCaseChildren).toHaveBeenCalledOnce();
    expect(deps.setNoteInfo).toHaveBeenLastCalledWith('Gleichstellungs-/GdB-Notiz wurde als verschlüsselte Fallnotiz gespeichert.');
  });

  it('declines secure note storage without a selected case', async () => {
    const createNote = vi.fn();
    vi.stubGlobal('window', { gremiaSbv: { security: {}, cases: { createNote } } });
    const deps = dependencies();
    expect(await useCaseProcessUpdates(deps).createEqualizationSecureNote(equalization, 'Entwurf')).toBe(false);
    expect(createNote).not.toHaveBeenCalled();
    expect(deps.reloadSelectedCaseChildren).not.toHaveBeenCalled();
  });

  it('reports rejected secure note storage without signaling a saved draft', async () => {
    const createNote = vi.fn().mockRejectedValue(new Error('Synthetischer Speicherfehler'));
    vi.stubGlobal('window', { gremiaSbv: { security: {}, cases: { createNote } } });
    const deps = { ...dependencies(), selectedCase };
    expect(await useCaseProcessUpdates(deps).createEqualizationSecureNote(equalization, 'Entwurf')).toBe(false);
    expect(deps.reloadSelectedCaseChildren).not.toHaveBeenCalled();
    expect(deps.setNoteError).toHaveBeenLastCalledWith('Synthetischer Speicherfehler');
    expect(deps.setNoteInfo.mock.calls).toEqual([['']]);
  });

  it('keeps confirmed note storage distinct from a failed view refresh to prevent duplicate retry', async () => {
    const createNote = vi.fn().mockResolvedValue({ id: 'note-1' });
    vi.stubGlobal('window', { gremiaSbv: { security: {}, cases: { createNote } } });
    const deps = { ...dependencies(), selectedCase };
    deps.reloadSelectedCaseChildren.mockRejectedValue(new Error('Ansicht konnte nicht geladen werden'));
    expect(await useCaseProcessUpdates(deps).createEqualizationSecureNote(equalization, 'Entwurf')).toBe(true);
    expect(createNote).toHaveBeenCalledOnce();
    expect(deps.setNoteError).toHaveBeenLastCalledWith('Ansicht konnte nicht geladen werden');
  });

  it('updates a prevention process, reloads the case and reports success', async () => {
    const update = vi.fn(async () => undefined);
    vi.stubGlobal('window', { gremiaSbv: { security: {}, prevention: { update } } });
    const deps = dependencies();
    const actions = useCaseProcessUpdates(deps);

    await actions.updateCasePreventionProcess('process-1', { hazardDescription: 'Arbeitsplatz prüfen' });

    expect(update).toHaveBeenCalledWith('process-1', { hazardDescription: 'Arbeitsplatz prüfen' });
    expect(deps.reloadSelectedCaseChildren).toHaveBeenCalledOnce();
    expect(deps.setNoteInfo).toHaveBeenLastCalledWith('Präventionsverfahren wurde aktualisiert.');
    expect(deps.setNoteError).toHaveBeenCalledWith('');
  });

  it('reports an unavailable service without claiming success or reloading', async () => {
    vi.stubGlobal('window', { gremiaSbv: { security: {} } });
    const deps = dependencies();
    const actions = useCaseProcessUpdates(deps);

    await actions.updateCaseBemProcess('process-2', { title: 'BEM begleiten' });

    expect(deps.reloadSelectedCaseChildren).not.toHaveBeenCalled();
    expect(deps.setNoteInfo).toHaveBeenCalledWith('');
    expect(deps.setNoteError).toHaveBeenLastCalledWith('BEM-Dienst ist nicht erreichbar.');
  });

  it('uses a safe message when a service fails without an Error object', async () => {
    const update = vi.fn(async () => { throw 'untrusted service failure'; });
    vi.stubGlobal('window', { gremiaSbv: { security: {}, equalization: { update } } });
    const deps = dependencies();
    const actions = useCaseProcessUpdates(deps);

    await actions.updateCaseEqualizationProcess('process-3', {});

    expect(deps.reloadSelectedCaseChildren).not.toHaveBeenCalled();
    expect(deps.setNoteInfo).toHaveBeenCalledWith('');
    expect(deps.setNoteError).toHaveBeenLastCalledWith('Gleichstellungsverfahren konnte nicht aktualisiert werden.');
  });
});
