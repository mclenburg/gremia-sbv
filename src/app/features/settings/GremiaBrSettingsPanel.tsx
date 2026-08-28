import { useMemo, useState } from 'react';
import type {
  GremiaBrApiMode,
  GremiaBrPublicSettings,
  GremiaBrRelevanceKeywordGroup,
  GremiaBrSettingsInput,
  GremiaBrWorkspaceBody,
} from '../../../domain/models/gremia-br.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import {
  GremiaBrCredentialsSection,
  GremiaBrEnabledToggle,
  GremiaBrFeedback,
  GremiaBrRelevanceSection,
  GremiaBrSettingsActions,
  GremiaBrSettingsIntro,
  GremiaBrSettingsMeta,
  GremiaBrWorkspaceBodySection,
} from './GremiaBrSettingsSections';
import {
  EMPTY_GREMIA_BR_CACHE,
  EMPTY_GREMIA_BR_SETTINGS,
  gremiaBrStatusText,
  loadGremiaBrSettingsSnapshot,
  notifyGremiaBrSettingsChanged,
  useInitialGremiaBrSettingsLoad,
  waitForBridge,
  type GremiaBrSettingsSetters,
} from './gremiaBrSettingsState';

export function GremiaBrSettingsPanel() {
  const announce = useAnnouncer();
  const [settings, setSettings] = useState<GremiaBrPublicSettings>(EMPTY_GREMIA_BR_SETTINGS);
  const [cache, setCache] = useState(EMPTY_GREMIA_BR_CACHE);
  const [enabled, setEnabled] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiMode, setApiMode] = useState<GremiaBrApiMode>('legacy_read_bridge');
  const [selectedBodyId, setSelectedBodyId] = useState('');
  const [selectedBodyName, setSelectedBodyName] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedSecurityDomain, setSelectedSecurityDomain] = useState('');
  const [workspaceBodies, setWorkspaceBodies] = useState<GremiaBrWorkspaceBody[]>([]);
  const [bodySearch, setBodySearch] = useState('');
  const [relevanceGroups, setRelevanceGroups] = useState<GremiaBrRelevanceKeywordGroup[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setters = useMemo<GremiaBrSettingsSetters>(() => ({
    setSettings,
    setCache,
    setEnabled,
    setServerUrl,
    setUsername,
    setPassword,
    setApiMode,
    setSelectedBodyId,
    setSelectedBodyName,
    setSelectedOrganizationId,
    setSelectedSecurityDomain,
    setRelevanceGroups,
    setError,
  }), []);

  useInitialGremiaBrSettingsLoad(setters, announce);

  function currentSettingsInput(): GremiaBrSettingsInput {
    const input: GremiaBrSettingsInput = {
      enabled,
      serverUrl,
      username,
      apiMode,
      selectedBodyId,
      selectedBodyName,
      selectedOrganizationId,
      selectedSecurityDomain,
      relevanceSettings: { groups: relevanceGroups },
    };
    if (password.trim()) input.password = password;
    return input;
  }

  async function persistSettings(): Promise<GremiaBrPublicSettings> {
    const bridge = await waitForBridge();
    if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Einstellungsdienst ist nicht erreichbar.');
    const next = await bridge.gremiaBr.saveSettings(currentSettingsInput());
    setSettings(next);
    setPassword('');
    notifyGremiaBrSettingsChanged();
    return next;
  }

  async function save() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await persistSettings();
      setStatus('Gremia.BR-Einstellungen wurden im verschlüsselten Vault gespeichert.');
      announce('Gremia.BR-Einstellungen wurden gespeichert.', 'polite');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gremia.BR-Einstellungen konnten nicht gespeichert werden.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  async function clearCredentials() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Einstellungsdienst ist nicht erreichbar.');
      const next = await bridge.gremiaBr.clearCredentials();
      setSettings(next);
      setEnabled(next.enabled);
      setSelectedBodyId('');
      setSelectedBodyName('');
      setSelectedOrganizationId('');
      setSelectedSecurityDomain('');
      setWorkspaceBodies([]);
      setPassword('');
      notifyGremiaBrSettingsChanged();
      setStatus('Gremia.BR-Zugangsdaten wurden gelöscht.');
      announce('Gremia.BR-Zugangsdaten wurden gelöscht.', 'polite');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gremia.BR-Zugangsdaten konnten nicht gelöscht werden.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await persistSettings();
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Einstellungsdienst ist nicht erreichbar.');
      const result = await bridge.gremiaBr.testConnection();
      const message = gremiaBrStatusText(result);
      setStatus(message);
      announce(message, result.status === 'ok' ? 'polite' : 'assertive');
      await loadGremiaBrSettingsSnapshot(setters);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gremia.BR-Verbindung konnte nicht geprüft werden.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  async function refreshCache() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Einstellungsdienst ist nicht erreichbar.');
      const result = await bridge.gremiaBr.refreshCache();
      setCache(result.cached);
      setStatus(result.message);
      announce(result.message, 'polite');
      await loadGremiaBrSettingsSnapshot(setters);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gremia.BR-Lesecache konnte nicht aktualisiert werden.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  async function loadWorkspaceBodies() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await persistSettings();
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Einstellungsdienst ist nicht erreichbar.');
      const bodies = await bridge.gremiaBr.listWorkspaceBodies();
      setWorkspaceBodies(bodies);
      const message = bodies.length
        ? `${bodies.length} berechtigte SBV-Gremien aus Gremia.BR geladen.`
        : 'Gremia.BR meldet für dieses Konto kein aktuell berechtigtes SBV-Gremium.';
      setStatus(message);
      announce(message, bodies.length ? 'polite' : 'assertive');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gremia.BR-Gremien konnten nicht geladen werden.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
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

  function updateRelevanceGroupKeywords(groupId: string, value: string) {
    const keywords = value.split(',').map((item) => item.trim()).filter(Boolean);
    setRelevanceGroups((groups) => groups.map((group) => group.id === groupId ? { ...group, keywords } : group));
  }

  function toggleRelevanceGroup(groupId: string, checked: boolean) {
    setRelevanceGroups((groups) => groups.map((group) => group.id === groupId ? { ...group, enabled: checked } : group));
  }

  const normalizedBodySearch = bodySearch.trim().toLowerCase();
  const filteredWorkspaceBodies = normalizedBodySearch
    ? workspaceBodies.filter((body) => body.bodyName.toLowerCase().includes(normalizedBodySearch))
    : workspaceBodies;

  return (
    <section className="gremia-br-settings-layout" aria-labelledby="gremia-br-settings-title">
      <GremiaBrSettingsIntro />
      <GremiaBrFeedback error={error} status={status} />
      <GremiaBrEnabledToggle enabled={enabled} onEnabledChange={setEnabled} />
      <GremiaBrCredentialsSection
        apiMode={apiMode}
        onApiModeChange={setApiMode}
        serverUrl={serverUrl}
        onServerUrlChange={setServerUrl}
        username={username}
        onUsernameChange={setUsername}
        password={password}
        onPasswordChange={setPassword}
        hasStoredCredentials={settings.hasStoredCredentials}
      />
      <GremiaBrWorkspaceBodySection
        visible={enabled && apiMode === 'gremia_br_v2'}
        busy={busy}
        enabled={enabled}
        selectedBodyName={selectedBodyName}
        workspaceBodies={workspaceBodies}
        filteredWorkspaceBodies={filteredWorkspaceBodies}
        bodySearch={bodySearch}
        onBodySearchChange={setBodySearch}
        onLoadWorkspaceBodies={() => void loadWorkspaceBodies()}
        onSelectWorkspaceBody={selectWorkspaceBody}
      />
      <GremiaBrRelevanceSection
        relevanceGroups={relevanceGroups}
        onKeywordsChange={updateRelevanceGroupKeywords}
        onGroupEnabledChange={toggleRelevanceGroup}
      />
      <GremiaBrSettingsActions
        busy={busy}
        enabled={enabled}
        hasStoredCredentials={settings.hasStoredCredentials}
        onSave={() => void save()}
        onTestConnection={() => void testConnection()}
        onRefreshCache={() => void refreshCache()}
        onClearCredentials={() => void clearCredentials()}
      />
      <GremiaBrSettingsMeta settings={settings} cache={cache} />
    </section>
  );
}
