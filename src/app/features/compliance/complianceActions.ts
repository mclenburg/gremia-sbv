import { waitForBridge } from "../../core/bridge/waitForBridge";
import type {
  ComplianceDocument, ComplianceDocumentType, CreateComplianceIncidentInput, UpdateComplianceIncidentInput,
} from "../../../domain/models/compliance.model";
import { buildComplianceReportInput, renderComplianceDocument } from "@/domain/compliance/complianceCenterService";
import { buildPdfExportFeedback } from "./complianceViewUtils";

type ComplianceFeedback = {
  setMessage: (message: string) => void;
  announce: (message: string, mode?: "polite" | "assertive") => void;
};

export function createComplianceDocumentActions({ document, setDocument, setSelectedType, setMessage, announce }: ComplianceFeedback & {
  document: ComplianceDocument;
  setDocument: (document: ComplianceDocument) => void;
  setSelectedType: (type: ComplianceDocumentType) => void;
}) {
  function render(type: ComplianceDocumentType) {
    const next = renderComplianceDocument(type);
    setSelectedType(type);
    setDocument(next);
    const info = `${next.title} wurde erzeugt.`;
    setMessage(info);
    announce(info, "polite");
  }

  async function exportPdfCurrent(openAfterExport = false) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error("Berichtsdienst ist nicht erreichbar.");
      const result = await bridge.reports.generate(buildComplianceReportInput(document));
      if (!result.ok) throw new Error(result.error ?? "PDF-Dokument konnte nicht erzeugt werden.");
      const openResult = openAfterExport
        ? await bridge.reports.openExportFolder(result.fileName)
        : undefined;
      const feedback = buildPdfExportFeedback({
        title: document.title,
        fileName: result.fileName,
        openRequested: openAfterExport,
        openResult,
      });
      setMessage(feedback.message);
      announce(feedback.message, feedback.announceMode);
    } catch (error) {
      const info = error instanceof Error ? error.message : "PDF-Dokument konnte nicht erzeugt werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }

  return { render, exportPdfCurrent };
}

export function createComplianceIncidentActions({ refreshIncidents, refreshSelfCheck, setMessage, announce }: ComplianceFeedback & {
  refreshIncidents: () => Promise<void>;
  refreshSelfCheck: () => Promise<void>;
}) {
  async function runIncidentMutation(
    save: (service: NonNullable<Window["gremiaSbv"]>["compliance"]) => Promise<unknown>,
    onSuccess: () => void,
    failureMessage: string,
  ) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance) throw new Error("Vorfallservice ist nicht erreichbar.");
      await save(bridge.compliance);
      await refreshIncidents();
      await refreshSelfCheck();
      onSuccess();
    } catch (error) {
      const info = error instanceof Error ? error.message : failureMessage;
      setMessage(info);
      announce(info, "assertive");
    }
  }

  function createIncident(input: CreateComplianceIncidentInput) {
    return runIncidentMutation(async (service) => {
      if (!service.createIncident) throw new Error("Vorfallservice ist nicht erreichbar.");
      await service.createIncident(input);
    }, () => {
      const info = "Datenschutzvorfall wurde gespeichert.";
      setMessage(info);
      announce(info, "polite");
    }, "Datenschutzvorfall konnte nicht gespeichert werden.");
  }

  function updateIncident(id: string, input: UpdateComplianceIncidentInput) {
    return runIncidentMutation(async (service) => {
      if (!service.updateIncident) throw new Error("Vorfallservice ist nicht erreichbar.");
      await service.updateIncident(id, input);
    }, () => {
      announce("Datenschutzvorfall wurde aktualisiert.", "polite");
    }, "Datenschutzvorfall konnte nicht aktualisiert werden.");
  }

  return { createIncident, updateIncident };
}
