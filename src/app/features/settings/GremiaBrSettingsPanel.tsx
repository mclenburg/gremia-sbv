import { useEffect, useState } from 'react';
import type {
  GremiaBrCachedOverview,
  GremiaBrConnectionTestResult,
  GremiaBrPublicSettings,
  GremiaBrRelevanceKeywordGroup,
  GremiaBrSettingsInput,
} from '../../core/models/gremia-br.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

const EMPTY_SETTINGS: GremiaBrPublicSettings = {
  enabled: false,
  serverUrl: '',
  username: '',
  hasStoredCredentials: false,
  relevanceSettings: { groups: [] },
};

const EMPTY_CACHE: GremiaBrCachedOverview = {
  upcomingMeetings: [],
  decisions: [],
  dueDecisions: [],
  meetingAgendas: {},
  overdueDecisions: [],
};

function maskStoredPassword(hasStoredCredentials: boolean): string {
  return hasStoredCredentials ? '••••••••••••' : '';
}

function statusText(result?: GremiaBrConnectionTestResult): string {
  if (!result) return '';
  return result.message;
}

export function GremiaBrSettingsPanel() {
  const announce = useAnnouncer();
  const [settings, setSettings] = useState<GremiaBrPublicSettings>(EMPTY_SETTINGS);
  const [cache, setCache] = useState<GremiaBrCachedOverview>(EMPTY_CACHE);
  const [enabled, setEnabled] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [relevanceGroups, setRelevanceGroups] = useState<GremiaBrRelevanceKeywordGroup[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadSettings() {
    const bridge = await waitForBridge();
    if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Einstellungsdienst ist nicht erreichbar.');
    const next = await bridge.gremiaBr.getSettings();
    const cached = await bridge.gremiaBr.getCachedOverview();
    setSettings(next);
    setCache(cached);
    setEnabled(next.enabled);
    setServerUrl(next.serverUrl);
    setUsername(next.username);
    setPassword('');
    setRelevanceGroups(next.relevanceSettings.groups);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const bridge = await waitForBridge();
        if (!active) return;
        if (!bridge?.gremiaBr) return;
        const next = await bridge.gremiaBr.getSettings();
        const cached = await bridge.gremiaBr.getCachedOverview();
        if (!active) return;
        setSettings(next);
        setCache(cached);
        setEnabled(next.enabled);
        setServerUrl(next.serverUrl);
        setUsername(next.username);
        setRelevanceGroups(next.relevanceSettings.groups);
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Gremia.BR-Einstellungen konnten nicht geladen werden.';
          setError(message);
          announce(message, 'assertive');
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [announce]);

  async function save() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Einstellungsdienst ist nicht erreichbar.');
      const input: GremiaBrSettingsInput = { enabled, serverUrl, username, relevanceSettings: { groups: relevanceGroups } };
      if (password.trim()) input.password = password;
      const next = await bridge.gremiaBr.saveSettings(input);
      setSettings(next);
      setPassword('');
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
      setPassword('');
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
      await save();
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Einstellungsdienst ist nicht erreichbar.');
      const result = await bridge.gremiaBr.testConnection();
      const message = statusText(result);
      setStatus(message);
      announce(message, result.status === 'ok' ? 'polite' : 'assertive');
      await loadSettings();
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
      await loadSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gremia.BR-Lesecache konnte nicht aktualisiert werden.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  function updateRelevanceGroupKeywords(groupId: string, value: string) {
    const keywords = value.split(',').map((item) => item.trim()).filter(Boolean);
    setRelevanceGroups((groups) => groups.map((group) => group.id === groupId ? { ...group, keywords } : group));
  }

  function toggleRelevanceGroup(groupId: string, checked: boolean) {
    setRelevanceGroups((groups) => groups.map((group) => group.id === groupId ? { ...group, enabled: checked } : group));
  }

  return (
    <section className="gremia-br-settings-layout" aria-labelledby="gremia-br-settings-title">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">Optionale Lesebrücke</p>
        <h3 id="gremia-br-settings-title">Gremia.BR</h3>
        <p className="text-sm text-zinc-400 mt-2">
          Gremia.SBV ruft Gremia.BR-Daten nur auf ausdrückliche Nutzeraktion ab. Es gibt keine Hintergrundsynchronisation,
          kein Rückschreiben und keine Übertragung von SBV-Falldaten an Gremia.BR.
        </p>
      </div>

      {error && <div className="industrial-message industrial-message-warning" role="alert">{error}</div>}
      {status && <div className="industrial-message industrial-message-success" role="status">{status}</div>}

      <div className="industrial-subsection compact">
        <label className="gremia-br-toggle-row">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          <span>Gremia.BR-Anbindung aktivieren</span>
        </label>
      </div>

      <div className="gremia-br-settings-credentials">
        <label className="industrial-field">
          <span>Serveradresse / URL</span>
          <input
            type="url"
            placeholder="https://br-server.example.local"
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="industrial-field">
          <span>Benutzerkonto / E-Mail</span>
          <input
            type="email"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="industrial-field">
          <span>Passwort</span>
          <input
            type="password"
            placeholder={maskStoredPassword(settings.hasStoredCredentials)}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          {settings.hasStoredCredentials && <small>Ein Passwort ist im verschlüsselten Vault hinterlegt. Leer lassen, um es beizubehalten.</small>}
        </label>
      </div>

      <details className="industrial-subsection compact" open>
        <summary>Lokaler Relevanzfilter für Dashboard-Sitzungen</summary>
        <p className="text-sm text-zinc-500 mt-2">
          Diese Stichwörter werden nur lokal in Gremia.SBV gegen gecachte Tagesordnungen geprüft und nicht an Gremia.BR gesendet.
        </p>
        <div className="gremia-br-relevance-grid mt-3">
          {relevanceGroups.map((group) => (
            <div key={group.id} className="gremia-br-relevance-group">
              <label className="gremia-br-relevance-group-header">
                <input
                  type="checkbox"
                  checked={group.enabled}
                  onChange={(event) => toggleRelevanceGroup(group.id, event.target.checked)}
                />
                <strong>{group.label}</strong>
              </label>
              <label className="industrial-field">
                <span>Stichwörter</span>
                <textarea
                  rows={2}
                  value={group.keywords.join(', ')}
                  onChange={(event) => updateRelevanceGroupKeywords(group.id, event.target.value)}
                />
              </label>
            </div>
          ))}
        </div>
      </details>

      <div className="industrial-action-row">
        <button type="button" className="industrial-button" disabled={busy} onClick={() => void save()}>
          Einstellungen speichern
        </button>
        <button type="button" className="industrial-button industrial-button-secondary" disabled={busy} onClick={() => void testConnection()}>
          Verbindung prüfen
        </button>
        <button type="button" className="industrial-button industrial-button-secondary" disabled={busy || !enabled} onClick={() => void refreshCache()}>
          Lesecache aktualisieren
        </button>
        <button type="button" className="industrial-button industrial-button-danger" disabled={busy || !settings.hasStoredCredentials} onClick={() => void clearCredentials()}>
          Zugangsdaten löschen
        </button>
      </div>

      <dl className="industrial-meta-grid">
        <div><dt>Letzter Verbindungstest</dt><dd>{settings.lastConnectionTestAt ?? 'noch nicht geprüft'}</dd></div>
        <div><dt>Letzte erfolgreiche Anmeldung</dt><dd>{settings.lastSuccessfulLoginAt ?? 'noch nicht durchgeführt'}</dd></div>
        <div><dt>Lesecache</dt><dd>{cache.lastFetchedAt ? `${cache.cacheAgeLabel ?? 'aktualisiert'} · ${cache.upcomingMeetings.length} Sitzungen · ${cache.decisions.length} Beschlüsse` : 'noch nicht aktualisiert'}</dd></div>
      </dl>
    </section>
  );
}
