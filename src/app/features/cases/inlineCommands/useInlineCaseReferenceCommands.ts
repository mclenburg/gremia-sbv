import type { CaseRecord } from "../../../../domain/models/case.model";
import { formatCaseReferenceText } from "@/domain/textCommands/textCommandPolicy";
import { defaultDeadlineTitleForCase } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineCaseReferenceCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, noteTitle, setLinkedCaseIds, setNoteInfo, setNoteError, replaceInlineCommandWithToken, removeInlineCommand,
    drafts: { inlineCaseLinkDraft, setInlineCaseLinkDraft, setInlineDeadlineDraft } } = runtime;
  function openCaseDeadlineDraft() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError("Bitte zuerst eine Fallakte auswählen.");
      return;
    }
    setInlineDeadlineDraft({
      target: "nextSteps",
      token: "//",
      title: defaultDeadlineTitleForCase(selectedCase, noteTitle),
      dueAt: "",
      severity: "important",
      legalBasis: "",
      description: `Direkt aus Fallakte ${selectedCase.caseNumber} angelegt.`,
      markerIndex: null,
    });
  }

  async function insertCaseReferenceFromProtocol(record: CaseRecord) {
    if (!inlineCaseLinkDraft) return;
    setLinkedCaseIds((current) => [...new Set([...current, record.id])]);
    replaceInlineCommandWithToken(
      inlineCaseLinkDraft.target,
      inlineCaseLinkDraft.markerIndex,
      inlineCaseLinkDraft.token,
      formatCaseReferenceText(record.caseNumber, record.displayName),
    );
    setInlineCaseLinkDraft(null);
    setNoteInfo(`Fallbezug ergänzt: ${record.caseNumber}`);
  }

  function cancelInlineCaseLinkDraft() {
    if (inlineCaseLinkDraft)
      removeInlineCommand(
        inlineCaseLinkDraft.target,
        inlineCaseLinkDraft.markerIndex,
        inlineCaseLinkDraft.token,
      );
    setInlineCaseLinkDraft(null);
  }

  return { openCaseDeadlineDraft, inlineCaseLinkDraft, setInlineCaseLinkDraft, insertCaseReferenceFromProtocol, cancelInlineCaseLinkDraft };
}
