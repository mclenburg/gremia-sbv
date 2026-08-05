import { formatEqualizationMarkerText } from "@services/textCommandPolicy";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineEqualizationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, onStructuredActionCreated, rememberEntityLink, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineEqualizationDraft, setInlineEqualizationDraft } } = runtime;
  async function createEqualizationFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. Gleichstellung/GdB wird immer mit der aktuellen Fallakte verbunden.",
      );
      return;
    }
    if (!inlineEqualizationDraft) return;
    if (!inlineEqualizationDraft.title.trim()) {
      setNoteError("Bitte einen Titel für Gleichstellung/GdB erfassen.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.equalization)
        throw new Error("Gleichstellungsdienst ist nicht erreichbar.");
      const created = await bridge.equalization.create({
        caseId: selectedCaseId,
        applicationStatus: inlineEqualizationDraft.status,
        outcome: inlineEqualizationDraft.note.trim() || undefined,
        objectionDueAt: inlineEqualizationDraft.objectionDueAt
          ? fromDateTimeLocalValue(inlineEqualizationDraft.objectionDueAt)
          : undefined,
        createDefaultDeadline: Boolean(inlineEqualizationDraft.objectionDueAt),
      });
      await onStructuredActionCreated?.();
      const linkLabel = formatEqualizationMarkerText(inlineEqualizationDraft.title);
      rememberEntityLink({
        targetType: "equalization",
        targetId: created.id,
        label: linkLabel,
        accessibleLabel: `Gleichstellung/GdB öffnen: ${inlineEqualizationDraft.title}`,
      });
      replaceInlineMeasureCommandWithToken(
        inlineEqualizationDraft,
        linkLabel,
      );
      setInlineEqualizationDraft(null);
      setNoteInfo(
        `Gleichstellung/GdB wurde in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch ergänzt werden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Gleichstellung/GdB konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineEqualizationDraft() {
    if (inlineEqualizationDraft)
      removeInlineCommand(
        inlineEqualizationDraft.target,
        inlineEqualizationDraft.markerIndex,
        inlineEqualizationDraft.token,
      );
    setInlineEqualizationDraft(null);
  }

  return { inlineEqualizationDraft, setInlineEqualizationDraft, createEqualizationFromProtocol, cancelInlineEqualizationDraft };
}
