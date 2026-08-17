import {
  AlertTriangle,
  BadgeCheck,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Wrench,
  FolderKanban,
  Lock,
  Scale,
  ShieldAlert,
  Siren,
  Users,
} from "lucide-react";
import type { LegalNormSuggestion } from "@/domain/textCommands/textCommandPolicy";
import {
  LEGAL_NORM_SUGGESTIONS,
  formatAnonymizationMarkerText,
  formatBemMarkerText,
  formatConfidentialityText,
  formatLegalNormText,
  formatOpenTaskText,
  formatPreventionMarkerText,
  formatEqualizationMarkerText,
  formatTerminationMarkerText,
  formatRiskText,
  formatTemplateMarkerText,
} from "@/domain/textCommands/textCommandPolicy";
import type { ContactCategory } from "../../../../../domain/models/contact.model";
import type { DeadlineSeverity } from "../../../../../domain/models/deadline.model";
import type { ConfidentialCommandLevel, RiskLevelCommand } from "@/domain/textCommands/textCommandPolicy";
import { filterContactsForQuery, formatContactReference } from "../../../contacts/contactDisplay";
import { filterCasesForInlineCommand, filterNormsForInlineCommand } from "../inlineCommandSearch";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { FieldCaption, IndustrialModalSurface } from "./inlineCommandOverlayShared";

export function InlineTemplateOverlay({ props }: { props: InlineCommandOverlaysProps }) {
  const {
    inlineCaseLinkDraft,
    setInlineCaseLinkDraft,
    cases,
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
    contacts,
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
    selectedCase,
    buildInlineDeadlineText,
    createInlineDeadlineFromProtocol,
    cancelInlineDeadlineDraft,
  } = props;

  return inlineTemplateDraft ? (
    <IndustrialModalSurface
      className="inline-command-quick"
      labelledById="inline-template-title"
      onClose={cancelInlineTemplateDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Vorlage</p>
            <h2 id="inline-template-title">Vorlage vormerken</h2>
            <p>
              Der Vorlagenbezug wird im Protokoll markiert. Die konkrete
              Dokumenterzeugung bleibt im Vorlagenmodul.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <span>Such-/Vorlagenhinweis</span>
            <input
              value={inlineTemplateDraft.query}
              onChange={(event) =>
                setInlineTemplateDraft((current) =>
                  current
                    ? { ...current, query: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Unterlagenanforderung Beteiligung"
            />
          </label>
        </div>
        <div className="industrial-modal-preview">
          <FileText className="h-4 w-4" /> Wird eingefügt:{" "}
          <strong>
            {formatTemplateMarkerText(inlineTemplateDraft.query)}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineTemplateDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={applyTemplateMarkerFromProtocol}
          >
            Vormerken
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
