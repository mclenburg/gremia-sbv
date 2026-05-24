import { useEffect, useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { ModuleFeedback } from "../../shared/components/ModuleFeedback";
import {
  CheckboxField,
  DateInput,
  DateTimeInput,
  FormActions,
  FormSection,
  SelectInput,
  TextareaInput,
  TextInput,
} from "../../shared/components/IndustrialForm";
import {
  ButtonGroup,
  IndustrialButton,
  ToolbarButton,
} from "../../shared/components/IndustrialButton";
import {
  ComplianceBadge,
  ProcessStatusBadge,
  RiskBadge,
} from "../../shared/components/StatusBadges";
import {
  complianceFindingToTone,
  riskLevelToTone,
} from "../../shared/status/statusTone";
import {
  EmptyState,
  IndustrialPanelHeader,
  IndustrialSelectionCard,
  IndustrialStatusCard,
  RecordList,
  SearchToolbar,
  recordMatchesQuery,
  WorkbenchNavigation,
  WorkbenchPage,
  WorkbenchToolbar,
  WorkbenchWorkspace,
} from "../../shared/components/WorkbenchLayout";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import type {
  ComplianceAuditChainStatus,
  ComplianceDatabaseIntegrityStatus,
  ComplianceDocument,
  ComplianceDocumentType,
  ComplianceIncidentCategory,
  ComplianceIncidentRecord,
  ComplianceIncidentRiskLevel,
  ComplianceIncidentStatus,
  ComplianceSelfCheckResult,
  ComplianceTechnicalStatusItem,
  ComplianceTechnicalStatusLevel,
  ComplianceStatusOverview,
  CreateComplianceIncidentInput,
  DataSubjectAccessRequestInput,
  UpdateComplianceIncidentInput,
} from "../../core/models/compliance.model";
import {
  buildComplianceReportInput,
  defaultDsarInput,
  listComplianceDocuments,
  renderComplianceDocument,
  renderDsarResponseDocument,
} from "@services/complianceCenterService";

type ComplianceWorkspace =
  | "system"
  | "self_check"
  | "incidents"
  | "documents"
  | "dsar";

const WORKSPACES: Array<{
  id: ComplianceWorkspace;
  title: string;
  description: string;
}> = [
  {
    id: "system",
    title: "Systemzustand",
    description: "Tresor, temporäre Dateien, Schema und Audit-Hash-Chain.",
  },
  {
    id: "self_check",
    title: "Selbstcheck",
    description:
      "Prüfbarer Sicherheits- und Datenschutzstatus mit Handlungsliste.",
  },
  {
    id: "incidents",
    title: "Datenschutzvorfälle",
    description: "Sicherheitsereignisse dokumentieren und abschließen.",
  },
  {
    id: "documents",
    title: "Unterlagen",
    description: "TOMs, VVT, DSFA, Löschkonzept und Freigaben.",
  },
  {
    id: "dsar",
    title: "Art. 15",
    description: "Auskunftsersuchen vorbereiten und vorbefüllen.",
  },
];

const INCIDENT_CATEGORIES: Array<{
  value: ComplianceIncidentCategory;
  label: string;
}> = [
  { value: "wrong_export", label: "Falscher Export" },
  { value: "lost_backup", label: "Backup/Datenträger verloren" },
  {
    value: "unauthorized_access_suspected",
    label: "Unberechtigter Zugriff vermutet",
  },
  { value: "wrong_recipient", label: "Falscher Empfänger" },
  { value: "vault_integrity", label: "Tresor-/Integritätsproblem" },
  { value: "temporary_file", label: "Temporäre Klartextdatei" },
  { value: "other", label: "Sonstiges Ereignis" },
];

const RISK_LEVELS: Array<{
  value: ComplianceIncidentRiskLevel;
  label: string;
}> = [
  { value: "low", label: "niedrig" },
  { value: "medium", label: "mittel" },
  { value: "high", label: "hoch" },
];

const INCIDENT_STATUSES: Array<{
  value: ComplianceIncidentStatus;
  label: string;
}> = [
  { value: "open", label: "offen" },
  { value: "in_review", label: "in Prüfung" },
  { value: "reported", label: "gemeldet" },
  { value: "closed", label: "abgeschlossen" },
];

function downloadTextFile(document: ComplianceDocument) {
  const blob = new Blob([document.body], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function technicalLevelLabel(level: ComplianceTechnicalStatusLevel): string {
  switch (level) {
    case "ok":
      return "OK";
    case "warning":
      return "Prüfen";
    case "problem":
      return "Problem";
    case "info":
      return "Info";
  }
}

function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDateTimeLocalValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function buildFallbackStatus(): ComplianceStatusOverview {
  return {
    generatedAt: new Date().toISOString(),
    technicalItems: [
      {
        id: "runtime-status",
        label: "Laufzeitstatus",
        level: "warning",
        summary:
          "Technischer Status konnte noch nicht vollständig geladen werden.",
        detail:
          "Das Compliance Center lädt Sicherheits- und Temp-Dateistatus nach dem Öffnen nach.",
      },
    ],
    manualItems: [],
    nextTechnicalActions: ["Technischen Status aktualisieren"],
    manualCheckSummary: "",
  };
}

function buildFallbackSelfCheck(): ComplianceSelfCheckResult {
  return {
    generatedAt: new Date().toISOString(),
    score: 0,
    status: "warning",
    items: [
      {
        id: "self-check-loading",
        label: "Selbstcheck",
        status: "warning",
        summary: "Selbstcheck wurde noch nicht geladen.",
        action: "Selbstcheck aktualisieren.",
      },
    ],
    nextActions: ["Selbstcheck aktualisieren."],
  };
}

function auditChainStatusItem(
  status?: ComplianceAuditChainStatus,
): ComplianceTechnicalStatusItem {
  if (!status)
    return {
      id: "audit-chain",
      label: "Audit-Hash-Chain",
      level: "warning",
      summary: "Audit-Hash-Chain konnte nicht geprüft werden.",
      detail:
        "Bitte technischen Status erneut laden oder System-/Integritätsbericht prüfen.",
    };
  if (!status.checked)
    return {
      id: "audit-chain",
      label: "Audit-Hash-Chain",
      level: "ok",
      summary: "Keine Audit-Einträge vorhanden.",
    };
  return {
    id: "audit-chain",
    label: "Audit-Hash-Chain",
    level: status.ok ? "ok" : "problem",
    summary: status.ok
      ? `Hash-Kette intakt (${status.checked} Einträge geprüft).`
      : `Hash-Kette auffällig (${status.issues.length} Befund(e)).`,
    detail: status.ok
      ? `Sequenzen ${status.firstSequence ?? "—"} bis ${status.lastSequence ?? "—"}, letzter Hash ${status.latestHash.slice(0, 12)}…`
      : `Erste auffällige Sequenz: ${status.firstBrokenSequence ?? "unbekannt"}. ${status.issues[0]?.message ?? "Integritätsprüfung fehlgeschlagen."}`,
  };
}

function databaseIntegrityStatusItem(
  status?: ComplianceDatabaseIntegrityStatus,
): ComplianceTechnicalStatusItem {
  if (!status)
    return {
      id: "database-integrity",
      label: "Datenbankschema",
      level: "warning",
      summary: "Datenbankschema konnte nicht geprüft werden.",
      detail:
        "Bitte technischen Status erneut laden oder Migrationsstatus prüfen.",
    };

  if (status.ok)
    return {
      id: "database-integrity",
      label: "Datenbankschema",
      level: "ok",
      summary: `Schema ${status.appliedSchemaVersion ?? status.schemaVersion} vollständig.`,
      detail:
        "Kritische Tabellen und Spalten für Fallakten-, Personen-, Datenschutz-, Audit- und Vorfallfunktionen sind vorhanden.",
    };

  return {
    id: "database-integrity",
    label: "Datenbankschema",
    level: status.repairRequired ? "problem" : "warning",
    summary: `${status.issueCount} Schema-Befund(e).`,
    detail: status.issues.slice(0, 3).join(" · "),
  };
}

async function loadComplianceStatus(): Promise<ComplianceStatusOverview> {
  const bridge = await waitForBridge();
  if (!bridge?.security) return buildFallbackStatus();

  const security = bridge.security;
  const securityStatus = await security.status();
  const tempStatus = await security.temporaryFileStatus();
  const auditStatus = await bridge.compliance
    ?.auditChainStatus()
    .catch(() => undefined);
  const databaseIntegrityStatus = await bridge.compliance
    ?.databaseIntegrityStatus()
    .catch(() => undefined);

  const technicalItems: ComplianceTechnicalStatusItem[] = [
    {
      id: "vault",
      label: "Verschlüsselter Tresor",
      level:
        securityStatus.initialized && securityStatus.databaseProtected !== false
          ? "ok"
          : "problem",
      summary: securityStatus.initialized
        ? "Tresor ist eingerichtet."
        : "Tresor ist noch nicht eingerichtet.",
      detail:
        securityStatus.databaseProtected === false
          ? "Die Datenbank wird als nicht geschützt gemeldet."
          : undefined,
    },
    {
      id: "temp-files",
      label: "Temporäre Arbeitskopien",
      level: tempStatus.remaining > 0 ? "warning" : "ok",
      summary:
        tempStatus.remaining > 0
          ? `${tempStatus.remaining} temporäre Datei(en) im Arbeitsbereich.`
          : "Keine temporären Arbeitskopien gefunden.",
      detail:
        tempStatus.remaining > 0
          ? "Temporäre PDF-/Dokumentkopien sollten nach Nutzung bereinigt werden."
          : undefined,
    },
    databaseIntegrityStatusItem(databaseIntegrityStatus),
    auditChainStatusItem(auditStatus),
  ];

  return {
    generatedAt: new Date().toISOString(),
    technicalItems,
    manualItems: [],
    nextTechnicalActions: technicalItems
      .filter((item) => item.level === "warning" || item.level === "problem")
      .map((item) => item.label),
    manualCheckSummary: "",
  };
}

function ComplianceWorkspaceNav({
  active,
  onChange,
}: {
  active: ComplianceWorkspace;
  onChange: (id: ComplianceWorkspace) => void;
}) {
  return (
    <WorkbenchNavigation
      items={WORKSPACES}
      active={active}
      onChange={onChange}
      ariaLabel="Compliance-Arbeitsbereiche"
    />
  );
}

function ComplianceStatusPanel({
  overview,
  onRefresh,
}: {
  overview: ComplianceStatusOverview;
  onRefresh: () => void;
}) {
  return (
    <section
      className="industrial-panel"
      aria-label="Technischer Datenschutz- und Integritätsstatus"
    >
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Systemzustand</p>
          <h2>Datenschutz- und Integritätsstatus</h2>
          <p>
            Automatisch prüfbare Zustände: Tresor, temporäre Dateien,
            Datenbankschema und Audit-Hash-Chain.
          </p>
        </div>
        <ComplianceBadge
          finding="warning"
          label={
            <>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Technische Prüfung
            </>
          }
          ariaLabel="Keine Gesamtbewertung der Datenschutzkonformität"
        />
      </div>

      <div className="industrial-status-grid">
        {overview.technicalItems.map((item) => (
          <IndustrialStatusCard
            key={item.id}
            title={item.label}
            tone={complianceFindingToTone(item.level)}
            statusLabel={technicalLevelLabel(item.level)}
            detail={item.detail}
          >
            {item.summary}
          </IndustrialStatusCard>
        ))}
      </div>

      {overview.nextTechnicalActions.length > 0 && (
        <div className="industrial-action-note">
          <strong>Technische Hinweise:</strong>
          <span>{overview.nextTechnicalActions.join(" · ")}</span>
        </div>
      )}

      <ToolbarButton onClick={onRefresh}>Systemzustand aktualisieren</ToolbarButton>
    </section>
  );
}

function ComplianceSelfCheckPanel({
  result,
  onRefresh,
}: {
  result: ComplianceSelfCheckResult;
  onRefresh: () => void;
}) {
  return (
    <section
      className="industrial-panel"
      aria-label="SBV-Sicherheits- und Datenschutz-Selbstcheck"
    >
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Selbstcheck</p>
          <h2>Sicherheits- und Datenschutzprüfung</h2>
          <p>
            Der Selbstcheck bündelt technische Integrität, Datenschutzprüfungen,
            Übergabedaten, Vorfälle und Exportnachweise.
          </p>
        </div>
        <ComplianceBadge finding={result.status} label={`${result.score} %`} />
      </div>
      <div className="industrial-status-grid">
        {result.items.map((entry) => (
          <IndustrialStatusCard
            key={entry.id}
            title={entry.label}
            tone={complianceFindingToTone(entry.status)}
            statusLabel={
              entry.status === "ok"
                ? "OK"
                : entry.status === "problem"
                  ? "Problem"
                  : "Prüfen"
            }
            detail={entry.action}
          >
            {entry.summary}
          </IndustrialStatusCard>
        ))}
      </div>
      {result.nextActions.length > 0 && (
        <div className="industrial-action-note">
          <strong>Nächste Schritte:</strong>
          <span>{result.nextActions.join(" · ")}</span>
        </div>
      )}
      <ToolbarButton onClick={onRefresh}>Selbstcheck aktualisieren</ToolbarButton>
    </section>
  );
}

function ComplianceIncidentsPanel({
  incidents,
  onCreate,
  onUpdate,
}: {
  incidents: ComplianceIncidentRecord[];
  onCreate: (input: CreateComplianceIncidentInput) => void;
  onUpdate: (id: string, input: UpdateComplianceIncidentInput) => void;
}) {
  const [input, setInput] = useState<CreateComplianceIncidentInput>(() => ({
    occurredAt: new Date().toISOString(),
    discoveredAt: new Date().toISOString(),
    category: "wrong_export",
    riskLevel: "medium",
    summary: "",
    affectedDataCategories: "",
    immediateMeasures: "",
  }));

  const [incidentQuery, setIncidentQuery] = useState("");
  const visibleIncidents = incidents.filter((incident) =>
    recordMatchesQuery(
      [
        incident.summary,
        incident.category,
        incident.riskLevel,
        incident.status,
        incident.immediateMeasures ?? "",
      ],
      incidentQuery,
    ),
  );

  function update<K extends keyof CreateComplianceIncidentInput>(
    key: K,
    value: CreateComplianceIncidentInput[K],
  ) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    onCreate(input);
    setInput({
      occurredAt: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      category: "wrong_export",
      riskLevel: "medium",
      summary: "",
      affectedDataCategories: "",
      immediateMeasures: "",
    });
  }

  return (
    <section
      className="industrial-split-grid compliance-incident-workspace"
      aria-label="Datenschutzvorfälle und Sicherheitsereignisse"
    >
      <FormSection
        className="industrial-panel"
        kicker="Vorfall erfassen"
        title="Datenschutz- oder Sicherheitsereignis dokumentieren"
        description="Hier werden keine Falldaten ausgewertet. Die Auditierung speichert nur technische Vorgangsdaten."
      >
        <div className="industrial-form-grid">
          <DateTimeInput
            label="Vorfallzeitpunkt"
            value={toDateTimeLocalValue(input.occurredAt)}
            onValueChange={(value) =>
              update("occurredAt", fromDateTimeLocalValue(value))
            }
            required
          />
          <DateTimeInput
            label="Kenntnis der SBV"
            value={toDateTimeLocalValue(input.discoveredAt)}
            onValueChange={(value) =>
              update("discoveredAt", fromDateTimeLocalValue(value))
            }
            required
          />
          <SelectInput
            label="Art"
            value={input.category}
            options={INCIDENT_CATEGORIES}
            onValueChange={(value) =>
              update("category", value as ComplianceIncidentCategory)
            }
          />
          <SelectInput
            label="Risiko"
            value={input.riskLevel}
            options={RISK_LEVELS}
            onValueChange={(value) =>
              update("riskLevel", value as ComplianceIncidentRiskLevel)
            }
          />
          <TextInput
            label="Kurzbeschreibung"
            value={input.summary}
            onValueChange={(value) => update("summary", value)}
            wide
            required
            error={!input.summary.trim() ? "Kurzbeschreibung ist erforderlich." : undefined}
          />
          <TextareaInput
            label="Betroffene Datenkategorien"
            value={input.affectedDataCategories ?? ""}
            onValueChange={(value) => update("affectedDataCategories", value)}
            wide
          />
          <TextareaInput
            label="Sofortmaßnahmen"
            value={input.immediateMeasures ?? ""}
            onValueChange={(value) => update("immediateMeasures", value)}
            wide
          />
        </div>
        <FormActions align="start">
          <IndustrialButton onClick={submit} disabled={!input.summary.trim()}>
            Vorfall speichern
          </IndustrialButton>
        </FormActions>
      </FormSection>

      <div className="industrial-panel">
        <IndustrialPanelHeader
          kicker="Vorfallliste"
          title="Offene und abgeschlossene Ereignisse"
        />
        <SearchToolbar
          searchValue={incidentQuery}
          onSearchChange={setIncidentQuery}
          searchLabel="Vorfallliste durchsuchen"
          searchPlaceholder="Kurzbeschreibung, Status, Risiko …"
          resultCount={visibleIncidents.length}
        />
        <RecordList
          items={visibleIncidents}
          getKey={(incident) => incident.id}
          ariaLabel="Gefilterte Datenschutzvorfälle"
          empty={
            <EmptyState
              title={incidents.length === 0 ? "Keine Datenschutzvorfälle" : "Keine Treffer"}
              text={
                incidents.length === 0
                  ? "Keine Datenschutzvorfälle dokumentiert."
                  : "Zur Suche passen keine Datenschutzvorfälle. Suchbegriff anpassen oder Filter leeren."
              }
            />
          }
          renderItem={(incident) => (
            <IndustrialSelectionCard
              tone={riskLevelToTone(incident.riskLevel)}
              ariaLabel={`Datenschutzvorfall ${incident.summary}`}
            >
              <div className="industrial-record-card-header">
                <div>
                  <h3>{incident.summary}</h3>
                  <p>
                    {INCIDENT_CATEGORIES.find(
                      (entry) => entry.value === incident.category,
                    )?.label ?? incident.category}{" "}
                    · Kenntnis: {formatDateTime(incident.discoveredAt)}
                  </p>
                </div>
                <ButtonGroup ariaLabel="Vorfallstatus und Risiko">
                  <ProcessStatusBadge
                    status={incident.status}
                    label={
                      INCIDENT_STATUSES.find(
                        (entry) => entry.value === incident.status,
                      )?.label ?? incident.status
                    }
                  />
                  <RiskBadge
                    risk={incident.riskLevel}
                    label={
                      RISK_LEVELS.find(
                        (entry) => entry.value === incident.riskLevel,
                      )?.label ?? incident.riskLevel
                    }
                  />
                </ButtonGroup>
              </div>
              <div className="industrial-record-meta">
                <SelectInput
                  label="Status"
                  value={incident.status}
                  options={INCIDENT_STATUSES}
                  onValueChange={(value) =>
                    onUpdate(incident.id, {
                      status: value as ComplianceIncidentStatus,
                      closedAt:
                        value === "closed"
                          ? new Date().toISOString()
                          : incident.closedAt,
                    })
                  }
                />
                <CheckboxField
                  label="Meldung an Aufsicht geprüft"
                  checked={incident.authorityNotificationChecked}
                  onCheckedChange={(checked) =>
                    onUpdate(incident.id, {
                      authorityNotificationChecked: checked,
                    })
                  }
                />
              </div>
              {incident.immediateMeasures && (
                <small>Sofortmaßnahmen: {incident.immediateMeasures}</small>
              )}
            </IndustrialSelectionCard>
          )}
        />
      </div>
    </section>
  );
}

export function ComplianceView() {
  const descriptors = useMemo(() => listComplianceDocuments(), []);
  const [workspace, setWorkspace] = useState<ComplianceWorkspace>("system");
  const [selectedType, setSelectedType] =
    useState<ComplianceDocumentType>("toms");
  const [document, setDocument] = useState<ComplianceDocument>(() =>
    renderComplianceDocument("toms"),
  );
  const [message, setMessage] = useState("");
  const [dsarInput, setDsarInput] = useState<DataSubjectAccessRequestInput>(
    () => defaultDsarInput(),
  );
  const [statusOverview, setStatusOverview] =
    useState<ComplianceStatusOverview>(() => buildFallbackStatus());
  const [selfCheck, setSelfCheck] = useState<ComplianceSelfCheckResult>(() =>
    buildFallbackSelfCheck(),
  );
  const [incidents, setIncidents] = useState<ComplianceIncidentRecord[]>([]);
  const announce = useAnnouncer();

  async function refreshStatus() {
    try {
      const next = await loadComplianceStatus();
      setStatusOverview(next);
      announce("Systemzustand wurde aktualisiert.", "polite");
    } catch (error) {
      const info =
        error instanceof Error
          ? error.message
          : "Systemzustand konnte nicht geladen werden.";
      setStatusOverview(buildFallbackStatus());
      setMessage(info);
      announce(info, "assertive");
    }
  }

  async function refreshSelfCheck() {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.selfCheck)
        throw new Error("Compliance-Selbstcheck ist nicht erreichbar.");
      const next = await bridge.compliance.selfCheck();
      setSelfCheck(next);
      announce("Compliance-Selbstcheck wurde aktualisiert.", "polite");
    } catch (error) {
      const info =
        error instanceof Error
          ? error.message
          : "Compliance-Selbstcheck konnte nicht geladen werden.";
      setSelfCheck(buildFallbackSelfCheck());
      setMessage(info);
      announce(info, "assertive");
    }
  }

  async function refreshIncidents() {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.listIncidents)
        throw new Error("Vorfallliste ist nicht erreichbar.");
      setIncidents(await bridge.compliance.listIncidents());
    } catch (error) {
      const info =
        error instanceof Error
          ? error.message
          : "Vorfallliste konnte nicht geladen werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }

  useEffect(() => {
    void refreshStatus();
    void refreshSelfCheck();
    void refreshIncidents();
  }, []);

  function render(type: ComplianceDocumentType) {
    const next = renderComplianceDocument(type);
    setSelectedType(type);
    setDocument(next);
    const info = `${next.title} wurde erzeugt.`;
    setMessage(info);
    announce(info, "polite");
  }

  function updateDsarInput<K extends keyof DataSubjectAccessRequestInput>(
    key: K,
    value: DataSubjectAccessRequestInput[K],
  ) {
    const clearsPrefill = key === "requesterName" || key === "caseReference";
    setDsarInput((current) => ({
      ...current,
      [key]: value,
      ...(clearsPrefill ? { prefill: undefined } : {}),
    }));
  }

  function renderDsar() {
    const next = renderDsarResponseDocument(dsarInput);
    setSelectedType("dsar_response");
    setDocument(next);
    setWorkspace("documents");
    const info = "Antwort auf DSGVO-Auskunftsersuchen wurde erzeugt.";
    setMessage(info);
    announce(info, "polite");
  }

  async function prefillDsar() {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.prefillDsar)
        throw new Error("DSGVO-Vorbefüllung ist nicht erreichbar.");
      const prefill = await bridge.compliance.prefillDsar(dsarInput);
      const nextInput = { ...dsarInput, prefill };
      setDsarInput(nextInput);
      const next = renderDsarResponseDocument(nextInput);
      setSelectedType("dsar_response");
      setDocument(next);
      const count =
        prefill.persons.length +
        prefill.cases.length +
        prefill.deadlines.length +
        prefill.measures.length +
        prefill.importRuns.length +
        prefill.lifecycleEvents.length +
        prefill.freeTextMatches.length;
      const info =
        count > 0
          ? `Art.-15-Auskunft wurde mit ${count} strukturierten Datensatzbezug/Datensatzbezügen aus Gremia.SBV vorbefüllt.`
          : "Art.-15-Vorbefüllung ausgeführt; es wurden keine passenden Datensatzbezüge gefunden.";
      setMessage(info);
      announce(info, "polite");
    } catch (error) {
      const info =
        error instanceof Error
          ? error.message
          : "DSGVO-Vorbefüllung konnte nicht ausgeführt werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }

  function downloadCurrent() {
    downloadTextFile(document);
    const info = `${document.title} wurde als Markdown exportiert.`;
    setMessage(info);
    announce(info, "polite");
  }

  async function exportPdfCurrent(openAfterExport = false) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports)
        throw new Error("Berichtsdienst ist nicht erreichbar.");
      const result = await bridge.reports.generate(
        buildComplianceReportInput(document),
      );
      if (!result.ok)
        throw new Error(
          result.error ?? "PDF-Dokument konnte nicht erzeugt werden.",
        );
      if (openAfterExport)
        await bridge.reports.openExportFolder(result.filePath);
      const info = openAfterExport
        ? `${document.title} wurde als PDF erzeugt und geöffnet: ${result.fileName}`
        : `${document.title} wurde als verschlüsselter PDF-Report erzeugt: ${result.fileName}`;
      setMessage(info);
      announce(info, "polite");
    } catch (error) {
      const info =
        error instanceof Error
          ? error.message
          : "PDF-Dokument konnte nicht erzeugt werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }

  async function createIncident(input: CreateComplianceIncidentInput) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.createIncident)
        throw new Error("Vorfallservice ist nicht erreichbar.");
      await bridge.compliance.createIncident(input);
      await refreshIncidents();
      await refreshSelfCheck();
      const info = "Datenschutzvorfall wurde gespeichert.";
      setMessage(info);
      announce(info, "polite");
    } catch (error) {
      const info =
        error instanceof Error
          ? error.message
          : "Datenschutzvorfall konnte nicht gespeichert werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }

  async function updateIncident(
    id: string,
    input: UpdateComplianceIncidentInput,
  ) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.updateIncident)
        throw new Error("Vorfallservice ist nicht erreichbar.");
      await bridge.compliance.updateIncident(id, input);
      await refreshIncidents();
      await refreshSelfCheck();
      announce("Datenschutzvorfall wurde aktualisiert.", "polite");
    } catch (error) {
      const info =
        error instanceof Error
          ? error.message
          : "Datenschutzvorfall konnte nicht aktualisiert werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }

  return (
    <WorkbenchPage
      title="Compliance Center"
      description="Datenschutz, Sicherheit, Integrität, Audit, Systemzustand, Vorfälle, Betroffenenrechte und Freigabeunterlagen."
    >
      <ModuleFeedback
        items={[message ? { id: "compliance-message", message } : null]}
      />
      <WorkbenchWorkspace
        ariaLabel="Compliance-Arbeitsbereiche"
        navigation={
          <ComplianceWorkspaceNav active={workspace} onChange={setWorkspace} />
        }
      >
        <>
          {workspace === "system" && (
            <ComplianceStatusPanel
              overview={statusOverview}
              onRefresh={() => void refreshStatus()}
            />
          )}
          {workspace === "self_check" && (
            <ComplianceSelfCheckPanel
              result={selfCheck}
              onRefresh={() => void refreshSelfCheck()}
            />
          )}
          {workspace === "incidents" && (
            <ComplianceIncidentsPanel
              incidents={incidents}
              onCreate={(input) => void createIncident(input)}
              onUpdate={(id, input) => void updateIncident(id, input)}
            />
          )}
          {workspace === "documents" && (
            <div className="compliance-layout">
              <section
                className="compliance-actions"
                aria-label="Compliance-Dokumente"
              >
                <RecordList
                  items={descriptors.filter((item) => item.type !== "dsar_response")}
                  getKey={(item) => item.type}
                  ariaLabel="Compliance-Unterlagen"
                  empty={<EmptyState text="Keine Compliance-Unterlagen verfügbar." />}
                  renderItem={(item) => (
                    <IndustrialSelectionCard selected={selectedType === item.type}>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                      <IndustrialButton onClick={() => render(item.type)}>
                        {item.buttonLabel}
                      </IndustrialButton>
                    </IndustrialSelectionCard>
                  )}
                />
              </section>
              <ComplianceDocumentPreview
                document={document}
                onDownload={downloadCurrent}
                onExportPdf={(open) => void exportPdfCurrent(open)}
              />
            </div>
          )}
          {workspace === "dsar" && (
            <div className="compliance-layout">
              <FormSection
                className="industrial-panel compliance-dsar-form"
                kicker="Art. 15 DSGVO"
                title="Auskunftsersuchen beantworten"
                description="Die Vorbefüllung durchsucht strukturierte Daten und relevante Freitextbezüge; die Antwort bleibt vor Versand manuell zu prüfen."
                ariaLabel="DSGVO-Auskunftsersuchen"
              >
                <div className="industrial-form-grid">
                  <TextInput
                    label="Name der anfragenden Person"
                    value={dsarInput.requesterName}
                    onValueChange={(value) => updateDsarInput("requesterName", value)}
                    required
                    error={!dsarInput.requesterName.trim() ? "Name ist für die Auskunftsantwort erforderlich." : undefined}
                  />
                  <TextInput
                    label="Fall-/Aktenbezug"
                    value={dsarInput.caseReference}
                    onValueChange={(value) => updateDsarInput("caseReference", value)}
                  />
                  <DateInput
                    label="Eingang"
                    value={dsarInput.requestReceivedAt}
                    onValueChange={(value) => updateDsarInput("requestReceivedAt", value)}
                    required
                  />
                  <DateInput
                    label="Antwortfrist"
                    value={dsarInput.responseDueAt}
                    onValueChange={(value) => updateDsarInput("responseDueAt", value)}
                    required
                  />
                  <TextInput
                    label="Bearbeitet durch"
                    value={dsarInput.preparedBy}
                    onValueChange={(value) => updateDsarInput("preparedBy", value)}
                  />
                  <CheckboxField
                    label="Identität geprüft"
                    checked={dsarInput.identityVerified}
                    onCheckedChange={(checked) => updateDsarInput("identityVerified", checked)}
                    helpText="Die Antwort sollte erst nach Identitätsprüfung herausgegeben werden."
                  />
                  <TextareaInput
                    label="Umfang des Ersuchens"
                    value={dsarInput.requestScope}
                    onValueChange={(value) => updateDsarInput("requestScope", value)}
                    wide
                  />
                </div>
                <ButtonGroup className="industrial-action-row" ariaLabel="DSAR-Aktionen">
                  <ToolbarButton onClick={() => void prefillDsar()}>
                    Daten aus Gremia.SBV vorbefüllen
                  </ToolbarButton>
                  <IndustrialButton onClick={renderDsar}>
                    Auskunftsantwort erzeugen
                  </IndustrialButton>
                </ButtonGroup>
                {dsarInput.prefill && (
                  <p
                    className="compliance-dsar-prefill-summary"
                    aria-live="polite"
                  >
                    Vorbefüllt: {dsarInput.prefill.persons.length} Personen,{" "}
                    {dsarInput.prefill.cases.length} Fallakten,{" "}
                    {dsarInput.prefill.deadlines.length} Fristen,{" "}
                    {dsarInput.prefill.measures.length} Maßnahmen,{" "}
                    {dsarInput.prefill.importRuns.length} Importe,{" "}
                    {dsarInput.prefill.lifecycleEvents.length}{" "}
                    Lifecycle-Ereignisse,{" "}
                    {dsarInput.prefill.freeTextMatches.length} Freitexttreffer.
                  </p>
                )}
              </FormSection>
              <ComplianceDocumentPreview
                document={document}
                onDownload={downloadCurrent}
                onExportPdf={(open) => void exportPdfCurrent(open)}
              />
            </div>
          )}
        </>
      </WorkbenchWorkspace>
    </WorkbenchPage>
  );
}

function ComplianceDocumentPreview({
  document,
  onDownload,
  onExportPdf,
}: {
  document: ComplianceDocument;
  onDownload: () => void;
  onExportPdf: (open: boolean) => void;
}) {
  return (
    <section
      className="industrial-panel compliance-preview"
      aria-label="Dokumentvorschau"
    >
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Vorschau</p>
          <h2>{document.title}</h2>
          <p>{document.description}</p>
        </div>
        <WorkbenchToolbar ariaLabel="Exportaktionen">
          <ToolbarButton onClick={onDownload}>
            <Download className="h-4 w-4" />
            Markdown exportieren
          </ToolbarButton>
          <ToolbarButton onClick={() => onExportPdf(false)}>
            PDF erzeugen
          </ToolbarButton>
          <IndustrialButton onClick={() => onExportPdf(true)}>
            PDF abrufen
          </IndustrialButton>
        </WorkbenchToolbar>
      </div>
      <textarea
        className="industrial-output-area compliance-output"
        value={document.body}
        readOnly
        aria-label={`${document.title} Vorschau`}
      />
    </section>
  );
}
