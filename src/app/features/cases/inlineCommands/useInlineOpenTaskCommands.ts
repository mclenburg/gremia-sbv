import { formatOpenTaskText } from "@services/textCommandPolicy";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineOpenTaskCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, noteTitle, setNoteInfo, setNoteError, replaceInlineCommandWithToken, removeInlineCommand, onStructuredActionCreated,
    drafts: { inlineOpenTaskDraft, setInlineOpenTaskDraft } } = runtime;
  async function createOpenTaskFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. Aufgaben werden immer mit dem aktuellen Fall verbunden.",
      );
      return;
    }
    if (!inlineOpenTaskDraft || !inlineOpenTaskDraft.title.trim()) {
      setNoteError("Bitte einen Aufgabentitel erfassen.");
      return;
    }
    try {
      const placeholderDueAt = new Date(
        "9999-12-31T23:59:59.000Z",
      ).toISOString();
      const bridge = await waitForBridge();
      if (!bridge?.deadlines) throw new Error("Fristendienst ist nicht erreichbar.");
      const created = await bridge.deadlines.create({
        caseId: selectedCaseId,
        processType: "case",
        deadlineType: "follow_up",
        title: inlineOpenTaskDraft.title.trim(),
        confidentialTitle: `Aufgabe ${selectedCase.caseNumber}`,
        description: `${inlineOpenTaskDraft.description.trim() || "Offene Aufgabe ohne konkretes Ablaufdatum."} Hinweis: technisch mit Platzhalterdatum gespeichert, aber als offene Aufgabe ohne Datum gemeint.`,
        dueAt: placeholderDueAt,
        severity: inlineOpenTaskDraft.severity,
        sourceEvent: noteTitle.trim()
          ? `Protokoll: ${noteTitle.trim()}`
          : `Protokoll im Fall ${selectedCase.caseNumber}`,
        calculationMode: "manual",
        isLegalDeadline: false,
        isUserEditable: true,
        warningThresholdHours: 999999,
        criticalThresholdHours: 999998,
      });
      await onStructuredActionCreated?.();
      if (inlineOpenTaskDraft.markerIndex !== null) {
        replaceInlineCommandWithToken(
          inlineOpenTaskDraft.target,
          inlineOpenTaskDraft.markerIndex,
          inlineOpenTaskDraft.token,
          formatOpenTaskText(inlineOpenTaskDraft.title),
        );
      }
      setInlineOpenTaskDraft(null);
      setNoteInfo(
        `Offene Aufgabe wurde mit Fall ${selectedCase.caseNumber} verbunden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Offene Aufgabe konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineOpenTaskDraft() {
    if (inlineOpenTaskDraft?.markerIndex !== null && inlineOpenTaskDraft)
      removeInlineCommand(
        inlineOpenTaskDraft.target,
        inlineOpenTaskDraft.markerIndex,
        inlineOpenTaskDraft.token,
      );
    setInlineOpenTaskDraft(null);
  }


  return { inlineOpenTaskDraft, setInlineOpenTaskDraft, createOpenTaskFromProtocol, cancelInlineOpenTaskDraft };
}
