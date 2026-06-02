import { useEffect, useRef, useState, type FormEvent } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";
import type { ProtectedPersonRecord } from "../../core/models/protected-person.model";
import { AUDIT_LOG_RETENTION_NOTICE } from "../../core/copy/privacyNotices";

export type PersonPrivacyActionMode = "anonymize" | "delete";

interface PersonPrivacyActionDialogProps {
  open: boolean;
  mode: PersonPrivacyActionMode;
  person: ProtectedPersonRecord | null;
  affectedCaseCount: number;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  onError: (message: string) => void;
}

function personLabel(person: ProtectedPersonRecord | null): string {
  if (!person) return "ausgewählte Person";
  if (person.recordKind === "pseudonymous_request")
    return person.pseudonymLabel || "Anonyme Anfrage";
  return `${person.lastName || "ohne Nachname"}, ${person.firstName || "ohne Vorname"}`;
}

const copy = {
  anonymize: {
    title: "Person anonymisieren",
    kicker: "Datenschutz-Lifecycle",
    confirmation: "PERSON ANONYMISIEREN",
    button: "Person anonymisieren",
    hint: "Direktidentifikatoren werden aus dem Personenstamm entfernt. Verbundene Fallakten bleiben erhalten und werden zur Datenschutzprüfung markiert.",
  },
  delete: {
    title: "Person löschen",
    kicker: "Art. 17 DSGVO",
    confirmation: "PERSON LÖSCHEN",
    button: "Person löschen",
    hint: "Der Personenstamm wird entfernt. Verbundene Fallakten werden vom Personenbezug gelöst und zur Datenschutzprüfung markiert.",
  },
} satisfies Record<
  PersonPrivacyActionMode,
  {
    title: string;
    kicker: string;
    confirmation: string;
    button: string;
    hint: string;
  }
>;

export function PersonPrivacyActionDialog({
  open,
  mode,
  person,
  affectedCaseCount,
  onClose,
  onSubmit,
  onError,
}: PersonPrivacyActionDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = `person-privacy-action-title-${mode}`;
  const descriptionId = `person-privacy-action-description-${mode}`;
  const errorId = `person-privacy-action-error-${mode}`;
  const texts = copy[mode];

  useEffect(() => {
    if (!open) return;
    setReason("");
    setConfirmation("");
    setFormError("");
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, mode, onClose]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!person) {
      setFormError("Bitte zuerst eine Person auswählen.");
      return;
    }
    if (!reason.trim()) {
      setFormError("Bitte einen Grund dokumentieren.");
      return;
    }
    if (confirmation.trim() !== texts.confirmation) {
      setFormError(
        `Bitte die Bestätigung exakt eingeben: ${texts.confirmation}`,
      );
      return;
    }
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Die Datenschutzaktion konnte nicht abgeschlossen werden.";
      setFormError(message);
      onError(message);
    }
  }

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        className="industrial-modal person-privacy-action-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-e2e={`person-${mode}-dialog`}
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            {mode === "delete" ? (
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="industrial-kicker">{texts.kicker}</p>
            <h2 id={titleId}>{texts.title}</h2>
            <p id={descriptionId}>{texts.hint}</p>
          </div>
        </div>

        <p className="industrial-message industrial-message-info" data-e2e="audit-log-retention-notice">
          {AUDIT_LOG_RETENTION_NOTICE}
        </p>

        <dl className="person-detail-grid privacy-context-grid">
          <div>
            <dt>Person</dt>
            <dd>{personLabel(person)}</dd>
          </div>
          <div>
            <dt>Betroffene Fallakten</dt>
            <dd>{affectedCaseCount}</dd>
          </div>
        </dl>

        <form className="privacy-review-form" onSubmit={submit}>
          <label>
            <span>Grund</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-describedby={formError ? errorId : undefined}
              required
            />
          </label>
          <label>
            <span>Bestätigung</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={texts.confirmation}
              aria-describedby={formError ? errorId : undefined}
              required
            />
          </label>
          {formError && (
            <p
              id={errorId}
              className="industrial-message industrial-message-warning"
              role="alert"
            >
              {formError}
            </p>
          )}
          <div className="person-toolbar compact">
            <button type="submit" className="industrial-button">
              {texts.button}
            </button>
            <button
              type="button"
              className="industrial-secondary-button"
              ref={closeButtonRef}
              onClick={onClose}
            >
              Abbrechen
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
