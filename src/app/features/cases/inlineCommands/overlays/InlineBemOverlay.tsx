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
import type { InlineBemDraft } from "../inlineCommandTypes";
import { FieldCaption } from "./inlineCommandOverlayShared";

export function InlineBemOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlineBemDraft ? (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal inline-command-quick"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-bem-title"
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-bem-title">BEM-Vorgang anlegen</h2>
            <p>
              Legt einen BEM-Vorgang direkt in der aktuellen Fallakte an.
              Details können nach dem Gespräch ergänzt werden.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineBemDraft} field="title">
              Titel
            </FieldCaption>
            <input
              value={inlineBemDraft.title}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              autoFocus
              placeholder="z. B. BEM wegen wiederholter Arbeitsunfähigkeit"
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineBemDraft} field="triggerDescription">
              Anlass / Kurznotiz
            </FieldCaption>
            <input
              value={inlineBemDraft.triggerDescription}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? { ...current, triggerDescription: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Rückkehr nach längerer AU, Beschäftigte wünscht Begleitung"
            />
          </label>
          <label>
            <FieldCaption draft={inlineBemDraft} field="triggerType">
              Auslöser
            </FieldCaption>
            <select
              value={inlineBemDraft.triggerType}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? {
                        ...current,
                        triggerType: event.target
                          .value as InlineBemDraft["triggerType"],
                      }
                    : current,
                )
              }
            >
              <option value="sechs_wochen_au">mehr als 6 Wochen AU</option>
              <option value="wiederholt_au">wiederholte AU</option>
              <option value="praeventiv">präventiv</option>
              <option value="arbeitgeberangebot">Arbeitgeberangebot</option>
              <option value="sbv_anregung">SBV-Anregung</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label>
            <span>Rückmeldefrist optional</span>
            <input
              type="datetime-local"
              value={inlineBemDraft.responseDueAt}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? { ...current, responseDueAt: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineBemDraft} field="nextStep">
              Nächster Schritt
            </FieldCaption>
            <input
              value={inlineBemDraft.nextStep}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? { ...current, nextStep: event.target.value }
                    : current,
                )
              }
            />
          </label>
        </div>
        <div className="industrial-modal-preview">
          <HeartPulse className="h-4 w-4" /> Wird als Fallaktenvorgang
          angelegt:{" "}
          <strong>{inlineBemDraft.title.trim() || "BEM-Vorgang"}</strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineBemDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={() => void createBemFromProtocol()}
          >
            Anlegen und weiterprotokollieren
          </button>
        </div>
      </section>
    </div>
  ) : null;
}
