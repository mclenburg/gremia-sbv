import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  CalendarPlus,
  FileText,
  Link2,
  Lock,
  Search,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import type { CaseRecord } from "../../core/models/case.model";
import type { ContactRecord } from "../../core/models/contact.model";
import {
  LEGAL_NORM_SUGGESTIONS,
  formatAnonymizationMarkerText,
  formatBemMarkerText,
  formatCaseReferenceText,
  formatConfidentialityText,
  formatContactReferenceText,
  formatLegalNormText,
  formatOpenTaskText,
  formatParticipationMarkerText,
  formatPreventionMarkerText,
  formatEqualizationMarkerText,
  formatTerminationMarkerText,
  formatWorkplaceAccommodationMarkerText,
  formatRiskText,
  formatTemplateMarkerText,
  getTextCommandArgument,
  getTextCommandKind,
  getTextCommandRangeLength,
  type ConfidentialCommandLevel,
  type RiskLevelCommand,
  type TextCommandToken,
} from "@services/textCommandPolicy";
import type {
  TextCommandTextareaChange,
  TextCommandTextareaReplacement,
} from "./TextCommandTextarea";

type GlobalDraft = TextCommandTextareaChange & {
  fieldId: string;
  query: string;
  title: string;
  dueAt: string;
  severity: "normal" | "important" | "critical" | "fatal";
  riskLevel: RiskLevelCommand;
  confidentiality: ConfidentialCommandLevel;
  label: string;
  commandText: string;
  rangeLength: number;
};

function initialDraft(detail: TextCommandTextareaChange): GlobalDraft | null {
  if (!detail.fieldId) return null;
  const commandText = getTextCommandArgument(
    detail.value,
    detail.index,
    detail.token,
  );
  return {
    ...detail,
    fieldId: detail.fieldId,
    query: commandText.trim(),
    title: commandText.trim(),
    dueAt: "",
    severity: "important",
    riskLevel: "high",
    confidentiality: "hoch_sensibel",
    label: commandText || "Name",
    commandText,
    rangeLength: getTextCommandRangeLength(
      detail.value,
      detail.index,
      detail.token,
    ),
  };
}

function emitReplacement(draft: GlobalDraft, replacement: string) {
  const detail: TextCommandTextareaReplacement = {
    fieldId: draft.fieldId,
    markerIndex: draft.index,
    token: draft.token,
    replacement,
    rangeLength: draft.rangeLength,
  };
  window.dispatchEvent(
    new CustomEvent<TextCommandTextareaReplacement>(
      "gremia-sbv:text-command-replace",
      { detail },
    ),
  );
}

function formatDate(value: string): string {
  if (!value) return "offen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function GlobalTextCommandController({
  cases,
  contacts,
}: {
  cases: CaseRecord[];
  contacts: ContactRecord[];
}) {
  const [draft, setDraft] = useState<GlobalDraft | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleTextCommand(event: Event) {
      const next = initialDraft(
        (event as CustomEvent<TextCommandTextareaChange>).detail,
      );
      if (!next) return;
      setDraft((current) => current ?? next);
    }

    window.addEventListener(
      "gremia-sbv:text-command-detected",
      handleTextCommand,
    );
    return () =>
      window.removeEventListener(
        "gremia-sbv:text-command-detected",
        handleTextCommand,
      );
  }, []);

  const matchingCases = useMemo(() => {
    if (!draft || getTextCommandKind(draft.token) !== "case_reference")
      return [];
    const query = draft.query.trim().toLowerCase();
    return cases
      .filter(
        (item) =>
          !query ||
          `${item.caseNumber} ${item.displayName} ${item.summary ?? ""} ${item.category}`
            .toLowerCase()
            .includes(query),
      )
      .slice(0, 8);
  }, [cases, draft]);

  const matchingContacts = useMemo(() => {
    if (!draft || getTextCommandKind(draft.token) !== "contact") return [];
    const query = draft.query.trim().toLowerCase();
    return contacts
      .filter(
        (item) =>
          !query ||
          `${item.firstName} ${item.lastName} ${item.organization ?? ""} ${item.role ?? ""} ${item.email ?? ""}`
            .toLowerCase()
            .includes(query),
      )
      .slice(0, 8);
  }, [contacts, draft]);

  const matchingNorms = useMemo(() => {
    if (!draft || getTextCommandKind(draft.token) !== "legal_norm") return [];
    const query = draft.query.trim().toLowerCase();
    return LEGAL_NORM_SUGGESTIONS.filter(
      (item) =>
        !query ||
        `${item.paragraph} ${item.title} ${item.shortText} ${item.source}`
          .toLowerCase()
          .includes(query),
    ).slice(0, 8);
  }, [draft]);

  if (!draft) return null;

  function closeWithoutReplacement() {
    setDraft(null);
  }

  function replaceAndClose(currentDraft: GlobalDraft, replacement: string) {
    emitReplacement(currentDraft, replacement);
    setDraft(null);
  }

  const titleByKind = {
    deadline: "Frist einfügen",
    follow_up: "Wiedervorlage einfügen",
    contact: "Kontakt einfügen",
    case_reference: "Fallbezug einfügen",
    legal_norm: "Rechtsnorm einfügen",
    risk: "Risiko markieren",
    open_task: "Aufgabe einfügen",
    confidentiality: "Vertraulichkeit einfügen",
    anonymization: "Anonymisierung vormerken",
    bem_measure: "BEM-Vorgang anlegen",
    prevention_measure: "Prävention anlegen",
    equalization_measure: "Gleichstellung/GdB anlegen",
    termination_measure: "Kündigungsanhörung anlegen",
    participation: "SBV-Beteiligung anlegen",
    workplace_accommodation: "Arbeitsplatzgestaltung anlegen",
    template: "Vorlage vormerken",
  } as const;
  const commandKind = getTextCommandKind(draft.token);
  const primaryActionLabel =
    commandKind === "deadline" || commandKind === "follow_up"
      ? "Einfügen"
      : commandKind === "template"
        ? "Vormerken"
        : [
              "bem_measure",
              "prevention_measure",
              "equalization_measure",
              "termination_measure",
              "participation",
              "workplace_accommodation",
            ].includes(commandKind)
          ? "Hinweis einfügen"
          : "Einfügen";

  function applyPrimaryAction() {
    const currentDraft = draft;
    if (!currentDraft) return;

    const currentCommandKind = getTextCommandKind(currentDraft.token);

    if (currentCommandKind === "deadline" || currentCommandKind === "follow_up")
      return replaceAndClose(
        currentDraft,
        `Frist bis ${formatDate(currentDraft.dueAt)}: ${currentDraft.title.trim() || "Wiedervorlage"}`,
      );
    if (currentCommandKind === "risk")
      return replaceAndClose(
        currentDraft,
        formatRiskText(currentDraft.riskLevel, currentDraft.title),
      );
    if (currentCommandKind === "open_task")
      return replaceAndClose(
        currentDraft,
        formatOpenTaskText(currentDraft.title),
      );
    if (currentCommandKind === "confidentiality")
      return replaceAndClose(
        currentDraft,
        formatConfidentialityText(currentDraft.confidentiality),
      );
    if (currentCommandKind === "anonymization")
      return replaceAndClose(
        currentDraft,
        formatAnonymizationMarkerText(currentDraft.label),
      );
    if (currentCommandKind === "bem_measure")
      return replaceAndClose(currentDraft, formatBemMarkerText(currentDraft.title));
    if (currentCommandKind === "prevention_measure")
      return replaceAndClose(
        currentDraft,
        formatPreventionMarkerText(currentDraft.title),
      );
    if (currentCommandKind === "equalization_measure")
      return replaceAndClose(
        currentDraft,
        formatEqualizationMarkerText(currentDraft.title),
      );
    if (currentCommandKind === "termination_measure")
      return replaceAndClose(
        currentDraft,
        formatTerminationMarkerText(currentDraft.title),
      );
    if (currentCommandKind === "participation")
      return replaceAndClose(
        currentDraft,
        formatParticipationMarkerText(currentDraft.title),
      );
    if (currentCommandKind === "workplace_accommodation")
      return replaceAndClose(
        currentDraft,
        formatWorkplaceAccommodationMarkerText(currentDraft.title),
      );
    if (currentCommandKind === "template")
      return replaceAndClose(
        currentDraft,
        formatTemplateMarkerText(currentDraft.query),
      );
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeWithoutReplacement();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      applyPrimaryAction();
    }
  }

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className={commandKind === 'anonymization' ? 'industrial-modal inline-anonymization-modal' : 'industrial-modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-text-command-title"
        aria-describedby="global-text-command-description"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Befehl</p>
            <h2 id="global-text-command-title">{titleByKind[commandKind]}</h2>
            <p id="global-text-command-description">
              Dieser Befehl wirkt direkt auf das aktuell bearbeitete Textfeld.
              Strg+Enter speichert, Esc bricht ab.
            </p>
          </div>
        </div>

        {(commandKind === "deadline" || commandKind === "follow_up") && (
          <div className="industrial-modal-grid">
            <label>
              <span>Titel</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, title: event.target.value }
                      : current,
                  )
                }
                autoFocus
                placeholder="z. B. Rückmeldung Arbeitgeber nachhalten"
              />
            </label>
            <label>
              <span>Datum</span>
              <input
                type="datetime-local"
                value={draft.dueAt}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, dueAt: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <div className="industrial-modal-preview">
              <CalendarPlus className="h-4 w-4" /> Wird eingefügt:{" "}
              <strong>{`Frist bis ${formatDate(draft.dueAt)}: ${draft.title.trim() || "Wiedervorlage"}`}</strong>
            </div>
          </div>
        )}

        {commandKind === "contact" && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide">
              <span>Kontakt suchen</span>
              <input
                value={draft.query}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, query: event.target.value }
                      : current,
                  )
                }
                autoFocus
                placeholder="Name, Organisation, Rolle …"
              />
            </label>
            <div className="industrial-command-results">
              {matchingContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() =>
                    replaceAndClose(draft, formatContactReferenceText(contact))
                  }
                >
                  <UserPlus className="h-4 w-4" />
                  {formatContactReferenceText(contact)}
                </button>
              ))}
              {!matchingContacts.length && (
                <p>Kein passender Kontakt gefunden.</p>
              )}
            </div>
          </div>
        )}

        {commandKind === "case_reference" && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide">
              <span>Fall suchen</span>
              <input
                value={draft.query}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, query: event.target.value }
                      : current,
                  )
                }
                autoFocus
                placeholder="Aktenzeichen, Name, Kurzbeschreibung …"
              />
            </label>
            <div className="industrial-command-results">
              {matchingCases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    replaceAndClose(
                      draft,
                      formatCaseReferenceText(
                        item.caseNumber,
                        item.displayName,
                      ),
                    )
                  }
                >
                  <Link2 className="h-4 w-4" />
                  {item.caseNumber} · {item.displayName}
                </button>
              ))}
              {!matchingCases.length && <p>Kein passender Fall gefunden.</p>}
            </div>
          </div>
        )}

        {commandKind === "legal_norm" && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide">
              <span>Norm suchen</span>
              <input
                value={draft.query}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, query: event.target.value }
                      : current,
                  )
                }
                autoFocus
                placeholder="z. B. 167, BEM, Kündigung, AGG …"
              />
            </label>
            <div className="industrial-command-results">
              {matchingNorms.map((norm) => (
                <button
                  key={norm.id}
                  type="button"
                  onClick={() => replaceAndClose(draft, formatLegalNormText(norm))}
                >
                  <FileText className="h-4 w-4" />
                  {norm.paragraph} · {norm.title}
                </button>
              ))}
              {!matchingNorms.length && <p>Keine passende Norm gefunden.</p>}
            </div>
          </div>
        )}

        {commandKind === "risk" && (
          <div className="industrial-modal-grid">
            <label>
              <span>Risikostufe</span>
              <select
                value={draft.riskLevel}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          riskLevel: event.target.value as RiskLevelCommand,
                        }
                      : current,
                  )
                }
              >
                <option value="low">niedrig</option>
                <option value="medium">mittel</option>
                <option value="high">hoch</option>
                <option value="critical">kritisch</option>
              </select>
            </label>
            <label className="industrial-modal-wide">
              <span>Hinweis</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, title: event.target.value }
                      : current,
                  )
                }
                autoFocus
                placeholder="z. B. Kündigungsrisiko, Chronifizierung, Blockade …"
              />
            </label>
          </div>
        )}

        {commandKind === "open_task" && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide">
              <span>Aufgabe</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, title: event.target.value }
                      : current,
                  )
                }
                autoFocus
                placeholder="z. B. Inklusionsamt nachfassen"
              />
            </label>
          </div>
        )}

        {commandKind === "confidentiality" && (
          <div className="industrial-modal-grid">
            <label>
              <span>Stufe</span>
              <select
                value={draft.confidentiality}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          confidentiality: event.target
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
            <div className="industrial-modal-preview">
              <Lock className="h-4 w-4" /> Wird eingefügt:{" "}
              <strong>
                {formatConfidentialityText(draft.confidentiality)}
              </strong>
            </div>
          </div>
        )}

        {commandKind === "anonymization" && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide">
              <span>Art der Textstelle</span>
              <input
                value={draft.label}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, label: event.target.value }
                      : current,
                  )
                }
                autoFocus
                placeholder="z. B. Name, Bereich, Gesundheitsdetail"
              />
            </label>
            <div className="industrial-modal-preview">
              <ShieldAlert className="h-4 w-4" /> Wird eingefügt:{" "}
              <strong>{formatAnonymizationMarkerText(draft.label)}</strong>
            </div>
          </div>
        )}

        {[
          "bem_measure",
          "prevention_measure",
          "equalization_measure",
          "termination_measure",
          "participation",
          "workplace_accommodation",
        ].includes(commandKind) && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide">
              <span>Titel</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, title: event.target.value }
                      : current,
                  )
                }
                autoFocus
                placeholder="z. B. Vorgang in der Fallakte anlegen"
              />
            </label>
            <div className="industrial-modal-preview">
              <ShieldAlert className="h-4 w-4" /> Personenbezogene Maßnahmen
              werden nur in einer geöffneten Fallakte strukturiert angelegt. In
              allgemeinen Textfeldern wird nur ein Hinweis eingefügt.
            </div>
          </div>
        )}

        {commandKind === "template" && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide">
              <span>Vorlagenhinweis</span>
              <input
                value={draft.query}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, query: event.target.value }
                      : current,
                  )
                }
                autoFocus
                placeholder="z. B. Unterlagenanforderung"
              />
            </label>
            <div className="industrial-modal-preview">
              <FileText className="h-4 w-4" /> Wird eingefügt:{" "}
              <strong>{formatTemplateMarkerText(draft.query)}</strong>
            </div>
          </div>
        )}

        <div className="industrial-modal-actions">
          <button
            type="button"
            className="industrial-secondary-button"
            onClick={closeWithoutReplacement}
          >
            Abbrechen
          </button>
          {!["contact", "case_reference", "legal_norm"].includes(
            commandKind,
          ) && (
            <button
              type="button"
              className="industrial-button"
              onClick={applyPrimaryAction}
            >
              {primaryActionLabel}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
