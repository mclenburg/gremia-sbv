import type { Dispatch, SetStateAction } from "react";
import type { CaseRecord } from "../../../../domain/models/case.model";
import type { ContactRecord, CreateContactInput } from "../../../../domain/models/contact.model";
import type { ConfidentialLevel, CaseNoteInlineActionInput } from "../../../../domain/models/case-note.model";
import type { CaseLegalReferenceRecord } from "../../../../domain/models/knowledge.model";
import type { CreateDeadlineInput } from "../../../../domain/models/deadline.model";
import type { CreateCaseNoteLinkInput } from "../../../../domain/models/case-note-link.model";
import type { TextCommandToken } from "@/domain/textCommands/textCommandPolicy";
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
  stageInlineAction?: (action: CaseNoteInlineActionInput) => void;
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
  stageInlineAction: (action: CaseNoteInlineActionInput) => void;
  rememberEntityLink: (input: {
    targetType: CreateCaseNoteLinkInput["targetType"];
    targetId: string;
    label: string;
    accessibleLabel: string;
  }) => void;
}
