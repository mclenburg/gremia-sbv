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
import type { InlineWorkplaceAccommodationDraft } from "../inlineCommandTypes";
import { FieldCaption } from "./inlineCommandOverlayShared";

export function InlineWorkplaceAccommodationOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlineWorkplaceAccommodationDraft ? (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal inline-command-quick"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-workplace-title"
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-workplace-title">
              Arbeitsplatzgestaltung anlegen
            </h2>
            <p>
              Legt eine Maßnahme nach § 164 Abs. 4 SGB IX direkt in der
              aktuellen Fallakte an. Details können nach dem Gespräch
              ergänzt werden.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <FieldCaption
              draft={inlineWorkplaceAccommodationDraft}
              field="title"
            >
              Titel
            </FieldCaption>
            <input
              value={inlineWorkplaceAccommodationDraft.title}
              onChange={(event) =>
                setInlineWorkplaceAccommodationDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              autoFocus
              placeholder="z. B. fester Arbeitsplatz / technische Arbeitshilfe"
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption
              draft={inlineWorkplaceAccommodationDraft}
              field="requestedAdjustment"
            >
              Gewünschte Gestaltung / Kurznotiz
            </FieldCaption>
            <input
              value={inlineWorkplaceAccommodationDraft.requestedAdjustment}
              onChange={(event) =>
                setInlineWorkplaceAccommodationDraft((current) =>
                  current
                    ? {
                        ...current,
                        requestedAdjustment: event.target.value,
                      }
                    : current,
                )
              }
              placeholder="z. B. fester Arbeitsplatz wegen behinderungsbedingter Belastung"
            />
          </label>
          <label>
            <FieldCaption
              draft={inlineWorkplaceAccommodationDraft}
              field="category"
            >
              Kategorie
            </FieldCaption>
            <select
              value={inlineWorkplaceAccommodationDraft.category}
              onChange={(event) =>
                setInlineWorkplaceAccommodationDraft((current) =>
                  current
                    ? {
                        ...current,
                        category: event.target
                          .value as InlineWorkplaceAccommodationDraft["category"],
                      }
                    : current,
                )
              }
            >
              <option value="arbeitsplatz">Arbeitsplatz</option>
              <option value="arbeitsumfeld">Arbeitsumfeld</option>
              <option value="arbeitsorganisation">
                Arbeitsorganisation
              </option>
              <option value="arbeitszeit">Arbeitszeit</option>
              <option value="arbeitsort">Arbeitsort / mobile Arbeit</option>
              <option value="technische_arbeitshilfe">
                technische Arbeitshilfe
              </option>
              <option value="software_barrierefreiheit">
                Software / Barrierefreiheit
              </option>
              <option value="qualifizierung">Qualifizierung</option>
              <option value="aufgabenanpassung">Aufgabenanpassung</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label>
            <FieldCaption
              draft={inlineWorkplaceAccommodationDraft}
              field="riskLevel"
            >
              Risikostufe
            </FieldCaption>
            <select
              value={inlineWorkplaceAccommodationDraft.riskLevel}
              onChange={(event) =>
                setInlineWorkplaceAccommodationDraft((current) =>
                  current
                    ? {
                        ...current,
                        riskLevel: event.target
                          .value as InlineWorkplaceAccommodationDraft["riskLevel"],
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
            <span>Umsetzungs-/Wiedervorlage optional</span>
            <input
              type="datetime-local"
              value={inlineWorkplaceAccommodationDraft.implementationDueAt}
              onChange={(event) =>
                setInlineWorkplaceAccommodationDraft((current) =>
                  current
                    ? {
                        ...current,
                        implementationDueAt: event.target.value,
                      }
                    : current,
                )
              }
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption
              draft={inlineWorkplaceAccommodationDraft}
              field="nextStep"
            >
              Nächster Schritt
            </FieldCaption>
            <input
              value={inlineWorkplaceAccommodationDraft.nextStep}
              onChange={(event) =>
                setInlineWorkplaceAccommodationDraft((current) =>
                  current
                    ? { ...current, nextStep: event.target.value }
                    : current,
                )
              }
            />
          </label>
        </div>
        <div className="industrial-modal-preview">
          <Wrench className="h-4 w-4" /> Wird als Fallaktenmaßnahme
          angelegt:{" "}
          <strong>
            {inlineWorkplaceAccommodationDraft.title.trim() ||
              "Arbeitsplatzgestaltung"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineWorkplaceAccommodationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={() => void createWorkplaceAccommodationFromProtocol()}
          >
            Anlegen und weiterprotokollieren
          </button>
        </div>
      </section>
    </div>
  ) : null;
}
