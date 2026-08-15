import { formatTerminationMarkerText } from "@services/textCommandPolicy";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineTerminationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, stageInlineAction, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineTerminationDraft, setInlineTerminationDraft } } = runtime;
  async function createTerminationFromProtocol() {
    setNoteError(""); setNoteInfo("");
    if (!selectedCaseId || !selectedCase) { setNoteError("Bitte zuerst eine Fallakte auswählen. Kündigungsanhörungen werden immer mit der aktuellen Fallakte verbunden."); return; }
    if (!inlineTerminationDraft) return;
    if (!inlineTerminationDraft.title.trim()) { setNoteError("Bitte einen Titel für die Kündigungsanhörung erfassen."); return; }
    const linkLabel = formatTerminationMarkerText(inlineTerminationDraft.title);
    stageInlineAction({
      kind: "termination_hearing",
      input: {
        caseId: selectedCaseId,
        status: "eingang",
        terminationType: inlineTerminationDraft.terminationType,
        protectionStatus: inlineTerminationDraft.protectionStatus,
        receivedAt: inlineTerminationDraft.receivedAt ? fromDateTimeLocalValue(inlineTerminationDraft.receivedAt) : new Date().toISOString(),
        sbvStatementDueAt: inlineTerminationDraft.sbvStatementDueAt ? fromDateTimeLocalValue(inlineTerminationDraft.sbvStatementDueAt) : undefined,
        employerReason: inlineTerminationDraft.employerReason.trim() || undefined,
        sbvAssessment: inlineTerminationDraft.nextStep.trim() || "Kündigungsanhörung und Beteiligungsrechte prüfen.",
      },
      linkLabel,
      accessibleLabel: `Kündigungsanhörung öffnen: ${inlineTerminationDraft.title.trim()}`,
    });
    replaceInlineMeasureCommandWithToken(inlineTerminationDraft, linkLabel);
    setInlineTerminationDraft(null);
    setNoteInfo(`Kündigungsanhörung ist vorgemerkt und wird erst mit dem Speichern der Notiz in Fall ${selectedCase.caseNumber} angelegt.`);
  }
  function cancelInlineTerminationDraft() {
    if (inlineTerminationDraft) removeInlineCommand(inlineTerminationDraft.target, inlineTerminationDraft.markerIndex, inlineTerminationDraft.token);
    setInlineTerminationDraft(null);
  }
  return { inlineTerminationDraft, setInlineTerminationDraft, createTerminationFromProtocol, cancelInlineTerminationDraft };
}
