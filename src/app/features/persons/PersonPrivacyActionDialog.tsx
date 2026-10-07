import { useEffect, useRef, useState, type FormEvent } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";
import type { ProtectedPersonRecord } from "../../../domain/models/protected-person.model";
import { AUDIT_LOG_RETENTION_NOTICE } from "../../core/copy/privacyNotices";
import { IndustrialModal } from "../../shared/components/IndustrialControls";
import { TextCommandTextarea } from "../../shared/textCommands/TextCommandTextarea";

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

function PrivacyActionContext({ person, affectedCaseCount }: Pick<PersonPrivacyActionDialogProps, 'person' | 'affectedCaseCount'>) {
  return (
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
  );
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
  const errorId = `person-privacy-action-error-${mode}`;
  const texts = copy[mode];

  useEffect(() => {
    if (!open) return;
    setReason("");
    setConfirmation("");
    setFormError("");
  }, [open, mode]);

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
    <IndustrialModal
      title={texts.title}
      kicker={texts.kicker}
      description={texts.hint}
      icon={mode === "delete" ? <Trash2 className="industrial-icon-md" /> : <ShieldAlert className="industrial-icon-md" />}
      className="person-privacy-action-dialog"
      initialFocusRef={closeButtonRef}
      onClose={onClose}
      dataE2e={`person-${mode}-dialog`}
    >
        <p className="industrial-message industrial-message-info" data-e2e="audit-log-retention-notice">
          {AUDIT_LOG_RETENTION_NOTICE}
        </p>

        <PrivacyActionContext person={person} affectedCaseCount={affectedCaseCount} />

        <form className="privacy-review-form" onSubmit={submit}>
          <label>
            <span>Grund</span>
            <TextCommandTextarea fieldId="person-privacy-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-describedby={formError ? errorId : undefined}
              required className="industrial-textarea-input" />
          </label>
          <label>
            <span>Bestätigung</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={texts.confirmation}
              aria-describedby={formError ? errorId : undefined}
              required className="industrial-input" />
          </label>
          {formError && (
            <p
              id={errorId} className="industrial-message industrial-message-warning"
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
              type="button" className="industrial-secondary-button"
              ref={closeButtonRef}
              onClick={onClose}
            >
              Abbrechen
            </button>
          </div>
        </form>
    </IndustrialModal>
  );
}
