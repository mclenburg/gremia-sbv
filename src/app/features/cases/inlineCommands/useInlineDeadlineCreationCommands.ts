import { waitForBridge } from "../../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import { buildInlineDeadlineText, replaceRange } from "./inlineCommandText";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";
import type { InlineDeadlineDraft } from "./inlineCommandTypes";

export function useInlineDeadlineCreationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, noteTitle, setContent, setNextSteps, setNoteInfo, setNoteError, rememberEntityLink, onStructuredActionCreated,
    drafts: { inlineDeadlineDraft, setInlineDeadlineDraft } } = runtime;
  function removeSlashCommand(draft: InlineDeadlineDraft) {
    if (draft.markerIndex === null) return;
    const applyRemoval = (current: string) => {
      const index = current
        .slice(draft.markerIndex ?? 0)
        .startsWith(draft.token)
        ? (draft.markerIndex ?? 0)
        : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, "").replace(
        / {2,}/g,
        " ",
      );
    };

    if (draft.target === "content") setContent(applyRemoval);
    else setNextSteps(applyRemoval);
  }

  function insertInlineDeadlineText(draft: InlineDeadlineDraft) {
    if (draft.markerIndex === null) return;
    const replacement = buildInlineDeadlineText(draft);
    const applyReplacement = (current: string) => {
      const index = current
        .slice(draft.markerIndex ?? 0)
        .startsWith(draft.token)
        ? (draft.markerIndex ?? 0)
        : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, replacement);
    };

    if (draft.target === "content") setContent(applyReplacement);
    else setNextSteps(applyReplacement);
  }

  async function createInlineDeadlineFromProtocol() {
    setNoteError("");
    setNoteInfo("");

    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. Inline-Fristen werden immer mit dem aktuellen Fall verbunden.",
      );
      return;
    }
    if (!inlineDeadlineDraft) return;
    if (!inlineDeadlineDraft.title.trim() || !inlineDeadlineDraft.dueAt) {
      setNoteError("Bitte Titel und Ablaufdatum der Frist erfassen.");
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.deadlines) throw new Error("Fristendienst ist nicht erreichbar.");
      const created = await bridge.deadlines.create({
        caseId: selectedCaseId,
        processType: "case",
        deadlineType: "follow_up",
        title: inlineDeadlineDraft.title.trim(),
        confidentialTitle: `Frist ${selectedCase.caseNumber}`,
        description:
          inlineDeadlineDraft.description.trim() ||
          `Aus Protokolltext zum Fall ${selectedCase.caseNumber} angelegt.`,
        dueAt: fromDateTimeLocalValue(inlineDeadlineDraft.dueAt),
        severity: inlineDeadlineDraft.severity,
        legalBasis: inlineDeadlineDraft.legalBasis.trim() || undefined,
        sourceEvent: noteTitle.trim()
          ? `Protokoll: ${noteTitle.trim()}`
          : `Protokoll im Fall ${selectedCase.caseNumber}`,
        calculationMode: "manual",
        isLegalDeadline: false,
        isUserEditable: true,
      });
      const shouldInsertDeadlineText = inlineDeadlineDraft.markerIndex !== null;
      const linkLabel = buildInlineDeadlineText(inlineDeadlineDraft);
      rememberEntityLink({
        targetType: "deadline",
        targetId: created.id,
        label: linkLabel,
        accessibleLabel: `Frist öffnen: ${created.title}`,
      });
      insertInlineDeadlineText(inlineDeadlineDraft);
      await onStructuredActionCreated?.();
      setInlineDeadlineDraft(null);
      setNoteInfo(
        shouldInsertDeadlineText
          ? `Frist wurde mit Fall ${selectedCase.caseNumber} angelegt und im Protokolltext vermerkt.`
          : `Frist wurde mit Fall ${selectedCase.caseNumber} angelegt.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Inline-Frist konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineDeadlineDraft() {
    if (inlineDeadlineDraft) removeSlashCommand(inlineDeadlineDraft);
    setInlineDeadlineDraft(null);
  }

  return { inlineDeadlineDraft, setInlineDeadlineDraft, buildInlineDeadlineText, createInlineDeadlineFromProtocol, cancelInlineDeadlineDraft };
}
