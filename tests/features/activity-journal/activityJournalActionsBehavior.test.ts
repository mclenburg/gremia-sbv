import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForBridge } from '../../../src/app/core/bridge/waitForBridge';
import { createActivityJournalActions } from '../../../src/app/features/activity-journal/activityJournalActions';
import type { ActivityJournalFormState } from '../../../src/app/features/activity-journal/activityJournalForm';

vi.mock('../../../src/app/core/bridge/waitForBridge', () => ({ waitForBridge: vi.fn() }));

const form: ActivityJournalFormState = {
  title: 'SBV-Beratung', description: 'Arbeitsplatz besprochen', resultNote: 'Unterlagen angefordert',
  entryDate: '2024-01-01', category: 'documentation', timeMode: 'duration', durationMinutes: '45',
  startedAt: '', endedAt: '', status: 'final', followUpDueAt: '', performedOutsideContractWorkTime: false,
  preferenceContextType: 'fallfrei',
};
const filter = { search: 'Beratung', categories: ['documentation' as const], limit: 100 };

function setup() {
  const service = {
    create: vi.fn().mockResolvedValue({ id: 'entry-1' }), rememberCategory: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    export: vi.fn().mockResolvedValue({ heading: 'Journal', totalEntries: 2, totalMinutes: 75 }),
  };
  vi.mocked(waitForBridge).mockResolvedValue({ activityJournal: service } as unknown as NonNullable<Window['gremiaSbv']>);
  const reload = vi.fn().mockResolvedValue(undefined);
  const setForm = vi.fn();
  const setTimeSuggestion = vi.fn();
  const setBusy = vi.fn();
  const setError = vi.fn();
  const setMessage = vi.fn();
  const actions = createActivityJournalActions({ form, filter, reload, setForm, setTimeSuggestion, setBusy, setError, setMessage });
  return { actions, service, reload, setForm, setTimeSuggestion, setBusy, setError, setMessage };
}

describe('activity journal action workflows', () => {
  afterEach(() => vi.resetAllMocks());

  it('stores a confidential manual entry, remembers its category and resets the confirmed form', async () => {
    const state = setup();
    expect(await state.actions.saveEntry()).toBe(true);
    expect(state.service.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      title: 'SBV-Beratung', entryDate: '2024-01-01', timeMode: 'duration', durationMinutes: 45,
      confidentialityLevel: 'confidential', createdFrom: 'manual',
    }));
    expect(state.service.rememberCategory).toHaveBeenCalledExactlyOnceWith('fallfrei', 'documentation');
    expect(state.setForm).toHaveBeenCalledWith(expect.objectContaining({ title: '', description: '', resultNote: '' }));
    expect(state.setTimeSuggestion).toHaveBeenCalledExactlyOnceWith(null);
    expect(state.reload).toHaveBeenCalledOnce();
    expect(state.setBusy.mock.calls.map(([busy]) => busy)).toEqual([true, false]);
  });

  it('preserves an entry draft and time suggestion when creation is rejected', async () => {
    const state = setup();
    state.service.create.mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    expect(await state.actions.saveEntry()).toBe(false);
    expect(state.setError).toHaveBeenLastCalledWith('Speichern fehlgeschlagen');
    expect(state.service.rememberCategory).not.toHaveBeenCalled();
    expect(state.setForm).not.toHaveBeenCalled();
    expect(state.setTimeSuggestion).not.toHaveBeenCalled();
    expect(state.reload).not.toHaveBeenCalled();
    expect(state.setBusy).toHaveBeenLastCalledWith(false);
  });

  it('does not clear the draft or signal completion before creation is confirmed', async () => {
    const state = setup();
    let saved!: (result: { id: string }) => void;
    state.service.create.mockImplementation(() => new Promise((resolve) => { saved = resolve; }));
    const pending = state.actions.saveEntry();
    await vi.waitFor(() => expect(state.service.create).toHaveBeenCalled());
    expect(state.setForm).not.toHaveBeenCalled();
    expect(state.setBusy).toHaveBeenLastCalledWith(true);
    saved({ id: 'entry-1' });
    expect(await pending).toBe(true);
    expect(state.setBusy).toHaveBeenLastCalledWith(false);
  });

  it('previews the filtered summary without marking exports or changing journal data', async () => {
    const state = setup();
    await state.actions.previewExport();
    expect(state.service.export).toHaveBeenCalledExactlyOnceWith(filter, 'summary', { markAsExported: false });
    expect(state.reload).not.toHaveBeenCalled();
    expect(state.setForm).not.toHaveBeenCalled();
    expect(state.setMessage).toHaveBeenLastCalledWith(expect.stringMatching(/2 Einträge, 1 h 15 min.*ohne Exportmarkierung/));
    expect(state.setBusy).toHaveBeenLastCalledWith(false);
  });

  it('marks an export only through the explicit marking action and refreshes afterwards', async () => {
    const state = setup();
    await state.actions.markExported();
    expect(state.service.export).toHaveBeenCalledExactlyOnceWith(filter, 'summary', { markAsExported: true });
    expect(state.reload).toHaveBeenCalledOnce();
    expect(state.setMessage).toHaveBeenLastCalledWith(expect.stringMatching(/bewusst.*Nachweisexport markiert/));
  });

  it('refreshes the journal after confirmed deletion without resetting an unrelated draft', async () => {
    const state = setup();
    await state.actions.deleteEntry('entry-1');
    expect(state.service.delete).toHaveBeenCalledExactlyOnceWith('entry-1');
    expect(state.reload).toHaveBeenCalledOnce();
    expect(state.setForm).not.toHaveBeenCalled();
    expect(state.setBusy).toHaveBeenLastCalledWith(false);
  });

  it.each(['deleteEntry', 'previewExport', 'markExported'] as const)('keeps the busy state recoverable and reports rejected %s without success feedback', async (action) => {
    const state = setup();
    state.service.delete.mockRejectedValue(new Error('Vorgang fehlgeschlagen'));
    state.service.export.mockRejectedValue(new Error('Vorgang fehlgeschlagen'));
    if (action === 'deleteEntry') await state.actions.deleteEntry('entry-1');
    else await state.actions[action]();
    expect(state.setError).toHaveBeenLastCalledWith('Vorgang fehlgeschlagen');
    expect(state.setMessage).toHaveBeenCalledExactlyOnceWith('');
    expect(state.reload).not.toHaveBeenCalled();
    expect(state.setBusy.mock.calls.map(([busy]) => busy)).toEqual([true, false]);
  });

  it('reports an unavailable journal service and releases the busy state', async () => {
    const state = setup();
    vi.mocked(waitForBridge).mockResolvedValue(null);
    expect(await state.actions.saveEntry()).toBe(false);
    expect(state.setError).toHaveBeenLastCalledWith('Tätigkeitsjournal-Dienst ist nicht erreichbar.');
    expect(state.setBusy).toHaveBeenLastCalledWith(false);
  });
});
