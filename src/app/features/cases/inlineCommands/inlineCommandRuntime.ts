import type { Dispatch, SetStateAction } from "react";
import type { CaseRecord } from "../../../core/models/case.model";
import type { ContactRecord, CreateContactInput } from "../../../core/models/contact.model";
import type { ConfidentialLevel } from "../../../core/models/case-note.model";
import type { CaseLegalReferenceRecord } from "../../../core/models/knowledge.model";
import type { CreateDeadlineInput } from "../../../core/models/deadline.model";
import type { CreateCaseNoteLinkInput } from "../../../core/models/case-note-link.model";
import type { TextCommandToken } from "@services/textCommandPolicy";
import type { ProtocolTextTarget } from "./inlineCommandTypes";
import type { useInlineCommandDrafts } from "./useInlineCommandDrafts";

export type InlineCommandDraftStore = ReturnType<typeof useInlineCommandDrafts>;

export interface InlineCommandEnvironment {
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
  onEntityLinkCreated?: (link: CreateCaseNoteLinkInput) => void;
  onStructuredActionCreated?: () => Promise<void> | void;
}

export interface InlineCommandRuntime extends InlineCommandEnvironment {
  drafts: InlineCommandDraftStore;
  updateProtocolTarget: (
    target: ProtocolTextTarget,
    updater: (current: string) => string,
  ) => void;
  replaceInlineCommand: (
    target: ProtocolTextTarget,
    markerIndex: number,
    token: TextCommandToken,
    replacement: string,
  ) => void;
  replaceInlineCommandWithToken: (
    target: ProtocolTextTarget,
    markerIndex: number,
    token: TextCommandToken,
    replacement: string,
  ) => void;
  removeInlineCommand: (
    target: ProtocolTextTarget,
    markerIndex: number,
    token: TextCommandToken,
  ) => void;
  replaceInlineMeasureCommandWithToken: (
    draft: {
      target: ProtocolTextTarget;
      markerIndex: number;
      token: TextCommandToken;
      commandText?: string;
    },
    replacement: string,
  ) => void;
  rememberEntityLink: (input: {
    targetType: CreateCaseNoteLinkInput["targetType"];
    targetId: string;
    label: string;
    accessibleLabel: string;
  }) => void;
}
