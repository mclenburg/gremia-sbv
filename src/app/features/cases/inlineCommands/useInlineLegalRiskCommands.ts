import type { LegalNormRecord } from "../../../core/models/knowledge.model";
import { formatLegalNormText, formatRiskText, type LegalNormSuggestion } from "@services/textCommandPolicy";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";

export function useInlineLegalRiskCommands(runtime: InlineCommandRuntime) {
  const { selectedCaseId, confidentialLevel, setConfidentialLevel, setCaseLegalReferences, setNoteInfo, replaceInlineCommandWithToken, removeInlineCommand,
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

  return { inlineLegalNormDraft, setInlineLegalNormDraft, insertLegalNormFromProtocol, cancelInlineLegalNormDraft, inlineRiskDraft, setInlineRiskDraft, insertRiskFromProtocol, cancelInlineRiskDraft };
}
