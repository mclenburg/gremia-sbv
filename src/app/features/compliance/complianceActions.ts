import { waitForBridge } from "../../core/bridge/waitForBridge";
import type {
  ComplianceDocument, ComplianceDocumentType, CreateComplianceIncidentInput, DataProtectionNoticeInput, UpdateComplianceIncidentInput,
} from "../../../domain/models/compliance.model";
import type { GenerateReportInput } from "../../../domain/models/report.model";
import { buildComplianceReportInput, renderComplianceDocument } from "@/domain/compliance/complianceCenterService";
import { buildPdfExportFeedback } from "./complianceViewUtils";

type ComplianceFeedback = {
  setMessage: (message: string) => void;
  announce: (message: string, mode?: "polite" | "assertive") => void;
};

export function createComplianceDocumentActions({ document, setDocument, setSelectedType, setMessage, announce, getEditedDocument }: ComplianceFeedback & {
  document: ComplianceDocument;
  setDocument: (document: ComplianceDocument) => void;
  setSelectedType: (type: ComplianceDocumentType) => void;
  getEditedDocument?: (type: ComplianceDocumentType) => ComplianceDocument | undefined;
}) {
  function render(type: ComplianceDocumentType) {
    if (type === 'data_protection_notice') {
      setSelectedType(type);
      return;
    }
    const edited = getEditedDocument?.(type);
    const next = edited ?? renderComplianceDocument(type);
    setSelectedType(type);
    setDocument(next);
    const info = edited ? `Bearbeiteter Entwurf für ${next.title} wurde wieder geöffnet.` : `${next.title} wurde erzeugt.`;
    setMessage(info);
    announce(info, "polite");
  }

  async function exportPdf(input: GenerateReportInput, title: string, openAfterExport: boolean) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error("Berichtsdienst ist nicht erreichbar.");
      const result = await bridge.reports.generate(input);
      if (!result.ok) throw new Error(result.error ?? "PDF-Dokument konnte nicht erzeugt werden.");
      const openResult = openAfterExport
        ? await bridge.reports.openExportFolder(result.fileName)
        : undefined;
      const feedback = buildPdfExportFeedback({
        title,
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

  function exportPdfCurrent(openAfterExport = false) {
    if (!document.body.trim()) {
      const info = "Dokumenttext fehlt. Bitte Markdown eingeben, bevor das PDF erzeugt wird.";
      setMessage(info);
      announce(info, "assertive");
      return Promise.resolve();
    }
    return exportPdf(buildComplianceReportInput(document), document.title, openAfterExport);
  }

  function exportDataProtectionNotice(input: DataProtectionNoticeInput, openAfterExport = false) {
    return exportPdf({ type: 'compliance_document', complianceDocumentType: 'data_protection_notice', complianceNoticeInput: input }, 'Datenschutzinformation', openAfterExport);
  }

  return { render, exportPdfCurrent, exportDataProtectionNotice };
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
      return true;
    } catch (error) {
      const info = error instanceof Error ? error.message : failureMessage;
      setMessage(info);
      announce(info, "assertive");
      return false;
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
