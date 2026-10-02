import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCaseProcessUpdates } from '../../../src/app/features/cases/useCaseProcessUpdates';

afterEach(() => vi.unstubAllGlobals());

function dependencies() {
  return {
    setNoteError: vi.fn(),
    setNoteInfo: vi.fn(),
    reloadSelectedCaseChildren: vi.fn(async () => undefined),
  };
}

describe('case process updates', () => {
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
