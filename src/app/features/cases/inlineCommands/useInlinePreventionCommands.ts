import { formatPreventionMarkerText } from "@services/textCommandPolicy";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlinePreventionCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, stageInlineAction, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlinePreventionDraft, setInlinePreventionDraft } } = runtime;
  async function createPreventionFromProtocol() {
    setNoteError(""); setNoteInfo("");
    if (!selectedCaseId || !selectedCase) { setNoteError("Bitte zuerst eine Fallakte auswählen. Präventionsverfahren werden immer mit der aktuellen Fallakte verbunden."); return; }
    if (!inlinePreventionDraft) return;
    if (!inlinePreventionDraft.title.trim()) { setNoteError("Bitte einen Titel für das Präventionsverfahren erfassen."); return; }
    const linkLabel = formatPreventionMarkerText(inlinePreventionDraft.title);
    stageInlineAction({
      kind: "prevention",
      input: {
        caseId: selectedCaseId,
        firstKnowledgeAt: new Date().toISOString(),
        difficultyType: inlinePreventionDraft.difficultyType,
        riskType: inlinePreventionDraft.riskType,
        personStatus: "unklar",
        hazardDescription: inlinePreventionDraft.hazardDescription.trim() || inlinePreventionDraft.title.trim(),
        employerResponseDueAt: inlinePreventionDraft.employerResponseDueAt ? fromDateTimeLocalValue(inlinePreventionDraft.employerResponseDueAt) : undefined,
        createDefaultDeadlines: Boolean(inlinePreventionDraft.employerResponseDueAt),
      },
      linkLabel,
      accessibleLabel: `Präventionsverfahren öffnen: ${inlinePreventionDraft.title.trim()}`,
    });
    replaceInlineMeasureCommandWithToken(inlinePreventionDraft, linkLabel);
    setInlinePreventionDraft(null);
    setNoteInfo(`Präventionsverfahren ist vorgemerkt und wird erst mit dem Speichern der Notiz in Fall ${selectedCase.caseNumber} angelegt.`);
  }
  function cancelInlinePreventionDraft() {
    if (inlinePreventionDraft) removeInlineCommand(inlinePreventionDraft.target, inlinePreventionDraft.markerIndex, inlinePreventionDraft.token);
    setInlinePreventionDraft(null);
  }
  return { inlinePreventionDraft, setInlinePreventionDraft, createPreventionFromProtocol, cancelInlinePreventionDraft };
}
