import type { GremiaBrSettingsInput, GremiaBrWorkspaceBody } from '../../../domain/models/gremia-br.model';
import { requireGremiaBrSettingsService, loadGremiaBrSettingsSnapshot, notifyGremiaBrSettingsChanged, type GremiaBrSettingsSetters } from './gremiaBrSettingsState';

type GremiaBrSettingsActionDeps = {
  input: Omit<GremiaBrSettingsInput, 'password'>;
  password: string;
  setters: GremiaBrSettingsSetters;
  setBusy: (busy: boolean) => void;
  setStatus: (status: string) => void;
  setWorkspaceBodies: (bodies: GremiaBrWorkspaceBody[]) => void;
  announce: (message: string, mode?: 'polite' | 'assertive') => void;
};

export function createGremiaBrSettingsActions({ input, password, setters, setBusy, setStatus, setWorkspaceBodies, announce }: GremiaBrSettingsActionDeps) {
  const { setSettings, setCache, setPassword, setEnabled, setAutoRefreshOnStartup, setSelectedBodyId, setSelectedBodyName, setSelectedOrganizationId, setSelectedSecurityDomain, setError } = setters;
  async function runOperation(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await action();
    } catch (err) {
      const message = err instanceof Error ? err.message : fallback;
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  async function persistSettings(): Promise<void> {
    const service = await requireGremiaBrSettingsService();
    const next = await service.saveSettings({ ...input, ...(password.trim() ? { password } : {}) });
    setSettings(next);
    setPassword('');
    notifyGremiaBrSettingsChanged();
  }

  async function save() {
    await runOperation(async () => {
      await persistSettings();
      setStatus('Gremia.BR-Einstellungen wurden im verschlüsselten Vault gespeichert.');
      announce('Gremia.BR-Einstellungen wurden gespeichert.', 'polite');
    }, 'Gremia.BR-Einstellungen konnten nicht gespeichert werden.');
  }

  async function clearCredentials() {
    await runOperation(async () => {
      const service = await requireGremiaBrSettingsService();
      const next = await service.clearCredentials();
      setSettings(next);
      setEnabled(next.enabled);
      setAutoRefreshOnStartup(next.autoRefreshOnStartup);
      setSelectedBodyId('');
      setSelectedBodyName('');
      setSelectedOrganizationId('');
      setSelectedSecurityDomain('');
      setWorkspaceBodies([]);
      setPassword('');
      notifyGremiaBrSettingsChanged();
      setStatus('Gremia.BR-Zugangsdaten wurden gelöscht.');
      announce('Gremia.BR-Zugangsdaten wurden gelöscht.', 'polite');
    }, 'Gremia.BR-Zugangsdaten konnten nicht gelöscht werden.');
  }

  async function testConnection() {
    await runOperation(async () => {
      await persistSettings();
      const service = await requireGremiaBrSettingsService();
      const result = await service.testConnection();
      const message = result.message;
      setStatus(message);
      announce(message, result.status === 'ok' ? 'polite' : 'assertive');
      await loadGremiaBrSettingsSnapshot(setters);
    }, 'Gremia.BR-Verbindung konnte nicht geprüft werden.');
  }

  async function refreshCache() {
    await runOperation(async () => {
      const service = await requireGremiaBrSettingsService();
      const result = await service.refreshCache();
      setCache(result.cached);
      setStatus(result.message);
      announce(result.message, 'polite');
      await loadGremiaBrSettingsSnapshot(setters);
    }, 'Gremia.BR-Lesecache konnte nicht aktualisiert werden.');
  }

  async function loadWorkspaceBodies() {
    await runOperation(async () => {
      await persistSettings();
      const service = await requireGremiaBrSettingsService();
      const bodies = await service.listWorkspaceBodies();
      setWorkspaceBodies(bodies);
      const message = bodies.length
        ? `${bodies.length} berechtigte SBV-Gremien aus Gremia.BR geladen.`
        : 'Gremia.BR meldet für dieses Konto kein aktuell berechtigtes SBV-Gremium.';
      setStatus(message);
      announce(message, bodies.length ? 'polite' : 'assertive');
    }, 'Gremia.BR-Gremien konnten nicht geladen werden.');
  }

  function selectWorkspaceBody(body: GremiaBrWorkspaceBody) {
    setSelectedBodyId(body.bodyId);
    setSelectedBodyName(body.bodyName);
    setSelectedOrganizationId(body.organizationId);
    setSelectedSecurityDomain(body.securityDomain ?? '');
    const message = `${body.bodyName} ist für den Gremia.BR-Arbeitsbereich vorgemerkt. Bitte Einstellungen speichern.`;
    setStatus(message);
    announce(message, 'polite');
  }

  return { save, clearCredentials, testConnection, refreshCache, loadWorkspaceBodies, selectWorkspaceBody };
}
