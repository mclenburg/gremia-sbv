import { useEffect, useMemo, useState } from "react";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import type {
  ComplianceDocument,
  ComplianceDocumentType,
  ComplianceIncidentRecord,
  ComplianceSelfCheckResult,
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
import { type ComplianceWorkspace } from "./complianceConstants";
import {
  buildFallbackSelfCheck,
  buildFallbackStatus,
  downloadTextFile,
  loadComplianceStatus,
} from "./complianceViewUtils";

export function useComplianceCenter() {
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
      const info = error instanceof Error ? error.message : "Systemzustand konnte nicht geladen werden.";
      setStatusOverview(buildFallbackStatus());
      setMessage(info);
      announce(info, "assertive");
    }
  }

  async function refreshSelfCheck() {
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
  }

  async function refreshIncidents() {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.listIncidents) throw new Error("Vorfallliste ist nicht erreichbar.");
      setIncidents(await bridge.compliance.listIncidents());
    } catch (error) {
      const info = error instanceof Error ? error.message : "Vorfallliste konnte nicht geladen werden.";
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
      if (!bridge?.compliance?.prefillDsar) throw new Error("DSGVO-Vorbefüllung ist nicht erreichbar.");
      const prefill = await bridge.compliance.prefillDsar(dsarInput);
      const nextInput = { ...dsarInput, prefill };
      setDsarInput(nextInput);
      setSelectedType("dsar_response");
      setDocument(renderDsarResponseDocument(nextInput));
      const count =
        prefill.persons.length + prefill.cases.length + prefill.deadlines.length +
        prefill.measures.length + prefill.importRuns.length + prefill.lifecycleEvents.length +
        prefill.freeTextMatches.length;
      const info = count > 0
        ? `Art.-15-Auskunft wurde mit ${count} strukturierten Datensatzbezug/Datensatzbezügen aus Gremia.SBV vorbefüllt.`
        : "Art.-15-Vorbefüllung ausgeführt; es wurden keine passenden Datensatzbezüge gefunden.";
      setMessage(info);
      announce(info, "polite");
    } catch (error) {
      const info = error instanceof Error ? error.message : "DSGVO-Vorbefüllung konnte nicht ausgeführt werden.";
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
      if (!bridge?.reports) throw new Error("Berichtsdienst ist nicht erreichbar.");
      const result = await bridge.reports.generate(buildComplianceReportInput(document));
      if (!result.ok) throw new Error(result.error ?? "PDF-Dokument konnte nicht erzeugt werden.");
      if (openAfterExport) await bridge.reports.openExportFolder(result.filePath);
      const info = openAfterExport
        ? `${document.title} wurde als PDF erzeugt und geöffnet: ${result.fileName}`
        : `${document.title} wurde als verschlüsselter PDF-Report erzeugt: ${result.fileName}`;
      setMessage(info);
      announce(info, "polite");
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
    dsarInput,
    statusOverview,
    selfCheck,
    incidents,
    render,
    updateDsarInput,
    renderDsar,
    prefillDsar,
    downloadCurrent,
    exportPdfCurrent,
    createIncident,
    updateIncident,
    refreshStatus,
    refreshSelfCheck,
  };
}
