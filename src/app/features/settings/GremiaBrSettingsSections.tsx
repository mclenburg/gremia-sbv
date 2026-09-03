import type {
  GremiaBrApiMode,
  GremiaBrCachedOverview,
  GremiaBrPublicSettings,
  GremiaBrRelevanceKeywordGroup,
  GremiaBrWorkspaceBody,
} from "../../../domain/models/gremia-br.model";
import { CheckboxField, PasswordInput, SearchInput, SelectInput, TextareaInput, TextInput } from "../../shared/components/IndustrialForm";
import type { IndustrialFieldOption } from "../../shared/components/IndustrialFormCore";
import { DangerButton, IndustrialButton, ToolbarButton } from "../../shared/components/IndustrialButton";

function maskStoredPassword(hasStoredCredentials: boolean): string {
  return hasStoredCredentials ? "••••••••••••" : "";
}

const gremiaBrApiModeOptions: IndustrialFieldOption[] = [
  { value: "legacy_read_bridge", label: "Legacy-Lesebrücke" },
  { value: "gremia_br_v2", label: "Gremia.BR 2.0" },
];

export function GremiaBrSettingsIntro() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">Optionale Gremiumsanbindung</p>
      <h3 id="gremia-br-settings-title">Gremia.BR</h3>
      <p className="text-sm text-zinc-400 mt-2">
        Gremia.SBV arbeitet mit klarer Datensouveränität: keine Hintergrundsynchronisation, kein Rückschreiben nach Gremia.BR ohne ausdrückliche Aktion.
        Lesecache und schreibende Aktionen erfolgen nur auf ausdrückliche Nutzeraktion; PDF-Übergaben ausschließlich im eigenen Gremia.BR-Bereich
        und nur mit von Gremia.SBV erzeugten PDF-Dokumenten.
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
      <CheckboxField
        label="Gremia.BR-Anbindung aktivieren"
        checked={enabled}
        onCheckedChange={onEnabledChange}
        helpText="Aktiviert die optionale Brücke. Ohne gespeicherte Konfiguration bleibt der Gremia.BR-Arbeitsbereich ausgeblendet."
      />
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
      <SelectInput
        label="API-Modus"
        value={apiMode}
        onValueChange={(value) => onApiModeChange(value as GremiaBrApiMode)}
        options={gremiaBrApiModeOptions}
        helpText="Gremia.BR 2.0 behandelt die SBV als eigenes berechtigtes Gremium mit eigenem Arbeitsbereich."
      />
      <TextInput
        label="Serveradresse / URL"
        type="url"
        placeholder="https://br-server.example.local"
        value={serverUrl}
        onValueChange={onServerUrlChange}
        autoComplete="off"
      />
      <TextInput
        label="Benutzerkonto / E-Mail"
        type="email"
        value={username}
        onValueChange={onUsernameChange}
        autoComplete="username"
      />
      <PasswordInput
        label="Passwort"
        placeholder={maskStoredPassword(hasStoredCredentials)}
        value={password}
        onValueChange={onPasswordChange}
        helpText={hasStoredCredentials ? "Ein Passwort ist im verschlüsselten Vault hinterlegt. Leer lassen, um es beizubehalten." : undefined}
      />
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
        <SearchInput
          className="mt-3"
          label="Gremien filtern"
          value={bodySearch}
          onValueChange={onBodySearchChange}
          placeholder="Name des SBV-Gremiums"
        />
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
            <CheckboxField
              label={group.label}
              checked={group.enabled}
              onCheckedChange={(checked) => onGroupEnabledChange(group.id, checked)}
            />
            <TextareaInput
              label="Stichwörter"
              rows={2}
              value={group.keywords.join(", ")}
              onValueChange={(value) => onKeywordsChange(group.id, value)}
            />
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
