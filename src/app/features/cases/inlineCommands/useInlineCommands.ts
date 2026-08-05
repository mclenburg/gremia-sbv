import type { CreateCaseNoteLinkInput } from "../../../core/models/case-note-link.model";
import {
  removeCommandMarker,
  replaceCommandMarker,
  type TextCommandToken,
} from "@services/textCommandPolicy";
import { extractInlineCommandArgument, getInlineCommandRangeLength } from "../measures/measurePrefill";
import { hasAnyInlineCommandOverlay } from "./inlineCommandSearch";
import { openInlineCommandDraft } from "./inlineCommandOpeners";
import { replaceRange } from "./inlineCommandText";
import type { InlineCommandEnvironment, InlineCommandRuntime } from "./inlineCommandRuntime";
import type { ProtocolTextTarget } from "./inlineCommandTypes";
import { useInlineCommandDrafts } from "./useInlineCommandDrafts";
import { useInlineContactCommands } from "./useInlineContactCommands";
import { useInlineCaseReferenceCommands } from "./useInlineCaseReferenceCommands";
import { useInlineLegalRiskCommands } from "./useInlineLegalRiskCommands";
import { useInlineMarkerCommands } from "./useInlineMarkerCommands";
import { useInlineTextCommandRouting } from "./useInlineTextCommandRouting";
import { useInlineOpenTaskCommands } from "./useInlineOpenTaskCommands";
import { useInlineDeadlineCreationCommands } from "./useInlineDeadlineCreationCommands";
import { useInlineBemCommands } from "./useInlineBemCommands";
import { useInlinePreventionCommands } from "./useInlinePreventionCommands";
import { useInlineEqualizationCommands } from "./useInlineEqualizationCommands";
import { useInlineTerminationCommands } from "./useInlineTerminationCommands";
import { useInlineParticipationCommands } from "./useInlineParticipationCommands";
import { useInlineAccommodationCommands } from "./useInlineAccommodationCommands";

export type * from "./inlineCommandTypes";

export function useInlineCommands(environment: InlineCommandEnvironment) {
  const drafts = useInlineCommandDrafts();
  const { content, nextSteps, selectedCase, noteTitle, selectedCaseId, setContent, setNextSteps, onEntityLinkCreated } = environment;

  const updateProtocolTarget = (target: ProtocolTextTarget, updater: (current: string) => string) => {
    if (target === "content") setContent(updater);
    else setNextSteps(updater);
  };

  const replaceInlineCommand = (target: ProtocolTextTarget, markerIndex: number, token: TextCommandToken, replacement: string) => {
    updateProtocolTarget(target, (current) => replaceCommandMarker(current, markerIndex, token, replacement));
  };
  const removeInlineCommand = (target: ProtocolTextTarget, markerIndex: number, token: TextCommandToken) => {
    updateProtocolTarget(target, (current) => removeCommandMarker(current, markerIndex, token));
  };
  const replaceInlineMeasureCommandWithToken = (draft: { target: ProtocolTextTarget; markerIndex: number; token: TextCommandToken; commandText?: string }, replacement: string) => {
    const rangeLength = getInlineCommandRangeLength(draft.token, draft.commandText);
    updateProtocolTarget(draft.target, (current) => {
      const index = current.slice(draft.markerIndex).startsWith(draft.token) ? draft.markerIndex : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, rangeLength, replacement).replace(/ {2,}/g, " ");
    });
  };
  const rememberEntityLink = (input: { targetType: CreateCaseNoteLinkInput["targetType"]; targetId: string; label: string; accessibleLabel: string }) => {
    if (!selectedCaseId) return;
    onEntityLinkCreated?.({ ...input, caseId: selectedCaseId, textStart: 0, textEnd: input.label.length });
  };

  const runtime: InlineCommandRuntime = {
    ...environment,
    drafts,
    updateProtocolTarget,
    replaceInlineCommand,
    replaceInlineCommandWithToken: replaceInlineCommand,
    removeInlineCommand,
    replaceInlineMeasureCommandWithToken,
    rememberEntityLink,
  };

  const hasOpenOverlay = () => hasAnyInlineCommandOverlay(
    drafts.inlineDeadlineDraft, drafts.inlineContactDraft, drafts.inlineCaseLinkDraft,
    drafts.inlineLegalNormDraft, drafts.inlineRiskDraft, drafts.inlineOpenTaskDraft,
    drafts.inlineConfidentialityDraft, drafts.inlineAnonymizationDraft, drafts.inlineBemDraft,
    drafts.inlinePreventionDraft, drafts.inlineEqualizationDraft, drafts.inlineTerminationDraft,
    drafts.inlineParticipationDraft, drafts.inlineWorkplaceAccommodationDraft, drafts.inlineTemplateDraft,
  );

  const getCommandText = (target: ProtocolTextTarget, markerIndex: number, token: TextCommandToken, commandValue?: string) =>
    extractInlineCommandArgument(commandValue ?? (target === "content" ? content : nextSteps), markerIndex, token);

  const openCommand = (target: ProtocolTextTarget, token: TextCommandToken, markerIndex: number, commandValue?: string) => {
    openInlineCommandDraft({
      target, token, markerIndex, commandValue, selectedCase, noteTitle, getCommandText,
      openers: {
        setInlineDeadlineDraft: drafts.setInlineDeadlineDraft,
        setInlineContactDraft: drafts.setInlineContactDraft,
        setInlineCaseLinkDraft: drafts.setInlineCaseLinkDraft,
        setInlineLegalNormDraft: drafts.setInlineLegalNormDraft,
        setInlineRiskDraft: drafts.setInlineRiskDraft,
        setInlineOpenTaskDraft: drafts.setInlineOpenTaskDraft,
        setInlineConfidentialityDraft: drafts.setInlineConfidentialityDraft,
        setInlineAnonymizationDraft: drafts.setInlineAnonymizationDraft,
        setInlineBemDraft: drafts.setInlineBemDraft,
        setInlinePreventionDraft: drafts.setInlinePreventionDraft,
        setInlineEqualizationDraft: drafts.setInlineEqualizationDraft,
        setInlineTerminationDraft: drafts.setInlineTerminationDraft,
        setInlineParticipationDraft: drafts.setInlineParticipationDraft,
        setInlineWorkplaceAccommodationDraft: drafts.setInlineWorkplaceAccommodationDraft,
        setInlineTemplateDraft: drafts.setInlineTemplateDraft,
      },
    });
  };

  const contact = useInlineContactCommands(runtime);
  const caseReferences = useInlineCaseReferenceCommands(runtime);
  const legalRisk = useInlineLegalRiskCommands(runtime);
  const markers = useInlineMarkerCommands(runtime);
  const routing = useInlineTextCommandRouting(runtime, openCommand, hasOpenOverlay);
  const openTasks = useInlineOpenTaskCommands(runtime);
  const deadlines = useInlineDeadlineCreationCommands(runtime);
  const bem = useInlineBemCommands(runtime);
  const prevention = useInlinePreventionCommands(runtime);
  const equalization = useInlineEqualizationCommands(runtime);
  const termination = useInlineTerminationCommands(runtime);
  const participation = useInlineParticipationCommands(runtime);
  const accommodation = useInlineAccommodationCommands(runtime);

  return {
    handleProtocolTextChange: routing.handleProtocolTextChange,
    handleProtocolTextCommand: routing.handleProtocolTextCommand,
    openCaseDeadlineDraft: caseReferences.openCaseDeadlineDraft,
    clearInlineDrafts: drafts.clearInlineDrafts,
    overlayProps: {
      ...caseReferences,
      ...legalRisk,
      ...markers,
      ...contact,
      ...bem,
      ...prevention,
      ...equalization,
      ...termination,
      ...participation,
      ...accommodation,
      ...openTasks,
      ...deadlines,
    },
  };
}
