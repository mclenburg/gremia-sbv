import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  FileText,
  Download,
  FolderOpen,
  FolderKanban,
  MessageSquare,
  Save,
  Search,
  ShieldCheck,
  HardDrive,
  HeartPulse,
  LogOut,
  Moon,
  Sun,
  Plus,
  Scale,
  Settings as SettingsIcon,
  HelpCircle,
  TerminalSquare,
  Trash2,
  Users,
  Workflow,
} from "lucide-react";
import { DashboardCard } from "./shared/components/DashboardCard";
import { ModuleFrame } from "./shared/components/ModuleFrame";
import { TextCommandTextarea } from "./shared/textCommands/TextCommandTextarea";
import {
  filterContactsForQuery,
  formatContactReference,
} from "./features/contacts/contactDisplay";
import { PlaceholderView } from "./shared/components/PlaceholderView";
import { ShellNav } from "./shell/ShellNav";
import { modules, type ViewId } from "./core/navigation/modules";
import { waitForBridge } from "./core/bridge/waitForBridge";
import { formatDateShort } from "./shared/format/dates";
import type { CaseNodeTarget } from "./core/navigation/caseNodeTarget";
import { useModalKeyboardShortcuts } from "./core/keyboard/useModalKeyboardShortcuts";
import { DeadlineDashboardPanel } from "./features/deadlines/DeadlineDashboardPanel";
import { CaseTreePanel } from "./features/cases/CaseTreePanel";
import { CaseDetailPanel } from "./features/cases/CaseDetailPanel";
import { CaseRegister } from "./features/cases/CaseRegister";
import { CaseCreateModal } from "./features/cases/CaseCreateModal";
import { CaseProcessDraftModal } from "./features/cases/CaseProcessDraftModal";
import { CaseDocumentDetail } from "./features/cases/CaseDocumentDetail";
import { CaseOverviewDetail } from "./features/cases/CaseOverviewDetail";
import { CaseNoteModal } from "./features/cases/CaseNoteModal";
import { CaseWorkbenchFooter } from "./features/cases/CaseWorkbenchFooter";
import { createCaseDocumentActions } from "./features/cases/useCaseDocuments";
import { InlineCommandOverlays } from "./features/cases/InlineCommandOverlays";
import { useInlineCommands } from "./features/cases/inlineCommands/useInlineCommands";
import { useCaseWorkbenchData } from "./features/cases/useCaseWorkbenchData";
import { useCaseRegisterFilter } from "./features/cases/useCaseRegisterFilter";
import { useCaseWorkbenchSearch } from "./features/cases/useCaseWorkbenchSearch";
import { useCaseNoteEditor } from "./features/cases/useCaseNoteEditor";
import {
  defaultDeadlineTitleForCase,
  formatBytes,
  formatCaseLabel,
  formatNoteDate,
  formatProcessNodeSubtitle,
  fromDateTimeLocalValue,
  processTypeLabel,
  toDateTimeLocalValue,
} from "./features/cases/caseWorkbenchFormat";
import {
  ProcessTemplateDocumentsModal,
  type ProcessTemplateModalState,
} from "./features/cases/ProcessTemplateDocumentsModal";
import type { CaseCategory, CaseRecord } from "./core/models/case.model";
import type {
  ContactCategory,
  ContactRecord,
  CreateContactInput,
  DeleteContactResult,
} from "./core/models/contact.model";
import type { CaseDocumentRecord } from "./core/models/case-document.model";
import type {
  CaseNoteRecord,
  CaseNoteType,
  ConfidentialLevel,
} from "./core/models/case-note.model";
import type {
  CreateDeadlineInput,
  DeadlineDashboardItem,
  DeadlineProcessType,
  DeadlineRecord,
  DeadlineSeverity,
  DeadlineType,
} from "./core/models/deadline.model";
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
  ReportType,
} from "./core/models/report.model";
import type {
  BackupInspectionResult,
  BackupOperationResult,
} from "./core/models/backup.model";
import type {
  RetentionCandidate,
  RetentionDashboard,
  RetentionOperationResult,
  RetentionSettings,
} from "./core/models/retention.model";
import type {
  CreatePreventionProcessInput,
  PreventionDifficultyType,
  PreventionProcessRecord,
  PreventionRiskType,
  PreventionStatus,
  PreventionStepDefinition,
  PreventionWarning,
  UpdatePreventionProcessInput,
} from "./core/models/prevention.model";
import type {
  BemProcessRecord,
  BemStatus,
  UpdateBemProcessInput,
} from "./core/models/bem.model";
import type {
  EqualizationProcessRecord,
  UpdateEqualizationProcessInput,
} from "./core/models/equalization.model";
import type {
  TerminationHearingRecord,
  UpdateTerminationHearingInput,
} from "./core/models/termination.model";
import type {
  ParticipationRecord,
  UpdateParticipationInput,
} from "./core/models/participation.model";
import { statusLabel } from "./features/prevention/preventionShared";
import { bemStatusLabel } from "./features/bem/bemShared";
import { PreventionProcessDetail } from "./features/prevention/PreventionProcessDetail";
import { BemProcessDetail } from "./features/bem/BemProcessDetail";
import { EqualizationProcessDetail } from "./features/equalization/EqualizationProcessDetail";
import { TerminationProcessDetail } from "./features/termination/TerminationProcessDetail";
import { ParticipationProcessDetail } from "./features/participation/ParticipationProcessDetail";
import type {
  CaseLawRecord,
  CaseLegalReferenceRecord,
  LegalNormRecord,
  NormChecklistItemRecord,
  NormCommentRecord,
} from "./core/models/knowledge.model";
import type {
  ContextualTemplateAction,
  RenderedTemplateResult,
  TemplateRecord,
} from "./core/models/template.model";
import { APP_VERSION } from "./generated/appVersion";
import {
  LEGAL_NORM_SUGGESTIONS,
  findFirstTextCommand,
  formatAnonymizationMarkerText,
  formatCaseReferenceText,
  formatConfidentialityText,
  formatLegalNormText,
  formatOpenTaskText,
  formatRiskText,
  removeCommandMarker,
  replaceCommandMarker,
  type ConfidentialCommandLevel,
  type LegalNormSuggestion,
  type RiskLevelCommand,
  type TextCommandToken,
} from "@services/textCommandPolicy";
import {
  missingPlaceholderWarning,
  resolveContextualTemplateAction,
} from "@services/templateContextPolicy";
import {
  buildExportWarningMessage,
  scanBemProcessExport,
  scanSensitiveExportText,
} from "@services/exportGuardPolicy";
import {
  buildTerminationExportContext,
  terminationPrivacyExportNotice,
} from "@services/terminationPrivacyPolicy";
import {
  ConfirmDialogProvider,
  useConfirmDialog,
} from "./shared/dialogs/ConfirmDialogProvider";
import {
  LiveRegionProvider,
  useAnnouncer,
} from "./shared/a11y/LiveRegionProvider";

export function nowLabel(): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function validatePassword(password: string): string | null {
  if (password.length < 12) {
    return "Das Passwort muss mindestens 12 Zeichen lang sein.";
  }
  return null;
}

export type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "gremia.sbv.theme";

const TEMPLATE_DEFAULT_VALUES_STORAGE_KEY = "gremia.sbv.templateDefaultValues";

type TemplateDefaultKey =
  | "sbv.name"
  | "sbv.funktion"
  | "sbv.email"
  | "sbv.telefon"
  | "sbv.signatur"
  | "arbeitgeber.ansprechpartner"
  | "arbeitgeber.personalabteilung"
  | "arbeitgeber.name"
  | "unternehmen.name"
  | "standort.name";

type TemplateDefaultValues = Record<TemplateDefaultKey, string>;

type TemplateDefaultsBridge = {
  templateDefaults?: {
    list(): Promise<TemplateDefaultValues>;
    save(values: TemplateDefaultValues): Promise<TemplateDefaultValues>;
  };
};

const TEMPLATE_DEFAULT_FIELDS: Array<{
  key: TemplateDefaultKey;
  label: string;
  description: string;
  multiline?: boolean;
}> = [
  {
    key: "sbv.name",
    label: "{{sbv.name}}",
    description: "Name oder Funktionsbezeichnung der SBV.",
  },
  {
    key: "sbv.funktion",
    label: "{{sbv.funktion}}",
    description: "Funktion, z. B. Schwerbehindertenvertretung.",
  },
  {
    key: "sbv.email",
    label: "{{sbv.email}}",
    description: "Kontakt-E-Mail der SBV.",
  },
  {
    key: "sbv.telefon",
    label: "{{sbv.telefon}}",
    description: "Telefon oder interne Durchwahl.",
  },
  {
    key: "sbv.signatur",
    label: "{{sbv.signatur}}",
    description: "Standard-Signatur für Schreiben.",
    multiline: true,
  },
  {
    key: "arbeitgeber.ansprechpartner",
    label: "{{arbeitgeber.ansprechpartner}}",
    description: "Standard-Ansprechstelle, z. B. Personalabteilung.",
  },
  {
    key: "arbeitgeber.personalabteilung",
    label: "{{arbeitgeber.personalabteilung}}",
    description: "Bezeichnung der Personalabteilung.",
  },
  {
    key: "arbeitgeber.name",
    label: "{{arbeitgeber.name}}",
    description: "Name des Arbeitgebers.",
  },
  {
    key: "unternehmen.name",
    label: "{{unternehmen.name}}",
    description: "Unternehmens- oder Dienststellenname.",
  },
  {
    key: "standort.name",
    label: "{{standort.name}}",
    description: "Standard-Standort.",
  },
];

const EMPTY_TEMPLATE_DEFAULT_VALUES: TemplateDefaultValues = {
  "sbv.name": "Schwerbehindertenvertretung",
  "sbv.funktion": "Schwerbehindertenvertretung",
  "sbv.email": "",
  "sbv.telefon": "",
  "sbv.signatur": "Mit freundlichen Grüßen\nSchwerbehindertenvertretung",
  "arbeitgeber.ansprechpartner": "Personalabteilung",
  "arbeitgeber.personalabteilung": "Personalabteilung",
  "arbeitgeber.name": "",
  "unternehmen.name": "",
  "standort.name": "",
};

function normalizeTemplateDefaultValues(
  input: Partial<Record<string, unknown>> | null | undefined,
): TemplateDefaultValues {
  const next = { ...EMPTY_TEMPLATE_DEFAULT_VALUES };
  for (const field of TEMPLATE_DEFAULT_FIELDS) {
    const value = input?.[field.key];
    next[field.key] = typeof value === "string" ? value : next[field.key];
  }
  return next;
}

function readTemplateDefaultValuesFromLocalStorage(): TemplateDefaultValues {
  try {
    const raw = window.localStorage.getItem(
      TEMPLATE_DEFAULT_VALUES_STORAGE_KEY,
    );
    return normalizeTemplateDefaultValues(
      raw ? (JSON.parse(raw) as Record<string, unknown>) : null,
    );
  } catch {
    return { ...EMPTY_TEMPLATE_DEFAULT_VALUES };
  }
}

function writeTemplateDefaultValuesToLocalStorage(
  values: TemplateDefaultValues,
): void {
  try {
    window.localStorage.setItem(
      TEMPLATE_DEFAULT_VALUES_STORAGE_KEY,
      JSON.stringify(values),
    );
  } catch {
    // Fallback-Speicherung kann blockiert sein; die laufende Sitzung bleibt trotzdem nutzbar.
  }
}

export async function loadTemplateDefaultValues(): Promise<TemplateDefaultValues> {
  const bridge = await waitForBridge();
  const defaultsBridge = bridge as unknown as TemplateDefaultsBridge | null;
  if (defaultsBridge?.templateDefaults?.list) {
    return normalizeTemplateDefaultValues(
      await defaultsBridge.templateDefaults.list(),
    );
  }
  return readTemplateDefaultValuesFromLocalStorage();
}

async function saveTemplateDefaultValues(
  values: TemplateDefaultValues,
): Promise<TemplateDefaultValues> {
  const normalized = normalizeTemplateDefaultValues(values);
  const bridge = await waitForBridge();
  const defaultsBridge = bridge as unknown as TemplateDefaultsBridge | null;
  if (defaultsBridge?.templateDefaults?.save) {
    return normalizeTemplateDefaultValues(
      await defaultsBridge.templateDefaults.save(normalized),
    );
  }
  writeTemplateDefaultValuesToLocalStorage(normalized);
  return normalized;
}

export function getInitialTheme(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage kann in Sonderumgebungen blockiert sein; dann bleibt Dark Industrial Standard.
  }
  return "dark";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function formatInlineDeadlineDate(value: string): string {
  if (!value) return "Datum offen";
  const date = new Date(fromDateTimeLocalValue(value));
  if (Number.isNaN(date.getTime())) return "Datum offen";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildInlineDeadlineText(draft: InlineDeadlineDraft): string {
  const dateLabel = formatInlineDeadlineDate(draft.dueAt);
  const title = draft.title.trim() || "Wiedervorlage";
  return `Frist bis ${dateLabel}: ${title}`;
}

function replaceRange(
  value: string,
  start: number,
  length: number,
  replacement: string,
): string {
  return `${value.slice(0, start)}${replacement}${value.slice(start + length)}`;
}

export function DashboardOverview({
  onNavigate,
  cases,
  deadlines,
  dashboardItems,
  onEditDeadline,
  onCompleteDeadline,
}: {
  onNavigate: (view: ViewId) => void;
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  dashboardItems: DeadlineDashboardItem[];
  onEditDeadline: (deadline: DeadlineRecord) => void;
  onCompleteDeadline: (deadline: DeadlineRecord) => void;
}) {
  const criticalCount = dashboardItems.filter(
    (item) =>
      item.dashboardState === "critical" || item.dashboardState === "overdue",
  ).length;
  const dueSoonCount = dashboardItems.filter(
    (item) => item.dashboardState === "due_soon",
  ).length;

  return (
    <div className="space-y-6">
      <section className="industrial-hero">
        <div>
          <p className="industrial-kicker">Dashboard</p>
          <h1 className="industrial-title">Arbeitsstand</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            label="kritisch"
            value={String(criticalCount)}
            tone="danger"
          />
          <Metric label="48h" value={String(dueSoonCount)} tone="warning" />
          <Metric label="Fälle" value={String(cases.length)} />
          <Metric label="Fristen" value={String(deadlines.length)} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {modules.map((module) => (
          <DashboardCard
            key={module.id}
            {...module}
            disabled={module.status === "planned"}
            statusText={
              module.status === "planned"
                ? `In Entwicklung${module.plannedVersion ? ` · geplant ${module.plannedVersion}` : ""}`
                : undefined
            }
            onClick={() => {
              if (module.status === "planned") return;
              onNavigate(module.id);
            }}
          />
        ))}
      </section>

      <DeadlineDashboardPanel
        items={dashboardItems}
        cases={cases}
        onEdit={onEditDeadline}
        onComplete={onCompleteDeadline}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type CaseExplorerSelection =
  | { type: "overview" }
  | { type: "note"; id: string }
  | { type: "document"; id: string }
  | { type: "process"; processType: CaseProcessType; id?: string }
  | { type: "search"; id: string };

type ProtocolTextTarget = "content" | "nextSteps";

type InlineDeadlineDraft = {
  target: ProtocolTextTarget;
  title: string;
  dueAt: string;
  severity: DeadlineSeverity;
  legalBasis: string;
  description: string;
  markerIndex: number | null;
};

type InlineContactDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  query: string;
  firstName: string;
  lastName: string;
  organization: string;
  role: string;
  category: ContactCategory;
  email: string;
  phone: string;
};

type InlineCaseLinkDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  query: string;
};
type InlineLegalNormDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  query: string;
};
type InlineRiskDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  level: RiskLevelCommand;
  text: string;
};
type InlineOpenTaskDraft = {
  target: ProtocolTextTarget;
  markerIndex: number | null;
  title: string;
  description: string;
  severity: DeadlineSeverity;
};
type InlineConfidentialityDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  level: ConfidentialCommandLevel;
};
type InlineAnonymizationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  label: string;
};

type CaseProcessType =
  | "prevention"
  | "bem"
  | "participation"
  | "termination_hearing"
  | "equalization";

type CaseProcessDraft = {
  processType: CaseProcessType;
  title: string;
  description: string;
  dueAt: string;
};

function defaultCaseProcessDraft(
  processType: CaseProcessType,
): CaseProcessDraft {
  return {
    processType,
    title: processTypeLabel(processType),
    description:
      processType === "prevention"
        ? "Aus der Fallakte gestartetes Präventionsverfahren. Bitte Anlass und Gefährdung konkretisieren."
        : processType === "bem"
          ? "Aus der Fallakte gestartetes BEM-Verfahren. Bitte Auslöser, Angebot und Reaktion konkretisieren."
          : processType === "participation"
            ? "Aus der Fallakte gestartete SBV-Beteiligungsmaßnahme. Bitte Arbeitgebermaßnahme, Beteiligungsstand und nächsten Schritt erfassen."
            : `${processTypeLabel(processType)} aus der Fallakte vorgemerkt. Das Fachmodul übernimmt später die strukturierte Bearbeitung.`,
    dueAt: "",
  };
}

function sanitizeDownloadFileName(value: string): string {
  return (
    value
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 110) || "dokument"
  );
}

function downloadRenderedTemplate(result: RenderedTemplateResult) {
  const content = `Betreff: ${result.subject}\n\n${result.body}`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeDownloadFileName(result.title || result.subject || "SBV-Dokument")}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function templateTags(template: TemplateRecord): string[] {
  return ((template.tags ?? []) as string[])
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function isTemplateConnectedToProcessStatus(
  template: TemplateRecord,
  processType: "prevention" | "bem" | "equalization" | "termination_hearing",
  status: PreventionStatus | BemStatus | string,
): boolean {
  if (processType === "prevention" && template.category !== "praevention")
    return false;
  if (processType === "bem" && template.category !== "bem") return false;
  if (processType === "equalization" && template.category !== "gleichstellung")
    return false;
  if (
    processType === "termination_hearing" &&
    template.category !== "kuendigung"
  )
    return false;
  const tags = templateTags(template);
  const text =
    `${template.title} ${template.description ?? ""} ${tags.join(" ")}`.toLowerCase();
  const processTokens =
    processType === "bem"
      ? ["massnahme:bem", "maßnahme:bem", "prozess:bem", "bem"]
      : processType === "equalization"
        ? [
            "massnahme:equalization",
            "maßnahme:equalization",
            "prozess:equalization",
            "gleichstellung",
            "gdb",
          ]
        : processType === "termination_hearing"
          ? [
              "massnahme:termination_hearing",
              "maßnahme:termination_hearing",
              "prozess:termination_hearing",
              "kündigung",
              "kuendigung",
              "kündigungsanhörung",
            ]
          : [
              "massnahme:prevention",
              "maßnahme:prevention",
              "prozess:prevention",
              "praevention",
              "prävention",
              "prevention",
            ];
  const hasProcessMatch =
    tags.length === 0 ||
    tags.some((tag) => processTokens.includes(tag)) ||
    (processType === "bem"
      ? text.includes("bem")
      : processType === "equalization"
        ? text.includes("gleichstellung") || text.includes("gdb")
        : processType === "termination_hearing"
          ? text.includes("kündigung") ||
            text.includes("kuendigung") ||
            text.includes("kündigungsanhörung")
          : text.includes("prävention") ||
            text.includes("präventionsverfahren"));
  const statusTokens = [`status:${status}`, `${processType}:${status}`, status];
  const hasStatusMatch =
    tags.length === 0 ||
    statusTokens.some(
      (token) =>
        tags.includes(token) || text.includes(token.replaceAll("_", " ")),
    );
  return hasProcessMatch && hasStatusMatch;
}

function isBemProcessRecord(
  process:
    | PreventionProcessRecord
    | BemProcessRecord
    | EqualizationProcessRecord
    | TerminationHearingRecord,
): process is BemProcessRecord {
  return "employeeResponse" in process;
}

function isEqualizationProcessRecord(
  process: unknown,
): process is EqualizationProcessRecord {
  return Boolean(
    process && typeof process === "object" && "applicationStatus" in process,
  );
}

function isTerminationHearingRecord(
  process: unknown,
): process is TerminationHearingRecord {
  return Boolean(
    process &&
    typeof process === "object" &&
    "terminationType" in process &&
    "protectionStatus" in process,
  );
}

function buildProcessTemplateValues(
  caseRecord: CaseRecord | undefined,
  process:
    | PreventionProcessRecord
    | BemProcessRecord
    | EqualizationProcessRecord
    | TerminationHearingRecord,
): Record<string, string> {
  const base = {
    "fall.aktenzeichen": caseRecord?.caseNumber ?? "",
    "fall.name": caseRecord?.displayName ?? "",
    "fall.kurzbeschreibung": caseRecord?.summary ?? "",
  };

  if (isBemProcessRecord(process)) {
    return {
      ...base,
      "bem.status": bemStatusLabel(process.status),
      "bem.status.key": process.status,
      "bem.titel": process.title,
      "bem.ausloeser": process.triggerDescription ?? "",
      "bem.au_tage":
        process.sicknessDaysTwelveMonths !== undefined
          ? String(process.sicknessDaysTwelveMonths)
          : "",
      "bem.angebot_am": formatDateShort(process.bemOfferedAt),
      "bem.reaktionsfrist": formatDateShort(process.responseDueAt),
      "bem.reaktion": process.employeeResponse.replaceAll("_", " "),
      "bem.reaktion_am": formatDateShort(process.employeeResponseAt),
      "bem.erstgespraech": formatDateShort(process.firstMeetingAt),
      "bem.beteiligte": process.participants ?? "",
      "bem.massnahmen": process.measures ?? "",
      "bem.wirksamkeitspruefung": formatDateShort(process.nextReviewAt),
      "bem.ergebnis": process.result ?? "",
      "frist.datum": formatDateShort(process.responseDueAt),
    };
  }

  if (isTerminationHearingRecord(process)) {
    return {
      ...base,
      "kuendigung.status": process.status,
      "kuendigung.art": process.terminationType,
      "kuendigung.schutzstatus": process.protectionStatus,
      "kuendigung.eingang": formatDateShort(process.receivedAt),
      "kuendigung.sbv_frist": formatDateShort(process.sbvStatementDueAt),
      "kuendigung.br_anhoerung": formatDateShort(process.worksCouncilHearingAt),
      "kuendigung.integrationsamt_anfrage": formatDateShort(
        process.integrationOfficeRequestedAt,
      ),
      "kuendigung.integrationsamt_entscheidung": formatDateShort(
        process.integrationOfficeDecisionAt,
      ),
      "kuendigung.integrationsamt_stand":
        process.integrationOfficeDecision ?? "",
      "kuendigung.grund": process.employerReason ?? "",
      "kuendigung.fehlende_unterlagen": process.missingInformation ?? "",
      "kuendigung.bewertung": process.sbvAssessment ?? "",
      "kuendigung.stellungnahme": process.statement ?? "",
      "frist.datum": formatDateShort(process.sbvStatementDueAt),
    };
  }

  if (isEqualizationProcessRecord(process)) {
    return {
      ...base,
      "gleichstellung.status": process.applicationStatus,
      "gleichstellung.status.label": process.applicationStatus,
      "gleichstellung.aktenzeichen": process.agencyReference ?? "",
      "gleichstellung.antrag_am": formatDateShort(
        process.applicationSubmittedAt,
      ),
      "gleichstellung.bescheid_am": formatDateShort(process.decisionReceivedAt),
      "gleichstellung.widerspruchsfrist": formatDateShort(
        process.objectionDueAt,
      ),
      "gleichstellung.ergebnis": process.outcome ?? "",
      "gleichstellung.notizen":
        "Siehe verschlüsselte Fallnotizen in der Fallakte.",
      "frist.datum": formatDateShort(process.objectionDueAt),
    };
  }

  return {
    ...base,
    "praevention.status": statusLabel(process.status),
    "praevention.status.key": process.status,
    "praevention.gefaehrdung": process.hazardDescription ?? "",
    "praevention.schwierigkeit": process.difficultyType.replaceAll("_", " "),
    "praevention.risiko": process.riskType.replaceAll("_", " "),
    "praevention.personenstatus": process.personStatus.replaceAll("_", " "),
    "praevention.angefordert_am": formatDateShort(process.requestedAt),
    "praevention.arbeitgeberfrist": formatDateShort(
      process.employerResponseDueAt,
    ),
    "praevention.arbeitgeberreaktion": process.employerRequestSummary ?? "",
    "praevention.massnahmen": process.measures ?? "",
    "praevention.ergebnis": process.result ?? "",
    "frist.datum": formatDateShort(process.employerResponseDueAt),
  };
}

type CaseToast = {
  id: number;
  variant: "ok" | "warning";
  text: string;
};

export function CasesView({
  cases,
  contacts,
  target,
  onCreateCase,
  onCreateDeadline,
  onCreateContact,
  onCasesChanged,
  onTargetConsumed,
}: {
  cases: CaseRecord[];
  contacts: ContactRecord[];
  target?: CaseNodeTarget | null;
  onCreateCase: (input: {
    caseNumber: string;
    displayName: string;
    category: CaseCategory;
    summary?: string;
  }) => Promise<void>;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>;
  onCasesChanged: () => Promise<void>;
  onTargetConsumed?: () => void;
}) {
  const [caseNumber, setCaseNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState<CaseCategory>("bem");
  const [summary, setSummary] = useState("");
  const [isCaseCreateModalOpen, setIsCaseCreateModalOpen] = useState(false);
  const [caseProcessDraft, setCaseProcessDraft] =
    useState<CaseProcessDraft | null>(null);
  const [processTemplateModal, setProcessTemplateModal] =
    useState<ProcessTemplateModalState | null>(null);
  const [error, setError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [caseToast, setCaseToast] = useState<CaseToast | null>(null);
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();

  const [caseLoadError, setCaseLoadError] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [caseRegisterPage, setCaseRegisterPage] = useState(1);
  const {
    selectedCaseId,
    setSelectedCaseId,
    selectedCase,
    notes,
    documents,
    caseLegalReferences,
    setCaseLegalReferences,
    casePreventionProcesses,
    caseBemProcesses,
    caseEqualizationProcesses,
    caseTerminationProcesses,
    caseParticipationProcesses,
    selection,
    setSelection,
    reloadSelectedCaseChildren,
  } = useCaseWorkbenchData({
    cases,
    target,
    onTargetConsumed,
    onError: setCaseLoadError,
  });
  const filteredCases = useCaseRegisterFilter(cases, caseFilter);
  const caseRegisterPageSize = 5;
  const caseRegisterPageCount = Math.max(
    1,
    Math.ceil(filteredCases.length / caseRegisterPageSize),
  );
  const normalizedCaseRegisterPage = Math.min(
    caseRegisterPage,
    caseRegisterPageCount,
  );
  const visibleCases = filteredCases.slice(
    (normalizedCaseRegisterPage - 1) * caseRegisterPageSize,
    normalizedCaseRegisterPage * caseRegisterPageSize,
  );
  const {
    searchQuery,
    setSearchQuery,
    searchOnlySelectedCase,
    setSearchOnlySelectedCase,
    searchResults,
    searchError,
    setSearchError,
    runSearch,
  } = useCaseWorkbenchSearch({
    selectedCaseId,
    onSelect: setSelection,
  });

  const selectedNote =
    selection.type === "note"
      ? notes.find((note) => note.id === selection.id)
      : undefined;
  const selectedDocument =
    selection.type === "document"
      ? documents.find((doc) => doc.id === selection.id)
      : undefined;
  const selectedSearchResult =
    selection.type === "search"
      ? searchResults.find((result) => result.sourceId === selection.id)
      : undefined;
  const selectedPreventionProcess =
    selection.type === "process" &&
    selection.processType === "prevention" &&
    selection.id
      ? casePreventionProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedBemProcess =
    selection.type === "process" &&
    selection.processType === "bem" &&
    selection.id
      ? caseBemProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedEqualizationProcess =
    selection.type === "process" &&
    selection.processType === "equalization" &&
    selection.id
      ? caseEqualizationProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedTerminationProcess =
    selection.type === "process" &&
    selection.processType === "termination_hearing" &&
    selection.id
      ? caseTerminationProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedParticipationProcess =
    selection.type === "process" &&
    selection.processType === "participation" &&
    selection.id
      ? caseParticipationProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedEqualizationNotes = selectedEqualizationProcess
    ? notes.filter((note) =>
        (note.content ?? "").includes(
          `[[equalization:${selectedEqualizationProcess.id}]]`,
        ),
      )
    : [];
  const documentActions = createCaseDocumentActions({
    importDocuments,
    openDocument,
    exportDocument,
    deleteDocument,
  });

  const noteEditor = useCaseNoteEditor({
    selectedCaseId,
    searchQuery,
    reloadSelectedCaseChildren,
    runSearch,
    setSelection,
  });
  const {
    bindClearInlineDrafts,
    isNoteModalOpen,
    editingNote,
    noteTitle,
    setNoteTitle,
    noteDate,
    setNoteDate,
    noteType,
    setNoteType,
    participants,
    setParticipants,
    content,
    setContent,
    nextSteps,
    setNextSteps,
    containsHealthData,
    setContainsHealthData,
    confidentialLevel,
    setConfidentialLevel,
    linkedCaseIds,
    setLinkedCaseIds,
    noteError,
    setNoteError,
    noteInfo,
    setNoteInfo,
    startEditNote,
    toggleLinkedCase,
    openNewNoteModal,
    cancelNoteModal,
    saveNote,
    ensureSelectedCaseLink,
  } = noteEditor;

  useEffect(() => {
    if (caseLoadError) setNoteError(caseLoadError);
  }, [caseLoadError, setNoteError]);

  const inlineCommands = useInlineCommands({
    selectedCaseId,
    selectedCase,
    noteTitle,
    content,
    setContent,
    nextSteps,
    setNextSteps,
    confidentialLevel,
    setConfidentialLevel,
    setLinkedCaseIds,
    setCaseLegalReferences,
    setNoteInfo,
    setNoteError,
    onCreateDeadline,
    onCreateContact,
    onStructuredActionCreated: async () => {
      await reloadSelectedCaseChildren();
      await onCasesChanged();
    },
  });

  bindClearInlineDrafts(inlineCommands.clearInlineDrafts);

  useEffect(() => {
    if (noteInfo) announce(noteInfo, "polite");
  }, [noteInfo, announce]);

  useEffect(() => {
    const message = noteError || documentError || error || caseLoadError;
    if (message) announce(message, "assertive");
  }, [noteError, documentError, error, caseLoadError, announce]);

  useEffect(() => {
    if (caseToast?.text)
      announce(
        caseToast.text,
        caseToast.variant === "warning" ? "assertive" : "polite",
      );
  }, [caseToast, announce]);

  function pushCaseToast(text: string, variant: "ok" | "warning" = "ok") {
    const id = Date.now();
    setCaseToast({ id, text, variant });
    window.setTimeout(() => {
      setCaseToast((current: CaseToast | null) =>
        current?.id === id ? null : current,
      );
    }, 4200);
  }

  useEffect(() => {
    ensureSelectedCaseLink();
  }, [selectedCaseId, editingNote]);

  useEffect(() => {
    function openCaseModalFromShortcut() {
      openCaseCreateModal();
    }

    function focusCaseSearchFromShortcut() {
      const target = document.querySelector<HTMLInputElement>(
        '[data-global-search-target=\"cases\"]',
      );
      target?.focus();
      target?.select();
    }

    window.addEventListener(
      "gremia-sbv:create-case",
      openCaseModalFromShortcut,
    );
    window.addEventListener(
      "gremia-sbv:focus-search",
      focusCaseSearchFromShortcut,
    );
    return () => {
      window.removeEventListener(
        "gremia-sbv:create-case",
        openCaseModalFromShortcut,
      );
      window.removeEventListener(
        "gremia-sbv:focus-search",
        focusCaseSearchFromShortcut,
      );
    };
  }, []);

  useEffect(() => {
    if (!noteInfo) return;
    pushCaseToast(noteInfo, "ok");
    setNoteInfo("");
  }, [noteInfo]);

  useEffect(() => {
    if (!noteError) return;
    pushCaseToast(noteError, "warning");
    setNoteError("");
  }, [noteError]);

  useEffect(() => {
    if (!documentError) return;
    pushCaseToast(documentError, "warning");
    setDocumentError("");
  }, [documentError]);

  useEffect(() => {
    if (!searchError) return;
    pushCaseToast(searchError, "warning");
    setSearchError("");
  }, [searchError]);

  async function updateCasePreventionProcess(
    processId: string,
    input: UpdatePreventionProcessInput,
  ) {
    setNoteError("");
    setNoteInfo("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.prevention)
        throw new Error("Präventionsdienst ist nicht erreichbar.");
      await bridge.prevention.update(processId, input);
      await reloadSelectedCaseChildren();
      setNoteInfo("Präventionsverfahren wurde aktualisiert.");
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Präventionsverfahren konnte nicht aktualisiert werden.",
      );
    }
  }

  async function updateCaseBemProcess(
    processId: string,
    input: UpdateBemProcessInput,
  ) {
    setNoteError("");
    setNoteInfo("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.bem) throw new Error("BEM-Dienst ist nicht erreichbar.");
      await bridge.bem.update(processId, input);
      await reloadSelectedCaseChildren();
      setNoteInfo("BEM-Verfahren wurde aktualisiert.");
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "BEM-Verfahren konnte nicht aktualisiert werden.",
      );
    }
  }

  async function updateCaseTerminationProcess(
    processId: string,
    input: UpdateTerminationHearingInput,
  ) {
    setNoteError("");
    setNoteInfo("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.termination)
        throw new Error("Kündigungsdienst ist nicht erreichbar.");
      await bridge.termination.update(processId, input);
      await reloadSelectedCaseChildren();
      setNoteInfo("Kündigungsanhörung wurde aktualisiert.");
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Kündigungsanhörung konnte nicht aktualisiert werden.",
      );
    }
  }

  async function updateCaseParticipationProcess(
    processId: string,
    input: UpdateParticipationInput,
  ) {
    setNoteError("");
    setNoteInfo("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.participation)
        throw new Error("Beteiligungsdienst ist nicht erreichbar.");
      await bridge.participation.update(processId, input);
      await reloadSelectedCaseChildren();
      setNoteInfo("SBV-Beteiligungsmaßnahme wurde aktualisiert.");
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "SBV-Beteiligungsmaßnahme konnte nicht aktualisiert werden.",
      );
    }
  }

  async function createEqualizationSecureNote(
    process: EqualizationProcessRecord,
    content: string,
  ) {
    if (!selectedCase) return;
    setNoteError("");
    setNoteInfo("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.createNote({
        caseId: selectedCase.id,
        caseIds: [selectedCase.id],
        title: "Gleichstellung/GdB – verschlüsselte Notiz",
        noteDate: new Date().toISOString(),
        noteType: "interne_notiz",
        participants: "",
        content: `[[equalization:${process.id}]]\n${content}`,
        nextSteps:
          "Bei Bedarf Antrag, Bescheid oder Widerspruchsfrist aktualisieren.",
        containsHealthData: true,
        confidentialLevel: "hoch_sensibel",
      });
      await reloadSelectedCaseChildren();
      setNoteInfo(
        "Gleichstellungs-/GdB-Notiz wurde als verschlüsselte Fallnotiz gespeichert.",
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Gleichstellungsnotiz konnte nicht gespeichert werden.",
      );
    }
  }

  async function updateCaseEqualizationProcess(
    processId: string,
    input: UpdateEqualizationProcessInput,
  ) {
    setNoteError("");
    setNoteInfo("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.equalization)
        throw new Error("Gleichstellungsdienst ist nicht erreichbar.");
      await bridge.equalization.update(processId, input);
      await reloadSelectedCaseChildren();
      setNoteInfo("Gleichstellungs-/GdB-Verfahren wurde aktualisiert.");
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Gleichstellungsverfahren konnte nicht aktualisiert werden.",
      );
    }
  }

  async function openProcessTemplateModal(
    process:
      | PreventionProcessRecord
      | BemProcessRecord
      | EqualizationProcessRecord
      | TerminationHearingRecord,
  ) {
    const processType = isBemProcessRecord(process)
      ? "bem"
      : isEqualizationProcessRecord(process)
        ? "equalization"
        : isTerminationHearingRecord(process)
          ? "termination_hearing"
          : "prevention";
    const category =
      processType === "bem"
        ? "bem"
        : processType === "equalization"
          ? "gleichstellung"
          : processType === "termination_hearing"
            ? "kuendigung"
            : "praevention";
    const status = isEqualizationProcessRecord(process)
      ? process.applicationStatus
      : process.status;
    setProcessTemplateModal({
      process,
      processType,
      templates: [],
      loading: true,
    });
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates)
        throw new Error("Vorlagendienst ist nicht erreichbar.");
      const rows = await bridge.templates.list({ category, limit: 500 });
      const templates = rows.filter((template: TemplateRecord) =>
        isTemplateConnectedToProcessStatus(template, processType, status),
      );
      setProcessTemplateModal({
        process,
        processType,
        templates,
        loading: false,
      });
    } catch (error) {
      setProcessTemplateModal({
        process,
        processType,
        templates: [],
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Vorlagen konnten nicht geladen werden.",
      });
    }
  }

  async function renderAndDownloadProcessTemplate(template: TemplateRecord) {
    if (!processTemplateModal) return;
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates)
        throw new Error("Vorlagendienst ist nicht erreichbar.");
      const defaultValues = await loadTemplateDefaultValues();
      const result = await (
        bridge.templates.render as unknown as (
          input: Record<string, unknown>,
        ) => Promise<RenderedTemplateResult>
      )({
        templateId: template.id,
        caseId: selectedCase?.id,
        sourceId: processTemplateModal.process.id,
        values: {
          ...defaultValues,
          ...buildProcessTemplateValues(
            selectedCase,
            processTemplateModal.process,
          ),
        },
        archive: true,
      });
      if (processTemplateModal.processType === "bem") {
        const scan = scanBemProcessExport({
          title: result.title,
          body: result.body,
          status: isEqualizationProcessRecord(processTemplateModal.process)
            ? processTemplateModal.process.applicationStatus
            : processTemplateModal.process.status,
          containsConfidentialNotes:
            isBemProcessRecord(processTemplateModal.process) &&
            Boolean(processTemplateModal.process.confidentialNotes),
          unresolvedPlaceholders: result.unresolvedPlaceholders,
        });
        const confirmed = await confirmDialog({
          variant: "warning",
          title: "BEM-Dokument exportieren?",
          message: buildExportWarningMessage(scan),
          confirmLabel: "Export bestätigen",
          cancelLabel: "Abbrechen",
        });
        if (!confirmed) {
          setProcessTemplateModal((current) =>
            current
              ? {
                  ...current,
                  rendered: result,
                  info: "Export wurde abgebrochen. Das Dokument bleibt im Verlauf archiviert.",
                  error: undefined,
                }
              : current,
          );
          return;
        }
      } else if (
        processTemplateModal.processType === "termination_hearing" &&
        isTerminationHearingRecord(processTemplateModal.process)
      ) {
        const scan = scanSensitiveExportText(
          `${result.subject}\n\n${result.body}\n\n${buildTerminationExportContext(processTemplateModal.process)}\n\n${terminationPrivacyExportNotice()}`,
          {
            context: "Kündigungsanhörung-Export",
            target: result.title,
          },
        );
        const confirmed = await confirmDialog({
          variant: "warning",
          title: "Kündigungsdokument exportieren?",
          message: buildExportWarningMessage(scan),
          confirmLabel: "Export bestätigen",
          cancelLabel: "Abbrechen",
        });
        if (!confirmed) {
          setProcessTemplateModal((current) =>
            current
              ? {
                  ...current,
                  rendered: result,
                  info: "Export wurde abgebrochen. Das Dokument bleibt im Verlauf archiviert.",
                  error: undefined,
                }
              : current,
          );
          return;
        }
      } else {
        const scan = scanSensitiveExportText(result.body, {
          context: "Dokumentenexport",
          target: result.title,
        });
        const confirmed = await confirmDialog({
          variant: "warning",
          title: "Dokument exportieren?",
          message: buildExportWarningMessage(scan),
          confirmLabel: "Export bestätigen",
          cancelLabel: "Abbrechen",
        });
        if (!confirmed) {
          setProcessTemplateModal((current) =>
            current
              ? {
                  ...current,
                  rendered: result,
                  info: "Export wurde abgebrochen. Das Dokument bleibt im Verlauf archiviert.",
                  error: undefined,
                }
              : current,
          );
          return;
        }
      }
      downloadRenderedTemplate(result);
      setProcessTemplateModal((current) =>
        current
          ? {
              ...current,
              rendered: result,
              info: "Dokument wurde erzeugt, heruntergeladen und im Vorlagenverlauf archiviert.",
              error: undefined,
            }
          : current,
      );
    } catch (error) {
      setProcessTemplateModal((current) =>
        current
          ? {
              ...current,
              error:
                error instanceof Error
                  ? error.message
                  : "Dokument konnte nicht erzeugt werden.",
            }
          : current,
      );
    }
  }

  function openCaseProcessDraft(processType: CaseProcessType) {
    if (!selectedCaseId) {
      setNoteError("Bitte zuerst eine Fallakte auswählen.");
      return;
    }
    setCaseProcessDraft(defaultCaseProcessDraft(processType));
  }

  async function createCaseProcessFromDraft() {
    if (!selectedCase || !caseProcessDraft) return;
    setNoteError("");
    setNoteInfo("");
    try {
      const bridge = await waitForBridge();
      if (caseProcessDraft.processType === "prevention") {
        if (!bridge?.prevention)
          throw new Error("Präventionsdienst ist nicht erreichbar.");
        const created = await bridge.prevention.create({
          caseId: selectedCase.id,
          hazardDescription:
            caseProcessDraft.description.trim() ||
            `Präventionsverfahren aus Fallakte ${selectedCase.caseNumber} gestartet.`,
          employerResponseDueAt: caseProcessDraft.dueAt
            ? fromDateTimeLocalValue(caseProcessDraft.dueAt)
            : undefined,
          difficultyType: "gesundheitlich_arbeitsplatzbezogen",
          riskType: "ueberlastung",
          personStatus: "unklar",
          contactIds: [],
          createDefaultDeadlines: true,
        });
        setCaseProcessDraft(null);
        setSelection({
          type: "process",
          processType: "prevention",
          id: created.id,
        });
        setNoteInfo(
          "Präventionsverfahren wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.",
        );
        await reloadSelectedCaseChildren();
        await onCasesChanged();
        return;
      }

      if (caseProcessDraft.processType === "bem") {
        if (!bridge?.bem) throw new Error("BEM-Dienst ist nicht erreichbar.");
        const created = await bridge.bem.create({
          caseId: selectedCase.id,
          title: caseProcessDraft.title.trim() || "BEM-Verfahren",
          triggerDescription:
            caseProcessDraft.description.trim() ||
            `BEM-Verfahren aus Fallakte ${selectedCase.caseNumber} gestartet.`,
          triggerType: "sbv_anregung",
          responseDueAt: caseProcessDraft.dueAt
            ? fromDateTimeLocalValue(caseProcessDraft.dueAt)
            : undefined,
          contactIds: [],
          createDefaultDeadlines: true,
        });
        setCaseProcessDraft(null);
        setSelection({ type: "process", processType: "bem", id: created.id });
        setNoteInfo(
          "BEM-Verfahren wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.",
        );
        await reloadSelectedCaseChildren();
        await onCasesChanged();
        return;
      }

      if (caseProcessDraft.processType === "participation") {
        if (!bridge?.participation)
          throw new Error("Beteiligungsdienst ist nicht erreichbar.");
        const created = await bridge.participation.create({
          caseId: selectedCase.id,
          title: caseProcessDraft.title.trim() || "SBV-Beteiligung",
          measureType: "sonstiges",
          riskLevel: "erhoeht",
          decisionStage: "unklar",
          personStatus: "unklar",
          firstKnownAt: new Date().toISOString(),
          statementDueAt: caseProcessDraft.dueAt
            ? fromDateTimeLocalValue(caseProcessDraft.dueAt)
            : undefined,
          violationSummary: caseProcessDraft.description.trim() || undefined,
          nextStep: "Beteiligung nach § 178 Abs. 2 SGB IX in der Fallakte weiter prüfen.",
          createDefaultDeadlines: true,
        });
        setCaseProcessDraft(null);
        setSelection({
          type: "process",
          processType: "participation",
          id: created.id,
        });
        setNoteInfo(
          "SBV-Beteiligungsmaßnahme wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.",
        );
        await reloadSelectedCaseChildren();
        await onCasesChanged();
        return;
      }

      if (caseProcessDraft.processType === "termination_hearing") {
        if (!bridge?.termination)
          throw new Error("Kündigungsdienst ist nicht erreichbar.");
        const created = await bridge.termination.create({
          caseId: selectedCase.id,
          status: "eingang",
          terminationType: "sonstiges",
          protectionStatus: "unklar",
          receivedAt: new Date().toISOString(),
          sbvStatementDueAt: caseProcessDraft.dueAt
            ? fromDateTimeLocalValue(caseProcessDraft.dueAt)
            : undefined,
          employerReason: caseProcessDraft.description.trim() || undefined,
        });
        setCaseProcessDraft(null);
        setSelection({
          type: "process",
          processType: "termination_hearing",
          id: created.id,
        });
        setNoteInfo(
          "Kündigungsanhörung wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.",
        );
        await reloadSelectedCaseChildren();
        await onCasesChanged();
        return;
      }

      if (caseProcessDraft.processType === "equalization") {
        if (!bridge?.equalization)
          throw new Error("Gleichstellungsdienst ist nicht erreichbar.");
        const created = await bridge.equalization.create({
          caseId: selectedCase.id,
          applicationStatus: "beratung",
          objectionDueAt: caseProcessDraft.dueAt
            ? fromDateTimeLocalValue(caseProcessDraft.dueAt)
            : undefined,
        });
        if (caseProcessDraft.description.trim()) {
          await bridge.cases.createNote({
            caseId: selectedCase.id,
            caseIds: [selectedCase.id],
            title: `Gleichstellung/GdB – verschlüsselte Startnotiz`,
            noteDate: new Date().toISOString(),
            noteType: "interne_notiz",
            participants: "",
            content: `[[equalization:${created.id}]]\n${caseProcessDraft.description.trim()}`,
            nextSteps: "Gleichstellungs-/GdB-Verfahren weiter bearbeiten.",
            containsHealthData: true,
            confidentialLevel: "hoch_sensibel",
          });
        }
        setCaseProcessDraft(null);
        setSelection({
          type: "process",
          processType: "equalization",
          id: created.id,
        });
        setNoteInfo(
          "Gleichstellungs-/GdB-Verfahren wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.",
        );
        await reloadSelectedCaseChildren();
        await onCasesChanged();
        return;
      }

      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.createNote({
        caseId: selectedCase.id,
        caseIds: [selectedCase.id],
        title: `${caseProcessDraft.title} vorgemerkt`,
        noteDate: new Date().toISOString(),
        noteType: "interne_notiz",
        participants: "",
        content: `${caseProcessDraft.title} wurde an dieser Fallakte als Fachmaßnahme vorgemerkt.

${caseProcessDraft.description}`,
        nextSteps:
          "Fachmodul öffnen, sobald der strukturierte Workflow verfügbar ist.",
        containsHealthData: true,
        confidentialLevel: "sensibel",
      });
      setCaseProcessDraft(null);
      setSelection({
        type: "process",
        processType: caseProcessDraft.processType,
      });
      setNoteInfo(
        `${caseProcessDraft.title} wurde als fallbezogene Maßnahme vorgemerkt.`,
      );
      await reloadSelectedCaseChildren();
      await onCasesChanged();
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Maßnahme konnte nicht angelegt werden.",
      );
    }
  }

  function openCaseCreateModal() {
    setError("");
    setIsCaseCreateModalOpen(true);
  }

  function cancelCaseCreateModal() {
    setIsCaseCreateModalOpen(false);
    setError("");
  }

  async function addCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!caseNumber.trim() || !displayName.trim()) {
      setError("Bitte Aktenzeichen und Namen/Pseudonym erfassen.");
      return;
    }

    try {
      await onCreateCase({
        caseNumber: caseNumber.trim(),
        displayName: displayName.trim(),
        category,
        summary: summary.trim() || undefined,
      });
      setCaseNumber("");
      setDisplayName("");
      setSummary("");
      setIsCaseCreateModalOpen(false);
      await onCasesChanged();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Fall konnte nicht angelegt werden.",
      );
    }
  }

  async function deleteNote(note: CaseNoteRecord) {
    setNoteError("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.deleteNote(note.id);
      if (editingNote?.id === note.id) noteEditor.resetNoteForm();
      await reloadSelectedCaseChildren();
      setSelection({ type: "overview" });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Gesprächsnotiz konnte nicht gelöscht werden.",
      );
    }
  }

  async function importDocuments() {
    setDocumentError("");
    if (!selectedCaseId) {
      setDocumentError("Bitte zuerst eine Fallakte auswählen.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      const imported = await bridge.cases.selectAndImportDocuments(
        selectedCaseId,
        true,
      );
      await reloadSelectedCaseChildren();
      if (imported.length)
        setSelection({ type: "document", id: imported[0].id });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Dokument konnte nicht importiert werden.",
      );
    }
  }

  async function openDocument(document: CaseDocumentRecord) {
    setDocumentError("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.openDocument(document.id);
    } catch (error) {
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Dokument konnte nicht geöffnet werden.",
      );
    }
  }

  async function exportDocument(document: CaseDocumentRecord) {
    setDocumentError("");
    const scan = scanSensitiveExportText(
      `${document.filename} ${selectedCase?.caseNumber ?? ""} ${selectedCase?.displayName ?? ""}`,
      {
        context: "Dokumentenexport",
        target: document.filename,
      },
    );
    const confirmed = await confirmDialog({
      variant: "warning",
      title: "Dokument exportieren?",
      message: buildExportWarningMessage(scan),
      confirmLabel: "Exportieren",
      cancelLabel: "Abbrechen",
    });
    if (!confirmed) return;
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.exportDocument(document.id, document.filename);
      announce("Dokument wurde exportiert.", "polite");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Dokument konnte nicht exportiert werden.";
      setDocumentError(message);
      announce(message, "assertive");
    }
  }

  async function deleteDocument(document: CaseDocumentRecord) {
    setDocumentError("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.deleteDocument(document.id);
      await reloadSelectedCaseChildren();
      setSelection({ type: "overview" });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Dokument konnte nicht gelöscht werden.",
      );
    }
  }

  return (
    <>
      {caseToast && (
        <div
          className={`case-toast case-toast-${caseToast.variant}`}
          role="status"
          aria-live="assertive"
        >
          {caseToast.variant === "warning" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>{caseToast.text}</span>
        </div>
      )}
      <ProcessTemplateDocumentsModal
        state={processTemplateModal}
        onClose={() => setProcessTemplateModal(null)}
        onDownload={(template) =>
          void renderAndDownloadProcessTemplate(template)
        }
        processTypeLabel={processTypeLabel}
      />
      <CaseRegister
        filteredCount={filteredCases.length}
        visibleCases={visibleCases}
        selectedCaseId={selectedCaseId}
        caseFilter={caseFilter}
        onCaseFilterChange={(value) => {
          setCaseFilter(value);
          setCaseRegisterPage(1);
        }}
        onSelectCase={setSelectedCaseId}
        onCreateCase={openCaseCreateModal}
        page={normalizedCaseRegisterPage}
        pageCount={caseRegisterPageCount}
        pageSize={caseRegisterPageSize}
        onPageChange={setCaseRegisterPage}
      />

      <section className="case-workbench">
        <CaseTreePanel
          selectedCase={selectedCase}
          notes={notes}
          documents={documents}
          preventionProcesses={casePreventionProcesses}
          bemProcesses={caseBemProcesses}
          equalizationProcesses={caseEqualizationProcesses}
          terminationProcesses={caseTerminationProcesses}
          participationProcesses={caseParticipationProcesses}
          selection={selection}
          onSelect={setSelection}
          formatProcessNodeSubtitle={formatProcessNodeSubtitle}
          formatNoteDate={formatNoteDate}
          formatBytes={formatBytes}
        />

        <CaseDetailPanel
          searchQuery={searchQuery}
          searchOnlySelectedCase={searchOnlySelectedCase}
          searchResults={searchResults}
          onSearchSubmit={runSearch}
          onSearchQueryChange={setSearchQuery}
          onSearchOnlySelectedCaseChange={setSearchOnlySelectedCase}
          onSelectSearchResult={(result) =>
            setSelection({ type: "search", id: result.sourceId })
          }
        >
          {selection.type === "overview" && (
            <CaseOverviewDetail
              selectedCase={selectedCase}
              notesCount={notes.length}
              documentsCount={documents.length}
              legalReferencesCount={caseLegalReferences.length}
              processesCount={
                casePreventionProcesses.length +
                caseBemProcesses.length +
                caseEqualizationProcesses.length +
                caseTerminationProcesses.length +
                caseParticipationProcesses.length
              }
              contextualTemplateActions={
                selectedCase &&
                (() => {
                  const action = resolveContextualTemplateAction({
                    sourceType: "case",
                    title: "Fallübersicht",
                  });
                  return action ? (
                    <div className="contextual-template-actions">
                      <ContextualTemplateButton
                        action={action}
                        caseId={selectedCase.id}
                        values={{
                          "fall.aktenzeichen": selectedCase.caseNumber,
                          "fall.name": selectedCase.displayName,
                          "fall.kurzbeschreibung": selectedCase.summary ?? "",
                        }}
                      />
                    </div>
                  ) : null;
                })()
              }
            />
          )}

          {selection.type === "process" &&
            selection.processType === "prevention" && (
              <PreventionProcessDetail
                processType={selection.processType}
                process={selectedPreventionProcess}
                onUpdate={updateCasePreventionProcess}
                onOpenTemplates={openProcessTemplateModal}
              />
            )}

          {selection.type === "process" && selection.processType === "bem" && (
            <BemProcessDetail
              processType={selection.processType}
              process={selectedBemProcess}
              onUpdate={updateCaseBemProcess}
              onOpenTemplates={openProcessTemplateModal}
            />
          )}

          {selection.type === "process" &&
            selection.processType === "termination_hearing" &&
            selectedTerminationProcess && (
              <TerminationProcessDetail
                process={selectedTerminationProcess}
                onUpdate={updateCaseTerminationProcess}
                onOpenTemplates={openProcessTemplateModal}
              />
            )}

          {selection.type === "process" &&
            selection.processType === "equalization" &&
            selectedEqualizationProcess && (
              <EqualizationProcessDetail
                process={selectedEqualizationProcess}
                onUpdate={updateCaseEqualizationProcess}
                onOpenTemplates={openProcessTemplateModal}
                secureNotes={selectedEqualizationNotes}
                onCreateSecureNote={createEqualizationSecureNote}
              />
            )}



          {selection.type === "process" &&
            selection.processType === "participation" &&
            selectedParticipationProcess && (
              <ParticipationProcessDetail
                process={selectedParticipationProcess}
                onUpdate={updateCaseParticipationProcess}
              />
            )}

          {selectedNote && (
            <article className="case-detail-content">
              <div className="case-note-card-header">
                <span className="industrial-badge">
                  {selectedNote.noteType}
                </span>
                <time>{formatNoteDate(selectedNote.noteDate)}</time>
              </div>
              <h2>{selectedNote.title}</h2>
              {selectedNote.participants && (
                <p className="industrial-meta">
                  Beteiligte: {selectedNote.participants}
                </p>
              )}
              {!!selectedNote.caseNumbers?.length && (
                <p className="industrial-meta">
                  Fallbezüge: {selectedNote.caseNumbers.join(", ")}
                </p>
              )}
              <p className="case-note-content">{selectedNote.content}</p>
              {selectedNote.nextSteps && (
                <p className="case-note-next">
                  <strong>Nächste Schritte:</strong> {selectedNote.nextSteps}
                </p>
              )}
              <div className="industrial-card-actions">
                <button
                  type="button"
                  className="industrial-secondary-button"
                  onClick={() => startEditNote(selectedNote)}
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  className="industrial-secondary-button"
                  onClick={() => void deleteNote(selectedNote)}
                >
                  <Trash2 className="h-4 w-4" /> Löschen
                </button>
              </div>
            </article>
          )}

          <CaseDocumentDetail
            document={selectedDocument}
            formatNoteDate={formatNoteDate}
            formatBytes={formatBytes}
            onOpen={(document) => void documentActions.openDocument(document)}
            onExport={(document) =>
              void documentActions.exportDocument(document)
            }
            onDelete={(document) =>
              void documentActions.deleteDocument(document)
            }
          />

          {selectedSearchResult && !selectedNote && !selectedDocument && (
            <article className="case-detail-content">
              <h2>{selectedSearchResult.title}</h2>
              <p>{selectedSearchResult.excerpt}</p>
              <button
                type="button"
                className="industrial-secondary-button"
                onClick={() => setSelectedCaseId(selectedSearchResult.caseId)}
              >
                Fallakte öffnen
              </button>
            </article>
          )}

          <CaseWorkbenchFooter
            disabled={!selectedCaseId}
            onNewNote={openNewNoteModal}
            onImportDocument={() => void documentActions.importDocuments()}
            onDeadline={inlineCommands.openCaseDeadlineDraft}
            onProcess={openCaseProcessDraft}
          />
        </CaseDetailPanel>
      </section>

      <CaseCreateModal
        open={isCaseCreateModalOpen}
        caseNumber={caseNumber}
        displayName={displayName}
        category={category}
        summary={summary}
        error={error}
        onCaseNumberChange={setCaseNumber}
        onDisplayNameChange={setDisplayName}
        onCategoryChange={setCategory}
        onSummaryChange={setSummary}
        onCancel={cancelCaseCreateModal}
        onSubmit={addCase}
      />

      <CaseNoteModal
        open={isNoteModalOpen}
        editingNote={editingNote}
        noteTitle={noteTitle}
        noteDate={noteDate}
        noteType={noteType}
        participants={participants}
        content={content}
        nextSteps={nextSteps}
        cases={cases}
        linkedCaseIds={linkedCaseIds}
        selectedCaseId={selectedCaseId}
        confidentialLevel={confidentialLevel}
        containsHealthData={containsHealthData}
        noteError={noteError}
        noteInfo={noteInfo}
        onTitleChange={setNoteTitle}
        onDateChange={setNoteDate}
        onNoteTypeChange={setNoteType}
        onParticipantsChange={setParticipants}
        onProtocolTextChange={inlineCommands.handleProtocolTextChange}
        onToggleLinkedCase={toggleLinkedCase}
        onConfidentialLevelChange={setConfidentialLevel}
        onContainsHealthDataChange={setContainsHealthData}
        onCancel={cancelNoteModal}
        onSubmit={saveNote}
      />

      <CaseProcessDraftModal
        draft={caseProcessDraft}
        onChange={(nextDraft) => setCaseProcessDraft(nextDraft)}
        onCancel={() => setCaseProcessDraft(null)}
        onCreate={() => void createCaseProcessFromDraft()}
      />

      <InlineCommandOverlays
        cases={cases}
        contacts={contacts}
        selectedCase={selectedCase}
        {...inlineCommands.overlayProps}
      />
    </>
  );
}

export function SettingsView({
  theme,
  onThemeChange,
  cases,
}: {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  cases: CaseRecord[];
}) {
  return (
    <ModuleFrame
      title="Einstellungen"
      kicker="System"
      description="Passwortverwaltung, Darstellung und lokale Anwendungseinstellungen."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <ThemeSettingsForm theme={theme} onThemeChange={onThemeChange} />
        <TemplateDefaultSettingsForm />
        <ChangePasswordForm />
        <TemporaryFilesSettingsPanel />
        <BackupRestoreForm />
        <RetentionSettingsPanel cases={cases} />
      </div>
    </ModuleFrame>
  );
}

function ThemeSettingsForm({
  theme,
  onThemeChange,
}: {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}) {
  return (
    <section className="industrial-settings-form">
      <div>
        <h3>Darstellung</h3>
        <p className="industrial-settings-note">
          Industrial bleibt die Designsprache. Der Light-Mode hellt nur die
          Arbeitsfläche auf, ohne daraus ein freundliches Wellness-Layout zu
          machen.
        </p>
      </div>

      <div
        className="industrial-theme-switch"
        role="group"
        aria-label="Darstellung auswählen"
      >
        <button
          type="button"
          className={theme === "dark" ? "active" : ""}
          onClick={() => onThemeChange("dark")}
        >
          <Moon className="h-4 w-4" />
          Dark Industrial
        </button>
        <button
          type="button"
          className={theme === "light" ? "active" : ""}
          onClick={() => onThemeChange("light")}
        >
          <Sun className="h-4 w-4" />
          Light Industrial
        </button>
      </div>
    </section>
  );
}

function TemplateDefaultSettingsForm() {
  const [values, setValues] = useState<TemplateDefaultValues>(
    EMPTY_TEMPLATE_DEFAULT_VALUES,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadTemplateDefaultValues()
      .then((loaded) => {
        if (!active) return;
        setValues(loaded);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Standardwerte konnten nicht geladen werden.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const saved = await saveTemplateDefaultValues(values);
      setValues(saved);
      setMessage("Standardwerte wurden gespeichert.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Standardwerte konnten nicht gespeichert werden.",
      );
    }
  }

  function updateValue(key: TemplateDefaultKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      onSubmit={submit}
      className="industrial-settings-form template-default-settings xl:col-span-2"
    >
      <div>
        <h3>Vorlagen & Standardwerte</h3>
        <p className="industrial-settings-note">
          Diese Werte füllen allgemeine Platzhalter wie{" "}
          <code>{"{{sbv.name}}"}</code> oder{" "}
          <code>{"{{arbeitgeber.ansprechpartner}}"}</code>. Konkrete Fall-,
          Frist- oder Maßnahmendaten überschreiben diese Standardwerte beim
          Erzeugen eines Schreibens.
        </p>
      </div>

      {loading ? (
        <div className="industrial-empty">Standardwerte werden geladen …</div>
      ) : (
        <div className="template-default-grid">
          {TEMPLATE_DEFAULT_FIELDS.map((field) => (
            <label
              key={field.key}
              className={field.multiline ? "template-default-wide" : undefined}
            >
              <span>{field.label}</span>
              <small>{field.description}</small>
              {field.multiline ? (
                <TextCommandTextarea
                  fieldId={`template-default-${field.key}`}
                  value={values[field.key]}
                  onChange={(event) =>
                    updateValue(field.key, event.target.value)
                  }
                />
              ) : (
                <input
                  value={values[field.key]}
                  onChange={(event) =>
                    updateValue(field.key, event.target.value)
                  }
                />
              )}
            </label>
          ))}
        </div>
      )}

      {error && (
        <div className="industrial-message industrial-message-warning">
          {error}
        </div>
      )}
      {message && (
        <div className="industrial-message industrial-message-ok">
          {message}
        </div>
      )}

      <button type="submit" className="industrial-button" disabled={loading}>
        <Save className="h-4 w-4" /> Standardwerte speichern
      </button>
    </form>
  );
}

function TemporaryFilesSettingsPanel() {
  const [status, setStatus] = useState<{
    root: string;
    remaining: number;
    bytesRemaining: number;
    oldestRemainingAt?: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      const nextStatus =
        await window.gremiaSbv?.security?.temporaryFileStatus?.();
      if (nextStatus) setStatus(nextStatus);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Status der temporären Arbeitskopien konnte nicht geladen werden.",
      );
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function cleanup() {
    setMessage("");
    setError("");
    try {
      const result =
        await window.gremiaSbv?.security?.cleanupTemporaryFiles?.();
      setMessage(
        `Temporäre Arbeitskopien bereinigt: ${result?.deleted ?? 0} gelöscht, ${result?.remaining ?? 0} verbleibend.`,
      );
      await loadStatus();
    } catch (cleanupError) {
      setError(
        cleanupError instanceof Error
          ? cleanupError.message
          : "Temporäre Arbeitskopien konnten nicht bereinigt werden.",
      );
    }
  }

  return (
    <section className="industrial-settings-form">
      <div>
        <h3>Temporäre Arbeitskopien</h3>
        <p className="industrial-settings-note">
          Vorschauen und geöffnete PDF-Reports werden nur als kurzlebige lokale
          Arbeitskopien erzeugt. Beim Sperren werden diese Dateien automatisch
          bereinigt.
        </p>
      </div>
      <div className="industrial-list">
        <div>
          <strong>Dateien:</strong> {status?.remaining ?? "—"}
        </div>
        <div>
          <strong>Größe:</strong>{" "}
          {status ? `${Math.round(status.bytesRemaining / 1024)} KB` : "—"}
        </div>
        <div>
          <strong>Ordner:</strong> <code>{status?.root ?? "—"}</code>
        </div>
        <div>
          <strong>Älteste Datei:</strong>{" "}
          {status?.oldestRemainingAt
            ? new Date(status.oldestRemainingAt).toLocaleString("de-DE")
            : "—"}
        </div>
      </div>
      {error && (
        <div className="industrial-message industrial-message-warning">
          {error}
        </div>
      )}
      {message && (
        <div className="industrial-message industrial-message-ok">
          {message}
        </div>
      )}
      <button
        type="button"
        className="industrial-secondary-button"
        onClick={() => void cleanup()}
      >
        <ShieldCheck className="h-4 w-4" /> Temporäre Dateien jetzt löschen
      </button>
    </section>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== repeatPassword) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError(
          "Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.",
        );
        return;
      }

      const result = await bridge.security.changePassword(
        currentPassword,
        newPassword,
      );
      if (!result.ok) {
        setError(result.error ?? "Das Passwort konnte nicht geändert werden.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setMessage("Passwort wurde geändert.");
    } catch (error) {
      console.error("Gremia.SBV security operation failed", error);
      setError(
        "Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.",
      );
    }
  }

  return (
    <form onSubmit={submit} className="industrial-settings-form max-w-2xl">
      <h3>Passwort ändern</h3>
      <label>
        <span>Aktuelles Passwort</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </label>
      <label>
        <span>Neues Passwort</span>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </label>
      <label>
        <span>Neues Passwort wiederholen</span>
        <input
          type="password"
          value={repeatPassword}
          onChange={(event) => setRepeatPassword(event.target.value)}
        />
      </label>

      {error && (
        <div className="industrial-message industrial-message-warning">
          {error}
        </div>
      )}
      {message && (
        <div className="industrial-message industrial-message-ok">
          {message}
        </div>
      )}

      <button type="submit" className="industrial-button">
        Passwort ändern
      </button>
    </form>
  );
}

function BackupRestoreForm() {
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [verifyPassphrase, setVerifyPassphrase] = useState("");
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    BackupOperationResult | BackupInspectionResult | null
  >(null);
  const [error, setError] = useState("");

  function resetMessages() {
    setResult(null);
    setError("");
  }

  function validateBackupPassphrase(passphrase: string): string | null {
    if (passphrase.length < 12)
      return "Die Backup-Passphrase muss mindestens 12 Zeichen lang sein.";
    return null;
  }

  async function createBackup() {
    resetMessages();
    const validation = validateBackupPassphrase(backupPassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup)
        throw new Error("Backup-Dienst ist nicht erreichbar.");
      const operationResult = await bridge.backup.create(backupPassphrase);
      if (!operationResult.ok)
        setError(
          operationResult.error ?? "Backup konnte nicht erstellt werden.",
        );
      setResult(operationResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function inspectBackup() {
    resetMessages();
    const validation = validateBackupPassphrase(verifyPassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup)
        throw new Error("Backup-Dienst ist nicht erreichbar.");
      const operationResult = await bridge.backup.inspect(verifyPassphrase);
      if (!operationResult.ok)
        setError(
          operationResult.error ?? "Backup konnte nicht geprüft werden.",
        );
      setResult(operationResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup() {
    resetMessages();
    const validation = validateBackupPassphrase(restorePassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup)
        throw new Error("Backup-Dienst ist nicht erreichbar.");
      const operationResult = await bridge.backup.restore(
        restorePassphrase,
        restoreConfirmation,
      );
      if (!operationResult.ok)
        setError(
          operationResult.error ??
            "Backup konnte nicht wiederhergestellt werden.",
        );
      setResult(operationResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="industrial-settings-form xl:col-span-2">
      <div>
        <h3>Backup & Wiederherstellung</h3>
        <p className="industrial-settings-note">
          Backups werden als verschlüsselte <code>.gsbvbackup</code>-Datei
          erzeugt. Die Datei enthält Datenbank, Sicherheitsmanifest, Dokumente
          und verschlüsselte Berichtsexporte. Temporäre Klartextkopien werden
          nicht gesichert.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="industrial-subpanel">
          <h4>Backup erstellen</h4>
          <label>
            <span>Backup-Passphrase</span>
            <input
              type="password"
              value={backupPassphrase}
              onChange={(event) => setBackupPassphrase(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="industrial-button"
            disabled={busy}
            onClick={() => void createBackup()}
          >
            <Save className="h-4 w-4" /> Backup speichern
          </button>
        </div>

        <div className="industrial-subpanel">
          <h4>Backup prüfen</h4>
          <label>
            <span>Backup-Passphrase</span>
            <input
              type="password"
              value={verifyPassphrase}
              onChange={(event) => setVerifyPassphrase(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="industrial-secondary-button"
            disabled={busy}
            onClick={() => void inspectBackup()}
          >
            Backup prüfen
          </button>
        </div>

        <div className="industrial-subpanel industrial-danger-zone">
          <h4>Wiederherstellen</h4>
          <p className="industrial-settings-note">
            Ersetzt den aktuellen lokalen Datenbestand. Der bisherige Stand wird
            vorher in einen Sicherheitsordner verschoben.
          </p>
          <label>
            <span>Backup-Passphrase</span>
            <input
              type="password"
              value={restorePassphrase}
              onChange={(event) => setRestorePassphrase(event.target.value)}
            />
          </label>
          <label>
            <span>Bestätigung: BACKUP WIEDERHERSTELLEN</span>
            <input
              value={restoreConfirmation}
              onChange={(event) => setRestoreConfirmation(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="industrial-danger-button"
            disabled={busy}
            onClick={() => void restoreBackup()}
          >
            Backup wiederherstellen
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="industrial-secondary-button"
          onClick={() => void window.gremiaSbv?.backup?.openBackupFolder()}
        >
          <FolderOpen className="h-4 w-4" /> Backup-Ordner öffnen
        </button>
      </div>

      {error && (
        <div className="industrial-message industrial-message-warning">
          {error}
        </div>
      )}
      {result?.ok && (
        <div className="industrial-message industrial-message-ok">
          <strong>
            {result.restartRequired
              ? "Wiederherstellung vorbereitet."
              : "verifiedAt" in result
                ? "Backup erfolgreich geprüft."
                : "Backup-Vorgang abgeschlossen."}
          </strong>
          <p>{result.fileName}</p>
          <p>
            {result.fileCount ?? 0} Dateien · {result.totalBytes ?? 0} Bytes
          </p>
          {result.restartRequired && (
            <p>Bitte Gremia.SBV jetzt vollständig schließen und neu starten.</p>
          )}
          {result.warnings?.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </section>
  );
}

function RetentionSettingsPanel({ cases }: { cases: CaseRecord[] }) {
  const [dashboard, setDashboard] = useState<RetentionDashboard | null>(null);
  const [settings, setSettings] = useState<RetentionSettings | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState("");

  async function reloadRetention() {
    setError("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention)
        throw new Error("Löschdienst ist nicht erreichbar.");
      const [nextSettings, nextDashboard] = await Promise.all([
        bridge.retention.getSettings(),
        bridge.retention.dashboard(),
      ]);
      setSettings(nextSettings);
      setDashboard(nextDashboard);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    void reloadRetention();
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention)
        throw new Error("Löschdienst ist nicht erreichbar.");
      const updated = await bridge.retention.updateSettings(settings);
      setSettings(updated);
      setMessage("Lösch- und Prüffristen wurden gespeichert.");
      await reloadRetention();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function runCaseAction(action: "anonymize" | "delete") {
    if (!selectedCaseId) {
      setError("Bitte einen Fall auswählen.");
      return;
    }
    if (!reason.trim()) {
      setError("Bitte einen Grund dokumentieren.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention)
        throw new Error("Löschdienst ist nicht erreichbar.");
      const result: RetentionOperationResult =
        action === "anonymize"
          ? await bridge.retention.anonymizeCase(
              selectedCaseId,
              reason,
              confirmation,
            )
          : await bridge.retention.deleteCase(
              selectedCaseId,
              reason,
              confirmation,
            );
      if (!result.ok) {
        setError(result.error ?? "Aktion konnte nicht durchgeführt werden.");
        return;
      }
      setMessage(result.message ?? "Aktion wurde durchgeführt.");
      setReason("");
      setConfirmation("");
      await reloadRetention();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function updateSetting<K extends keyof RetentionSettings>(
    key: K,
    value: string,
  ) {
    const parsed = Number(value);
    if (!settings || !Number.isFinite(parsed)) return;
    setSettings({ ...settings, [key]: Math.max(1, Math.trunc(parsed)) });
  }

  const candidates = dashboard?.candidates ?? [];
  const criticalCandidates = candidates.filter(
    (candidate) => candidate.riskLevel === "critical",
  );
  const reviewCandidates = candidates.slice(0, 12);

  return (
    <section className="industrial-settings-form xl:col-span-2">
      <div>
        <h3>Datenschutz: Löschprüfung & Aufbewahrung</h3>
        <p className="industrial-settings-note">
          Gremia.SBV löscht nicht automatisch. Die App erkennt Prüfkandidaten,
          dokumentiert Entscheidungen und führt Anonymisierung oder Löschung nur
          nach bewusster Bestätigung aus.
        </p>
      </div>

      {settings && (
        <div className="grid gap-4 lg:grid-cols-5">
          <label>
            <span>Abgeschlossene Fälle prüfen nach Monaten</span>
            <input
              type="number"
              min={1}
              value={settings.closedCaseReviewMonths}
              onChange={(e) =>
                updateSetting("closedCaseReviewMonths", e.target.value)
              }
            />
          </label>
          <label>
            <span>Inaktive offene Fälle prüfen nach Monaten</span>
            <input
              type="number"
              min={1}
              value={settings.inactiveOpenCaseMonths}
              onChange={(e) =>
                updateSetting("inactiveOpenCaseMonths", e.target.value)
              }
            />
          </label>
          <label>
            <span>Kontakte ohne Bezug prüfen nach Tagen</span>
            <input
              type="number"
              min={1}
              value={settings.orphanContactReviewDays}
              onChange={(e) =>
                updateSetting("orphanContactReviewDays", e.target.value)
              }
            />
          </label>
          <label>
            <span>Erledigte Fristen prüfen nach Monaten</span>
            <input
              type="number"
              min={1}
              value={settings.completedDeadlineRetentionMonths}
              onChange={(e) =>
                updateSetting(
                  "completedDeadlineRetentionMonths",
                  e.target.value,
                )
              }
            />
          </label>
          <label>
            <span>Mindestfallzahl für Berichte</span>
            <input
              type="number"
              min={2}
              value={settings.minimumGroupSizeForReports}
              onChange={(e) =>
                updateSetting("minimumGroupSizeForReports", e.target.value)
              }
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="industrial-button"
          disabled={busy}
          onClick={() => void saveSettings()}
        >
          Einstellungen speichern
        </button>
        <button
          type="button"
          className="industrial-secondary-button"
          disabled={busy}
          onClick={() => void reloadRetention()}
        >
          Prüfung aktualisieren
        </button>
      </div>

      {dashboard && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="industrial-subpanel">
            <h4>Gesamt</h4>
            <strong className="text-2xl">{dashboard.counts.total}</strong>
          </div>
          <div className="industrial-subpanel">
            <h4>Kritisch</h4>
            <strong className="text-2xl text-red-300">
              {dashboard.counts.critical}
            </strong>
          </div>
          <div className="industrial-subpanel">
            <h4>Prüfen</h4>
            <strong className="text-2xl text-yellow-300">
              {dashboard.counts.warning}
            </strong>
          </div>
          <div className="industrial-subpanel">
            <h4>Hinweis</h4>
            <strong className="text-2xl">{dashboard.counts.info}</strong>
          </div>
        </div>
      )}

      {!!criticalCandidates.length && (
        <div className="industrial-message industrial-message-warning">
          <strong>Kritische Datenschutz-/Integritätsprüfungen offen.</strong>
          <p>
            {criticalCandidates.length} Eintrag/Einträge sollten zeitnah geprüft
            werden.
          </p>
        </div>
      )}

      <div className="industrial-table-shell">
        <table className="industrial-table">
          <thead>
            <tr>
              <th>Risiko</th>
              <th>Typ</th>
              <th>Bezug</th>
              <th>Empfehlung</th>
              <th>Hinweis</th>
            </tr>
          </thead>
          <tbody>
            {reviewCandidates.map((candidate: RetentionCandidate) => (
              <tr key={candidate.id}>
                <td>
                  {candidate.riskLevel === "critical"
                    ? "Kritisch"
                    : candidate.riskLevel === "warning"
                      ? "Prüfen"
                      : "Hinweis"}
                </td>
                <td>{candidate.title}</td>
                <td>{candidate.reference ?? "—"}</td>
                <td>{candidate.recommendedAction}</td>
                <td>{candidate.description}</td>
              </tr>
            ))}
            {!reviewCandidates.length && (
              <tr>
                <td colSpan={5}>
                  Keine Lösch- oder Aufbewahrungsprüfungen offen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="industrial-subpanel industrial-danger-zone">
        <h4>Fall anonymisieren oder löschen</h4>
        <p className="industrial-settings-note">
          Diese Funktionen sind bewusst streng. Bitte vor Löschung ein Backup
          erstellen und den Grund dokumentieren.
        </p>
        <label>
          <span>Fall</span>
          <select
            value={selectedCaseId}
            onChange={(event) => setSelectedCaseId(event.target.value)}
          >
            <option value="">Fall auswählen</option>
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.caseNumber} · {item.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Grund / Dokumentation</span>
          <TextCommandTextarea
            fieldId="retention-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <label>
          <span>Bestätigung</span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="FALL ANONYMISIEREN oder FALL LÖSCHEN"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="industrial-secondary-button"
            disabled={busy}
            onClick={() => void runCaseAction("anonymize")}
          >
            Fall anonymisieren
          </button>
          <button
            type="button"
            className="industrial-danger-button"
            disabled={busy}
            onClick={() => void runCaseAction("delete")}
          >
            Fall löschen
          </button>
        </div>
      </div>

      {error && (
        <div className="industrial-message industrial-message-warning">
          {error}
        </div>
      )}
      {message && (
        <div className="industrial-message industrial-message-ok">
          {message}
        </div>
      )}
    </section>
  );
}

function ContextualTemplateButton({
  action,
  caseId,
  sourceId,
  values,
}: {
  action: ContextualTemplateAction;
  caseId: string;
  sourceId?: string;
  values?: Record<string, string>;
}) {
  const [rendered, setRendered] = useState<RenderedTemplateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();

  async function generate() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates)
        throw new Error("Vorlagendienst ist nicht erreichbar.");
      const result = await bridge.templates.renderContext({
        templateKey: action.templateKey,
        caseId,
        sourceType: action.sourceType,
        sourceId,
        sourceLabel: action.description,
        values,
        archive: true,
      });
      setRendered(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Schreiben konnte nicht erzeugt werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyRendered() {
    if (!rendered) return;
    const text = `Betreff: ${rendered.subject}\n\n${rendered.body}`;
    const scan = scanSensitiveExportText(text, {
      context: "Vorlagenexport",
      target: rendered.title,
    });
    const confirmed = await confirmDialog({
      variant: "warning",
      title: "Entwurf in Zwischenablage kopieren?",
      message: buildExportWarningMessage(scan),
      confirmLabel: "Kopieren",
      cancelLabel: "Abbrechen",
    });
    if (!confirmed) return;
    await navigator.clipboard.writeText(text);
    const successMessage =
      "Entwurf wurde in die Zwischenablage kopiert. Achtung: Die Zwischenablage liegt außerhalb des Tresors.";
    setMessage(successMessage);
    announce(successMessage, "polite");
  }

  return (
    <>
      <button
        type="button"
        className="industrial-inline-link"
        onClick={() => void generate()}
        disabled={busy || !caseId}
        title={action.description}
      >
        {busy ? "Schreiben wird erzeugt …" : action.label}
      </button>
      {error && <span className="industrial-inline-warning">{error}</span>}
      {rendered && (
        <div
          className="industrial-modal-backdrop"
          role="dialog"
          aria-modal="true"
        >
          <section className="industrial-modal industrial-modal-wide">
            <div className="industrial-panel-header compact">
              <div>
                <p className="industrial-kicker">Kontextschreiben</p>
                <h2>{rendered.title}</h2>
                <p>
                  Dieser Entwurf wurde aus dem aktuellen Vorgang erzeugt und der
                  Fallakte zugeordnet.
                </p>
              </div>
            </div>
            {!!rendered.unresolvedPlaceholders.length && (
              <div className="industrial-message industrial-message-warning mt-4">
                {missingPlaceholderWarning(rendered.unresolvedPlaceholders)}
              </div>
            )}
            {message && (
              <div className="industrial-message industrial-message-ok mt-4">
                {message}
              </div>
            )}
            <div className="industrial-subpanel mt-4">
              <h4>Betreff</h4>
              <p>{rendered.subject}</p>
            </div>
            <div className="industrial-subpanel mt-4 template-preview-body">
              <h4>Textvorschau</h4>
              <pre>{rendered.body}</pre>
            </div>
            <div className="industrial-modal-actions">
              <button
                type="button"
                className="industrial-secondary-button"
                onClick={() => setRendered(null)}
              >
                Schließen
              </button>
              <button
                type="button"
                className="industrial-button"
                onClick={() => void copyRendered()}
              >
                In Zwischenablage kopieren
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
