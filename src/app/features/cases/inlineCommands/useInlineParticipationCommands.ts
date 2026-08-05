import { formatParticipationMarkerText } from "@services/textCommandPolicy";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import { buildParticipationPrefill } from "../measures/measurePrefill";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineParticipationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, onStructuredActionCreated, rememberEntityLink, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineParticipationDraft, setInlineParticipationDraft } } = runtime;
  async function createParticipationFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. SBV-Beteiligungen werden immer als Maßnahme der aktuellen Fallakte angelegt.",
      );
      return;
    }
    if (!inlineParticipationDraft) return;
    if (!inlineParticipationDraft.title.trim()) {
      setNoteError("Bitte einen Titel für die SBV-Beteiligung erfassen.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.participation)
        throw new Error("Beteiligungsdienst ist nicht erreichbar.");
      const created = await bridge.participation.create({
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
        statementDueAt: inlineParticipationDraft.statementDueAt
          ? fromDateTimeLocalValue(inlineParticipationDraft.statementDueAt)
          : undefined,
        violationSummary:
          inlineParticipationDraft.employerMeasure.trim() || undefined,
        nextStep:
          inlineParticipationDraft.nextStep.trim() ||
          "Beteiligung nach § 178 Abs. 2 SGB IX in der Fallakte weiter prüfen.",
        createDefaultDeadlines: Boolean(
          inlineParticipationDraft.statementDueAt,
        ),
      });
      await onStructuredActionCreated?.();
      const linkLabel = formatParticipationMarkerText(inlineParticipationDraft.title);
      rememberEntityLink({
        targetType: "participation",
        targetId: created.id,
        label: linkLabel,
        accessibleLabel: `SBV-Beteiligung öffnen: ${created.title}`,
      });
      replaceInlineMeasureCommandWithToken(
        inlineParticipationDraft,
        linkLabel,
      );
      setInlineParticipationDraft(null);
      setNoteInfo(
        `SBV-Beteiligung wurde als Maßnahme in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch im Maßnahmenbereich ergänzt werden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "SBV-Beteiligung konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineParticipationDraft() {
    if (inlineParticipationDraft)
      removeInlineCommand(
        inlineParticipationDraft.target,
        inlineParticipationDraft.markerIndex,
        inlineParticipationDraft.token,
      );
    setInlineParticipationDraft(null);
  }

  return { inlineParticipationDraft, setInlineParticipationDraft, createParticipationFromProtocol, cancelInlineParticipationDraft };
}
