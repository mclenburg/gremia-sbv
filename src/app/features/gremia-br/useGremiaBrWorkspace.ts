import { useEffect, useMemo, useState } from "react";
import type { CaseRecord } from "../../../domain/models/case.model";
import type { GremiaBrDashboardOverview, GremiaBrGeneratedPdfDocument } from "../../../domain/models/gremia-br.model";
import {
  createCaseSummaryPdf,
  importBrMeeting,
  loadTransferableDocuments,
  loadWorkspaceSnapshot,
  refreshReadContextSnapshot,
  requestAgendaItem,
  transferGeneratedPdf,
} from "./gremiaBrWorkspaceActions";
import {
  buildBrMeetingDrafts,
  EMPTY_GREMIA_BR_DASHBOARD,
  EMPTY_GREMIA_BR_SETTINGS,
} from "./gremiaBrWorkspaceModel";
import type { GremiaBrWorkspaceDraft } from "./GremiaBrWorkspacePanels";

const INITIAL_DRAFT: GremiaBrWorkspaceDraft = {
  selectedCaseId: "",
  summaryPurpose: "Information des Betriebsrats zur sachgerechten Befassung mit einem SBV-relevanten Vorgang.",
  recipientLabel: "Betriebsrat",
  selectedDocumentId: "",
  targetSecurityDomain: "BR",
  transferPurpose: "Information des Betriebsrats zur SBV-Beteiligung.",
  transferValidUntil: "",
  protectionClass: "HIGH",
  selectedAgendaMeetingId: "",
  agendaTitle: "",
  agendaDescription: "",
  agendaMinutes: "15",
  selectedImportMeetingId: "",
};

export type BusyAction = "read" | "summary" | "transfer" | "agenda" | "import" | null;

export function useGremiaBrWorkspace(announce: (message: string, politeness?: "polite" | "assertive") => void) {
  const [settings, setSettings] = useState(EMPTY_GREMIA_BR_SETTINGS);
  const [overview, setOverview] = useState<GremiaBrDashboardOverview>(EMPTY_GREMIA_BR_DASHBOARD);
  const [documents, setDocuments] = useState<GremiaBrGeneratedPdfDocument[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const meetingDrafts = useMemo(() => buildBrMeetingDrafts(overview), [overview]);

  function applySnapshot(snapshot: Awaited<ReturnType<typeof loadWorkspaceSnapshot>>) {
    setSettings(snapshot.settings);
    setOverview(snapshot.overview);
    setDocuments(snapshot.documents);
    setCases(snapshot.cases);
  }

  function updateDraft<K extends keyof GremiaBrWorkspaceDraft>(key: K, value: GremiaBrWorkspaceDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function runAction(action: Exclude<BusyAction, null>, work: () => Promise<string>) {
    setBusyAction(action);
    setError("");
    setStatus("");
    try {
      const message = await work();
      setStatus(message);
      announce(message, "polite");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Die Gremia.BR-Aktion konnte nicht ausgeführt werden.";
      setError(message);
      announce(message, "assertive");
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    let active = true;
    void loadWorkspaceSnapshot()
      .then((snapshot) => { if (active) applySnapshot(snapshot); })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Gremia.BR-Konfiguration konnte nicht geladen werden.";
        setError(message);
        announce(message, "assertive");
      });
    return () => { active = false; };
  }, [announce]);

  return {
    settings,
    overview,
    documents,
    cases,
    draft,
    status,
    error,
    busyAction,
    meetingDrafts,
    updateDraft,
    refreshReadContext: () => runAction("read", async () => {
      const result = await refreshReadContextSnapshot();
      applySnapshot(result.snapshot);
      return result.message;
    }),
    refreshDocuments: () => runAction("transfer", async () => {
      setDocuments(await loadTransferableDocuments());
      return "PDF-Liste wurde aktualisiert.";
    }),
    createCaseSummary: () => runAction("summary", async () => {
      const created = await createCaseSummaryPdf(draft);
      setDocuments(await loadTransferableDocuments());
      updateDraft("selectedDocumentId", created.id);
      return `Fallzusammenfassung wurde erzeugt: ${created.filename}`;
    }),
    transferDocument: () => runAction("transfer", () => transferGeneratedPdf(draft)),
    requestAgendaItem: () => runAction("agenda", () => requestAgendaItem(draft)),
    importMeeting: () => runAction("import", () => importBrMeeting(draft, meetingDrafts)),
  };
}
