import { formatAnonymizationMarkerText, formatConfidentialityText, formatTemplateMarkerText } from "@services/textCommandPolicy";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineMarkerCommands(runtime: InlineCommandRuntime) {
  const { setConfidentialLevel, setNoteInfo, removeInlineCommand, replaceInlineCommandWithToken,
    drafts: { inlineConfidentialityDraft, setInlineConfidentialityDraft, inlineAnonymizationDraft, setInlineAnonymizationDraft, inlineTemplateDraft, setInlineTemplateDraft } } = runtime;
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

  return { inlineConfidentialityDraft, setInlineConfidentialityDraft, applyConfidentialityFromProtocol, cancelInlineConfidentialityDraft, inlineAnonymizationDraft, setInlineAnonymizationDraft, applyAnonymizationMarkerFromProtocol, cancelInlineAnonymizationDraft, inlineTemplateDraft, setInlineTemplateDraft, applyTemplateMarkerFromProtocol, cancelInlineTemplateDraft };
}
