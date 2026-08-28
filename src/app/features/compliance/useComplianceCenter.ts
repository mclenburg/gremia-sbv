import { useCallback, useEffect, useMemo, useState } from "react";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import type {
  ComplianceDocument,
  ComplianceDocumentType,
  ComplianceIncidentRecord,
  ComplianceSelfCheckResult,
  ComplianceStatusOverview,
  CreateComplianceIncidentInput,
  UpdateComplianceIncidentInput,
} from "../../../domain/models/compliance.model";
import {
  buildComplianceReportInput,
  listComplianceDocuments,
  renderComplianceDocument,
} from "@/domain/compliance/complianceCenterService";
import {
  buildPdfExportFeedback,
  buildFallbackSelfCheck,
  buildFallbackStatus,
  loadComplianceStatus,
} from "./complianceViewUtils";
import { useComplianceDsar, type ComplianceWorkspace } from "./useComplianceDsar";

export function useComplianceCenter() {
  const descriptors = useMemo(() => listComplianceDocuments(), []);
  const [workspace, setWorkspace] = useState<ComplianceWorkspace>("system");
  const [selectedType, setSelectedType] =
    useState<ComplianceDocumentType>("toms");
  const [document, setDocument] = useState<ComplianceDocument>(() =>
    renderComplianceDocument("toms"),
  );
  const [message, setMessage] = useState("");
  const [statusOverview, setStatusOverview] =
    useState<ComplianceStatusOverview>(() => buildFallbackStatus());
  const [selfCheck, setSelfCheck] = useState<ComplianceSelfCheckResult>(() =>
    buildFallbackSelfCheck(),
  );
  const [incidents, setIncidents] = useState<ComplianceIncidentRecord[]>([]);
  const announce = useAnnouncer();
  const dsar = useComplianceDsar({
    announce,
    setDocument,
    setMessage,
    setSelectedType,
    setWorkspace,
  });

  const refreshStatus = useCallback(async () => {
    try {
      const next = await loadComplianceStatus();
      setStatusOverview(next);
      announce("Systemzustand wurde aktualisiert.", "polite");
    } catch (error) {
      const info = error instanceof Error ? error.message : "Systemzustand konnte nicht geladen werden.";
      setStatusOverview(buildFallbackStatus());
      setMessage(info);
      announce(info, "assertive");
    }
  }, [announce]);

  const refreshSelfCheck = useCallback(async () => {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.selfCheck) throw new Error("Compliance-Selbstcheck ist nicht erreichbar.");
      setSelfCheck(await bridge.compliance.selfCheck());
      announce("Compliance-Selbstcheck wurde aktualisiert.", "polite");
    } catch (error) {
      const info = error instanceof Error ? error.message : "Compliance-Selbstcheck konnte nicht geladen werden.";
      setSelfCheck(buildFallbackSelfCheck());
      setMessage(info);
      announce(info, "assertive");
    }
  }, [announce]);

  const refreshIncidents = useCallback(async () => {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.listIncidents) throw new Error("Vorfallliste ist nicht erreichbar.");
      setIncidents(await bridge.compliance.listIncidents());
    } catch (error) {
      const info = error instanceof Error ? error.message : "Vorfallliste konnte nicht geladen werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }, [announce]);

  useEffect(() => {
    void refreshStatus();
    void refreshSelfCheck();
    void refreshIncidents();
  }, [refreshStatus, refreshSelfCheck, refreshIncidents]);

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

  async function createIncident(input: CreateComplianceIncidentInput) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.createIncident) throw new Error("Vorfallservice ist nicht erreichbar.");
      await bridge.compliance.createIncident(input);
      await refreshIncidents();
      await refreshSelfCheck();
      const info = "Datenschutzvorfall wurde gespeichert.";
      setMessage(info);
      announce(info, "polite");
    } catch (error) {
      const info = error instanceof Error ? error.message : "Datenschutzvorfall konnte nicht gespeichert werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }

  async function updateIncident(id: string, input: UpdateComplianceIncidentInput) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.updateIncident) throw new Error("Vorfallservice ist nicht erreichbar.");
      await bridge.compliance.updateIncident(id, input);
      await refreshIncidents();
      await refreshSelfCheck();
      announce("Datenschutzvorfall wurde aktualisiert.", "polite");
    } catch (error) {
      const info = error instanceof Error ? error.message : "Datenschutzvorfall konnte nicht aktualisiert werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }

  return {
    descriptors,
    workspace,
    setWorkspace,
    selectedType,
    document,
    message,
    dsarInput: dsar.dsarInput,
    dsarReadiness: dsar.dsarReadiness,
    persons: dsar.persons,
    statusOverview,
    selfCheck,
    incidents,
    render,
    updateDsarInput: dsar.updateDsarInput,
    selectDsarPerson: dsar.selectDsarPerson,
    renderDsar: dsar.renderDsar,
    prefillDsar: dsar.prefillDsar,
    exportPdfCurrent,
    createIncident,
    updateIncident,
    refreshStatus,
    refreshSelfCheck,
  };
}
