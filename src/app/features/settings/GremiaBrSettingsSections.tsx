import type {
  GremiaBrApiMode,
  GremiaBrCachedOverview,
  GremiaBrPublicSettings,
  GremiaBrRelevanceKeywordGroup,
  GremiaBrWorkspaceBody,
} from "../../../domain/models/gremia-br.model";
import { DangerButton, IndustrialButton, ToolbarButton } from "../../shared/components/IndustrialButton";

function maskStoredPassword(hasStoredCredentials: boolean): string {
  return hasStoredCredentials ? "••••••••••••" : "";
}

export function GremiaBrSettingsIntro() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">Optionale Gremiumsanbindung</p>
      <h3 id="gremia-br-settings-title">Gremia.BR</h3>
      <p className="text-sm text-zinc-400 mt-2">
        Gremia.SBV ruft Gremia.BR-Daten nur auf ausdrückliche Nutzeraktion ab. Schreibende Aktionen erfolgen ausschließlich im eigenen Gremia.BR-Bereich
        und nur für von Gremia.SBV erzeugte PDF-Dokumente.
      </p>
    </div>
  );
}

export function GremiaBrFeedback({ error, status }: { error: string; status: string }) {
  return (
    <>
      {error && <div className="industrial-message industrial-message-warning" role="alert">{error}</div>}
      {status && <div className="industrial-message industrial-message-success" role="status">{status}</div>}
    </>
  );
}

export function GremiaBrEnabledToggle({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
}) {
  return (
    <div className="industrial-subsection compact">
      <label className="gremia-br-toggle-row">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
        <span>Gremia.BR-Anbindung aktivieren</span>
      </label>
    </div>
  );
}

export function GremiaBrCredentialsSection({
  apiMode,
  onApiModeChange,
  serverUrl,
  onServerUrlChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  hasStoredCredentials,
}: {
  apiMode: GremiaBrApiMode;
  onApiModeChange: (value: GremiaBrApiMode) => void;
  serverUrl: string;
  onServerUrlChange: (value: string) => void;
  username: string;
  onUsernameChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  hasStoredCredentials: boolean;
}) {
  return (
    <div className="gremia-br-settings-credentials">
      <label className="industrial-field">
        <span>API-Modus</span>
        <select className="industrial-select" value={apiMode} onChange={(event) => onApiModeChange(event.target.value as GremiaBrApiMode)}>
          <option value="legacy_read_bridge">Legacy-Lesebrücke</option>
          <option value="gremia_br_v2">Gremia.BR 2.0</option>
        </select>
        <small>Gremia.BR 2.0 behandelt die SBV als eigenes berechtigtes Gremium mit eigenem Arbeitsbereich.</small>
      </label>
      <label className="industrial-field">
        <span>Serveradresse / URL</span>
        <input type="url" placeholder="https://br-server.example.local" value={serverUrl} onChange={(event) => onServerUrlChange(event.target.value)} autoComplete="off" />
      </label>
      <label className="industrial-field">
        <span>Benutzerkonto / E-Mail</span>
        <input type="email" value={username} onChange={(event) => onUsernameChange(event.target.value)} autoComplete="username" />
      </label>
      <label className="industrial-field">
        <span>Passwort</span>
        <input
          type="password"
          placeholder={maskStoredPassword(hasStoredCredentials)}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          autoComplete="current-password"
        />
        {hasStoredCredentials && <small>Ein Passwort ist im verschlüsselten Vault hinterlegt. Leer lassen, um es beizubehalten.</small>}
      </label>
    </div>
  );
}

export function GremiaBrWorkspaceBodySection({
  visible,
  busy,
  enabled,
  selectedBodyName,
  workspaceBodies,
  filteredWorkspaceBodies,
  bodySearch,
  onBodySearchChange,
  onLoadWorkspaceBodies,
  onSelectWorkspaceBody,
}: {
  visible: boolean;
  busy: boolean;
  enabled: boolean;
  selectedBodyName: string;
  workspaceBodies: GremiaBrWorkspaceBody[];
  filteredWorkspaceBodies: GremiaBrWorkspaceBody[];
  bodySearch: string;
  onBodySearchChange: (value: string) => void;
  onLoadWorkspaceBodies: () => void;
  onSelectWorkspaceBody: (body: GremiaBrWorkspaceBody) => void;
}) {
  if (!visible) return null;
  return (
    <div className="industrial-subsection compact">
      <p className="industrial-kicker">SBV-Gremium in Gremia.BR</p>
      <p className="text-sm text-zinc-400 mt-2">
        Wählen Sie den SBV-Arbeitsbereich aus den Gremien, für die Ihr Gremia.BR-Konto aktuell berechtigt ist.
        Technische IDs werden nicht als manuelle Eingabe verlangt.
      </p>
      {selectedBodyName && <div className="industrial-message mt-3" role="status">Ausgewählter Arbeitsbereich: {selectedBodyName}</div>}
      <div className="industrial-action-row mt-3">
        <ToolbarButton disabled={busy || !enabled} onClick={onLoadWorkspaceBodies}>SBV-Gremien aus Gremia.BR laden</ToolbarButton>
      </div>
      {workspaceBodies.length > 5 && (
        <label className="industrial-field mt-3">
          <span>Gremien filtern</span>
          <input type="search" value={bodySearch} onChange={(event) => onBodySearchChange(event.target.value)} placeholder="Name des SBV-Gremiums" />
        </label>
      )}
      {workspaceBodies.length > 0 && (
        <div className="industrial-list mt-3" role="list" aria-label="Berechtigte SBV-Gremien aus Gremia.BR">
          {filteredWorkspaceBodies.map((body) => (
            <div className="industrial-list-row" role="listitem" key={body.bodyId}>
              <div>
                <strong>{body.bodyName}</strong>
                <p className="text-sm text-zinc-500">
                  {body.contentProtectionClass ? `Schutzklasse ${body.contentProtectionClass}` : "Schutzklasse von Gremia.BR vorgegeben"}
                </p>
              </div>
              <ToolbarButton disabled={busy} onClick={() => onSelectWorkspaceBody(body)}>Auswählen</ToolbarButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GremiaBrRelevanceSection({
  relevanceGroups,
  onKeywordsChange,
  onGroupEnabledChange,
}: {
  relevanceGroups: GremiaBrRelevanceKeywordGroup[];
  onKeywordsChange: (groupId: string, value: string) => void;
  onGroupEnabledChange: (groupId: string, checked: boolean) => void;
}) {
  return (
    <details className="industrial-subsection compact" open>
      <summary>Lokaler Relevanzfilter für Dashboard-Sitzungen</summary>
      <p className="text-sm text-zinc-500 mt-2">
        Diese Stichwörter werden nur lokal in Gremia.SBV gegen gecachte Tagesordnungen geprüft und nicht an Gremia.BR gesendet.
      </p>
      <div className="gremia-br-relevance-grid mt-3">
        {relevanceGroups.map((group) => (
          <div key={group.id} className="gremia-br-relevance-group">
            <label className="gremia-br-relevance-group-header">
              <input type="checkbox" checked={group.enabled} onChange={(event) => onGroupEnabledChange(group.id, event.target.checked)} />
              <strong>{group.label}</strong>
            </label>
            <label className="industrial-field">
              <span>Stichwörter</span>
              <textarea rows={2} value={group.keywords.join(", ")} onChange={(event) => onKeywordsChange(group.id, event.target.value)} />
            </label>
          </div>
        ))}
      </div>
    </details>
  );
}

export function GremiaBrSettingsActions({
  busy,
  enabled,
  hasStoredCredentials,
  onSave,
  onTestConnection,
  onRefreshCache,
  onClearCredentials,
}: {
  busy: boolean;
  enabled: boolean;
  hasStoredCredentials: boolean;
  onSave: () => void;
  onTestConnection: () => void;
  onRefreshCache: () => void;
  onClearCredentials: () => void;
}) {
  return (
    <div className="industrial-action-row">
      <IndustrialButton disabled={busy} onClick={onSave}>Einstellungen speichern</IndustrialButton>
      <ToolbarButton disabled={busy} onClick={onTestConnection}>Verbindung prüfen</ToolbarButton>
      <ToolbarButton disabled={busy || !enabled} onClick={onRefreshCache}>Lesecache aktualisieren</ToolbarButton>
      <DangerButton disabled={busy || !hasStoredCredentials} onClick={onClearCredentials}>Zugangsdaten löschen</DangerButton>
    </div>
  );
}

export function GremiaBrSettingsMeta({ settings, cache }: { settings: GremiaBrPublicSettings; cache: GremiaBrCachedOverview }) {
  const cacheText = cache.lastFetchedAt
    ? `${cache.cacheAgeLabel ?? "aktualisiert"} · ${cache.upcomingMeetings.length} Sitzungen · ${cache.decisions.length} Beschlüsse`
    : "noch nicht aktualisiert";
  return (
    <dl className="industrial-meta-grid">
      <div><dt>Letzter Verbindungstest</dt><dd>{settings.lastConnectionTestAt ?? "noch nicht geprüft"}</dd></div>
      <div><dt>Letzte erfolgreiche Anmeldung</dt><dd>{settings.lastSuccessfulLoginAt ?? "noch nicht durchgeführt"}</dd></div>
      <div><dt>Lesecache</dt><dd>{cacheText}</dd></div>
    </dl>
  );
}
