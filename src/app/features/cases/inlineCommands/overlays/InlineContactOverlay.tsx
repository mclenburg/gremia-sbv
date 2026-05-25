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

export function InlineContactOverlay({ props }: { props: InlineCommandOverlaysProps }) {
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

  return inlineContactDraft ? (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-contact-title"
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Kontakt</p>
            <h2 id="inline-contact-title">Kontakt im Protokoll einfügen</h2>
            <p>Nach dem Einfügen steht im Text: Name, Vorname (Firma).</p>
          </div>
        </div>

        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <span>Bestehenden Kontakt suchen</span>
            <input
              value={inlineContactDraft.query}
              onChange={(event) =>
                setInlineContactDraft((current) =>
                  current
                    ? { ...current, query: event.target.value }
                    : current,
                )
              }
              placeholder="Name, Organisation, Rolle, E-Mail …"
              autoFocus
            />
          </label>
        </div>

        <div className="inline-contact-results">
          {filterContactsForQuery(contacts, inlineContactDraft.query).map(
            (contact) => (
              <button
                key={contact.id}
                type="button"
                className="inline-contact-result"
                onClick={() =>
                  void insertExistingContactFromProtocol(contact)
                }
              >
                <strong>{formatContactReference(contact)}</strong>
                <span>
                  {[contact.role, contact.email, contact.phone]
                    .filter(Boolean)
                    .join(" · ") || "Kontakt"}
                </span>
              </button>
            ),
          )}
          {!filterContactsForQuery(contacts, inlineContactDraft.query)
            .length && (
            <div className="industrial-empty compact">
              Kein bestehender Kontakt gefunden. Unten neu erfassen.
            </div>
          )}
        </div>

        <div className="industrial-modal-grid">
          <label>
            <span>Vorname</span>
            <input
              value={inlineContactDraft.firstName}
              onChange={(event) =>
                setInlineContactDraft((current) =>
                  current
                    ? { ...current, firstName: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label>
            <span>Nachname</span>
            <input
              value={inlineContactDraft.lastName}
              onChange={(event) =>
                setInlineContactDraft((current) =>
                  current
                    ? { ...current, lastName: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label>
            <span>Firma / Stelle</span>
            <input
              value={inlineContactDraft.organization}
              onChange={(event) =>
                setInlineContactDraft((current) =>
                  current
                    ? { ...current, organization: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label>
            <span>Rolle</span>
            <input
              value={inlineContactDraft.role}
              onChange={(event) =>
                setInlineContactDraft((current) =>
                  current
                    ? { ...current, role: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Personalleiter"
            />
          </label>
          <label>
            <span>Kategorie</span>
            <select
              value={inlineContactDraft.category}
              onChange={(event) =>
                setInlineContactDraft((current) =>
                  current
                    ? {
                        ...current,
                        category: event.target.value as ContactCategory,
                      }
                    : current,
                )
              }
            >
              <option value="arbeitgeber">Arbeitgeber</option>
              <option value="inklusionsamt">Inklusionsamt</option>
              <option value="agentur_fuer_arbeit">
                Agentur für Arbeit
              </option>
              <option value="betriebsarzt">Betriebsarzt</option>
              <option value="betriebsrat">Betriebsrat</option>
              <option value="beratung">Beratung</option>
              <option value="intern">intern</option>
              <option value="sonstiges">sonstiges</option>
            </select>
          </label>
          <label>
            <span>E-Mail</span>
            <input
              value={inlineContactDraft.email}
              onChange={(event) =>
                setInlineContactDraft((current) =>
                  current
                    ? { ...current, email: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label>
            <span>Telefon</span>
            <input
              value={inlineContactDraft.phone}
              onChange={(event) =>
                setInlineContactDraft((current) =>
                  current
                    ? { ...current, phone: event.target.value }
                    : current,
                )
              }
            />
          </label>
        </div>

        {(inlineContactDraft.firstName || inlineContactDraft.lastName) && (
          <div className="industrial-modal-preview">
            Wird im Protokoll eingefügt:{" "}
            <strong>
              {formatContactReference({
                firstName: inlineContactDraft.firstName,
                lastName: inlineContactDraft.lastName,
                organization: inlineContactDraft.organization,
              })}
            </strong>
          </div>
        )}

        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={cancelInlineContactDraft}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="industrial-button"
            onClick={() => void createAndInsertContactFromProtocol()}
          >
            <Users className="h-4 w-4" />
            Kontakt anlegen und einfügen
          </button>
        </div>
      </section>
    </div>
  ) : null;
}
