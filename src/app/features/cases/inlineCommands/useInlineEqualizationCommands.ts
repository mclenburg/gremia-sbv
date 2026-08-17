import { formatEqualizationMarkerText } from "@/domain/textCommands/textCommandPolicy";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineEqualizationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, stageInlineAction, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineEqualizationDraft, setInlineEqualizationDraft } } = runtime;
  async function createEqualizationFromProtocol() {
    setNoteError(""); setNoteInfo("");
    if (!selectedCaseId || !selectedCase) { setNoteError("Bitte zuerst eine Fallakte auswählen. Gleichstellung/GdB wird immer mit der aktuellen Fallakte verbunden."); return; }
    if (!inlineEqualizationDraft) return;
    if (!inlineEqualizationDraft.title.trim()) { setNoteError("Bitte einen Titel für Gleichstellung/GdB erfassen."); return; }
    const linkLabel = formatEqualizationMarkerText(inlineEqualizationDraft.title);
    stageInlineAction({
      kind: "equalization",
      input: {
        caseId: selectedCaseId,
        applicationStatus: inlineEqualizationDraft.status,
        outcome: inlineEqualizationDraft.note.trim() || undefined,
        objectionDueAt: inlineEqualizationDraft.objectionDueAt ? fromDateTimeLocalValue(inlineEqualizationDraft.objectionDueAt) : undefined,
        createDefaultDeadline: Boolean(inlineEqualizationDraft.objectionDueAt),
      },
      linkLabel,
      accessibleLabel: `Gleichstellung/GdB öffnen: ${inlineEqualizationDraft.title.trim()}`,
    });
    replaceInlineMeasureCommandWithToken(inlineEqualizationDraft, linkLabel);
    setInlineEqualizationDraft(null);
    setNoteInfo(`Gleichstellung/GdB ist vorgemerkt und wird erst mit dem Speichern der Notiz in Fall ${selectedCase.caseNumber} angelegt.`);
  }
  function cancelInlineEqualizationDraft() {
    if (inlineEqualizationDraft) removeInlineCommand(inlineEqualizationDraft.target, inlineEqualizationDraft.markerIndex, inlineEqualizationDraft.token);
    setInlineEqualizationDraft(null);
  }
  return { inlineEqualizationDraft, setInlineEqualizationDraft, createEqualizationFromProtocol, cancelInlineEqualizationDraft };
}
