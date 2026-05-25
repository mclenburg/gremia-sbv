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
import type { InlineEqualizationDraft } from "../inlineCommandTypes";
import { FieldCaption } from "./inlineCommandOverlayShared";

export function InlineEqualizationOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlineEqualizationDraft ? (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal inline-command-quick"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-equalization-title"
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-equalization-title">
              Gleichstellung/GdB anlegen
            </h2>
            <p>
              Legt einen Beratungs-/Begleitvorgang zur Gleichstellung oder
              zum GdB in der aktuellen Fallakte an.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineEqualizationDraft} field="title">
              Titel
            </FieldCaption>
            <input
              value={inlineEqualizationDraft.title}
              onChange={(event) =>
                setInlineEqualizationDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              autoFocus
              placeholder="z. B. Gleichstellungsantrag vorbereiten"
            />
          </label>
          <label>
            <span>Status</span>
            <select
              value={inlineEqualizationDraft.status}
              onChange={(event) =>
                setInlineEqualizationDraft((current) =>
                  current
                    ? {
                        ...current,
                        status: event.target
                          .value as InlineEqualizationDraft["status"],
                      }
                    : current,
                )
              }
            >
              <option value="beratung">Beratung</option>
              <option value="vorbereitung">Vorbereitung</option>
              <option value="eingereicht">eingereicht</option>
              <option value="nachfrage">Nachfrage</option>
              <option value="bewilligt">bewilligt</option>
              <option value="abgelehnt">abgelehnt</option>
              <option value="widerspruch">Widerspruch</option>
              <option value="abgeschlossen">abgeschlossen</option>
            </select>
          </label>
          <label>
            <span>Widerspruchs-/Prüffrist optional</span>
            <input
              type="datetime-local"
              value={inlineEqualizationDraft.objectionDueAt}
              onChange={(event) =>
                setInlineEqualizationDraft((current) =>
                  current
                    ? { ...current, objectionDueAt: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineEqualizationDraft} field="note">
              Kurznotiz
            </FieldCaption>
            <input
              value={inlineEqualizationDraft.note}
              onChange={(event) =>
                setInlineEqualizationDraft((current) =>
                  current
                    ? { ...current, note: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Voraussetzungen prüfen, Unterlagen sammeln"
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineEqualizationDraft} field="nextStep">
              Nächster Schritt
            </FieldCaption>
            <input
              value={inlineEqualizationDraft.nextStep}
              onChange={(event) =>
                setInlineEqualizationDraft((current) =>
                  current
                    ? { ...current, nextStep: event.target.value }
                    : current,
                )
              }
            />
          </label>
        </div>
        <div className="industrial-modal-preview">
          <BadgeCheck className="h-4 w-4" /> Wird als Fallaktenvorgang
          angelegt:{" "}
          <strong>
            {inlineEqualizationDraft.title.trim() || "Gleichstellung/GdB"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineEqualizationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={() => void createEqualizationFromProtocol()}
          >
            Anlegen und weiterprotokollieren
          </button>
        </div>
      </section>
    </div>
  ) : null;
}
