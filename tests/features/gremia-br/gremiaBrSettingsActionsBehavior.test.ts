import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGremiaBrSettingsActions } from '../../../src/app/features/settings/gremiaBrSettingsActions';
import { EMPTY_GREMIA_BR_CACHE, EMPTY_GREMIA_BR_SETTINGS, GREMIA_BR_SETTINGS_CHANGED_EVENT } from '../../../src/app/features/settings/gremiaBrSettingsState';
import type { GremiaBrWorkspaceBody } from '../../../src/domain/models/gremia-br.model';

const input = {
  enabled: true, autoRefreshOnStartup: false, serverUrl: 'https://br.example.test', username: 'synthetic-account',
  selectedBodyId: 'body-1', selectedBodyName: 'Test-SBV', selectedOrganizationId: 'org-1', selectedSecurityDomain: 'domain-1',
  relevanceSettings: { groups: [] },
};
const settings = { ...EMPTY_GREMIA_BR_SETTINGS, ...input, hasStoredCredentials: true };
const body: GremiaBrWorkspaceBody = { bodyId: 'body-2', bodyName: 'Ausgewählte SBV', bodyType: 'sbv', organizationId: 'org-2' };

function setup(password = ' synthetisches Passwort ') {
  const service = {
    saveSettings: vi.fn().mockResolvedValue(settings), clearCredentials: vi.fn().mockResolvedValue(EMPTY_GREMIA_BR_SETTINGS),
    testConnection: vi.fn().mockResolvedValue({ status: 'ok', message: 'Verbindung bestätigt', checkedAt: '2030-01-01' }),
    refreshCache: vi.fn().mockResolvedValue({ cached: EMPTY_GREMIA_BR_CACHE, message: 'Lesecache aktualisiert' }),
    listWorkspaceBodies: vi.fn().mockResolvedValue([body]),
    getSettings: vi.fn().mockResolvedValue(settings), getCachedOverview: vi.fn().mockResolvedValue(EMPTY_GREMIA_BR_CACHE),
  };
  const dispatchEvent = vi.fn();
  vi.stubGlobal('window', { gremiaSbv: { security: {}, gremiaBr: service }, dispatchEvent });
  const setters = {
    setSettings: vi.fn(), setCache: vi.fn(), setEnabled: vi.fn(), setAutoRefreshOnStartup: vi.fn(),
    setServerUrl: vi.fn(), setUsername: vi.fn(), setPassword: vi.fn(), setSelectedBodyId: vi.fn(), setSelectedBodyName: vi.fn(),
    setSelectedOrganizationId: vi.fn(), setSelectedSecurityDomain: vi.fn(), setRelevanceGroups: vi.fn(), setError: vi.fn(),
  };
  const setBusy = vi.fn();
  const setStatus = vi.fn();
  const setWorkspaceBodies = vi.fn();
  const announce = vi.fn();
  const actions = createGremiaBrSettingsActions({ input, password, setters, setBusy, setStatus, setWorkspaceBodies, announce });
  return { service, setters, setBusy, setStatus, setWorkspaceBodies, announce, dispatchEvent, actions };
}

describe('Gremia.BR settings workflows', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not save, connect or fetch data merely by constructing the actions', () => {
    const state = setup();
    expect(state.service.saveSettings).not.toHaveBeenCalled();
    expect(state.service.testConnection).not.toHaveBeenCalled();
    expect(state.service.refreshCache).not.toHaveBeenCalled();
    expect(state.service.listWorkspaceBodies).not.toHaveBeenCalled();
  });

  it('saves the entered password unchanged and clears it only after confirmation', async () => {
    const state = setup();
    let resolve!: (value: typeof settings) => void;
    state.service.saveSettings.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = state.actions.save();
    await vi.waitFor(() => expect(state.service.saveSettings).toHaveBeenCalledExactlyOnceWith({ ...input, password: ' synthetisches Passwort ' }));
    expect(state.setters.setPassword).not.toHaveBeenCalled();
    expect(state.dispatchEvent).not.toHaveBeenCalled();
    expect(state.announce).not.toHaveBeenCalled();
    resolve(settings);
    await pending;
    expect(state.setters.setPassword).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setSettings).toHaveBeenCalledExactlyOnceWith(settings);
    expect(state.dispatchEvent.mock.calls.map(([event]) => event.type)).toEqual([GREMIA_BR_SETTINGS_CHANGED_EVENT]);
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Gremia.BR-Einstellungen wurden gespeichert.', 'polite');
    expect(state.setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it('omits a blank password so the service can retain the stored credentials', async () => {
    const state = setup('   ');
    await state.actions.save();
    expect(state.service.saveSettings).toHaveBeenCalledExactlyOnceWith(input);
  });

  it('clears credentials and their selected workspace context after service confirmation', async () => {
    const state = setup();
    await state.actions.clearCredentials();
    expect(state.service.clearCredentials).toHaveBeenCalledOnce();
    expect(state.setters.setSettings).toHaveBeenCalledExactlyOnceWith(EMPTY_GREMIA_BR_SETTINGS);
    expect(state.setters.setEnabled).toHaveBeenCalledExactlyOnceWith(false);
    expect(state.setters.setAutoRefreshOnStartup).toHaveBeenCalledExactlyOnceWith(false);
    expect(state.setters.setPassword).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setSelectedBodyId).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setSelectedBodyName).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setSelectedOrganizationId).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setSelectedSecurityDomain).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setWorkspaceBodies).toHaveBeenCalledExactlyOnceWith([]);
    expect(state.setters.setCache).not.toHaveBeenCalled();
    expect(state.dispatchEvent).toHaveBeenCalledOnce();
  });

  it.each(['ok', 'failed'] as const)('saves before testing the connection and announces %s with appropriate urgency', async (status) => {
    const state = setup();
    state.service.testConnection.mockResolvedValue({ status, message: 'Bestätigtes Testergebnis', checkedAt: '2030-01-01' });
    await state.actions.testConnection();
    expect(state.service.saveSettings.mock.invocationCallOrder[0]).toBeLessThan(state.service.testConnection.mock.invocationCallOrder[0]);
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Bestätigtes Testergebnis', status === 'ok' ? 'polite' : 'assertive');
    expect(state.service.getSettings).toHaveBeenCalledOnce();
    expect(state.service.getCachedOverview).toHaveBeenCalledOnce();
  });

  it('refreshes the confirmed cache without saving credentials or testing the connection', async () => {
    const state = setup();
    await state.actions.refreshCache();
    expect(state.service.refreshCache).toHaveBeenCalledOnce();
    expect(state.service.saveSettings).not.toHaveBeenCalled();
    expect(state.service.testConnection).not.toHaveBeenCalled();
    expect(state.setters.setCache).toHaveBeenCalledWith(EMPTY_GREMIA_BR_CACHE);
    expect(state.setStatus).toHaveBeenLastCalledWith('Lesecache aktualisiert');
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Lesecache aktualisiert', 'polite');
  });

  it.each([true, false])('loads authorized bodies after persisting settings and reports whether any exist: %s', async (available) => {
    const state = setup();
    state.service.listWorkspaceBodies.mockResolvedValue(available ? [body] : []);
    await state.actions.loadWorkspaceBodies();
    expect(state.service.saveSettings.mock.invocationCallOrder[0]).toBeLessThan(state.service.listWorkspaceBodies.mock.invocationCallOrder[0]);
    expect(state.setWorkspaceBodies).toHaveBeenCalledExactlyOnceWith(available ? [body] : []);
    expect(state.announce).toHaveBeenCalledExactlyOnceWith(expect.any(String), available ? 'polite' : 'assertive');
  });

  it('stages the explicitly selected body locally without persisting or fetching data', () => {
    const state = setup();
    state.actions.selectWorkspaceBody(body);
    expect(state.setters.setSelectedBodyId).toHaveBeenCalledExactlyOnceWith('body-2');
    expect(state.setters.setSelectedBodyName).toHaveBeenCalledExactlyOnceWith('Ausgewählte SBV');
    expect(state.setters.setSelectedOrganizationId).toHaveBeenCalledExactlyOnceWith('org-2');
    expect(state.setters.setSelectedSecurityDomain).toHaveBeenCalledExactlyOnceWith('');
    expect(state.service.saveSettings).not.toHaveBeenCalled();
    expect(state.service.refreshCache).not.toHaveBeenCalled();
    expect(state.announce).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('Bitte Einstellungen speichern'), 'polite');
  });

  it.each(['testConnection', 'loadWorkspaceBodies'] as const)('does not proceed with %s when saving the settings fails', async (action) => {
    const state = setup();
    state.service.saveSettings.mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    await state.actions[action]();
    expect(state.service.testConnection).not.toHaveBeenCalled();
    expect(state.service.listWorkspaceBodies).not.toHaveBeenCalled();
    expect(state.setters.setPassword).not.toHaveBeenCalled();
    expect(state.dispatchEvent).not.toHaveBeenCalled();
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Speichern fehlgeschlagen', 'assertive');
    expect(state.setBusy).toHaveBeenLastCalledWith(false);
  });

  it.each([
    ['save', 'saveSettings'], ['clearCredentials', 'clearCredentials'], ['testConnection', 'testConnection'],
    ['refreshCache', 'refreshCache'], ['loadWorkspaceBodies', 'listWorkspaceBodies'],
  ] as const)('reports rejected %s and releases busy state', async (action, method) => {
    const state = setup();
    state.service[method].mockRejectedValue(new Error('Synthetischer Dienstfehler'));
    await state.actions[action]();
    expect(state.setters.setError).toHaveBeenLastCalledWith('Synthetischer Dienstfehler');
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Synthetischer Dienstfehler', 'assertive');
    expect(state.setBusy.mock.calls).toEqual([[true], [false]]);
    expect(state.setStatus.mock.calls).toEqual([['']]);
    if (action === 'save' || action === 'clearCredentials') expect(state.setters.setPassword).not.toHaveBeenCalled();
  });
});
