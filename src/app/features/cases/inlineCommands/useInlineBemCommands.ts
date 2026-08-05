import { formatBemMarkerText } from "@services/textCommandPolicy";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineBemCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, onStructuredActionCreated, rememberEntityLink, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineBemDraft, setInlineBemDraft } } = runtime;
  async function createBemFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. BEM-Vorgänge werden immer mit der aktuellen Fallakte verbunden.",
      );
      return;
    }
    if (!inlineBemDraft) return;
    if (!inlineBemDraft.title.trim()) {
      setNoteError("Bitte einen Titel für den BEM-Vorgang erfassen.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.bem) throw new Error("BEM-Dienst ist nicht erreichbar.");
      const created = await bridge.bem.create({
        caseId: selectedCaseId,
        title: inlineBemDraft.title.trim(),
        triggerType: inlineBemDraft.triggerType,
        triggerDescription:
          inlineBemDraft.triggerDescription.trim() || undefined,
        responseDueAt: inlineBemDraft.responseDueAt
          ? fromDateTimeLocalValue(inlineBemDraft.responseDueAt)
          : undefined,
        createDefaultDeadlines: Boolean(inlineBemDraft.responseDueAt),
      });
      await onStructuredActionCreated?.();
      const linkLabel = formatBemMarkerText(inlineBemDraft.title);
      rememberEntityLink({
        targetType: "bem",
        targetId: created.id,
        label: linkLabel,
        accessibleLabel: `BEM-Vorgang öffnen: ${created.title}`,
      });
      replaceInlineMeasureCommandWithToken(
        inlineBemDraft,
        linkLabel,
      );
      setInlineBemDraft(null);
      setNoteInfo(
        `BEM-Vorgang wurde in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch ergänzt werden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "BEM-Vorgang konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineBemDraft() {
    if (inlineBemDraft)
      removeInlineCommand(
        inlineBemDraft.target,
        inlineBemDraft.markerIndex,
        inlineBemDraft.token,
      );
    setInlineBemDraft(null);
  }

  return { inlineBemDraft, setInlineBemDraft, createBemFromProtocol, cancelInlineBemDraft };
}
