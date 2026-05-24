import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import type { CaseRecord } from "../../core/models/case.model";
import type { DeadlineRecord } from "../../core/models/deadline.model";
import type { ParticipationRecord } from "../../core/models/participation.model";
import type {
  CreateSbvResourceRecordInput,
  SbvResourceRecord,
  SbvResourceRecordKind,
  SbvResourceRecordStatus,
} from "../../core/models/sbv-resource.model";
import type { ViewId } from "../../core/navigation/modules";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { ModuleFeedback } from "../../shared/components/ModuleFeedback";
import {
  DateInput,
  FormActions,
  SelectInput,
  TextareaInput,
  TextInput,
} from "../../shared/components/IndustrialForm";
import {
  DangerButton,
  GhostButton,
  IndustrialButton,
  ToolbarButton,
} from "../../shared/components/IndustrialButton";
import {
  DataTable,
  EmptyState,
  IndustrialPanel,
  IndustrialRecordCard,
  IndustrialSelectionCard,
  RecordList,
  SearchToolbar,
  recordMatchesQuery,
  WorkbenchNavigation,
  WorkbenchPage,
  WorkbenchSummary,
  WorkbenchWorkspace,
} from "../../shared/components/WorkbenchLayout";
import { ProcessStatusBadge, RiskBadge } from "../../shared/components/StatusBadges";
import { riskLevelToTone } from "../../shared/status/statusTone";
import { getParticipationEscalationAdvice } from "../participation/participationPolicy";

type ControlSectionId =
  | "resources"
  | "participation"
  | "obligations"
  | "inclusion"
  | "reports";

type ObligationItem = {
  id: string;
  title: string;
  legalBasis: string;
  cadence: string;
  evidence: string;
  sbvAction: string;
  risk: "normal" | "warning" | "critical";
};

type InclusionTopic = {
  id: string;
  title: string;
  legalBasis: string;
  sbvGoal: string;
  enforceableAnchor: string;
};

type SbvControlViewProps = {
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  onNavigate?: (viewId: ViewId) => void;
};

type ResourceFormState = CreateSbvResourceRecordInput;

const employerObligations: ObligationItem[] = [
  {
    id: "anzeige-163",
    title: "Anzeige / Verzeichnis",
    legalBasis: "§ 163 Abs. 2 SGB IX",
    cadence: "jährlich",
    evidence: "Anzeige, Verzeichnis, Kopie an BR/SBV",
    sbvAction:
      "Kopie freundlich mit Frist anfordern und Vorgang dokumentieren.",
    risk: "warning",
  },
  {
    id: "beschaeftigungsquote",
    title: "Beschäftigungspflicht",
    legalBasis: "§ 154 Abs. 1 SGB IX, § 160 SGB IX",
    cadence: "jährlich / Personalplanung",
    evidence: "Quote, Pflichtplätze, besondere Gruppen, Ausgleichsabgabe",
    sbvAction:
      "Quote nicht nur statistisch lesen, sondern als Argument für Besetzung, Qualifizierung und Arbeitsplatzgestaltung nutzen.",
    risk: "normal",
  },
  {
    id: "freie-arbeitsplaetze",
    title: "Freie Arbeitsplätze prüfen",
    legalBasis: "§ 164 Abs. 1 Satz 1 SGB IX",
    cadence: "jede Besetzung",
    evidence:
      "freie Stelle, Prüfvermerk, Agenturkontakt, Beteiligung der Interessenvertretungen",
    sbvAction:
      "Bei fehlender Prüfung Beteiligungsvorgang anlegen oder Unterlagen nachfordern.",
    risk: "critical",
  },
  {
    id: "bem-praevention",
    title: "BEM / Prävention",
    legalBasis: "§ 167 Abs. 1 und Abs. 2 SGB IX",
    cadence: "laufend",
    evidence: "BEM-Angebote, Präventionsfälle, Maßnahmenumsetzung",
    sbvAction:
      "Alibi-Verfahren als Strukturmangel dokumentieren und konkrete Nachsteuerung verlangen.",
    risk: "warning",
  },
  {
    id: "inklusionsvereinbarung",
    title: "Inklusionsvereinbarung",
    legalBasis: "§ 166 SGB IX",
    cadence: "jährlich / bei Änderungen",
    evidence: "Regelungsstand, Lücken, Arbeitgeberantworten",
    sbvAction:
      "Fortschreibung mit verbindlichen Mindestunterlagen, Fristen und Eskalationswegen führen.",
    risk: "warning",
  },
];

const inclusionTopics: InclusionTopic[] = [
  {
    id: "beteiligung",
    title: "SBV-Beteiligung verbindlich machen",
    legalBasis: "§ 178 Abs. 2 Satz 1 SGB IX",
    sbvGoal: "Keine Entscheidung ohne vorherige Unterrichtung und Anhörung.",
    enforceableAnchor:
      "Mindestunterlagen, Fristen, Eskalation, Dokumentationspflicht.",
  },
  {
    id: "arbeitsplatz",
    title: "Arbeitsplatzgestaltung operationalisieren",
    legalBasis: "§ 164 Abs. 4 Satz 1 SGB IX",
    sbvGoal:
      "Arbeitsplatz, Arbeitsorganisation, Arbeitszeit und Hilfen werden früh geprüft.",
    enforceableAnchor:
      "Prüfmatrix, Umsetzungsfristen, Verantwortliche, Nachkontrolle.",
  },
  {
    id: "praevention",
    title: "Prävention vor Eskalation",
    legalBasis: "§ 167 Abs. 1 SGB IX",
    sbvGoal: "Gefährdungen lösen sofort ein Präventionsverfahren aus.",
    enforceableAnchor:
      "Sofortmeldung, Maßnahmenplan, Einbindung Inklusionsamt.",
  },
  {
    id: "bem",
    title: "BEM als Prozess sichern",
    legalBasis: "§ 167 Abs. 2 SGB IX",
    sbvGoal: "Freiwillig, vertraulich, maßnahmenorientiert.",
    enforceableAnchor: "Einladung, Datenschutz, Beteiligungswahl, Evaluation.",
  },
];

const resourceKindLabels: Record<SbvResourceRecordKind, string> = {
  training: "Schulung",
  deputy_involvement: "Heranziehung Stellvertretung",
  equipment: "Sachmittel / sichere IT",
  other: "Sonstiger Nachweis",
};

const resourceStatusLabels: Record<SbvResourceRecordStatus, string> = {
  planned: "geplant",
  requested: "beantragt",
  approved: "genehmigt",
  completed: "durchgeführt",
  rejected: "abgelehnt",
  documented: "dokumentiert",
};

const initialResourceForm: ResourceFormState = {
  kind: "training",
  title: "",
  legalBasis: "§ 179 Abs. 4 Satz 3 SGB IX",
  startedAt: "",
  endedAt: "",
  provider: "",
  participants: "",
  taskContext: "",
  necessityReason: "",
  employerReaction: "",
  costNote: "",
  status: "documented",
  notes: "",
};

function countCriticalParticipation(records: ParticipationRecord[]) {
  return records.filter(
    (record) => getParticipationEscalationAdvice(record).level === "critical",
  ).length;
}

function monthLabel(date = new Date()): string {
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function toneLabel(risk: ObligationItem["risk"]) {
  if (risk === "critical") return "kritisch";
  if (risk === "warning") return "prüfen";
  return "ok";
}

function formatDate(value?: string): string {
  if (!value) return "ohne Datum";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("de-DE");
}

function legalBasisForKind(kind: SbvResourceRecordKind): string {
  if (kind === "training") return "§ 179 Abs. 4 Satz 3 SGB IX";
  if (kind === "deputy_involvement")
    return "§ 178 Abs. 1 Satz 4 SGB IX, § 179 Abs. 4 SGB IX";
  if (kind === "equipment") return "§ 179 Abs. 8 SGB IX";
  return "§ 179 SGB IX";
}

export function SbvControlView({
  cases,
  deadlines,
  onNavigate,
}: SbvControlViewProps) {
  const [participations, setParticipations] = useState<ParticipationRecord[]>(
    [],
  );
  const [resources, setResources] = useState<SbvResourceRecord[]>([]);
  const [resourceQuery, setResourceQuery] = useState("");
  const [activeSection, setActiveSection] =
    useState<ControlSectionId>("resources");
  const [resourceForm, setResourceForm] =
    useState<ResourceFormState>(initialResourceForm);
  const [resourceFormSubmitted, setResourceFormSubmitted] = useState(false);
  const [resourceTitleTouched, setResourceTitleTouched] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData() {
    const bridge = await waitForBridge();
    if (bridge?.participation)
      setParticipations(await bridge.participation.list());
    if (bridge?.sbvResources) setResources(await bridge.sbvResources.list());
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const bridge = await waitForBridge();
        if (!active) return;
        if (bridge?.participation)
          setParticipations(await bridge.participation.list());
        if (bridge?.sbvResources)
          setResources(await bridge.sbvResources.list());
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "SBV-Steuerungsdaten konnten nicht geladen werden.",
          );
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [cases.length]);

  const openDeadlines = deadlines.filter(
    (deadline) => deadline.status !== "done",
  ).length;
  const criticalParticipation = useMemo(
    () => countCriticalParticipation(participations),
    [participations],
  );
  const privacyReviewCases = cases.filter(
    (item) => item.privacyReviewRequired,
  ).length;
  const openResourceRequests = resources.filter(
    (item) => item.status === "planned" || item.status === "requested",
  ).length;
  const reportHints = [
    { label: "Fallakten im Arbeitsbestand", value: cases.length },
    { label: "Beteiligungsvorgänge", value: participations.length },
    { label: "offene Fristen / Wiedervorlagen", value: openDeadlines },
    { label: "Akten mit Datenschutzprüfung", value: privacyReviewCases },
  ];

  const visibleResources = resources.filter((record) =>
    recordMatchesQuery(
      [
        record.title,
        record.kind,
        record.status,
        record.legalBasis,
        record.provider ?? "",
        record.participants ?? "",
        record.taskContext ?? "",
        record.necessityReason ?? "",
      ],
      resourceQuery,
    ),
  );

  const sectionTabs: Array<{
    id: ControlSectionId;
    title: string;
    summary: string;
    view?: ViewId;
  }> = [
    {
      id: "resources",
      title: "Nachweise",
      summary: `${resources.length} Einträge`,
    },
    {
      id: "participation",
      title: "Beteiligung",
      summary: `${criticalParticipation} kritisch`,
      view: "participation",
    },
    {
      id: "obligations",
      title: "Arbeitgeberpflichten",
      summary: `${employerObligations.length} Prüfpunkte`,
    },
    {
      id: "inclusion",
      title: "Inklusionsvereinbarung",
      summary: `${inclusionTopics.length} Regelungsfelder`,
    },
    {
      id: "reports",
      title: "Berichte",
      summary: `${monthLabel()}`,
      view: "reports",
    },
  ];

  function updateResourceForm<K extends keyof ResourceFormState>(
    key: K,
    value: ResourceFormState[K],
  ) {
    setResourceForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "kind")
        next.legalBasis = legalBasisForKind(value as SbvResourceRecordKind);
      return next;
    });
  }

  function editResource(record: SbvResourceRecord) {
    setEditingResourceId(record.id);
    setResourceForm({
      kind: record.kind,
      title: record.title,
      legalBasis: record.legalBasis,
      startedAt: record.startedAt?.slice(0, 10) ?? "",
      endedAt: record.endedAt?.slice(0, 10) ?? "",
      provider: record.provider ?? "",
      participants: record.participants ?? "",
      taskContext: record.taskContext ?? "",
      necessityReason: record.necessityReason ?? "",
      employerReaction: record.employerReaction ?? "",
      costNote: record.costNote ?? "",
      status: record.status,
      notes: record.notes ?? "",
    });
    setResourceFormSubmitted(false);
    setResourceTitleTouched(false);
    setNotice("");
    setError("");
  }

  async function saveResource() {
    setError("");
    setNotice("");
    setResourceFormSubmitted(true);
    if (!resourceForm.title?.trim()) {
      setError("Bitte einen Titel für den Nachweis angeben.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.sbvResources)
        throw new Error("SBV-Ressourcen-Bridge ist nicht verfügbar.");
      if (editingResourceId) {
        await bridge.sbvResources.update(editingResourceId, resourceForm);
        setNotice("Nachweis aktualisiert.");
      } else {
        await bridge.sbvResources.create(resourceForm);
        setNotice("Nachweis protokolliert.");
      }
      setResourceForm(initialResourceForm);
      setResourceFormSubmitted(false);
      setResourceTitleTouched(false);
      setEditingResourceId(null);
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nachweis konnte nicht gespeichert werden.",
      );
    }
  }

  async function deleteResource(id: string) {
    setError("");
    setNotice("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.sbvResources)
        throw new Error("SBV-Ressourcen-Bridge ist nicht verfügbar.");
      await bridge.sbvResources.delete(id);
      if (editingResourceId === id) {
        setResourceForm(initialResourceForm);
        setEditingResourceId(null);
      }
      setNotice("Nachweis gelöscht.");
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Nachweis konnte nicht gelöscht werden.",
      );
    }
  }

  return (
    <WorkbenchPage
      title="SBV-Steuerung"
      kicker="Arbeitsplatz"
      description="Arbeitsnachweise, Kontrollpunkte und Einstiege in bestehende Module. Kein Ersatz für Fallakten."
    >
      <ModuleFeedback
        items={[
          error
            ? { id: "sbv-control-error", tone: "warning", message: error }
            : null,
          notice
            ? { id: "sbv-control-notice", tone: "success", message: notice }
            : null,
        ]}
      />
      <WorkbenchSummary
        ariaLabel="SBV-Steuerung Kennzahlen"
        items={[
          { label: "Nachweise", value: resources.length, tone: "default" },
          {
            label: "offene Ressourcenanfragen",
            value: openResourceRequests,
            tone: openResourceRequests > 0 ? "warning" : "default",
          },
          {
            label: "kritische Beteiligungen",
            value: criticalParticipation,
            tone: criticalParticipation > 0 ? "danger" : "default",
          },
          {
            label: "Datenschutzprüfungen",
            value: privacyReviewCases,
            tone: privacyReviewCases > 0 ? "warning" : "default",
          },
        ]}
        actions={
          <span className="industrial-meta">Monatsblick {monthLabel()}</span>
        }
      />

      <WorkbenchWorkspace
        ariaLabel="SBV-Steuerung Arbeitsbereiche"
        ariaLive="polite"
        navigation={
          <WorkbenchNavigation
            items={sectionTabs.map((tab) => ({
              id: tab.id,
              title: tab.title,
              description: tab.summary,
            }))}
            active={activeSection}
            onChange={setActiveSection}
            ariaLabel="SBV-Steuerung Arbeitsbereiche"
          />
        }
      >
        {activeSection === "resources" && (
          <ControlPanel
            icon={<GraduationCap className="h-5 w-5" />}
            kicker="§ 179 SGB IX"
            title="Schulungen, Heranziehungen und Sachmittel protokollieren"
          >
            <div className="sbv-resource-workbench">
              <form
                className="sbv-resource-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveResource();
                }}
              >
                <SelectInput
                  label="Art"
                  value={resourceForm.kind}
                  options={Object.entries(resourceKindLabels).map(
                    ([value, label]) => ({ value, label }),
                  )}
                  onValueChange={(value) =>
                    updateResourceForm("kind", value as SbvResourceRecordKind)
                  }
                />
                <TextInput
                  label="Titel / Anlass"
                  value={resourceForm.title ?? ""}
                  onValueChange={(value) => updateResourceForm("title", value)}
                  onBlur={() => setResourceTitleTouched(true)}
                  placeholder="z. B. Grundlagenschulung SBV I oder Heranziehung wegen BEM-Begleitung"
                  required
                  error={
                    (resourceTitleTouched || resourceFormSubmitted) &&
                    !resourceForm.title?.trim()
                      ? "Titel ist für den Nachweis erforderlich."
                      : undefined
                  }
                />
                <TextInput
                  label="Rechtsgrundlage"
                  value={resourceForm.legalBasis ?? ""}
                  onValueChange={(value) =>
                    updateResourceForm("legalBasis", value)
                  }
                />
                <div className="sbv-resource-form-row">
                  <DateInput
                    label="Beginn / Datum"
                    value={resourceForm.startedAt ?? ""}
                    onValueChange={(value) =>
                      updateResourceForm("startedAt", value)
                    }
                  />
                  <DateInput
                    label="Ende"
                    value={resourceForm.endedAt ?? ""}
                    onValueChange={(value) =>
                      updateResourceForm("endedAt", value)
                    }
                  />
                  <SelectInput
                    label="Status"
                    value={resourceForm.status ?? "documented"}
                    options={Object.entries(resourceStatusLabels).map(
                      ([value, label]) => ({ value, label }),
                    )}
                    onValueChange={(value) =>
                      updateResourceForm(
                        "status",
                        value as SbvResourceRecordStatus,
                      )
                    }
                  />
                </div>
                <TextInput
                  label="Anbieter / Beteiligte"
                  value={resourceForm.provider ?? ""}
                  onValueChange={(value) =>
                    updateResourceForm("provider", value)
                  }
                  placeholder="Seminaranbieter, Stellvertretung, IT, Arbeitgeber …"
                />
                <TextInput
                  label="Teilnehmende / herangezogene Personen"
                  value={resourceForm.participants ?? ""}
                  onValueChange={(value) =>
                    updateResourceForm("participants", value)
                  }
                  placeholder="nur soweit für den Nachweis erforderlich"
                />
                <TextareaInput
                  label="Aufgabenbezug / Anlass"
                  rows={3}
                  value={resourceForm.taskContext ?? ""}
                  onValueChange={(value) =>
                    updateResourceForm("taskContext", value)
                  }
                  placeholder="Warum war die Schulung, Heranziehung oder Ausstattung für die SBV-Arbeit erforderlich?"
                />
                <TextareaInput
                  label="Erforderlichkeit / Begründung"
                  rows={3}
                  value={resourceForm.necessityReason ?? ""}
                  onValueChange={(value) =>
                    updateResourceForm("necessityReason", value)
                  }
                  placeholder="Rechtssichere Begründung für Kosten, Freistellung, Heranziehung oder Ausstattung."
                />
                <div className="sbv-resource-form-row">
                  <TextInput
                    label="Arbeitgeberreaktion"
                    value={resourceForm.employerReaction ?? ""}
                    onValueChange={(value) =>
                      updateResourceForm("employerReaction", value)
                    }
                    placeholder="zugestimmt, offen, abgelehnt, Rückfrage …"
                  />
                  <TextInput
                    label="Kosten / Sachstand"
                    value={resourceForm.costNote ?? ""}
                    onValueChange={(value) => updateResourceForm("costNote", value)}
                    placeholder="Kostenrahmen, Freistellung, Sachmittel …"
                  />
                </div>
                <TextareaInput
                  label="Notiz"
                  rows={3}
                  value={resourceForm.notes ?? ""}
                  onValueChange={(value) => updateResourceForm("notes", value)}
                />
                <FormActions className="sbv-resource-actions">
                  <IndustrialButton type="submit" disabled={!resourceForm.title?.trim()}>
                    <Save className="h-4 w-4" />
                    {editingResourceId
                      ? "Nachweis aktualisieren"
                      : "Nachweis speichern"}
                  </IndustrialButton>
                  {editingResourceId && (
                    <ToolbarButton
                      onClick={() => {
                        setEditingResourceId(null);
                        setResourceForm(initialResourceForm);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Neu erfassen
                    </ToolbarButton>
                  )}
                </FormActions>
              </form>
              <div className="sbv-resource-list" aria-label="SBV-Nachweise">
                <SearchToolbar
                  searchValue={resourceQuery}
                  onSearchChange={setResourceQuery}
                  searchLabel="Nachweise durchsuchen"
                  searchPlaceholder="Titel, Rechtsgrundlage, Anbieter …"
                  resultCount={visibleResources.length}
                />
                <RecordList
                  items={visibleResources}
                  getKey={(record) => record.id}
                  ariaLabel="Gefilterte SBV-Nachweise"
                  empty={
                    <EmptyState
                      title={resources.length === 0 ? "Noch keine Nachweise" : "Keine Treffer"}
                      text={
                        resources.length === 0
                          ? "Erfasse Schulungen, Heranziehungen oder Sachmittel hier, damit später nachvollziehbar ist, was beantragt, durchgeführt oder abgelehnt wurde."
                          : "Zur Suche passen keine Nachweise. Suchbegriff anpassen oder Suche leeren."
                      }
                    />
                  }
                  renderItem={(record) => (
                    <IndustrialRecordCard className="sbv-resource-record">
                      <GhostButton
                        className="sbv-resource-record-main"
                        onClick={() => editResource(record)}
                      >
                        <strong>{record.title}</strong>
                        <span>
                          {resourceKindLabels[
                            record.kind as SbvResourceRecordKind
                          ] ?? record.kind}{" "}
                          · {formatDate(record.startedAt)}
                          <ProcessStatusBadge
                            status={record.status}
                            label={
                              resourceStatusLabels[
                                record.status as SbvResourceRecordStatus
                              ] ?? record.status
                            }
                          />
                        </span>
                        <em>{record.legalBasis}</em>
                      </GhostButton>
                      <DangerButton
                        compact
                        aria-label={`Nachweis ${record.title} löschen`}
                        onClick={() => void deleteResource(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </DangerButton>
                    </IndustrialRecordCard>
                  )}
                />
              </div>
            </div>
          </ControlPanel>
        )}

        {activeSection === "participation" && (
          <ControlPanel
            icon={<ShieldAlert className="h-5 w-5" />}
            kicker="§ 178 Abs. 2 Satz 1 SGB IX"
            title="Beteiligung steuern"
            actionLabel="Beteiligungsmonitor öffnen"
            onAction={
              onNavigate ? () => onNavigate("participation") : undefined
            }
          >
            <div className="sbv-control-compact-list">
              {participations.slice(0, 5).map((record) => {
                const advice = getParticipationEscalationAdvice(record);
                return (
                  <IndustrialRecordCard
                    key={record.id}
                    className="sbv-control-row"
                    tone={riskLevelToTone(advice.level)}
                  >
                    <div>
                      <strong>{record.title}</strong>
                      <span>{advice.title}</span>
                    </div>
                    <p>{advice.nextStep}</p>
                  </IndustrialRecordCard>
                );
              })}
              {participations.length === 0 && (
                <EmptyState
                  title="Noch keine Beteiligungsvorgänge"
                  text="Neue Vorgänge werden im Beteiligungsmodul oder aus einer Fallakte heraus angelegt."
                />
              )}
            </div>
          </ControlPanel>
        )}

        {activeSection === "obligations" && (
          <ControlPanel
            icon={<Building2 className="h-5 w-5" />}
            kicker="Strukturmonitor"
            title="Arbeitgeberpflichten im Blick"
          >
            <DataTable
              ariaLabel="Arbeitgeberpflichten"
              headers={["Pflicht", "Nachweis", "SBV-Aktion"]}
              empty={<EmptyState text="Keine Arbeitgeberpflichten hinterlegt." />}
              rows={employerObligations.map((item) => ({
                id: item.id,
                cells: [
                  <div className="industrial-data-table-cell">
                    <strong>{item.title}</strong>
                    <span>{item.legalBasis}</span>
                  </div>,
                  <div className="industrial-data-table-cell">
                    <span>{item.cadence}</span>
                    <p>{item.evidence}</p>
                  </div>,
                  <div className="industrial-data-table-cell">
                    <RiskBadge risk={item.risk} label={toneLabel(item.risk)} />
                    <p>{item.sbvAction}</p>
                  </div>,
                ],
              }))}
            />
          </ControlPanel>
        )}

        {activeSection === "inclusion" && (
          <ControlPanel
            icon={<ClipboardCheck className="h-5 w-5" />}
            kicker="§ 166 SGB IX"
            title="Inklusionsvereinbarung fortschreiben"
          >
            <div className="sbv-control-card-grid">
              {inclusionTopics.map((topic) => (
                <IndustrialSelectionCard
                  key={topic.id}
                  className="sbv-control-mini-card"
                >
                  <strong>{topic.title}</strong>
                  <span>{topic.legalBasis}</span>
                  <p>{topic.sbvGoal}</p>
                  <em>{topic.enforceableAnchor}</em>
                </IndustrialSelectionCard>
              ))}
            </div>
          </ControlPanel>
        )}

        {activeSection === "reports" && (
          <ControlPanel
            icon={<FileCheck2 className="h-5 w-5" />}
            kicker="Berichte"
            title="Tätigkeitsbericht vorbereiten"
            actionLabel="Berichte öffnen"
            onAction={onNavigate ? () => onNavigate("reports") : undefined}
          >
            <div className="sbv-control-metric-grid">
              {reportHints.map((hint) => (
                <IndustrialRecordCard key={hint.label}>
                  <strong>{hint.value}</strong>
                  <span>{hint.label}</span>
                </IndustrialRecordCard>
              ))}
            </div>
          </ControlPanel>
        )}
      </WorkbenchWorkspace>
    </WorkbenchPage>
  );
}

function ControlPanel({
  icon,
  kicker,
  title,
  actionLabel,
  onAction,
  children,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <IndustrialPanel
      className="sbv-control-panel"
      kicker={kicker}
      title={title}
      actions={
        actionLabel && onAction ? (
          <ToolbarButton onClick={onAction}>
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </ToolbarButton>
        ) : undefined
      }
    >
      <span className="sbv-control-panel-icon" aria-hidden="true">
        {icon}
      </span>
      {children}
    </IndustrialPanel>
  );
}

