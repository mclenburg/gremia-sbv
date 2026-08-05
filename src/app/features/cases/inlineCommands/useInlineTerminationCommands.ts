import { formatTerminationMarkerText } from "@services/textCommandPolicy";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineTerminationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, onStructuredActionCreated, rememberEntityLink, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineTerminationDraft, setInlineTerminationDraft } } = runtime;
  async function createTerminationFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. Kündigungsanhörungen werden immer mit der aktuellen Fallakte verbunden.",
      );
      return;
    }
    if (!inlineTerminationDraft) return;
    if (!inlineTerminationDraft.title.trim()) {
      setNoteError("Bitte einen Titel für die Kündigungsanhörung erfassen.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.termination)
        throw new Error("Kündigungsdienst ist nicht erreichbar.");
      const created = await bridge.termination.create({
        caseId: selectedCaseId,
        status: "eingang",
        terminationType: inlineTerminationDraft.terminationType,
        protectionStatus: inlineTerminationDraft.protectionStatus,
        receivedAt: inlineTerminationDraft.receivedAt
          ? fromDateTimeLocalValue(inlineTerminationDraft.receivedAt)
          : new Date().toISOString(),
        sbvStatementDueAt: inlineTerminationDraft.sbvStatementDueAt
          ? fromDateTimeLocalValue(inlineTerminationDraft.sbvStatementDueAt)
          : undefined,
        employerReason:
          inlineTerminationDraft.employerReason.trim() || undefined,
        sbvAssessment:
          inlineTerminationDraft.nextStep.trim() ||
          "Kündigungsanhörung und Beteiligungsrechte prüfen.",
      });
      await onStructuredActionCreated?.();
      const linkLabel = formatTerminationMarkerText(inlineTerminationDraft.title);
      rememberEntityLink({
        targetType: "termination_hearing",
        targetId: created.id,
        label: linkLabel,
        accessibleLabel: `Kündigungsanhörung öffnen: ${inlineTerminationDraft.title}`,
      });
      replaceInlineMeasureCommandWithToken(
        inlineTerminationDraft,
        linkLabel,
      );
      setInlineTerminationDraft(null);
      setNoteInfo(
        `Kündigungsanhörung wurde in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch ergänzt werden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Kündigungsanhörung konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineTerminationDraft() {
    if (inlineTerminationDraft)
      removeInlineCommand(
        inlineTerminationDraft.target,
        inlineTerminationDraft.markerIndex,
        inlineTerminationDraft.token,
      );
    setInlineTerminationDraft(null);
  }

  return { inlineTerminationDraft, setInlineTerminationDraft, createTerminationFromProtocol, cancelInlineTerminationDraft };
}
