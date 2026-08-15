import { formatOpenTaskText } from "@services/textCommandPolicy";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineOpenTaskCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, noteTitle, setNoteInfo, setNoteError, replaceInlineCommandWithToken, removeInlineCommand, stageInlineAction,
    drafts: { inlineOpenTaskDraft, setInlineOpenTaskDraft } } = runtime;
  async function createOpenTaskFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError("Bitte zuerst eine Fallakte auswählen. Aufgaben werden immer mit dem aktuellen Fall verbunden.");
      return;
    }
    if (!inlineOpenTaskDraft || !inlineOpenTaskDraft.title.trim()) {
      setNoteError("Bitte einen Aufgabentitel erfassen.");
      return;
    }
    const placeholderDueAt = new Date("9999-12-31T23:59:59.000Z").toISOString();
    const linkLabel = formatOpenTaskText(inlineOpenTaskDraft.title);
    stageInlineAction({
      kind: "deadline",
      input: {
        caseId: selectedCaseId,
        processType: "case",
        deadlineType: "follow_up",
        title: inlineOpenTaskDraft.title.trim(),
        confidentialTitle: `Aufgabe ${selectedCase.caseNumber}`,
        description: `${inlineOpenTaskDraft.description.trim() || "Offene Aufgabe ohne konkretes Ablaufdatum."} Hinweis: technisch mit Platzhalterdatum gespeichert, aber als offene Aufgabe ohne Datum gemeint.`,
        dueAt: placeholderDueAt,
        severity: inlineOpenTaskDraft.severity,
        sourceEvent: noteTitle.trim() ? `Protokoll: ${noteTitle.trim()}` : `Protokoll im Fall ${selectedCase.caseNumber}`,
        calculationMode: "manual",
        isLegalDeadline: false,
        isUserEditable: true,
        warningThresholdHours: 999999,
        criticalThresholdHours: 999998,
      },
      linkLabel,
      accessibleLabel: `Aufgabe öffnen: ${inlineOpenTaskDraft.title.trim()}`,
    });
    if (inlineOpenTaskDraft.markerIndex !== null) {
      replaceInlineCommandWithToken(inlineOpenTaskDraft.target, inlineOpenTaskDraft.markerIndex, inlineOpenTaskDraft.token, linkLabel);
    }
    setInlineOpenTaskDraft(null);
    setNoteInfo(`Offene Aufgabe ist vorgemerkt und wird erst mit dem Speichern der Notiz in Fall ${selectedCase.caseNumber} angelegt.`);
  }

  function cancelInlineOpenTaskDraft() {
    if (inlineOpenTaskDraft?.markerIndex !== null && inlineOpenTaskDraft)
      removeInlineCommand(inlineOpenTaskDraft.target, inlineOpenTaskDraft.markerIndex, inlineOpenTaskDraft.token);
    setInlineOpenTaskDraft(null);
  }

  return { inlineOpenTaskDraft, setInlineOpenTaskDraft, createOpenTaskFromProtocol, cancelInlineOpenTaskDraft };
}
