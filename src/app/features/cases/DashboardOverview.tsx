import type { ReactNode } from "react";
import { BarChart3, CalendarClock, FileText, FolderOpen, MessageSquare } from "lucide-react";
import { DashboardCard } from "../../shared/components/DashboardCard";
import { ModuleFrame } from "../../shared/components/ModuleFrame";
import { DeadlineDashboardPanel } from "../deadlines/DeadlineDashboardPanel";
import { modules, type ViewId } from "../../core/navigation/modules";
import { formatDateShort } from "../../shared/format/dates";
import type { CaseRecord } from "../../core/models/case.model";
import type { ContactCategory } from "../../core/models/contact.model";
import type { DeadlineDashboardItem, DeadlineRecord, DeadlineSeverity } from "../../core/models/deadline.model";
import type { ReportExportHistoryItem } from "../../core/models/report.model";
import type { TemplateRecord, RenderedTemplateResult } from "../../core/models/template.model";
import type { PreventionProcessRecord, PreventionStatus } from "../../core/models/prevention.model";
import type { BemProcessRecord, BemStatus } from "../../core/models/bem.model";
import type { EqualizationProcessRecord } from "../../core/models/equalization.model";
import type { TerminationHearingRecord } from "../../core/models/termination.model";
import { APP_VERSION } from "../../generated/appVersion";
import type { ConfidentialCommandLevel, RiskLevelCommand } from "@services/textCommandPolicy";
import { processTypeLabel } from "./caseWorkbenchFormat";
import { statusLabel } from "../prevention/preventionShared";
import { bemStatusLabel } from "../bem/bemShared";
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
  | "workplace_accommodation"
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
          : processType === "workplace_accommodation"
            ? "Aus der Fallakte gestartete Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX. Bitte Barriere, gewünschte Gestaltung und nächsten Schritt erfassen."
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

