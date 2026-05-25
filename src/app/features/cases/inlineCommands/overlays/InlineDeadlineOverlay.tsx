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

export function InlineDeadlineOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlineDeadlineDraft ? (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-deadline-title"
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <CalendarPlus className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Frist</p>
            <h2 id="inline-deadline-title">Frist aus Protokoll anlegen</h2>
            <p>
              Die Frist wird mit dem aktuell ausgewählten Fall verbunden:{" "}
              {selectedCase?.caseNumber ?? "—"}
            </p>
          </div>
        </div>

        <div className="industrial-modal-grid">
          <label>
            <span>Fristtitel</span>
            <input
              value={inlineDeadlineDraft.title}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Antwort Arbeitgeber nachhalten"
              autoFocus
            />
          </label>
          <label>
            <span>Ablaufdatum</span>
            <input
              type="datetime-local"
              value={inlineDeadlineDraft.dueAt}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? { ...current, dueAt: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label>
            <span>Stufe</span>
            <select
              value={inlineDeadlineDraft.severity}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? {
                        ...current,
                        severity: event.target.value as DeadlineSeverity,
                      }
                    : current,
                )
              }
            >
              <option value="normal">normal</option>
              <option value="important">wichtig</option>
              <option value="critical">kritisch</option>
              <option value="fatal">fatal</option>
            </select>
          </label>
          <label>
            <span>Rechtsbezug</span>
            <input
              value={inlineDeadlineDraft.legalBasis}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? { ...current, legalBasis: event.target.value }
                    : current,
                )
              }
              placeholder="optional"
            />
          </label>
          <label className="industrial-modal-wide">
            <span>Notiz zur Frist</span>
            <input
              value={inlineDeadlineDraft.description}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? { ...current, description: event.target.value }
                    : current,
                )
              }
            />
          </label>
        </div>

        {inlineDeadlineDraft.dueAt && (
          <div className="industrial-modal-preview">
            Wird im Protokoll eingefügt:{" "}
            <strong>{buildInlineDeadlineText(inlineDeadlineDraft)}</strong>
          </div>
        )}

        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineDeadlineDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={() => void createInlineDeadlineFromProtocol()}
          >
            <CalendarPlus className="h-4 w-4" />
            Frist anlegen
          </button>
        </div>
      </section>
    </div>
  ) : null;
}
