import { useCallback, useState } from 'react';
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
} from './inlineCommandTypes';

export function useInlineCommandDrafts() {
  const [inlineDeadlineDraft, setInlineDeadlineDraft] = useState<InlineDeadlineDraft | null>(null);
  const [inlineContactDraft, setInlineContactDraft] = useState<InlineContactDraft | null>(null);
  const [inlineCaseLinkDraft, setInlineCaseLinkDraft] = useState<InlineCaseLinkDraft | null>(null);
  const [inlineLegalNormDraft, setInlineLegalNormDraft] = useState<InlineLegalNormDraft | null>(null);
  const [inlineRiskDraft, setInlineRiskDraft] = useState<InlineRiskDraft | null>(null);
  const [inlineOpenTaskDraft, setInlineOpenTaskDraft] = useState<InlineOpenTaskDraft | null>(null);
  const [inlineConfidentialityDraft, setInlineConfidentialityDraft] = useState<InlineConfidentialityDraft | null>(null);
  const [inlineAnonymizationDraft, setInlineAnonymizationDraft] = useState<InlineAnonymizationDraft | null>(null);
  const [inlineBemDraft, setInlineBemDraft] = useState<InlineBemDraft | null>(null);
  const [inlinePreventionDraft, setInlinePreventionDraft] = useState<InlinePreventionDraft | null>(null);
  const [inlineEqualizationDraft, setInlineEqualizationDraft] = useState<InlineEqualizationDraft | null>(null);
  const [inlineTerminationDraft, setInlineTerminationDraft] = useState<InlineTerminationDraft | null>(null);
  const [inlineParticipationDraft, setInlineParticipationDraft] = useState<InlineParticipationDraft | null>(null);
  const [inlineWorkplaceAccommodationDraft, setInlineWorkplaceAccommodationDraft] = useState<InlineWorkplaceAccommodationDraft | null>(null);
  const [inlineTemplateDraft, setInlineTemplateDraft] = useState<InlineTemplateDraft | null>(null);

  const clearInlineDrafts = useCallback(() => {
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
  }, []);

  return {
    inlineDeadlineDraft, setInlineDeadlineDraft,
    inlineContactDraft, setInlineContactDraft,
    inlineCaseLinkDraft, setInlineCaseLinkDraft,
    inlineLegalNormDraft, setInlineLegalNormDraft,
    inlineRiskDraft, setInlineRiskDraft,
    inlineOpenTaskDraft, setInlineOpenTaskDraft,
    inlineConfidentialityDraft, setInlineConfidentialityDraft,
    inlineAnonymizationDraft, setInlineAnonymizationDraft,
    inlineBemDraft, setInlineBemDraft,
    inlinePreventionDraft, setInlinePreventionDraft,
    inlineEqualizationDraft, setInlineEqualizationDraft,
    inlineTerminationDraft, setInlineTerminationDraft,
    inlineParticipationDraft, setInlineParticipationDraft,
    inlineWorkplaceAccommodationDraft, setInlineWorkplaceAccommodationDraft,
    inlineTemplateDraft, setInlineTemplateDraft,
    clearInlineDrafts,
  };
}
