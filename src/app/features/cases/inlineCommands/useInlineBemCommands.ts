import { formatBemMarkerText } from "@/domain/textCommands/textCommandPolicy";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineBemCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, stageInlineAction, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineBemDraft, setInlineBemDraft } } = runtime;
  async function createBemFromProtocol() {
    setNoteError(""); setNoteInfo("");
    if (!selectedCaseId || !selectedCase) { setNoteError("Bitte zuerst eine Fallakte auswählen. BEM-Vorgänge werden immer mit der aktuellen Fallakte verbunden."); return; }
    if (!inlineBemDraft) return;
    if (!inlineBemDraft.title.trim()) { setNoteError("Bitte einen Titel für den BEM-Vorgang erfassen."); return; }
    const linkLabel = formatBemMarkerText(inlineBemDraft.title);
    stageInlineAction({
      kind: "bem",
      input: {
        caseId: selectedCaseId,
        title: inlineBemDraft.title.trim(),
        triggerType: inlineBemDraft.triggerType,
        triggerDescription: inlineBemDraft.triggerDescription.trim() || undefined,
        responseDueAt: inlineBemDraft.responseDueAt ? fromDateTimeLocalValue(inlineBemDraft.responseDueAt) : undefined,
        createDefaultDeadlines: Boolean(inlineBemDraft.responseDueAt),
      },
      linkLabel,
      accessibleLabel: `BEM-Vorgang öffnen: ${inlineBemDraft.title.trim()}`,
    });
    replaceInlineMeasureCommandWithToken(inlineBemDraft, linkLabel);
    setInlineBemDraft(null);
    setNoteInfo(`BEM-Vorgang ist vorgemerkt und wird erst mit dem Speichern der Notiz in Fall ${selectedCase.caseNumber} angelegt.`);
  }
  function cancelInlineBemDraft() {
    if (inlineBemDraft) removeInlineCommand(inlineBemDraft.target, inlineBemDraft.markerIndex, inlineBemDraft.token);
    setInlineBemDraft(null);
  }
  return { inlineBemDraft, setInlineBemDraft, createBemFromProtocol, cancelInlineBemDraft };
}
