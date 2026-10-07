import type { FormEvent } from "react";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import { FormActions, TextInput } from "../../shared/components/IndustrialForm";

interface RecoveryPasswordFormProps {
  recoveryKey: string;
  newPassword: string;
  repeatPassword: string;
  setRecoveryKey: (value: string) => void;
  setNewPassword: (value: string) => void;
  setRepeatPassword: (value: string) => void;
  triggeredFromLogin: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}

export function RecoveryPasswordForm({
  recoveryKey, newPassword, repeatPassword, setRecoveryKey, setNewPassword, setRepeatPassword,
  triggeredFromLogin, onSubmit, onCancel,
}: RecoveryPasswordFormProps) {
  return (
    <form onSubmit={onSubmit} className="auth-body">
      <h2 className="auth-section-title">
        Passwort zurücksetzen
      </h2>
      <p className="industrial-muted">
        {triggeredFromLogin
          ? "Nutze den bei der Ersteinrichtung ausgegebenen Recovery-Key, um ein neues App-Passwort zu setzen."
          : "Ein vorhandener Datenbestand wurde erkannt. Ein neues Passwort kann nur mit dem Recovery-Key gesetzt werden."}
      </p>
      <TextInput
        label="Recovery-Key"
        aria-label="Recovery-Key"
        value={recoveryKey}
        onValueChange={setRecoveryKey}
        autoComplete="off"
      />
      <TextInput
        label="Neues Passwort"
        aria-label="Neues Passwort"
        type="password"
        value={newPassword}
        onValueChange={setNewPassword}
        autoComplete="new-password"
      />
      <TextInput
        label="Wiederholung"
        aria-label="Wiederholung neues Passwort"
        type="password"
        value={repeatPassword}
        onValueChange={setRepeatPassword}
        autoComplete="new-password"
      />
      <FormActions align="between" className="auth-form-actions">
        {onCancel && (
          <IndustrialButton
            type="button"
            variant="secondary"
            className="auth-form-action"
            onClick={onCancel}
          >
            Zurück zum Entsperren
          </IndustrialButton>
        )}
        <IndustrialButton type="submit" className="auth-form-action">
          Passwort zurücksetzen
        </IndustrialButton>
      </FormActions>
    </form>
  );
}
