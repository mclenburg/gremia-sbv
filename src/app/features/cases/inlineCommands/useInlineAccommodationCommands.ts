import { formatWorkplaceAccommodationMarkerText } from "@/domain/textCommands/textCommandPolicy";
import { fromDateTimeLocalValue } from "../caseWorkbenchFormat";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineAccommodationCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, selectedCase, setNoteInfo, setNoteError, stageInlineAction, replaceInlineMeasureCommandWithToken, removeInlineCommand,
    drafts: { inlineWorkplaceAccommodationDraft, setInlineWorkplaceAccommodationDraft } } = runtime;
  async function createWorkplaceAccommodationFromProtocol() {
    setNoteError(""); setNoteInfo("");
    if (!selectedCaseId || !selectedCase) { setNoteError("Bitte zuerst eine Fallakte auswählen. Arbeitsplatzgestaltung wird immer als Maßnahme der aktuellen Fallakte angelegt."); return; }
    if (!inlineWorkplaceAccommodationDraft) return;
    if (!inlineWorkplaceAccommodationDraft.title.trim()) { setNoteError("Bitte einen Titel für die Arbeitsplatzgestaltung erfassen."); return; }
    const linkLabel = formatWorkplaceAccommodationMarkerText(inlineWorkplaceAccommodationDraft.title);
    stageInlineAction({
      kind: "workplace_accommodation",
      input: {
        caseId: selectedCaseId,
        title: inlineWorkplaceAccommodationDraft.title.trim(),
        category: inlineWorkplaceAccommodationDraft.category,
        status: "angefragt",
        riskLevel: inlineWorkplaceAccommodationDraft.riskLevel,
        requestedAdjustment: inlineWorkplaceAccommodationDraft.requestedAdjustment.trim() || inlineWorkplaceAccommodationDraft.title.trim(),
        legalBasis: "§ 164 Abs. 4 SGB IX",
        implementationDueAt: inlineWorkplaceAccommodationDraft.implementationDueAt ? fromDateTimeLocalValue(inlineWorkplaceAccommodationDraft.implementationDueAt) : undefined,
        nextStep: inlineWorkplaceAccommodationDraft.nextStep.trim() || "Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX in der Fallakte weiter prüfen.",
        createDefaultDeadlines: Boolean(inlineWorkplaceAccommodationDraft.implementationDueAt),
      },
      linkLabel,
      accessibleLabel: `Arbeitsplatzanpassung öffnen: ${inlineWorkplaceAccommodationDraft.title.trim()}`,
    });
    replaceInlineMeasureCommandWithToken(inlineWorkplaceAccommodationDraft, linkLabel);
    setInlineWorkplaceAccommodationDraft(null);
    setNoteInfo(`Arbeitsplatzgestaltung ist vorgemerkt und wird erst mit dem Speichern der Notiz in Fall ${selectedCase.caseNumber} angelegt.`);
  }
  function cancelInlineWorkplaceAccommodationDraft() {
    if (inlineWorkplaceAccommodationDraft) removeInlineCommand(inlineWorkplaceAccommodationDraft.target, inlineWorkplaceAccommodationDraft.markerIndex, inlineWorkplaceAccommodationDraft.token);
    setInlineWorkplaceAccommodationDraft(null);
  }
  return { inlineWorkplaceAccommodationDraft, setInlineWorkplaceAccommodationDraft, createWorkplaceAccommodationFromProtocol, cancelInlineWorkplaceAccommodationDraft };
}
