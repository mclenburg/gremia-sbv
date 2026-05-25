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
import type { InlineTerminationDraft } from "../inlineCommandTypes";
import { FieldCaption } from "./inlineCommandOverlayShared";

export function InlineTerminationOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlineTerminationDraft ? (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal inline-command-quick"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-termination-title"
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <Siren className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-termination-title">
              Kündigungsanhörung anlegen
            </h2>
            <p>
              Legt einen Kündigungsanhörungsvorgang direkt in der aktuellen
              Fallakte an. Fristen können sofort vorgemerkt werden.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineTerminationDraft} field="title">
              Titel
            </FieldCaption>
            <input
              value={inlineTerminationDraft.title}
              onChange={(event) =>
                setInlineTerminationDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              autoFocus
              placeholder="z. B. Anhörung zur ordentlichen Kündigung"
            />
          </label>
          <label>
            <FieldCaption
              draft={inlineTerminationDraft}
              field="terminationType"
            >
              Kündigungsart
            </FieldCaption>
            <select
              value={inlineTerminationDraft.terminationType}
              onChange={(event) =>
                setInlineTerminationDraft((current) =>
                  current
                    ? {
                        ...current,
                        terminationType: event.target
                          .value as InlineTerminationDraft["terminationType"],
                      }
                    : current,
                )
              }
            >
              <option value="ordentlich">ordentlich</option>
              <option value="ausserordentlich">außerordentlich</option>
              <option value="aenderungskuendigung">
                Änderungskündigung
              </option>
              <option value="verdachtskuendigung">
                Verdachtskündigung
              </option>
              <option value="personenbedingt">personenbedingt</option>
              <option value="verhaltensbedingt">verhaltensbedingt</option>
              <option value="betriebsbedingt">betriebsbedingt</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label>
            <FieldCaption
              draft={inlineTerminationDraft}
              field="protectionStatus"
            >
              Schutzstatus
            </FieldCaption>
            <select
              value={inlineTerminationDraft.protectionStatus}
              onChange={(event) =>
                setInlineTerminationDraft((current) =>
                  current
                    ? {
                        ...current,
                        protectionStatus: event.target
                          .value as InlineTerminationDraft["protectionStatus"],
                      }
                    : current,
                )
              }
            >
              <option value="unklar">unklar</option>
              <option value="schwerbehindert">schwerbehindert</option>
              <option value="gleichgestellt">gleichgestellt</option>
              <option value="antrag_laeuft">Antrag läuft</option>
              <option value="nicht_bekannt">nicht bekannt</option>
            </select>
          </label>
          <label>
            <FieldCaption draft={inlineTerminationDraft} field="receivedAt">
              Eingang optional
            </FieldCaption>
            <input
              type="datetime-local"
              value={inlineTerminationDraft.receivedAt}
              onChange={(event) =>
                setInlineTerminationDraft((current) =>
                  current
                    ? { ...current, receivedAt: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label>
            <span>SBV-Frist optional</span>
            <input
              type="datetime-local"
              value={inlineTerminationDraft.sbvStatementDueAt}
              onChange={(event) =>
                setInlineTerminationDraft((current) =>
                  current
                    ? { ...current, sbvStatementDueAt: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption
              draft={inlineTerminationDraft}
              field="employerReason"
            >
              Arbeitgebervortrag / Kurznotiz
            </FieldCaption>
            <input
              value={inlineTerminationDraft.employerReason}
              onChange={(event) =>
                setInlineTerminationDraft((current) =>
                  current
                    ? { ...current, employerReason: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineTerminationDraft} field="nextStep">
              Nächster Schritt
            </FieldCaption>
            <input
              value={inlineTerminationDraft.nextStep}
              onChange={(event) =>
                setInlineTerminationDraft((current) =>
                  current
                    ? { ...current, nextStep: event.target.value }
                    : current,
                )
              }
            />
          </label>
        </div>
        <div className="industrial-modal-preview">
          <Siren className="h-4 w-4" /> Wird als Fallaktenvorgang angelegt:{" "}
          <strong>
            {inlineTerminationDraft.title.trim() || "Kündigungsanhörung"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineTerminationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={() => void createTerminationFromProtocol()}
          >
            Anlegen und weiterprotokollieren
          </button>
        </div>
      </section>
    </div>
  ) : null;
}
