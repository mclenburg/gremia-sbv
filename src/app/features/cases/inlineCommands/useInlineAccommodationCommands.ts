import { formatWorkplaceAccommodationMarkerText } from "@services/textCommandPolicy";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineAccommodationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, onStructuredActionCreated, rememberEntityLink, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineWorkplaceAccommodationDraft, setInlineWorkplaceAccommodationDraft } } = runtime;
  async function createWorkplaceAccommodationFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. Arbeitsplatzgestaltung wird immer als Maßnahme der aktuellen Fallakte angelegt.",
      );
      return;
    }
    if (!inlineWorkplaceAccommodationDraft) return;
    if (!inlineWorkplaceAccommodationDraft.title.trim()) {
      setNoteError(
        "Bitte einen Titel für die Arbeitsplatzgestaltung erfassen.",
      );
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.workplaceAccommodation)
        throw new Error("Arbeitsplatzgestaltungsdienst ist nicht erreichbar.");
      const created = await bridge.workplaceAccommodation.create({
        caseId: selectedCaseId,
        title: inlineWorkplaceAccommodationDraft.title.trim(),
        category: inlineWorkplaceAccommodationDraft.category,
        status: "angefragt",
        riskLevel: inlineWorkplaceAccommodationDraft.riskLevel,
        requestedAdjustment:
          inlineWorkplaceAccommodationDraft.requestedAdjustment.trim() ||
          inlineWorkplaceAccommodationDraft.title.trim(),
        legalBasis: "§ 164 Abs. 4 SGB IX",
        implementationDueAt:
          inlineWorkplaceAccommodationDraft.implementationDueAt
            ? fromDateTimeLocalValue(
                inlineWorkplaceAccommodationDraft.implementationDueAt,
              )
            : undefined,
        nextStep:
          inlineWorkplaceAccommodationDraft.nextStep.trim() ||
          "Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX in der Fallakte weiter prüfen.",
        createDefaultDeadlines: Boolean(
          inlineWorkplaceAccommodationDraft.implementationDueAt,
        ),
      });
      await onStructuredActionCreated?.();
      const linkLabel = formatWorkplaceAccommodationMarkerText(
        inlineWorkplaceAccommodationDraft.title,
      );
      rememberEntityLink({
        targetType: "workplace_accommodation",
        targetId: created.id,
        label: linkLabel,
        accessibleLabel: `Arbeitsplatzanpassung öffnen: ${created.title}`,
      });
      replaceInlineMeasureCommandWithToken(
        inlineWorkplaceAccommodationDraft,
        linkLabel,
      );
      setInlineWorkplaceAccommodationDraft(null);
      setNoteInfo(
        `Arbeitsplatzgestaltung wurde als Maßnahme in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch im Maßnahmenbereich ergänzt werden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Arbeitsplatzgestaltung konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineWorkplaceAccommodationDraft() {
    if (inlineWorkplaceAccommodationDraft)
      removeInlineCommand(
        inlineWorkplaceAccommodationDraft.target,
        inlineWorkplaceAccommodationDraft.markerIndex,
        inlineWorkplaceAccommodationDraft.token,
      );
    setInlineWorkplaceAccommodationDraft(null);
  }

  return { inlineWorkplaceAccommodationDraft, setInlineWorkplaceAccommodationDraft, createWorkplaceAccommodationFromProtocol, cancelInlineWorkplaceAccommodationDraft };
}
