import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import { buildInlineDeadlineText, replaceRange } from "./inlineCommandText";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";
import type { InlineDeadlineDraft } from "./inlineCommandTypes";

export function useInlineDeadlineCreationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, noteTitle, setContent, setNextSteps, setNoteInfo, setNoteError, stageInlineAction,
    drafts: { inlineDeadlineDraft, setInlineDeadlineDraft } } = runtime;
  function removeSlashCommand(draft: InlineDeadlineDraft) {
    if (draft.markerIndex === null) return;
    const applyRemoval = (current: string) => {
      const index = current.slice(draft.markerIndex ?? 0).startsWith(draft.token)
        ? (draft.markerIndex ?? 0)
        : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, "").replace(/ {2,}/g, " ");
    };
    if (draft.target === "content") setContent(applyRemoval);
    else setNextSteps(applyRemoval);
  }

  function insertInlineDeadlineText(draft: InlineDeadlineDraft) {
    if (draft.markerIndex === null) return;
    const replacement = buildInlineDeadlineText(draft);
    const applyReplacement = (current: string) => {
      const index = current.slice(draft.markerIndex ?? 0).startsWith(draft.token)
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
      setNoteError("Bitte zuerst eine Fallakte auswählen. Inline-Fristen werden immer mit dem aktuellen Fall verbunden.");
      return;
    }
    if (!inlineDeadlineDraft) return;
    if (!inlineDeadlineDraft.title.trim() || !inlineDeadlineDraft.dueAt) {
      setNoteError("Bitte Titel und Ablaufdatum der Frist erfassen.");
      return;
    }

    const linkLabel = buildInlineDeadlineText(inlineDeadlineDraft);
    stageInlineAction({
      kind: "deadline",
      input: {
        caseId: selectedCaseId,
        processType: "case",
        deadlineType: "follow_up",
        title: inlineDeadlineDraft.title.trim(),
        confidentialTitle: `Frist ${selectedCase.caseNumber}`,
        description: inlineDeadlineDraft.description.trim() || `Aus Protokolltext zum Fall ${selectedCase.caseNumber} angelegt.`,
        dueAt: fromDateTimeLocalValue(inlineDeadlineDraft.dueAt),
        severity: inlineDeadlineDraft.severity,
        legalBasis: inlineDeadlineDraft.legalBasis.trim() || undefined,
        sourceEvent: noteTitle.trim() ? `Protokoll: ${noteTitle.trim()}` : `Protokoll im Fall ${selectedCase.caseNumber}`,
        calculationMode: "manual",
        isLegalDeadline: false,
        isUserEditable: true,
      },
      linkLabel,
      accessibleLabel: `Frist öffnen: ${inlineDeadlineDraft.title.trim()}`,
    });
    const shouldInsertDeadlineText = inlineDeadlineDraft.markerIndex !== null;
    insertInlineDeadlineText(inlineDeadlineDraft);
    setInlineDeadlineDraft(null);
    setNoteInfo(shouldInsertDeadlineText
      ? `Frist ist vorgemerkt und wird erst mit dem Speichern der Notiz in Fall ${selectedCase.caseNumber} angelegt.`
      : `Frist ist vorgemerkt und wird erst mit dem Speichern der Notiz angelegt.`);
  }

  function cancelInlineDeadlineDraft() {
    if (inlineDeadlineDraft) removeSlashCommand(inlineDeadlineDraft);
    setInlineDeadlineDraft(null);
  }

  return { inlineDeadlineDraft, setInlineDeadlineDraft, buildInlineDeadlineText, createInlineDeadlineFromProtocol, cancelInlineDeadlineDraft };
}
