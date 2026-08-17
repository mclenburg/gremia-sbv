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

export function InlineConfidentialityOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlineConfidentialityDraft ? (
    <IndustrialModalSurface
      labelledById="inline-conf-title"
      onClose={cancelInlineConfidentialityDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Vertraulichkeit</p>
            <h2 id="inline-conf-title">Vertraulichkeitsstufe anheben</h2>
            <p>
              Setzt die Vertraulichkeitsstufe der gesamten Notiz direkt
              hoch.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label>
            <span>Stufe</span>
            <select className="industrial-select"
              value={inlineConfidentialityDraft.level}
              onChange={(event) =>
                setInlineConfidentialityDraft((current) =>
                  current
                    ? {
                        ...current,
                        level: event.target
                          .value as ConfidentialCommandLevel,
                      }
                    : current,
                )
              }
            >
              <option value="normal">normal</option>
              <option value="sensibel">sensibel</option>
              <option value="hoch_sensibel">hoch sensibel</option>
            </select>
          </label>
        </div>
        <div className="industrial-modal-preview">
          Wird eingefügt:{" "}
          <strong>
            {formatConfidentialityText(inlineConfidentialityDraft.level)}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineConfidentialityDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={applyConfidentialityFromProtocol}
          >
            Übernehmen
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
