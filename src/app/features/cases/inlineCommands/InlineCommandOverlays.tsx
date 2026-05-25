import type { CaseRecord } from "../../../core/models/case.model";
import type { ContactRecord } from "../../../core/models/contact.model";
import type { LegalNormSuggestion } from "@services/textCommandPolicy";
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
} from "./useInlineCommands";
import type { Setter } from "./overlays/inlineCommandOverlayShared";
import { InlineCaseLinkOverlay } from "./overlays/InlineCaseLinkOverlay";
import { InlineLegalNormOverlay } from "./overlays/InlineLegalNormOverlay";
import { InlineRiskOverlay } from "./overlays/InlineRiskOverlay";
import { InlineOpenTaskOverlay } from "./overlays/InlineOpenTaskOverlay";
import { InlineConfidentialityOverlay } from "./overlays/InlineConfidentialityOverlay";
import { InlineAnonymizationOverlay } from "./overlays/InlineAnonymizationOverlay";
import { InlineContactOverlay } from "./overlays/InlineContactOverlay";
import { InlineBemOverlay } from "./overlays/InlineBemOverlay";
import { InlinePreventionOverlay } from "./overlays/InlinePreventionOverlay";
import { InlineEqualizationOverlay } from "./overlays/InlineEqualizationOverlay";
import { InlineTerminationOverlay } from "./overlays/InlineTerminationOverlay";
import { InlineParticipationOverlay } from "./overlays/InlineParticipationOverlay";
import { InlineWorkplaceAccommodationOverlay } from "./overlays/InlineWorkplaceAccommodationOverlay";
import { InlineTemplateOverlay } from "./overlays/InlineTemplateOverlay";
import { InlineDeadlineOverlay } from "./overlays/InlineDeadlineOverlay";

export type InlineCommandOverlaysProps = {
  inlineCaseLinkDraft: InlineCaseLinkDraft | null;
  setInlineCaseLinkDraft: Setter<InlineCaseLinkDraft>;
  cases: CaseRecord[];
  insertCaseReferenceFromProtocol: (record: CaseRecord) => void | Promise<void>;
  cancelInlineCaseLinkDraft: () => void;

  inlineLegalNormDraft: InlineLegalNormDraft | null;
  setInlineLegalNormDraft: Setter<InlineLegalNormDraft>;
  insertLegalNormFromProtocol: (
    norm: LegalNormSuggestion,
  ) => void | Promise<void>;
  cancelInlineLegalNormDraft: () => void;

  inlineRiskDraft: InlineRiskDraft | null;
  setInlineRiskDraft: Setter<InlineRiskDraft>;
  insertRiskFromProtocol: () => void | Promise<void>;
  cancelInlineRiskDraft: () => void;

  inlineOpenTaskDraft: InlineOpenTaskDraft | null;
  setInlineOpenTaskDraft: Setter<InlineOpenTaskDraft>;
  createOpenTaskFromProtocol: () => void | Promise<void>;
  cancelInlineOpenTaskDraft: () => void;

  inlineConfidentialityDraft: InlineConfidentialityDraft | null;
  setInlineConfidentialityDraft: Setter<InlineConfidentialityDraft>;
  applyConfidentialityFromProtocol: () => void;
  cancelInlineConfidentialityDraft: () => void;

  inlineAnonymizationDraft: InlineAnonymizationDraft | null;
  setInlineAnonymizationDraft: Setter<InlineAnonymizationDraft>;
  applyAnonymizationMarkerFromProtocol: () => void;
  cancelInlineAnonymizationDraft: () => void;

  inlineContactDraft: InlineContactDraft | null;
  setInlineContactDraft: Setter<InlineContactDraft>;
  contacts: ContactRecord[];
  insertExistingContactFromProtocol: (
    contact: ContactRecord,
  ) => void | Promise<void>;
  createAndInsertContactFromProtocol: () => void | Promise<void>;
  cancelInlineContactDraft: () => void;

  inlineBemDraft: InlineBemDraft | null;
  setInlineBemDraft: Setter<InlineBemDraft>;
  createBemFromProtocol: () => void | Promise<void>;
  cancelInlineBemDraft: () => void;

  inlinePreventionDraft: InlinePreventionDraft | null;
  setInlinePreventionDraft: Setter<InlinePreventionDraft>;
  createPreventionFromProtocol: () => void | Promise<void>;
  cancelInlinePreventionDraft: () => void;

  inlineEqualizationDraft: InlineEqualizationDraft | null;
  setInlineEqualizationDraft: Setter<InlineEqualizationDraft>;
  createEqualizationFromProtocol: () => void | Promise<void>;
  cancelInlineEqualizationDraft: () => void;

  inlineTerminationDraft: InlineTerminationDraft | null;
  setInlineTerminationDraft: Setter<InlineTerminationDraft>;
  createTerminationFromProtocol: () => void | Promise<void>;
  cancelInlineTerminationDraft: () => void;

  inlineParticipationDraft: InlineParticipationDraft | null;
  setInlineParticipationDraft: Setter<InlineParticipationDraft>;
  createParticipationFromProtocol: () => void | Promise<void>;
  cancelInlineParticipationDraft: () => void;

  inlineWorkplaceAccommodationDraft: InlineWorkplaceAccommodationDraft | null;
  setInlineWorkplaceAccommodationDraft: Setter<InlineWorkplaceAccommodationDraft>;
  createWorkplaceAccommodationFromProtocol: () => void | Promise<void>;
  cancelInlineWorkplaceAccommodationDraft: () => void;

  inlineTemplateDraft: InlineTemplateDraft | null;
  setInlineTemplateDraft: Setter<InlineTemplateDraft>;
  applyTemplateMarkerFromProtocol: () => void;
  cancelInlineTemplateDraft: () => void;

  inlineDeadlineDraft: InlineDeadlineDraft | null;
  setInlineDeadlineDraft: Setter<InlineDeadlineDraft>;
  selectedCase?: CaseRecord;
  buildInlineDeadlineText: (draft: InlineDeadlineDraft) => string;
  createInlineDeadlineFromProtocol: () => void | Promise<void>;
  cancelInlineDeadlineDraft: () => void;
};


export function InlineCommandOverlays(props: InlineCommandOverlaysProps) {
  return (
    <>
      <InlineCaseLinkOverlay props={props} />
      <InlineLegalNormOverlay props={props} />
      <InlineRiskOverlay props={props} />
      <InlineOpenTaskOverlay props={props} />
      <InlineConfidentialityOverlay props={props} />
      <InlineAnonymizationOverlay props={props} />
      <InlineContactOverlay props={props} />
      <InlineBemOverlay props={props} />
      <InlinePreventionOverlay props={props} />
      <InlineEqualizationOverlay props={props} />
      <InlineTerminationOverlay props={props} />
      <InlineParticipationOverlay props={props} />
      <InlineWorkplaceAccommodationOverlay props={props} />
      <InlineTemplateOverlay props={props} />
      <InlineDeadlineOverlay props={props} />
    </>
  );
}
