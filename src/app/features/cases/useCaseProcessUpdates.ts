import { waitForBridge } from "../../core/bridge/waitForBridge";
import type { Dispatch, SetStateAction } from "react";
import type { CaseRecord } from "../../../domain/models/case.model";
import type { UpdatePreventionProcessInput } from "../../../domain/models/prevention.model";
import type { UpdateBemProcessInput } from "../../../domain/models/bem.model";
import type { EqualizationProcessRecord, UpdateEqualizationProcessInput } from "../../../domain/models/equalization.model";
import type { UpdateTerminationHearingInput } from "../../../domain/models/termination.model";
import type { UpdateParticipationInput } from "../../../domain/models/participation.model";
import type { UpdateWorkplaceAccommodationInput } from "../../../domain/models/workplace-accommodation.model";

type UseCaseProcessUpdatesDeps = {
  setNoteError: Dispatch<SetStateAction<string>>;
  setNoteInfo: Dispatch<SetStateAction<string>>;
  reloadSelectedCaseChildren: () => Promise<void>;
  selectedCase?: CaseRecord;
};

type ProcessBridge = Awaited<ReturnType<typeof waitForBridge>>;
type ProcessUpdateDeps = Pick<UseCaseProcessUpdatesDeps,
  "setNoteError" | "setNoteInfo" | "reloadSelectedCaseChildren">;

async function runProcessUpdate(
  deps: ProcessUpdateDeps,
  update: (bridge: ProcessBridge) => Promise<void>,
  successMessage: string,
  fallbackError: string,
) {
  deps.setNoteError("");
  deps.setNoteInfo("");
  try {
    await update(await waitForBridge());
    await deps.reloadSelectedCaseChildren();
    deps.setNoteInfo(successMessage);
  } catch (error) {
    deps.setNoteError(error instanceof Error ? error.message : fallbackError);
  }
}

export function useCaseProcessUpdates(deps: UseCaseProcessUpdatesDeps) {
  const { setNoteError, setNoteInfo, reloadSelectedCaseChildren, selectedCase } = deps;
  async function updateCasePreventionProcess(
    processId: string,
    input: UpdatePreventionProcessInput,
  ) {
    await runProcessUpdate(deps, async (bridge) => {
      if (!bridge?.prevention)
        throw new Error("Präventionsdienst ist nicht erreichbar.");
      await bridge.prevention.update(processId, input);
    }, "Präventionsverfahren wurde aktualisiert.", "Präventionsverfahren konnte nicht aktualisiert werden.");
  }

  async function updateCaseBemProcess(
    processId: string,
    input: UpdateBemProcessInput,
  ) {
    await runProcessUpdate(deps, async (bridge) => {
      if (!bridge?.bem) throw new Error("BEM-Dienst ist nicht erreichbar.");
      await bridge.bem.update(processId, input);
    }, "BEM-Verfahren wurde aktualisiert.", "BEM-Verfahren konnte nicht aktualisiert werden.");
  }

  async function updateCaseTerminationProcess(
    processId: string,
    input: UpdateTerminationHearingInput,
  ) {
    await runProcessUpdate(deps, async (bridge) => {
      if (!bridge?.termination)
        throw new Error("Kündigungsdienst ist nicht erreichbar.");
      await bridge.termination.update(processId, input);
    }, "Kündigungsanhörung wurde aktualisiert.", "Kündigungsanhörung konnte nicht aktualisiert werden.");
  }

  async function updateCaseParticipationProcess(
    processId: string,
    input: UpdateParticipationInput,
  ) {
    await runProcessUpdate(deps, async (bridge) => {
      if (!bridge?.participation)
        throw new Error("Beteiligungsdienst ist nicht erreichbar.");
      await bridge.participation.update(processId, input);
    }, "SBV-Beteiligungsmaßnahme wurde aktualisiert.", "SBV-Beteiligungsmaßnahme konnte nicht aktualisiert werden.");
  }

  async function updateCaseWorkplaceAccommodationProcess(
    processId: string,
    input: UpdateWorkplaceAccommodationInput,
  ) {
    await runProcessUpdate(deps, async (bridge) => {
      if (!bridge?.workplaceAccommodation)
        throw new Error("Arbeitsplatzgestaltungsdienst ist nicht erreichbar.");
      await bridge.workplaceAccommodation.update(processId, input);
    }, "Arbeitsplatzgestaltung wurde aktualisiert.", "Arbeitsplatzgestaltung konnte nicht aktualisiert werden.");
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
    await runProcessUpdate(deps, async (bridge) => {
      if (!bridge?.equalization)
        throw new Error("Gleichstellungsdienst ist nicht erreichbar.");
      await bridge.equalization.update(processId, input);
    }, "Gleichstellungs-/GdB-Verfahren wurde aktualisiert.", "Gleichstellungsverfahren konnte nicht aktualisiert werden.");
  }


  return { updateCasePreventionProcess, updateCaseBemProcess, updateCaseTerminationProcess, updateCaseParticipationProcess, updateCaseWorkplaceAccommodationProcess, createEqualizationSecureNote, updateCaseEqualizationProcess };
}
