import type { LegalNormRecord } from "../../../core/models/knowledge.model";
import { formatLegalNormText, formatRiskText, type LegalNormSuggestion } from "@services/textCommandPolicy";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineLegalRiskCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, confidentialLevel, setConfidentialLevel, setNoteInfo, stageInlineAction, replaceInlineCommandWithToken, removeInlineCommand,
    drafts: { inlineLegalNormDraft, setInlineLegalNormDraft, inlineRiskDraft, setInlineRiskDraft } } = runtime;
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
      stageInlineAction({
        kind: "legal_norm_case_link",
        input: { caseId: selectedCaseId, legalNormId: norm.id, note: "Aus Protokoll mit §§ verknüpft." },
        displayLabel: `${norm.paragraph} · ${norm.title}`,
      });
    }
    setInlineLegalNormDraft(null);
    setNoteInfo(selectedCaseId
      ? `Rechtsnorm eingefügt und Fallbezug vorgemerkt: ${norm.paragraph}`
      : `Rechtsnorm eingefügt: ${norm.paragraph}`);
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

  return { inlineLegalNormDraft, setInlineLegalNormDraft, insertLegalNormFromProtocol, cancelInlineLegalNormDraft, inlineRiskDraft, setInlineRiskDraft, insertRiskFromProtocol, cancelInlineRiskDraft };
}
