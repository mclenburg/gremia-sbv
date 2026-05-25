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
import type { InlineParticipationDraft } from "../inlineCommandTypes";
import { FieldCaption } from "./inlineCommandOverlayShared";

export function InlineParticipationOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlineParticipationDraft ? (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal inline-command-quick"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-participation-title"
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-participation-title">SBV-Beteiligung anlegen</h2>
            <p>
              Legt die Beteiligung direkt als Maßnahme in der aktuellen
              Fallakte an. Details können nach dem Gespräch ergänzt werden.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineParticipationDraft} field="title">
              Titel
            </FieldCaption>
            <input
              value={inlineParticipationDraft.title}
              onChange={(event) =>
                setInlineParticipationDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              autoFocus
              placeholder="z. B. Versetzung ohne vorherige SBV-Anhörung"
            />
          </label>
          <label>
            <FieldCaption
              draft={inlineParticipationDraft}
              field="employerMeasure"
            >
              Arbeitgebermaßnahme / Kurznotiz
            </FieldCaption>
            <input
              value={inlineParticipationDraft.employerMeasure}
              onChange={(event) =>
                setInlineParticipationDraft((current) =>
                  current
                    ? { ...current, employerMeasure: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Versetzung angekündigt, Unterlagen fehlen"
            />
          </label>
          <label>
            <FieldCaption
              draft={inlineParticipationDraft}
              field="riskLevel"
            >
              Risikostufe
            </FieldCaption>
            <select
              value={inlineParticipationDraft.riskLevel}
              onChange={(event) =>
                setInlineParticipationDraft((current) =>
                  current
                    ? {
                        ...current,
                        riskLevel: event.target
                          .value as InlineParticipationDraft["riskLevel"],
                      }
                    : current,
                )
              }
            >
              <option value="normal">normal</option>
              <option value="erhoeht">erhöht</option>
              <option value="kritisch">kritisch</option>
            </select>
          </label>
          <label>
            <span>Stellungnahmefrist optional</span>
            <input
              type="datetime-local"
              value={inlineParticipationDraft.statementDueAt}
              onChange={(event) =>
                setInlineParticipationDraft((current) =>
                  current
                    ? { ...current, statementDueAt: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineParticipationDraft} field="nextStep">
              Nächster Schritt
            </FieldCaption>
            <input
              value={inlineParticipationDraft.nextStep}
              onChange={(event) =>
                setInlineParticipationDraft((current) =>
                  current
                    ? { ...current, nextStep: event.target.value }
                    : current,
                )
              }
            />
          </label>
        </div>
        <div className="industrial-modal-preview">
          <ClipboardCheck className="h-4 w-4" /> Wird als Fallaktenmaßnahme
          angelegt:{" "}
          <strong>
            {inlineParticipationDraft.title.trim() || "SBV-Beteiligung"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineParticipationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={() => void createParticipationFromProtocol()}
          >
            Anlegen und weiterprotokollieren
          </button>
        </div>
      </section>
    </div>
  ) : null;
}
