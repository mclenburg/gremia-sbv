import { waitForBridge } from "../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "./caseWorkbenchFormat";
import type { FormEvent } from "react";
import type { CaseNoteRecord } from "../../core/models/case-note.model";
import type { CaseDocumentRecord } from "../../core/models/case-document.model";
import type { TemplateRecord, RenderedTemplateResult } from "../../core/models/template.model";
import { buildExportWarningMessage, scanBemProcessExport, scanSensitiveExportText } from "@services/exportGuardPolicy";
import { buildTerminationExportContext, terminationPrivacyExportNotice } from "@services/terminationPrivacyPolicy";
import { buildProcessTemplateValues, defaultCaseProcessDraft, downloadRenderedTemplate, isBemProcessRecord, isEqualizationProcessRecord, isTemplateConnectedToProcessStatus, isTerminationHearingRecord } from "./casesViewProcessUtils";
import { loadTemplateDefaultValues } from "../../shared/templates/templateDefaults";
import type { CaseProcessType } from "./casesViewProcessUtils";

type useCaseProcessCreationDeps = Record<string, any>;

export function useCaseProcessCreation(deps: useCaseProcessCreationDeps) {
  const { selectedCase, selectedCaseId, caseProcessDraft, setCaseProcessDraft, setSelection, setNoteError, setNoteInfo, reloadSelectedCaseChildren, onCasesChanged } = deps;
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

      if (caseProcessDraft.processType === "workplace_accommodation") {
        if (!bridge?.workplaceAccommodation)
          throw new Error("Arbeitsplatzgestaltungsdienst ist nicht erreichbar.");
        const created = await bridge.workplaceAccommodation.create({
          caseId: selectedCase.id,
          title: caseProcessDraft.title.trim() || "Arbeitsplatzgestaltung",
          requestedAdjustment: caseProcessDraft.description.trim() || "Behinderungsgerechte Arbeitsplatzgestaltung prüfen.",
          barrierOrLimitation: caseProcessDraft.description.trim() || undefined,
          category: "sonstiges",
          status: "angefragt",
          riskLevel: "erhoeht",
          implementationDueAt: caseProcessDraft.dueAt
            ? fromDateTimeLocalValue(caseProcessDraft.dueAt)
            : undefined,
          nextStep: "Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX in der Fallakte weiter prüfen.",
          createDefaultDeadlines: true,
        });
        setCaseProcessDraft(null);
        setSelection({
          type: "process",
          processType: "workplace_accommodation",
          id: created.id,
        });
        setNoteInfo(
          "Arbeitsplatzgestaltung wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.",
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


  return { openCaseProcessDraft, createCaseProcessFromDraft };
}
