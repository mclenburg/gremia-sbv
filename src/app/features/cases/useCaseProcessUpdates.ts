import { waitForBridge } from "../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "./caseWorkbenchFormat";
import type { FormEvent } from "react";
import type { CaseNoteRecord } from "../../core/models/case-note.model";
import type { CaseDocumentRecord } from "../../core/models/case-document.model";
import type { TemplateRecord, RenderedTemplateResult } from "../../core/models/template.model";
import type { UpdatePreventionProcessInput } from "../../core/models/prevention.model";
import type { UpdateBemProcessInput } from "../../core/models/bem.model";
import type { EqualizationProcessRecord, UpdateEqualizationProcessInput } from "../../core/models/equalization.model";
import type { UpdateTerminationHearingInput } from "../../core/models/termination.model";
import type { UpdateParticipationInput } from "../../core/models/participation.model";
import type { UpdateWorkplaceAccommodationInput } from "../../core/models/workplace-accommodation.model";
import { buildExportWarningMessage, scanBemProcessExport, scanSensitiveExportText } from "@services/exportGuardPolicy";
import { buildTerminationExportContext, terminationPrivacyExportNotice } from "@services/terminationPrivacyPolicy";
import { buildProcessTemplateValues, defaultCaseProcessDraft, downloadRenderedTemplate, isBemProcessRecord, isEqualizationProcessRecord, isTemplateConnectedToProcessStatus, isTerminationHearingRecord } from "./casesViewProcessUtils";
import { loadTemplateDefaultValues } from "../../shared/templates/templateDefaults";

type useCaseProcessUpdatesDeps = Record<string, any>;

export function useCaseProcessUpdates(deps: useCaseProcessUpdatesDeps) {
  const { setNoteError, setNoteInfo, reloadSelectedCaseChildren, selectedCase } = deps;
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

  async function updateCaseWorkplaceAccommodationProcess(
    processId: string,
    input: UpdateWorkplaceAccommodationInput,
  ) {
    setNoteError("");
    setNoteInfo("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.workplaceAccommodation)
        throw new Error("Arbeitsplatzgestaltungsdienst ist nicht erreichbar.");
      await bridge.workplaceAccommodation.update(processId, input);
      await reloadSelectedCaseChildren();
      setNoteInfo("Arbeitsplatzgestaltung wurde aktualisiert.");
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Arbeitsplatzgestaltung konnte nicht aktualisiert werden.",
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


  return { updateCasePreventionProcess, updateCaseBemProcess, updateCaseTerminationProcess, updateCaseParticipationProcess, updateCaseWorkplaceAccommodationProcess, createEqualizationSecureNote, updateCaseEqualizationProcess };
}
