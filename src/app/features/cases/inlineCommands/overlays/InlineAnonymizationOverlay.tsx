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
import type { LegalNormSuggestion } from "@services/textCommandPolicy";
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
} from "@services/textCommandPolicy";
import type { ContactCategory } from "../../../../core/models/contact.model";
import type { DeadlineSeverity } from "../../../../core/models/deadline.model";
import type { ConfidentialCommandLevel, RiskLevelCommand } from "@services/textCommandPolicy";
import { filterContactsForQuery, formatContactReference } from "../../../contacts/contactDisplay";
import { filterCasesForInlineCommand, filterNormsForInlineCommand } from "../inlineCommandSearch";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { FieldCaption } from "./inlineCommandOverlayShared";

export function InlineAnonymizationOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlineAnonymizationDraft ? (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal inline-anonymization-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-anon-title"
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Anonymisierung</p>
            <h2 id="inline-anon-title">Anonymisierung vormerken</h2>
            <p>
              Setzt eine sichtbare Vormerkung im Protokoll. Berichtslogik
              kann diese Markierung später gezielt auswerten.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label>
            <span>Art der Textstelle</span>
            <input
              value={inlineAnonymizationDraft.label}
              onChange={(event) =>
                setInlineAnonymizationDraft((current) =>
                  current
                    ? { ...current, label: event.target.value }
                    : current,
                )
              }
              autoFocus
              placeholder="z. B. Name, Bereich, Funktion, Gesundheitsdetail"
            />
          </label>
        </div>
        <div className="industrial-modal-preview">
          Wird eingefügt:{" "}
          <strong>
            {formatAnonymizationMarkerText(inlineAnonymizationDraft.label)}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineAnonymizationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={applyAnonymizationMarkerFromProtocol}
          >
            Vormerken
          </button>
        </div>
      </section>
    </div>
  ) : null;
}
