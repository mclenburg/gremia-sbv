import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CaseRecord } from "../../../core/models/case.model";
import type {
  ContactCategory,
  ContactRecord,
  CreateContactInput,
} from "../../../core/models/contact.model";
import type { ConfidentialLevel } from "../../../core/models/case-note.model";
import type {
  CaseLegalReferenceRecord,
  LegalNormRecord,
} from "../../../core/models/knowledge.model";
import type {
  CreateDeadlineInput,
  DeadlineSeverity,
} from "../../../core/models/deadline.model";
import {
  findFirstTextCommand,
  formatAnonymizationMarkerText,
  formatBemMarkerText,
  formatCaseReferenceText,
  formatConfidentialityText,
  formatLegalNormText,
  formatOpenTaskText,
  formatParticipationMarkerText,
  formatPreventionMarkerText,
  formatWorkplaceAccommodationMarkerText,
  formatEqualizationMarkerText,
  formatTerminationMarkerText,
  formatRiskText,
  formatTemplateMarkerText,
  getTextCommandKind,
  removeCommandMarker,
  replaceCommandMarker,
  type ConfidentialCommandLevel,
  type LegalNormSuggestion,
  type RiskLevelCommand,
  type TextCommandToken,
} from "@services/textCommandPolicy";
import { formatContactReference } from "../../contacts/contactDisplay";
import {
  defaultDeadlineTitleForCase,
  fromDateTimeLocalValue,
} from "../caseWorkbenchFormat";
import { hasAnyInlineCommandOverlay } from "./inlineCommandSearch";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import {
  buildBemPrefill,
  buildEqualizationPrefill,
  buildParticipationPrefill,
  buildPreventionPrefill,
  buildTerminationPrefill,
  buildWorkplaceAccommodationPrefill,
  extractInlineCommandArgument,
  getInlineCommandRangeLength,
} from "../measures/measurePrefill";

export type ProtocolTextTarget = "content" | "nextSteps";

export type InlineDeadlineDraft = {
  target: ProtocolTextTarget;
  token: TextCommandToken;
  title: string;
  dueAt: string;
  severity: DeadlineSeverity;
  legalBasis: string;
  description: string;
  markerIndex: number | null;
};

export type InlineContactDraft = {
  target: ProtocolTextTarget;
  token: TextCommandToken;
  markerIndex: number;
  query: string;
  firstName: string;
  lastName: string;
  organization: string;
  role: string;
  category: ContactCategory;
  email: string;
  phone: string;
};

export type InlineCaseLinkDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  query: string;
};
export type InlineLegalNormDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  query: string;
};
export type InlineRiskDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  level: RiskLevelCommand;
  text: string;
};
export type InlineOpenTaskDraft = {
  target: ProtocolTextTarget;
  markerIndex: number | null;
  token: TextCommandToken;
  title: string;
  description: string;
  severity: DeadlineSeverity;
};
export type InlineConfidentialityDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  level: ConfidentialCommandLevel;
};
export type InlineAnonymizationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  label: string;
};
export type InlineBemDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  triggerDescription: string;
  triggerType:
    | "sechs_wochen_au"
    | "wiederholt_au"
    | "praeventiv"
    | "arbeitgeberangebot"
    | "sbv_anregung"
    | "sonstiges";
  responseDueAt: string;
  nextStep: string;
};
export type InlinePreventionDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  hazardDescription: string;
  difficultyType:
    | "personenbedingt"
    | "verhaltensbedingt"
    | "betriebsbedingt"
    | "organisatorisch"
    | "gesundheitlich_arbeitsplatzbezogen"
    | "konflikt_fuehrung"
    | "sonstiges";
  riskType:
    | "abmahnung"
    | "kuendigung"
    | "umsetzung"
    | "arbeitsunfaehigkeit"
    | "ueberlastung"
    | "leistungsverlust"
    | "arbeitsplatzverlust"
    | "sonstiges";
  employerResponseDueAt: string;
  nextStep: string;
};
export type InlineEqualizationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  status:
    | "beratung"
    | "vorbereitung"
    | "eingereicht"
    | "nachfrage"
    | "bewilligt"
    | "abgelehnt"
    | "widerspruch"
    | "abgeschlossen";
  note: string;
  objectionDueAt: string;
  nextStep: string;
};
export type InlineTerminationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  terminationType:
    | "ordentlich"
    | "ausserordentlich"
    | "aenderungskuendigung"
    | "verdachtskuendigung"
    | "personenbedingt"
    | "verhaltensbedingt"
    | "betriebsbedingt"
    | "sonstiges";
  protectionStatus:
    | "schwerbehindert"
    | "gleichgestellt"
    | "antrag_laeuft"
    | "unklar"
    | "nicht_bekannt";
  receivedAt: string;
  sbvStatementDueAt: string;
  employerReason: string;
  nextStep: string;
};

export type InlineParticipationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  employerMeasure: string;
  riskLevel: "normal" | "erhoeht" | "kritisch";
  statementDueAt: string;
  nextStep: string;
};
export type InlineWorkplaceAccommodationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  requestedAdjustment: string;
  category:
    | "arbeitsplatz"
    | "arbeitsumfeld"
    | "arbeitsorganisation"
    | "arbeitszeit"
    | "arbeitsort"
    | "technische_arbeitshilfe"
    | "software_barrierefreiheit"
    | "qualifizierung"
    | "aufgabenanpassung"
    | "sonstiges";
  riskLevel: "normal" | "erhoeht" | "kritisch";
  implementationDueAt: string;
  nextStep: string;
};
export type InlineTemplateDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  query: string;
};

function formatInlineDeadlineDate(value: string): string {
  if (!value) return "offen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildInlineDeadlineText(draft: InlineDeadlineDraft): string {
  const dateLabel = formatInlineDeadlineDate(draft.dueAt);
  const title = draft.title.trim() || "Wiedervorlage";
  return `Frist bis ${dateLabel}: ${title}`;
}

function replaceRange(
  value: string,
  start: number,
  length: number,
  replacement: string,
): string {
  return `${value.slice(0, start)}${replacement}${value.slice(start + length)}`;
}

export function useInlineCommands({
  selectedCaseId,
  selectedCase,
  noteTitle,
  content,
  setContent,
  nextSteps,
  setNextSteps,
  confidentialLevel,
  setConfidentialLevel,
  setLinkedCaseIds,
  setCaseLegalReferences,
  setNoteInfo,
  setNoteError,
  onCreateDeadline,
  onCreateContact,
  onStructuredActionCreated,
}: {
  selectedCaseId: string;
  selectedCase?: CaseRecord;
  noteTitle: string;
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  nextSteps: string;
  setNextSteps: Dispatch<SetStateAction<string>>;
  confidentialLevel: ConfidentialLevel;
  setConfidentialLevel: Dispatch<SetStateAction<ConfidentialLevel>>;
  setLinkedCaseIds: Dispatch<SetStateAction<string[]>>;
  setCaseLegalReferences: Dispatch<SetStateAction<CaseLegalReferenceRecord[]>>;
  setNoteInfo: Dispatch<SetStateAction<string>>;
  setNoteError: Dispatch<SetStateAction<string>>;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>;
  onStructuredActionCreated?: () => Promise<void> | void;
}) {
  const [inlineDeadlineDraft, setInlineDeadlineDraft] =
    useState<InlineDeadlineDraft | null>(null);
  const [inlineContactDraft, setInlineContactDraft] =
    useState<InlineContactDraft | null>(null);
  const [inlineCaseLinkDraft, setInlineCaseLinkDraft] =
    useState<InlineCaseLinkDraft | null>(null);
  const [inlineLegalNormDraft, setInlineLegalNormDraft] =
    useState<InlineLegalNormDraft | null>(null);
  const [inlineRiskDraft, setInlineRiskDraft] =
    useState<InlineRiskDraft | null>(null);
  const [inlineOpenTaskDraft, setInlineOpenTaskDraft] =
    useState<InlineOpenTaskDraft | null>(null);
  const [inlineConfidentialityDraft, setInlineConfidentialityDraft] =
    useState<InlineConfidentialityDraft | null>(null);
  const [inlineAnonymizationDraft, setInlineAnonymizationDraft] =
    useState<InlineAnonymizationDraft | null>(null);
  const [inlineBemDraft, setInlineBemDraft] = useState<InlineBemDraft | null>(
    null,
  );
  const [inlinePreventionDraft, setInlinePreventionDraft] =
    useState<InlinePreventionDraft | null>(null);
  const [inlineEqualizationDraft, setInlineEqualizationDraft] =
    useState<InlineEqualizationDraft | null>(null);
  const [inlineTerminationDraft, setInlineTerminationDraft] =
    useState<InlineTerminationDraft | null>(null);
  const [inlineParticipationDraft, setInlineParticipationDraft] =
    useState<InlineParticipationDraft | null>(null);
  const [
    inlineWorkplaceAccommodationDraft,
    setInlineWorkplaceAccommodationDraft,
  ] = useState<InlineWorkplaceAccommodationDraft | null>(null);
  const [inlineTemplateDraft, setInlineTemplateDraft] =
    useState<InlineTemplateDraft | null>(null);

  function clearInlineDrafts() {
    setInlineDeadlineDraft(null);
    setInlineContactDraft(null);
    setInlineCaseLinkDraft(null);
    setInlineLegalNormDraft(null);
    setInlineRiskDraft(null);
    setInlineOpenTaskDraft(null);
    setInlineConfidentialityDraft(null);
    setInlineAnonymizationDraft(null);
    setInlineBemDraft(null);
    setInlinePreventionDraft(null);
    setInlineEqualizationDraft(null);
    setInlineTerminationDraft(null);
    setInlineParticipationDraft(null);
    setInlineWorkplaceAccommodationDraft(null);
    setInlineTemplateDraft(null);
  }

  function hasOpenInlineOverlay(): boolean {
    return hasAnyInlineCommandOverlay(
      inlineDeadlineDraft,
      inlineContactDraft,
      inlineCaseLinkDraft,
      inlineLegalNormDraft,
      inlineRiskDraft,
      inlineOpenTaskDraft,
      inlineConfidentialityDraft,
      inlineAnonymizationDraft,
      inlineBemDraft,
      inlinePreventionDraft,
      inlineEqualizationDraft,
      inlineTerminationDraft,
      inlineParticipationDraft,
      inlineWorkplaceAccommodationDraft,
      inlineTemplateDraft,
    );
  }

  function updateProtocolTarget(
    target: ProtocolTextTarget,
    updater: (current: string) => string,
  ) {
    if (target === "content") setContent(updater);
    else setNextSteps(updater);
  }

  function replaceInlineCommand(
    target: ProtocolTextTarget,
    markerIndex: number,
    token: TextCommandToken,
    replacement: string,
  ) {
    updateProtocolTarget(target, (current) =>
      replaceCommandMarker(current, markerIndex, token, replacement),
    );
  }

  function removeInlineCommand(
    target: ProtocolTextTarget,
    markerIndex: number,
    token: TextCommandToken,
  ) {
    updateProtocolTarget(target, (current) =>
      removeCommandMarker(current, markerIndex, token),
    );
  }

  function replaceInlineCommandWithToken(
    target: ProtocolTextTarget,
    markerIndex: number,
    token: TextCommandToken,
    replacement: string,
  ) {
    updateProtocolTarget(target, (current) =>
      replaceCommandMarker(current, markerIndex, token, replacement),
    );
  }

  function replaceInlineMeasureCommandWithToken(
    draft: {
      target: ProtocolTextTarget;
      markerIndex: number;
      token: TextCommandToken;
      commandText?: string;
    },
    replacement: string,
  ) {
    const rangeLength = getInlineCommandRangeLength(
      draft.token,
      draft.commandText,
    );
    updateProtocolTarget(draft.target, (current) => {
      const index = current.slice(draft.markerIndex).startsWith(draft.token)
        ? draft.markerIndex
        : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, rangeLength, replacement).replace(
        / {2,}/g,
        " ",
      );
    });
  }

  function getCommandText(
    target: ProtocolTextTarget,
    markerIndex: number,
    token: TextCommandToken,
  ): string {
    const value = target === "content" ? content : nextSteps;
    return extractInlineCommandArgument(value, markerIndex, token);
  }

  function openInlineContactDraft(
    target: ProtocolTextTarget,
    markerIndex: number,
    token: TextCommandToken = "@@",
  ) {
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

  function openInlineCommand(
    target: ProtocolTextTarget,
    token: TextCommandToken,
    markerIndex: number,
  ) {
    const kind = getTextCommandKind(token);
    if (kind === "deadline" || kind === "follow_up") {
      setInlineDeadlineDraft({
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
      openInlineContactDraft(target, markerIndex, token);
      return;
    }
    if (kind === "case_reference") {
      setInlineCaseLinkDraft({ target, markerIndex, token, query: "" });
      return;
    }
    if (kind === "legal_norm") {
      setInlineLegalNormDraft({ target, markerIndex, token, query: "" });
      return;
    }
    if (kind === "risk") {
      setInlineRiskDraft({
        target,
        markerIndex,
        token,
        level: "high",
        text: "",
      });
      return;
    }
    if (kind === "open_task") {
      setInlineOpenTaskDraft({
        target,
        markerIndex,
        token,
        title: "",
        description: "",
        severity: "important",
      });
      return;
    }
    if (kind === "confidentiality") {
      setInlineConfidentialityDraft({
        target,
        markerIndex,
        token,
        level: "hoch_sensibel",
      });
      return;
    }
    if (kind === "anonymization") {
      setInlineAnonymizationDraft({
        target,
        markerIndex,
        token,
        label: "Name",
      });
      return;
    }
    if (kind === "bem_measure") {
      const commandText = getCommandText(target, markerIndex, token);
      const prefill = buildBemPrefill({
        selectedCase,
        commandText,
        createdFrom: "inline_command",
      });
      setInlineBemDraft({
        target,
        markerIndex,
        token,
        commandText,
        prefilledFields: [
          "title",
          "triggerDescription",
          "triggerType",
          "nextStep",
        ],
        title: prefill.title.value,
        triggerDescription: prefill.triggerDescription.value,
        triggerType: prefill.triggerType.value as InlineBemDraft["triggerType"],
        responseDueAt: prefill.responseDueAt.value,
        nextStep: prefill.nextStep.value,
      });
      return;
    }
    if (kind === "prevention_measure") {
      const commandText = getCommandText(target, markerIndex, token);
      const prefill = buildPreventionPrefill({
        selectedCase,
        commandText,
        createdFrom: "inline_command",
      });
      setInlinePreventionDraft({
        target,
        markerIndex,
        token,
        commandText,
        prefilledFields: [
          "title",
          "hazardDescription",
          "difficultyType",
          "riskType",
          "nextStep",
        ],
        title: prefill.title.value,
        hazardDescription: prefill.hazardDescription.value,
        difficultyType: prefill.difficultyType
          .value as InlinePreventionDraft["difficultyType"],
        riskType: prefill.riskType.value as InlinePreventionDraft["riskType"],
        employerResponseDueAt: prefill.employerResponseDueAt.value,
        nextStep: prefill.nextStep.value,
      });
      return;
    }
    if (kind === "equalization_measure") {
      const commandText = getCommandText(target, markerIndex, token);
      const prefill = buildEqualizationPrefill({
        selectedCase,
        commandText,
        createdFrom: "inline_command",
      });
      setInlineEqualizationDraft({
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
      const commandText = getCommandText(target, markerIndex, token);
      const prefill = buildTerminationPrefill({
        selectedCase,
        commandText,
        createdFrom: "inline_command",
      });
      setInlineTerminationDraft({
        target,
        markerIndex,
        token,
        commandText,
        prefilledFields: [
          "title",
          "terminationType",
          "protectionStatus",
          "receivedAt",
          "employerReason",
          "nextStep",
        ],
        title: prefill.title.value,
        terminationType: prefill.terminationType
          .value as InlineTerminationDraft["terminationType"],
        protectionStatus: prefill.protectionStatus
          .value as InlineTerminationDraft["protectionStatus"],
        receivedAt: prefill.receivedAt.value,
        sbvStatementDueAt: prefill.sbvStatementDueAt.value,
        employerReason: prefill.employerReason.value,
        nextStep: prefill.nextStep.value,
      });
      return;
    }
    if (kind === "participation") {
      const commandText = getCommandText(target, markerIndex, token);
      const prefill = buildParticipationPrefill({
        selectedCase,
        commandText,
        createdFrom: "inline_command",
      });
      setInlineParticipationDraft({
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
      const commandText = getCommandText(target, markerIndex, token);
      const prefill = buildWorkplaceAccommodationPrefill({
        selectedCase,
        commandText,
        createdFrom: "inline_command",
      });
      setInlineWorkplaceAccommodationDraft({
        target,
        markerIndex,
        token,
        commandText,
        prefilledFields: [
          "title",
          "requestedAdjustment",
          "category",
          "riskLevel",
          "nextStep",
        ],
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
      setInlineTemplateDraft({ target, markerIndex, token, query: "" });
    }
  }

  function removeContactCommand(draft: InlineContactDraft) {
    const applyRemoval = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith(draft.token)
        ? draft.markerIndex
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

  function insertInlineContactText(
    draft: InlineContactDraft,
    contact: ContactRecord,
  ) {
    const replacement = formatContactReference(contact);
    const applyReplacement = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith(draft.token)
        ? draft.markerIndex
        : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, replacement);
    };

    if (draft.target === "content") setContent(applyReplacement);
    else setNextSteps(applyReplacement);
  }

  async function insertExistingContactFromProtocol(contact: ContactRecord) {
    if (!inlineContactDraft) return;
    insertInlineContactText(inlineContactDraft, contact);
    setInlineContactDraft(null);
    setNoteInfo(`Kontakt eingefügt: ${formatContactReference(contact)}`);
  }

  async function createAndInsertContactFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!inlineContactDraft) return;
    if (
      !inlineContactDraft.firstName.trim() ||
      !inlineContactDraft.lastName.trim()
    ) {
      setNoteError("Bitte Vorname und Nachname des Kontakts erfassen.");
      return;
    }

    try {
      const created = await onCreateContact({
        firstName: inlineContactDraft.firstName,
        lastName: inlineContactDraft.lastName,
        organization: inlineContactDraft.organization || undefined,
        role: inlineContactDraft.role || undefined,
        category: inlineContactDraft.category,
        email: inlineContactDraft.email || undefined,
        phone: inlineContactDraft.phone || undefined,
      });
      insertInlineContactText(inlineContactDraft, created);
      setInlineContactDraft(null);
      setNoteInfo(
        `Kontakt angelegt und eingefügt: ${formatContactReference(created)}`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Kontakt konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineContactDraft() {
    if (inlineContactDraft) removeContactCommand(inlineContactDraft);
    setInlineContactDraft(null);
  }

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

  function handleProtocolTextChange(target: ProtocolTextTarget, value: string) {
    setNoteInfo("");
    const previousValue = target === "content" ? content : nextSteps;
    if (target === "content") setContent(value);
    else setNextSteps(value);

    if (hasOpenInlineOverlay()) return;
    const command = findFirstTextCommand(value);
    if (!command) return;

    const wasAlreadyPresent = previousValue.includes(command.token);
    if (!wasAlreadyPresent) {
      openInlineCommand(target, command.token, command.index);
    }
  }

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

  async function insertLegalNormFromProtocol(
    norm: LegalNormSuggestion | LegalNormRecord,
  ) {
    if (!inlineLegalNormDraft) return;
    replaceInlineCommandWithToken(
      inlineLegalNormDraft.target,
      inlineLegalNormDraft.markerIndex,
      inlineLegalNormDraft.token,
      formatLegalNormText(norm),
    );
    if (selectedCaseId) {
      try {
        const bridge = await waitForBridge();
        if (bridge?.knowledge) {
          await bridge.knowledge.linkNormToCase({
            caseId: selectedCaseId,
            legalNormId: norm.id,
            note: "Aus Protokoll mit §§ verknüpft.",
          });
          setCaseLegalReferences(
            await bridge.knowledge.listCaseReferences(selectedCaseId),
          );
        }
      } catch {
        // Der Text bleibt eingefügt; der Fallbezug kann später im Wissensmodul nachgezogen werden.
      }
    }
    setInlineLegalNormDraft(null);
    setNoteInfo(`Rechtsnorm eingefügt: ${norm.paragraph}`);
  }

  function cancelInlineLegalNormDraft() {
    if (inlineLegalNormDraft)
      removeInlineCommand(
        inlineLegalNormDraft.target,
        inlineLegalNormDraft.markerIndex,
        inlineLegalNormDraft.token,
      );
    setInlineLegalNormDraft(null);
  }

  async function insertRiskFromProtocol() {
    if (!inlineRiskDraft) return;
    replaceInlineCommandWithToken(
      inlineRiskDraft.target,
      inlineRiskDraft.markerIndex,
      inlineRiskDraft.token,
      formatRiskText(inlineRiskDraft.level, inlineRiskDraft.text),
    );
    if (inlineRiskDraft.level === "critical")
      setConfidentialLevel("hoch_sensibel");
    else if (inlineRiskDraft.level === "high" && confidentialLevel === "normal")
      setConfidentialLevel("sensibel");
    setInlineRiskDraft(null);
    setNoteInfo(
      "Risiko im Protokoll markiert. Fall-Risikostufe wird mit dem Protokoll nachvollziehbar dokumentiert.",
    );
  }

  function cancelInlineRiskDraft() {
    if (inlineRiskDraft)
      removeInlineCommand(
        inlineRiskDraft.target,
        inlineRiskDraft.markerIndex,
        inlineRiskDraft.token,
      );
    setInlineRiskDraft(null);
  }

  async function createOpenTaskFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. Aufgaben werden immer mit dem aktuellen Fall verbunden.",
      );
      return;
    }
    if (!inlineOpenTaskDraft || !inlineOpenTaskDraft.title.trim()) {
      setNoteError("Bitte einen Aufgabentitel erfassen.");
      return;
    }
    try {
      const placeholderDueAt = new Date(
        "9999-12-31T23:59:59.000Z",
      ).toISOString();
      await onCreateDeadline({
        caseId: selectedCaseId,
        processType: "case",
        deadlineType: "follow_up",
        title: inlineOpenTaskDraft.title.trim(),
        confidentialTitle: `Aufgabe ${selectedCase.caseNumber}`,
        description: `${inlineOpenTaskDraft.description.trim() || "Offene Aufgabe ohne konkretes Ablaufdatum."} Hinweis: technisch mit Platzhalterdatum gespeichert, aber als offene Aufgabe ohne Datum gemeint.`,
        dueAt: placeholderDueAt,
        severity: inlineOpenTaskDraft.severity,
        sourceEvent: noteTitle.trim()
          ? `Protokoll: ${noteTitle.trim()}`
          : `Protokoll im Fall ${selectedCase.caseNumber}`,
        calculationMode: "manual",
        isLegalDeadline: false,
        isUserEditable: true,
        warningThresholdHours: 999999,
        criticalThresholdHours: 999998,
      });
      if (inlineOpenTaskDraft.markerIndex !== null) {
        replaceInlineCommandWithToken(
          inlineOpenTaskDraft.target,
          inlineOpenTaskDraft.markerIndex,
          inlineOpenTaskDraft.token,
          formatOpenTaskText(inlineOpenTaskDraft.title),
        );
      }
      setInlineOpenTaskDraft(null);
      setNoteInfo(
        `Offene Aufgabe wurde mit Fall ${selectedCase.caseNumber} verbunden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Offene Aufgabe konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineOpenTaskDraft() {
    if (inlineOpenTaskDraft?.markerIndex !== null && inlineOpenTaskDraft)
      removeInlineCommand(
        inlineOpenTaskDraft.target,
        inlineOpenTaskDraft.markerIndex,
        inlineOpenTaskDraft.token,
      );
    setInlineOpenTaskDraft(null);
  }

  function applyConfidentialityFromProtocol() {
    if (!inlineConfidentialityDraft) return;
    setConfidentialLevel(inlineConfidentialityDraft.level);
    replaceInlineCommandWithToken(
      inlineConfidentialityDraft.target,
      inlineConfidentialityDraft.markerIndex,
      inlineConfidentialityDraft.token,
      formatConfidentialityText(inlineConfidentialityDraft.level),
    );
    setInlineConfidentialityDraft(null);
    setNoteInfo("Vertraulichkeitsstufe der Notiz wurde angepasst.");
  }

  function cancelInlineConfidentialityDraft() {
    if (inlineConfidentialityDraft)
      removeInlineCommand(
        inlineConfidentialityDraft.target,
        inlineConfidentialityDraft.markerIndex,
        inlineConfidentialityDraft.token,
      );
    setInlineConfidentialityDraft(null);
  }

  function applyAnonymizationMarkerFromProtocol() {
    if (!inlineAnonymizationDraft) return;
    replaceInlineCommandWithToken(
      inlineAnonymizationDraft.target,
      inlineAnonymizationDraft.markerIndex,
      inlineAnonymizationDraft.token,
      formatAnonymizationMarkerText(inlineAnonymizationDraft.label),
    );
    setInlineAnonymizationDraft(null);
    setNoteInfo("Anonymisierungsvormerkung im Protokoll gesetzt.");
  }

  function cancelInlineAnonymizationDraft() {
    if (inlineAnonymizationDraft)
      removeInlineCommand(
        inlineAnonymizationDraft.target,
        inlineAnonymizationDraft.markerIndex,
        inlineAnonymizationDraft.token,
      );
    setInlineAnonymizationDraft(null);
  }

  async function createBemFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. BEM-Vorgänge werden immer mit der aktuellen Fallakte verbunden.",
      );
      return;
    }
    if (!inlineBemDraft) return;
    if (!inlineBemDraft.title.trim()) {
      setNoteError("Bitte einen Titel für den BEM-Vorgang erfassen.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.bem) throw new Error("BEM-Dienst ist nicht erreichbar.");
      await bridge.bem.create({
        caseId: selectedCaseId,
        title: inlineBemDraft.title.trim(),
        triggerType: inlineBemDraft.triggerType,
        triggerDescription:
          inlineBemDraft.triggerDescription.trim() || undefined,
        responseDueAt: inlineBemDraft.responseDueAt
          ? fromDateTimeLocalValue(inlineBemDraft.responseDueAt)
          : undefined,
        createDefaultDeadlines: Boolean(inlineBemDraft.responseDueAt),
      });
      await onStructuredActionCreated?.();
      replaceInlineMeasureCommandWithToken(
        inlineBemDraft,
        formatBemMarkerText(inlineBemDraft.title),
      );
      setInlineBemDraft(null);
      setNoteInfo(
        `BEM-Vorgang wurde in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch ergänzt werden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "BEM-Vorgang konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineBemDraft() {
    if (inlineBemDraft)
      removeInlineCommand(
        inlineBemDraft.target,
        inlineBemDraft.markerIndex,
        inlineBemDraft.token,
      );
    setInlineBemDraft(null);
  }

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
      await bridge.prevention.create({
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
      replaceInlineMeasureCommandWithToken(
        inlinePreventionDraft,
        formatPreventionMarkerText(inlinePreventionDraft.title),
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

  async function createEqualizationFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. Gleichstellung/GdB wird immer mit der aktuellen Fallakte verbunden.",
      );
      return;
    }
    if (!inlineEqualizationDraft) return;
    if (!inlineEqualizationDraft.title.trim()) {
      setNoteError("Bitte einen Titel für Gleichstellung/GdB erfassen.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.equalization)
        throw new Error("Gleichstellungsdienst ist nicht erreichbar.");
      await bridge.equalization.create({
        caseId: selectedCaseId,
        applicationStatus: inlineEqualizationDraft.status,
        outcome: inlineEqualizationDraft.note.trim() || undefined,
        objectionDueAt: inlineEqualizationDraft.objectionDueAt
          ? fromDateTimeLocalValue(inlineEqualizationDraft.objectionDueAt)
          : undefined,
        createDefaultDeadline: Boolean(inlineEqualizationDraft.objectionDueAt),
      });
      await onStructuredActionCreated?.();
      replaceInlineMeasureCommandWithToken(
        inlineEqualizationDraft,
        formatEqualizationMarkerText(inlineEqualizationDraft.title),
      );
      setInlineEqualizationDraft(null);
      setNoteInfo(
        `Gleichstellung/GdB wurde in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch ergänzt werden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Gleichstellung/GdB konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineEqualizationDraft() {
    if (inlineEqualizationDraft)
      removeInlineCommand(
        inlineEqualizationDraft.target,
        inlineEqualizationDraft.markerIndex,
        inlineEqualizationDraft.token,
      );
    setInlineEqualizationDraft(null);
  }

  async function createTerminationFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!selectedCaseId || !selectedCase) {
      setNoteError(
        "Bitte zuerst eine Fallakte auswählen. Kündigungsanhörungen werden immer mit der aktuellen Fallakte verbunden.",
      );
      return;
    }
    if (!inlineTerminationDraft) return;
    if (!inlineTerminationDraft.title.trim()) {
      setNoteError("Bitte einen Titel für die Kündigungsanhörung erfassen.");
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.termination)
        throw new Error("Kündigungsdienst ist nicht erreichbar.");
      await bridge.termination.create({
        caseId: selectedCaseId,
        status: "eingang",
        terminationType: inlineTerminationDraft.terminationType,
        protectionStatus: inlineTerminationDraft.protectionStatus,
        receivedAt: inlineTerminationDraft.receivedAt
          ? fromDateTimeLocalValue(inlineTerminationDraft.receivedAt)
          : new Date().toISOString(),
        sbvStatementDueAt: inlineTerminationDraft.sbvStatementDueAt
          ? fromDateTimeLocalValue(inlineTerminationDraft.sbvStatementDueAt)
          : undefined,
        employerReason:
          inlineTerminationDraft.employerReason.trim() || undefined,
        sbvAssessment:
          inlineTerminationDraft.nextStep.trim() ||
          "Kündigungsanhörung und Beteiligungsrechte prüfen.",
      });
      await onStructuredActionCreated?.();
      replaceInlineMeasureCommandWithToken(
        inlineTerminationDraft,
        formatTerminationMarkerText(inlineTerminationDraft.title),
      );
      setInlineTerminationDraft(null);
      setNoteInfo(
        `Kündigungsanhörung wurde in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch ergänzt werden.`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Kündigungsanhörung konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineTerminationDraft() {
    if (inlineTerminationDraft)
      removeInlineCommand(
        inlineTerminationDraft.target,
        inlineTerminationDraft.markerIndex,
        inlineTerminationDraft.token,
      );
    setInlineTerminationDraft(null);
  }

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
      replaceInlineMeasureCommandWithToken(
        inlineParticipationDraft,
        formatParticipationMarkerText(inlineParticipationDraft.title),
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
      await bridge.workplaceAccommodation.create({
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
      replaceInlineMeasureCommandWithToken(
        inlineWorkplaceAccommodationDraft,
        formatWorkplaceAccommodationMarkerText(
          inlineWorkplaceAccommodationDraft.title,
        ),
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

  function applyTemplateMarkerFromProtocol() {
    if (!inlineTemplateDraft) return;
    replaceInlineCommandWithToken(
      inlineTemplateDraft.target,
      inlineTemplateDraft.markerIndex,
      inlineTemplateDraft.token,
      formatTemplateMarkerText(inlineTemplateDraft.query),
    );
    setInlineTemplateDraft(null);
    setNoteInfo(
      "Vorlagenbezug wurde im Protokoll vorgemerkt. Die konkrete Dokumenterzeugung erfolgt weiterhin im Vorlagenbereich.",
    );
  }

  function cancelInlineTemplateDraft() {
    if (inlineTemplateDraft)
      removeInlineCommand(
        inlineTemplateDraft.target,
        inlineTemplateDraft.markerIndex,
        inlineTemplateDraft.token,
      );
    setInlineTemplateDraft(null);
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
      await onCreateDeadline({
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
      insertInlineDeadlineText(inlineDeadlineDraft);
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

  return {
    handleProtocolTextChange,
    openCaseDeadlineDraft,
    clearInlineDrafts,
    overlayProps: {
      inlineCaseLinkDraft,
      setInlineCaseLinkDraft,
      insertCaseReferenceFromProtocol,
      cancelInlineCaseLinkDraft,
      inlineLegalNormDraft,
      setInlineLegalNormDraft,
      insertLegalNormFromProtocol,
      cancelInlineLegalNormDraft,
      inlineRiskDraft,
      setInlineRiskDraft,
      insertRiskFromProtocol,
      cancelInlineRiskDraft,
      inlineOpenTaskDraft,
      setInlineOpenTaskDraft,
      createOpenTaskFromProtocol,
      cancelInlineOpenTaskDraft,
      inlineConfidentialityDraft,
      setInlineConfidentialityDraft,
      applyConfidentialityFromProtocol,
      cancelInlineConfidentialityDraft,
      inlineAnonymizationDraft,
      setInlineAnonymizationDraft,
      applyAnonymizationMarkerFromProtocol,
      cancelInlineAnonymizationDraft,
      inlineContactDraft,
      setInlineContactDraft,
      insertExistingContactFromProtocol,
      createAndInsertContactFromProtocol,
      cancelInlineContactDraft,
      inlineBemDraft,
      setInlineBemDraft,
      createBemFromProtocol,
      cancelInlineBemDraft,
      inlinePreventionDraft,
      setInlinePreventionDraft,
      createPreventionFromProtocol,
      cancelInlinePreventionDraft,
      inlineEqualizationDraft,
      setInlineEqualizationDraft,
      createEqualizationFromProtocol,
      cancelInlineEqualizationDraft,
      inlineTerminationDraft,
      setInlineTerminationDraft,
      createTerminationFromProtocol,
      cancelInlineTerminationDraft,
      inlineParticipationDraft,
      setInlineParticipationDraft,
      createParticipationFromProtocol,
      cancelInlineParticipationDraft,
      inlineWorkplaceAccommodationDraft,
      setInlineWorkplaceAccommodationDraft,
      createWorkplaceAccommodationFromProtocol,
      cancelInlineWorkplaceAccommodationDraft,
      inlineTemplateDraft,
      setInlineTemplateDraft,
      applyTemplateMarkerFromProtocol,
      cancelInlineTemplateDraft,
      inlineDeadlineDraft,
      setInlineDeadlineDraft,
      buildInlineDeadlineText,
      createInlineDeadlineFromProtocol,
      cancelInlineDeadlineDraft,
    },
  };
}
