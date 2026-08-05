import { formatPreventionMarkerText } from "@services/textCommandPolicy";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlinePreventionCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, onStructuredActionCreated, rememberEntityLink, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlinePreventionDraft, setInlinePreventionDraft } } = runtime;
  async function createPreventionFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. Präventionsverfahren werden immer mit der aktuellen Fallakte verbunden.",
      );
      return;
    }
    if (!inlinePreventionDraft) return;
    if (!inlinePreventionDraft.title.trim()) {
      setNoteError("Bitte einen Titel für das Präventionsverfahren erfassen.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.prevention)
        throw new Error("Präventionsdienst ist nicht erreichbar.");
      const created = await bridge.prevention.create({
        caseId: selectedCaseId,
        firstKnowledgeAt: new Date().toISOString(),
        difficultyType: inlinePreventionDraft.difficultyType,
        riskType: inlinePreventionDraft.riskType,
        personStatus: "unklar",
        hazardDescription:
          inlinePreventionDraft.hazardDescription.trim() ||
          inlinePreventionDraft.title.trim(),
        employerResponseDueAt: inlinePreventionDraft.employerResponseDueAt
          ? fromDateTimeLocalValue(inlinePreventionDraft.employerResponseDueAt)
          : undefined,
        createDefaultDeadlines: Boolean(
          inlinePreventionDraft.employerResponseDueAt,
        ),
      });
      await onStructuredActionCreated?.();
      const linkLabel = formatPreventionMarkerText(inlinePreventionDraft.title);
      rememberEntityLink({
        targetType: "prevention",
        targetId: created.id,
        label: linkLabel,
        accessibleLabel: `Präventionsverfahren öffnen: ${created.hazardDescription || inlinePreventionDraft.title}`,
      });
      replaceInlineMeasureCommandWithToken(
        inlinePreventionDraft,
        linkLabel,
      );
      setInlinePreventionDraft(null);
      setNoteInfo(
        `Präventionsverfahren wurde in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch ergänzt werden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Präventionsverfahren konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlinePreventionDraft() {
    if (inlinePreventionDraft)
      removeInlineCommand(
        inlinePreventionDraft.target,
        inlinePreventionDraft.markerIndex,
        inlinePreventionDraft.token,
      );
    setInlinePreventionDraft(null);
  }

  return { inlinePreventionDraft, setInlinePreventionDraft, createPreventionFromProtocol, cancelInlinePreventionDraft };
}
