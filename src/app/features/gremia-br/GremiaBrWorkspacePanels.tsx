import type { CaseRecord } from "../../../domain/models/case.model";
import type {
  GremiaBrDashboardOverview,
  GremiaBrGeneratedPdfDocument,
  GremiaBrPublicSettings,
  GremiaBrProtectionClass,
  GremiaBrWorkspaceActionRecord,
} from "../../../domain/models/gremia-br.model";
import { IndustrialButton, ToolbarButton } from "../../shared/components/IndustrialButton";
import { SearchableSelectInput, SelectInput, TextareaInput, TextInput } from "../../shared/components/IndustrialForm";
import { DataTable, EmptyState, WorkbenchSummary } from "../../shared/components/WorkbenchLayout";
import { IndustrialPanel } from "../../shared/components/WorkbenchPanels";
import type { BrMeetingDraft } from "./gremiaBrWorkspaceModel";
import {
  caseOptions,
  documentOptions,
  meetingOptions,
  resolveGremiaBrDecisionRows,
  resolveGremiaBrMeetingRows,
  resolveGremiaBrWorkspaceActionRows,
  resolveGremiaBrWorkspaceSummary,
  workspaceLabel,
} from "./gremiaBrWorkspaceModel";

const PROTECTION_OPTIONS = [
  { value: "CONFIDENTIAL", label: "Vertraulich" },
  { value: "HIGH", label: "Hoch schutzbedürftig" },
  { value: "RESTRICTED", label: "Streng beschränkt" },
  { value: "INTERNAL", label: "Intern" },
];

function searchableOptions(options: Array<{ value: string; label: string }>) {
  return options.filter((option) => option.value);
}

type BusyAction = "read" | "summary" | "transfer" | "agenda" | "import" | null;

export type GremiaBrWorkspaceDraft = {
  selectedCaseId: string;
  summaryPurpose: string;
  recipientLabel: string;
  selectedDocumentId: string;
  targetSecurityDomain: string;
  transferPurpose: string;
  transferValidUntil: string;
  protectionClass: GremiaBrProtectionClass;
  selectedAgendaMeetingId: string;
  agendaTitle: string;
  agendaDescription: string;
  agendaMinutes: string;
  selectedImportMeetingId: string;
};

export type GremiaBrWorkspaceDraftChange = <K extends keyof GremiaBrWorkspaceDraft>(
  key: K,
  value: GremiaBrWorkspaceDraft[K],
) => void;

export function DisabledGremiaBrWorkspace() {
  return (
    <section className="industrial-card no-card-hover" aria-labelledby="gremia-br-workspace-title">
      <p className="industrial-kicker">Optionale Gremiumsanbindung</p>
      <h1 id="gremia-br-workspace-title">Gremia.BR</h1>
      <p className="text-sm text-zinc-400 mt-2">
        Die Gremia.BR-Anbindung ist nicht aktiviert. Gremia.SBV arbeitet vollständig lokal weiter.
      </p>
    </section>
  );
}

export function GremiaBrWorkspaceHeader() {
  return (
    <div className="industrial-card no-card-hover">
      <p className="industrial-kicker">Optionale Gremiumsanbindung</p>
      <h1 id="gremia-br-workspace-title">Gremia.BR</h1>
      <p className="text-sm text-zinc-400 mt-2">
        Arbeitsbereich für bewusste Gremienaktionen: Lesekontext abrufen, BR-Tagesordnungspunkte anfordern,
        SBV-Sitzungen übernehmen und zentral erzeugte PDF-Dokumente an Gremia.BR übertragen.
      </p>
    </div>
  );
}

export function GremiaBrWorkspaceFeedback({ error, status }: { error: string; status: string }) {
  return (
    <>
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {status ? <div className="industrial-message industrial-message-ok" role="status">{status}</div> : null}
    </>
  );
}

export function GremiaBrConfigurationCard({ settings }: { settings: GremiaBrPublicSettings }) {
  return (
    <IndustrialPanel kicker="Konfiguration" title="Verbundene Instanz">
      <dl className="industrial-meta-grid mt-3">
        <div><dt>Server</dt><dd>{settings.serverUrl}</dd></div>
        <div><dt>Benutzerkonto</dt><dd>{settings.username}</dd></div>
        <div><dt>API-Modus</dt><dd>{settings.apiMode === "gremia_br_v2" ? "Gremia.BR 2.0" : "Legacy-Lesebrücke"}</dd></div>
        <div><dt>SBV-Gremium</dt><dd>{workspaceLabel(settings)}</dd></div>
      </dl>
      {settings.apiMode === "gremia_br_v2" && !settings.selectedBodyId ? (
        <div className="industrial-message industrial-message-warning mt-4" role="status">
          Für Gremia.BR 2.0 muss in den Einstellungen ein berechtigtes SBV-Gremium ausgewählt sein.
        </div>
      ) : null}
    </IndustrialPanel>
  );
}

export function GremiaBrReadContextPanel({
  busy,
  onRefresh,
}: {
  busy: boolean;
  onRefresh: () => void;
}) {
  return (
    <IndustrialPanel
      kicker="Lesekontext"
      title="BR-/Gremienkontext abrufen"
      description="Sitzungen, Tagesordnungen und Beschlüsse werden nur auf ausdrückliche Aktion geladen und lokal als Lesekontext genutzt."
      actions={<ToolbarButton loading={busy} onClick={onRefresh}>{busy ? "Abruf läuft …" : "Lesekontext abrufen"}</ToolbarButton>}
    >
      <p className="industrial-meta">Keine automatische Synchronisation, keine Fallübertragung.</p>
    </IndustrialPanel>
  );
}

export function GremiaBrCaseSummaryPanel({
  cases,
  draft,
  busy,
  disabled,
  onChange,
  onCreate,
}: {
  cases: CaseRecord[];
  draft: GremiaBrWorkspaceDraft;
  busy: boolean;
  disabled: boolean;
  onChange: GremiaBrWorkspaceDraftChange;
  onCreate: () => void;
}) {
  return (
    <IndustrialPanel
      kicker="Fallzusammenfassung"
      title="PDF für BR-Information erzeugen"
      description="Die Zusammenfassung enthält nur für die BR-Befassung erforderliche Falldaten und bleibt ein Gremia.SBV-generiertes PDF."
    >
      <div className="industrial-form-grid two-columns">
        <SearchableSelectInput label="Fallakte suchen und auswählen" value={draft.selectedCaseId} options={searchableOptions(caseOptions(cases))} onValueChange={(value) => onChange("selectedCaseId", value)} disabled={disabled || busy} placeholder="Fallnummer oder Name tippen …" required />
        <TextInput label="Empfängerhinweis" value={draft.recipientLabel} onValueChange={(value) => onChange("recipientLabel", value)} disabled={disabled || busy} />
        <TextareaInput label="Zweck der BR-Information" value={draft.summaryPurpose} onValueChange={(value) => onChange("summaryPurpose", value)} disabled={disabled || busy} wide required />
      </div>
      <div className="industrial-action-row mt-4">
        <IndustrialButton loading={busy} disabled={disabled || !draft.selectedCaseId || !draft.summaryPurpose.trim()} onClick={onCreate}>
          Fallzusammenfassung erzeugen
        </IndustrialButton>
      </div>
    </IndustrialPanel>
  );
}

export function GremiaBrDocumentTransferPanel({
  documents,
  draft,
  busy,
  disabled,
  onChange,
  onTransfer,
  onRefreshDocuments,
}: {
  documents: GremiaBrGeneratedPdfDocument[];
  draft: GremiaBrWorkspaceDraft;
  busy: boolean;
  disabled: boolean;
  onChange: GremiaBrWorkspaceDraftChange;
  onTransfer: () => void;
  onRefreshDocuments: () => void;
}) {
  return (
    <IndustrialPanel
      kicker="PDF-Übergabe"
      title="Dokument an Gremia.BR übertragen"
      description="Übertragbar sind ausschließlich von Gremia.SBV erzeugte PDF-Dokumente. Freigabezweck und Ziel-Sicherheitsbereich werden protokolliert."
      actions={<ToolbarButton disabled={disabled || busy} onClick={onRefreshDocuments}>PDF-Liste aktualisieren</ToolbarButton>}
    >
      <div className="industrial-form-grid two-columns">
        <SearchableSelectInput label="PDF-Dokument suchen und auswählen" value={draft.selectedDocumentId} options={searchableOptions(documentOptions(documents))} onValueChange={(value) => onChange("selectedDocumentId", value)} disabled={disabled || busy} placeholder="Titel, Fallnummer oder Datum tippen …" required />
        <TextInput label="Ziel-Sicherheitsbereich" value={draft.targetSecurityDomain} onValueChange={(value) => onChange("targetSecurityDomain", value)} disabled={disabled || busy} required />
        <SelectInput label="Schutzklasse" value={draft.protectionClass} options={PROTECTION_OPTIONS} onValueChange={(value) => onChange("protectionClass", value as GremiaBrProtectionClass)} disabled={disabled || busy} required />
        <TextInput label="Freigabe gültig bis" type="date" value={draft.transferValidUntil} onValueChange={(value) => onChange("transferValidUntil", value)} disabled={disabled || busy} />
        <TextareaInput label="Freigabezweck" value={draft.transferPurpose} onValueChange={(value) => onChange("transferPurpose", value)} disabled={disabled || busy} wide required />
      </div>
      <div className="industrial-action-row mt-4">
        <IndustrialButton loading={busy} disabled={disabled || !draft.selectedDocumentId || !draft.targetSecurityDomain.trim() || !draft.transferPurpose.trim()} onClick={onTransfer}>
          PDF übertragen und freigeben
        </IndustrialButton>
      </div>
    </IndustrialPanel>
  );
}

export function GremiaBrAgendaPanel({
  overview,
  draft,
  busy,
  disabled,
  onChange,
  onRequest,
}: {
  overview: GremiaBrDashboardOverview;
  draft: GremiaBrWorkspaceDraft;
  busy: boolean;
  disabled: boolean;
  onChange: GremiaBrWorkspaceDraftChange;
  onRequest: () => void;
}) {
  return (
    <IndustrialPanel
      kicker="Tagesordnung"
      title="SBV-Tagesordnungspunkt anfordern"
      description="Der Punkt wird an die bestehende Gremia.BR-Tagesordnung angehängt; vorhandene TOP-Schlüssel bleiben erhalten."
    >
      <div className="industrial-form-grid two-columns">
        <SearchableSelectInput label="Gremia.BR-Sitzung suchen und auswählen" value={draft.selectedAgendaMeetingId} options={searchableOptions(meetingOptions(overview))} onValueChange={(value) => onChange("selectedAgendaMeetingId", value)} disabled={disabled || busy} placeholder="Termin oder Sitzungstitel tippen …" required />
        <TextInput label="Zeitbedarf in Minuten" type="number" min={1} max={240} value={draft.agendaMinutes} onValueChange={(value) => onChange("agendaMinutes", value)} disabled={disabled || busy} />
        <TextInput label="Tagesordnungspunkt" value={draft.agendaTitle} onValueChange={(value) => onChange("agendaTitle", value)} disabled={disabled || busy} wide required />
        <TextareaInput label="Begründung / Kontext" value={draft.agendaDescription} onValueChange={(value) => onChange("agendaDescription", value)} disabled={disabled || busy} wide />
      </div>
      <div className="industrial-action-row mt-4">
        <IndustrialButton loading={busy} disabled={disabled || !draft.selectedAgendaMeetingId || !draft.agendaTitle.trim()} onClick={onRequest}>
          Tagesordnungspunkt anfordern
        </IndustrialButton>
      </div>
    </IndustrialPanel>
  );
}

export function GremiaBrMeetingImportPanel({
  meetings,
  draft,
  busy,
  disabled,
  onChange,
  onImport,
}: {
  meetings: BrMeetingDraft[];
  draft: GremiaBrWorkspaceDraft;
  busy: boolean;
  disabled: boolean;
  onChange: GremiaBrWorkspaceDraftChange;
  onImport: () => void;
}) {
  const options = meetings.map((meeting) => ({ value: meeting.sourceId, label: `${meeting.startsAt} · ${meeting.title}` }));
  return (
    <IndustrialPanel
      kicker="Import"
      title="Sitzung als SBV-Arbeitskopie übernehmen"
      description="Sitzung und Tagesordnung werden lokal angelegt. SBV-Relevanz und Bewertungen bleiben bewusst manuell."
    >
      <div className="industrial-form-grid two-columns">
        <SearchableSelectInput label="Gremia.BR-Sitzung suchen und auswählen" value={draft.selectedImportMeetingId} options={options} onValueChange={(value) => onChange("selectedImportMeetingId", value)} disabled={disabled || busy} placeholder="Termin oder Sitzungstitel tippen …" required />
      </div>
      <div className="industrial-action-row mt-4">
        <IndustrialButton loading={busy} disabled={disabled || !draft.selectedImportMeetingId} onClick={onImport}>
          In SBV-Sitzungen übernehmen
        </IndustrialButton>
      </div>
    </IndustrialPanel>
  );
}

export function GremiaBrCacheTables({ overview }: { overview: GremiaBrDashboardOverview }) {
  return (
    <div className="industrial-grid-two">
      <IndustrialPanel kicker="Gelesene Sitzungen" title="Sitzungen im lokalen Cache">
        <DataTable
          ariaLabel="Gremia.BR-Sitzungen im lokalen Cache"
          headers={["Sitzung", "Termin", "Einordnung"]}
          rows={resolveGremiaBrMeetingRows(overview)}
          empty={<EmptyState title="Kein Lesekontext" text="Noch keine Sitzungen aus Gremia.BR abgerufen." />}
        />
      </IndustrialPanel>
      <IndustrialPanel kicker="Gelesene Beschlüsse" title="Beschlüsse im lokalen Cache">
        <DataTable
          ariaLabel="Gremia.BR-Beschlüsse im lokalen Cache"
          headers={["Beschluss", "Datum", "Status"]}
          rows={resolveGremiaBrDecisionRows(overview)}
          empty={<EmptyState title="Keine Beschlüsse" text="Noch keine Beschlüsse aus Gremia.BR im lokalen Cache." />}
        />
      </IndustrialPanel>
    </div>
  );
}

export function GremiaBrWorkspaceActionHistory({ actions }: { actions: GremiaBrWorkspaceActionRecord[] }) {
  return (
    <IndustrialPanel
      kicker="Nachvollziehbarkeit"
      title="Gremia.BR-Aktionshistorie"
      description="Bewusst ausgelöste Übergaben und Anforderungen werden ohne Dokumentinhalt oder Suchbegriffe angezeigt."
    >
      <DataTable
        ariaLabel="Gremia.BR-Aktionshistorie"
        headers={["Zeitpunkt", "Aktion", "Bezug", "Ziel", "Status"]}
        rows={resolveGremiaBrWorkspaceActionRows(actions)}
        empty={<EmptyState title="Noch keine Aktionen" text="Hier erscheinen PDF-Übergaben, Freigaben und Tagesordnungspunkt-Anforderungen." />}
      />
    </IndustrialPanel>
  );
}

export function GremiaBrSummary({ settings, overview }: { settings: GremiaBrPublicSettings; overview: GremiaBrDashboardOverview }) {
  return (
    <WorkbenchSummary
      ariaLabel="Gremia.BR-Arbeitsbereich Zusammenfassung"
      items={resolveGremiaBrWorkspaceSummary(settings, overview)}
    />
  );
}

export function isGremiaBrActionDisabled(settings: GremiaBrPublicSettings): boolean {
  return settings.apiMode !== "gremia_br_v2" || !settings.selectedBodyId;
}

export function busyMatches(busyAction: BusyAction, action: Exclude<BusyAction, null>): boolean {
  return busyAction === action;
}
