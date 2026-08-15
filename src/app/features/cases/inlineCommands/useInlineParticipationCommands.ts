import { formatParticipationMarkerText } from "@services/textCommandPolicy";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import { buildParticipationPrefill } from "../measures/measurePrefill";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineParticipationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, stageInlineAction, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineParticipationDraft, setInlineParticipationDraft } } = runtime;
  async function createParticipationFromProtocol() {
    setNoteError(""); setNoteInfo("");
    if (!selectedCaseId || !selectedCase) { setNoteError("Bitte zuerst eine Fallakte auswählen. SBV-Beteiligungen werden immer als Maßnahme der aktuellen Fallakte angelegt."); return; }
    if (!inlineParticipationDraft) return;
    if (!inlineParticipationDraft.title.trim()) { setNoteError("Bitte einen Titel für die SBV-Beteiligung erfassen."); return; }
    const linkLabel = formatParticipationMarkerText(inlineParticipationDraft.title);
    stageInlineAction({
      kind: "participation",
      input: {
        caseId: selectedCaseId,
        title: inlineParticipationDraft.title.trim(),
        measureType: buildParticipationPrefill({
          selectedCase,
          commandText: inlineParticipationDraft.commandText,
          createdFrom: "inline_command",
        }).measureType.value,
        riskLevel: inlineParticipationDraft.riskLevel,
        personStatus: "unklar",
        decisionStage: "unklar",
        firstKnownAt: new Date().toISOString(),
        statementDueAt: inlineParticipationDraft.statementDueAt ? fromDateTimeLocalValue(inlineParticipationDraft.statementDueAt) : undefined,
        violationSummary: inlineParticipationDraft.employerMeasure.trim() || undefined,
        nextStep: inlineParticipationDraft.nextStep.trim() || "Beteiligung nach § 178 Abs. 2 SGB IX in der Fallakte weiter prüfen.",
        createDefaultDeadlines: Boolean(inlineParticipationDraft.statementDueAt),
      },
      linkLabel,
      accessibleLabel: `SBV-Beteiligung öffnen: ${inlineParticipationDraft.title.trim()}`,
    });
    replaceInlineMeasureCommandWithToken(inlineParticipationDraft, linkLabel);
    setInlineParticipationDraft(null);
    setNoteInfo(`SBV-Beteiligung ist vorgemerkt und wird erst mit dem Speichern der Notiz in Fall ${selectedCase.caseNumber} angelegt.`);
  }
  function cancelInlineParticipationDraft() {
    if (inlineParticipationDraft) removeInlineCommand(inlineParticipationDraft.target, inlineParticipationDraft.markerIndex, inlineParticipationDraft.token);
    setInlineParticipationDraft(null);
  }
  return { inlineParticipationDraft, setInlineParticipationDraft, createParticipationFromProtocol, cancelInlineParticipationDraft };
}
