import type { Dispatch, SetStateAction } from "react";
import type { CaseRecord } from "../../../core/models/case.model";
import {
  getTextCommandKind,
  type TextCommandToken,
} from "@services/textCommandPolicy";
import { defaultDeadlineTitleForCase } from "../caseWorkbenchFormat";
import {
  buildBemPrefill,
  buildEqualizationPrefill,
  buildParticipationPrefill,
  buildPreventionPrefill,
  buildTerminationPrefill,
  buildWorkplaceAccommodationPrefill,
} from "../measures/measurePrefill";
import type {
  InlineAnonymizationDraft,
  InlineBemDraft,
  InlineCaseLinkDraft,
  InlineConfidentialityDraft,
  InlineContactDraft,
  InlineDeadlineDraft,
  InlineEqualizationDraft,
  InlineLegalNormDraft,
  InlineOpenTaskDraft,
  InlineParticipationDraft,
  InlinePreventionDraft,
  InlineRiskDraft,
  InlineTemplateDraft,
  InlineTerminationDraft,
  InlineWorkplaceAccommodationDraft,
  ProtocolTextTarget,
} from "./inlineCommandTypes";

type InlineCommandOpeners = {
  setInlineDeadlineDraft: Dispatch<SetStateAction<InlineDeadlineDraft | null>>;
  setInlineContactDraft: Dispatch<SetStateAction<InlineContactDraft | null>>;
  setInlineCaseLinkDraft: Dispatch<SetStateAction<InlineCaseLinkDraft | null>>;
  setInlineLegalNormDraft: Dispatch<SetStateAction<InlineLegalNormDraft | null>>;
  setInlineRiskDraft: Dispatch<SetStateAction<InlineRiskDraft | null>>;
  setInlineOpenTaskDraft: Dispatch<SetStateAction<InlineOpenTaskDraft | null>>;
  setInlineConfidentialityDraft: Dispatch<SetStateAction<InlineConfidentialityDraft | null>>;
  setInlineAnonymizationDraft: Dispatch<SetStateAction<InlineAnonymizationDraft | null>>;
  setInlineBemDraft: Dispatch<SetStateAction<InlineBemDraft | null>>;
  setInlinePreventionDraft: Dispatch<SetStateAction<InlinePreventionDraft | null>>;
  setInlineEqualizationDraft: Dispatch<SetStateAction<InlineEqualizationDraft | null>>;
  setInlineTerminationDraft: Dispatch<SetStateAction<InlineTerminationDraft | null>>;
  setInlineParticipationDraft: Dispatch<SetStateAction<InlineParticipationDraft | null>>;
  setInlineWorkplaceAccommodationDraft: Dispatch<SetStateAction<InlineWorkplaceAccommodationDraft | null>>;
  setInlineTemplateDraft: Dispatch<SetStateAction<InlineTemplateDraft | null>>;
};

export function openInlineContactDraft({
  target,
  markerIndex,
  token,
  setInlineContactDraft,
}: {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  setInlineContactDraft: Dispatch<SetStateAction<InlineContactDraft | null>>;
}) {
  setInlineContactDraft({
    target,
    token,
    markerIndex,
    query: "",
    firstName: "",
    lastName: "",
    organization: "",
    role: "",
    category: "sonstiges",
    email: "",
    phone: "",
  });
}

export function openInlineCommandDraft({
  target,
  token,
  markerIndex,
  commandValue,
  selectedCase,
  noteTitle,
  getCommandText,
  openers,
}: {
  target: ProtocolTextTarget;
  token: TextCommandToken;
  markerIndex: number;
  commandValue?: string;
  selectedCase?: CaseRecord;
  noteTitle: string;
  getCommandText: (
    target: ProtocolTextTarget,
    markerIndex: number,
    token: TextCommandToken,
    commandValue?: string,
  ) => string;
  openers: InlineCommandOpeners;
}) {
  const kind = getTextCommandKind(token);
  if (kind === "deadline" || kind === "follow_up") {
    openers.setInlineDeadlineDraft({
      target,
      token,
      title:
        kind === "follow_up"
          ? "Wiedervorlage"
          : defaultDeadlineTitleForCase(selectedCase, noteTitle),
      dueAt: "",
      severity: kind === "follow_up" ? "normal" : "important",
      legalBasis: "",
      description:
        target === "content"
          ? `Aus Protokolltext per ${token} angelegt.`
          : `Aus nächste Schritte per ${token} angelegt.`,
      markerIndex,
    });
    return;
  }
  if (kind === "contact") {
    openInlineContactDraft({
      target,
      markerIndex,
      token,
      setInlineContactDraft: openers.setInlineContactDraft,
    });
    return;
  }
  if (kind === "case_reference") {
    openers.setInlineCaseLinkDraft({ target, markerIndex, token, query: "" });
    return;
  }
  if (kind === "legal_norm") {
    openers.setInlineLegalNormDraft({ target, markerIndex, token, query: "" });
    return;
  }
  if (kind === "risk") {
    openers.setInlineRiskDraft({ target, markerIndex, token, level: "high", text: "" });
    return;
  }
  if (kind === "open_task") {
    openers.setInlineOpenTaskDraft({ target, markerIndex, token, title: "", description: "", severity: "important" });
    return;
  }
  if (kind === "confidentiality") {
    openers.setInlineConfidentialityDraft({ target, markerIndex, token, level: "hoch_sensibel" });
    return;
  }
  if (kind === "anonymization") {
    openers.setInlineAnonymizationDraft({ target, markerIndex, token, label: "Name" });
    return;
  }

  const commandText = getCommandText(target, markerIndex, token, commandValue);
  if (kind === "bem_measure") {
    const prefill = buildBemPrefill({ selectedCase, commandText, createdFrom: "inline_command" });
    openers.setInlineBemDraft({
      target,
      markerIndex,
      token,
      commandText,
      prefilledFields: ["title", "triggerDescription", "triggerType", "nextStep"],
      title: prefill.title.value,
      triggerDescription: prefill.triggerDescription.value,
      triggerType: prefill.triggerType.value as InlineBemDraft["triggerType"],
      responseDueAt: prefill.responseDueAt.value,
      nextStep: prefill.nextStep.value,
    });
    return;
  }
  if (kind === "prevention_measure") {
    const prefill = buildPreventionPrefill({ selectedCase, commandText, createdFrom: "inline_command" });
    openers.setInlinePreventionDraft({
      target,
      markerIndex,
      token,
      commandText,
      prefilledFields: ["title", "hazardDescription", "difficultyType", "riskType", "nextStep"],
      title: prefill.title.value,
      hazardDescription: prefill.hazardDescription.value,
      difficultyType: prefill.difficultyType.value as InlinePreventionDraft["difficultyType"],
      riskType: prefill.riskType.value as InlinePreventionDraft["riskType"],
      employerResponseDueAt: prefill.employerResponseDueAt.value,
      nextStep: prefill.nextStep.value,
    });
    return;
  }
  if (kind === "equalization_measure") {
    const prefill = buildEqualizationPrefill({ selectedCase, commandText, createdFrom: "inline_command" });
    openers.setInlineEqualizationDraft({
      target,
      markerIndex,
      token,
      commandText,
      prefilledFields: ["title", "status", "note", "nextStep"],
      title: prefill.title.value,
      status: prefill.status.value as InlineEqualizationDraft["status"],
      note: prefill.note.value,
      objectionDueAt: prefill.objectionDueAt.value,
      nextStep: prefill.nextStep.value,
    });
    return;
  }
  if (kind === "termination_measure") {
    const prefill = buildTerminationPrefill({ selectedCase, commandText, createdFrom: "inline_command" });
    openers.setInlineTerminationDraft({
      target,
      markerIndex,
      token,
      commandText,
      prefilledFields: ["title", "terminationType", "protectionStatus", "receivedAt", "employerReason", "nextStep"],
      title: prefill.title.value,
      terminationType: prefill.terminationType.value as InlineTerminationDraft["terminationType"],
      protectionStatus: prefill.protectionStatus.value as InlineTerminationDraft["protectionStatus"],
      receivedAt: prefill.receivedAt.value,
      sbvStatementDueAt: prefill.sbvStatementDueAt.value,
      employerReason: prefill.employerReason.value,
      nextStep: prefill.nextStep.value,
    });
    return;
  }
  if (kind === "participation") {
    const prefill = buildParticipationPrefill({ selectedCase, commandText, createdFrom: "inline_command" });
    openers.setInlineParticipationDraft({
      target,
      markerIndex,
      token,
      commandText,
      prefilledFields: ["title", "employerMeasure", "riskLevel", "nextStep"],
      title: prefill.title.value,
      employerMeasure: prefill.employerMeasure.value,
      riskLevel: prefill.riskLevel.value,
      statementDueAt: prefill.statementDueAt.value,
      nextStep: prefill.nextStep.value,
    });
    return;
  }
  if (kind === "workplace_accommodation") {
    const prefill = buildWorkplaceAccommodationPrefill({ selectedCase, commandText, createdFrom: "inline_command" });
    openers.setInlineWorkplaceAccommodationDraft({
      target,
      markerIndex,
      token,
      commandText,
      prefilledFields: ["title", "requestedAdjustment", "category", "riskLevel", "nextStep"],
      title: prefill.title.value,
      requestedAdjustment: prefill.requestedAdjustment.value,
      category: prefill.category.value,
      riskLevel: prefill.riskLevel.value,
      implementationDueAt: prefill.implementationDueAt.value,
      nextStep: prefill.nextStep.value,
    });
    return;
  }
  if (kind === "template") {
    openers.setInlineTemplateDraft({ target, markerIndex, token, query: "" });
  }
}
