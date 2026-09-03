import type { CaseRecord } from "../../../domain/models/case.model";
import type {
  GremiaBrDashboardOverview,
  GremiaBrGeneratedPdfDocument,
  GremiaBrPublicSettings,
  GremiaBrWorkspaceActionRecord,
} from "../../../domain/models/gremia-br.model";
import type { IndustrialFieldOption } from "../../shared/components/IndustrialFormCore";
import type { WorkbenchStatItem } from "../../shared/components/WorkbenchLayout";

export const EMPTY_GREMIA_BR_SETTINGS: GremiaBrPublicSettings = {
  enabled: false,
  serverUrl: "",
  username: "",
  hasStoredCredentials: false,
  apiMode: "legacy_read_bridge",
  relevanceSettings: { groups: [] },
};

export const EMPTY_GREMIA_BR_DASHBOARD: GremiaBrDashboardOverview = {
  upcomingMeetings: [],
  meetingAgendas: {},
  pendingFollowUps: [],
  decisions: [],
  dueDecisions: [],
  overdueDecisions: [],
  relevanceSettings: { groups: [] },
  relevantMeetings: [],
  openDecisionCount: 0,
  dueDecisionCount: 0,
  overdueDecisionCount: 0,
};

export type BrMeetingDraft = {
  sourceId: string;
  title: string;
  startsAt: string;
  location?: string;
  agenda: string[];
};

export function workspaceLabel(settings: GremiaBrPublicSettings): string {
  return settings.selectedBodyName
    ?? settings.selectedSecurityDomain
    ?? "Noch kein SBV-Gremium ausgewählt";
}

function itemRecord(item: unknown): Record<string, unknown> | undefined {
  return item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : undefined;
}

function firstText(record: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function gremiaBrItemId(item: unknown, fallback: string): string {
  return firstText(itemRecord(item), ["id", "uuid", "meetingId", "sitzungId", "reference"]) ?? fallback;
}

export function gremiaBrItemTitle(item: unknown, fallback: string): string {
  return firstText(itemRecord(item), ["titel", "title", "name", "beschlusstext", "text", "reference"]) ?? fallback;
}

export function gremiaBrItemDate(item: unknown): string {
  return firstText(itemRecord(item), ["plannedStart", "startsAt", "startAt", "datum", "date", "frist", "decidedAt"]) ?? "—";
}

export function gremiaBrItemStatus(item: unknown): string {
  return firstText(itemRecord(item), ["status", "state", "phase"]) ?? "—";
}

function gremiaBrItemLocation(item: unknown): string | undefined {
  return firstText(itemRecord(item), ["ort", "location", "raum", "room"]);
}

function agendaItemTitle(item: unknown): string | undefined {
  return firstText(itemRecord(item), ["titel", "title", "name", "bezeichnung", "text"]);
}

export function buildBrMeetingDrafts(overview: Pick<GremiaBrDashboardOverview, "currentMeeting" | "nextMeeting" | "upcomingMeetings" | "meetingAgendas"> | null): BrMeetingDraft[] {
  if (!overview) return [];
  const raw = [overview.currentMeeting, overview.nextMeeting, ...overview.upcomingMeetings].filter(Boolean);
  const seen = new Set<string>();
  const result: BrMeetingDraft[] = [];
  for (const item of raw) {
    const sourceId = gremiaBrItemId(item, "");
    const startsAt = gremiaBrItemDate(item);
    if (!sourceId || startsAt === "—" || seen.has(sourceId)) continue;
    seen.add(sourceId);
    result.push({
      sourceId,
      title: gremiaBrItemTitle(item, "Betriebsratssitzung"),
      startsAt,
      location: gremiaBrItemLocation(item),
      agenda: (overview.meetingAgendas[sourceId] ?? []).map(agendaItemTitle).filter((title): title is string => Boolean(title)),
    });
  }
  return result.sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
}

export function resolveGremiaBrWorkspaceSummary(
  settings: GremiaBrPublicSettings,
  overview: GremiaBrDashboardOverview,
): WorkbenchStatItem[] {
  return [
    { label: "API-Modus", value: settings.apiMode === "gremia_br_v2" ? "2.0" : "Legacy" },
    { label: "Sitzungen im Cache", value: String(overview.upcomingMeetings.length) },
    { label: "SBV-Treffer", value: String(overview.relevantMeetings.length), tone: overview.relevantMeetings.length ? "warning" : "default" },
    { label: "Beschlüsse", value: String(overview.openDecisionCount) },
  ];
}

export function resolveGremiaBrMeetingRows(overview: GremiaBrDashboardOverview) {
  return overview.upcomingMeetings.slice(0, 8).map((meeting, index) => ({
    id: `meeting-${gremiaBrItemId(meeting, String(index))}`,
    cells: [
      gremiaBrItemTitle(meeting, "Sitzung"),
      gremiaBrItemDate(meeting),
      overview.relevantMeetings.some((match) => match.item === meeting) ? "SBV-relevant" : "Lesekontext",
    ],
  }));
}

export function resolveGremiaBrDecisionRows(overview: GremiaBrDashboardOverview) {
  return overview.decisions.slice(0, 8).map((decision, index) => ({
    id: `decision-${gremiaBrItemId(decision, String(index))}`,
    cells: [
      gremiaBrItemTitle(decision, "Beschluss"),
      gremiaBrItemDate(decision),
      gremiaBrItemStatus(decision),
    ],
  }));
}

const WORKSPACE_ACTION_LABELS: Record<GremiaBrWorkspaceActionRecord["actionType"], string> = {
  document_uploaded: "PDF übertragen",
  document_shared: "PDF freigeben",
  agenda_item_requested: "TOP angefordert",
  information_requested: "Information angefordert",
};

const WORKSPACE_ACTION_STATUS_LABELS: Record<GremiaBrWorkspaceActionRecord["status"], string> = {
  uploaded: "Übertragen",
  shared: "Freigegeben",
  requested: "Angefordert",
  failed: "Fehlgeschlagen",
};

export function resolveGremiaBrWorkspaceActionRows(actions: GremiaBrWorkspaceActionRecord[]) {
  return actions.slice(0, 10).map((action) => ({
    id: action.id,
    cells: [
      action.createdAt,
      WORKSPACE_ACTION_LABELS[action.actionType],
      [
        action.localDocumentTitle,
        action.caseNumber ? `Fall ${action.caseNumber}` : undefined,
        action.remoteMeetingId ? `Sitzung ${action.remoteMeetingId}` : undefined,
      ].filter(Boolean).join(" · ") || "—",
      action.targetBodyName ?? action.targetSecurityDomain ?? "—",
      WORKSPACE_ACTION_STATUS_LABELS[action.status],
    ],
  }));
}

export function caseOptions(cases: CaseRecord[]): IndustrialFieldOption[] {
  return [
    { value: "", label: "Fallakte auswählen …" },
    ...cases
      .slice()
      .sort((left, right) => left.caseNumber.localeCompare(right.caseNumber, "de-DE"))
      .map((record) => ({
        value: record.id,
        label: `${record.caseNumber} · ${record.displayName}`,
      })),
  ];
}

export function documentOptions(documents: GremiaBrGeneratedPdfDocument[]): IndustrialFieldOption[] {
  return [
    { value: "", label: "PDF auswählen …" },
    ...documents.map((document) => ({
      value: document.id,
      label: [
        document.title,
        document.caseNumber ? `Fall ${document.caseNumber}` : undefined,
        document.createdAt,
      ].filter(Boolean).join(" · "),
    })),
  ];
}

export function meetingOptions(overview: GremiaBrDashboardOverview): IndustrialFieldOption[] {
  return [
    { value: "", label: "Gremia.BR-Sitzung auswählen …" },
    ...buildBrMeetingDrafts(overview).map((meeting) => ({
      value: meeting.sourceId,
      label: `${meeting.startsAt} · ${meeting.title}`,
    })),
  ];
}
