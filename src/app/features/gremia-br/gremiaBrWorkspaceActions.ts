import type { CaseRecord } from "../../../domain/models/case.model";
import type {
  GremiaBrDashboardOverview,
  GremiaBrGeneratedPdfDocument,
  GremiaBrPublicSettings,
  GremiaBrWorkspaceActionRecord,
} from "../../../domain/models/gremia-br.model";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import type { BrMeetingDraft } from "./gremiaBrWorkspaceModel";
import type { GremiaBrWorkspaceDraft } from "./GremiaBrWorkspacePanels";

export type GremiaBrWorkspaceSnapshot = {
  settings: GremiaBrPublicSettings;
  overview: GremiaBrDashboardOverview;
  documents: GremiaBrGeneratedPdfDocument[];
  actions: GremiaBrWorkspaceActionRecord[];
  cases: CaseRecord[];
};

function agendaMinutes(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function isoDateOrUndefined(value: string): string | undefined {
  return value ? new Date(`${value}T23:59:59`).toISOString() : undefined;
}

export async function loadWorkspaceSnapshot(): Promise<GremiaBrWorkspaceSnapshot> {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
  const settings = await bridge.gremiaBr.getSettings();
  const overview = await bridge.gremiaBr.getDashboardOverview();
  const documents = settings.enabled ? await bridge.gremiaBr.listTransferableDocuments(100) : [];
  const actions = settings.enabled ? await bridge.gremiaBr.listWorkspaceActions(50) : [];
  const cases = settings.enabled && bridge.cases ? await bridge.cases.list() : [];
  return { settings, overview, documents, actions, cases };
}

export async function refreshReadContextSnapshot(): Promise<{ message: string; snapshot: GremiaBrWorkspaceSnapshot }> {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
  const result = await bridge.gremiaBr.refreshCache();
  const snapshot = await loadWorkspaceSnapshot();
  return { message: result.message, snapshot: { ...snapshot, overview: result.cached as GremiaBrDashboardOverview } };
}

export async function loadTransferableDocuments(): Promise<GremiaBrGeneratedPdfDocument[]> {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
  return bridge.gremiaBr.listTransferableDocuments(100);
}

export async function loadWorkspaceActions(): Promise<GremiaBrWorkspaceActionRecord[]> {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
  return bridge.gremiaBr.listWorkspaceActions(50);
}

export async function createCaseSummaryPdf(draft: GremiaBrWorkspaceDraft) {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
  return bridge.gremiaBr.createCaseSummaryDocument({
    caseId: draft.selectedCaseId,
    purpose: draft.summaryPurpose,
    recipientLabel: draft.recipientLabel,
  });
}

export async function transferGeneratedPdf(draft: GremiaBrWorkspaceDraft): Promise<string> {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
  const result = await bridge.gremiaBr.transferGeneratedPdf({
    documentId: draft.selectedDocumentId,
    purpose: draft.transferPurpose,
    targetSecurityDomain: draft.targetSecurityDomain,
    protectionClass: draft.protectionClass,
    validUntil: isoDateOrUndefined(draft.transferValidUntil),
  });
  return result.message;
}

export async function requestAgendaItem(draft: GremiaBrWorkspaceDraft): Promise<string> {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
  const result = await bridge.gremiaBr.requestAgendaItem({
    meetingId: draft.selectedAgendaMeetingId,
    title: draft.agendaTitle,
    description: draft.agendaDescription,
    protectionClass: "CONFIDENTIAL",
    timeAllocationMinutes: agendaMinutes(draft.agendaMinutes),
  });
  return result.message;
}

export async function importBrMeeting(draft: GremiaBrWorkspaceDraft, meetingDrafts: BrMeetingDraft[]): Promise<string> {
  const selected = meetingDrafts.find((meeting) => meeting.sourceId === draft.selectedImportMeetingId);
  if (!selected) throw new Error("Bitte eine Gremia.BR-Sitzung auswählen.");
  const bridge = await waitForBridge();
  if (!bridge?.sbvOffice?.meetings) throw new Error("SBV-Sitzungsdienst ist nicht erreichbar.");
  const created = await bridge.sbvOffice.meetings.create({
    meetingType: "works_council",
    title: selected.title,
    startsAt: new Date(selected.startsAt).toISOString(),
    location: selected.location,
    status: "planned",
  });
  for (const [index, title] of selected.agenda.entries()) {
    await bridge.sbvOffice.meetings.saveAgenda(created.id, {
      title,
      position: index + 1,
      sbvRelevance: false,
      referenceScope: "none",
      requestedBySbv: false,
      significantImpairment: false,
      nonParticipation: false,
    });
  }
  return `Sitzung wurde als SBV-Arbeitskopie übernommen${selected.agenda.length ? `, ${selected.agenda.length} TOP(s) angelegt` : ""}.`;
}
