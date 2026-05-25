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
import type { InlinePreventionDraft } from "../inlineCommandTypes";
import { FieldCaption } from "./inlineCommandOverlayShared";

export function InlinePreventionOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlinePreventionDraft ? (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal inline-command-quick"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-prevention-title"
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-prevention-title">Prävention anlegen</h2>
            <p>
              Legt ein Präventionsverfahren nach § 167 Abs. 1 SGB IX direkt
              in der aktuellen Fallakte an.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlinePreventionDraft} field="title">
              Titel
            </FieldCaption>
            <input
              value={inlinePreventionDraft.title}
              onChange={(event) =>
                setInlinePreventionDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              autoFocus
              placeholder="z. B. Arbeitsplatzgefährdung frühzeitig klären"
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption
              draft={inlinePreventionDraft}
              field="hazardDescription"
            >
              Gefährdung / Kurznotiz
            </FieldCaption>
            <input
              value={inlinePreventionDraft.hazardDescription}
              onChange={(event) =>
                setInlinePreventionDraft((current) =>
                  current
                    ? { ...current, hazardDescription: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Konflikt mit Führungskraft, Überlastung, Kündigungsrisiko"
            />
          </label>
          <label>
            <FieldCaption
              draft={inlinePreventionDraft}
              field="difficultyType"
            >
              Schwierigkeit
            </FieldCaption>
            <select
              value={inlinePreventionDraft.difficultyType}
              onChange={(event) =>
                setInlinePreventionDraft((current) =>
                  current
                    ? {
                        ...current,
                        difficultyType: event.target
                          .value as InlinePreventionDraft["difficultyType"],
                      }
                    : current,
                )
              }
            >
              <option value="personenbedingt">personenbedingt</option>
              <option value="verhaltensbedingt">verhaltensbedingt</option>
              <option value="betriebsbedingt">betriebsbedingt</option>
              <option value="organisatorisch">organisatorisch</option>
              <option value="gesundheitlich_arbeitsplatzbezogen">
                gesundheitlich/arbeitsplatzbezogen
              </option>
              <option value="konflikt_fuehrung">Konflikt Führung</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label>
            <span>Risiko</span>
            <select
              value={inlinePreventionDraft.riskType}
              onChange={(event) =>
                setInlinePreventionDraft((current) =>
                  current
                    ? {
                        ...current,
                        riskType: event.target
                          .value as InlinePreventionDraft["riskType"],
                      }
                    : current,
                )
              }
            >
              <option value="arbeitsplatzverlust">
                Arbeitsplatzverlust
              </option>
              <option value="kuendigung">Kündigung</option>
              <option value="abmahnung">Abmahnung</option>
              <option value="umsetzung">Umsetzung</option>
              <option value="arbeitsunfaehigkeit">
                Arbeitsunfähigkeit
              </option>
              <option value="ueberlastung">Überlastung</option>
              <option value="leistungsverlust">Leistungsverlust</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label>
            <span>Arbeitgeberantwort optional</span>
            <input
              type="datetime-local"
              value={inlinePreventionDraft.employerResponseDueAt}
              onChange={(event) =>
                setInlinePreventionDraft((current) =>
                  current
                    ? {
                        ...current,
                        employerResponseDueAt: event.target.value,
                      }
                    : current,
                )
              }
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlinePreventionDraft} field="nextStep">
              Nächster Schritt
            </FieldCaption>
            <input
              value={inlinePreventionDraft.nextStep}
              onChange={(event) =>
                setInlinePreventionDraft((current) =>
                  current
                    ? { ...current, nextStep: event.target.value }
                    : current,
                )
              }
            />
          </label>
        </div>
        <div className="industrial-modal-preview">
          <ShieldAlert className="h-4 w-4" /> Wird als Fallaktenvorgang
          angelegt:{" "}
          <strong>
            {inlinePreventionDraft.title.trim() || "Präventionsverfahren"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlinePreventionDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={() => void createPreventionFromProtocol()}
          >
            Anlegen und weiterprotokollieren
          </button>
        </div>
      </section>
    </div>
  ) : null;
}
