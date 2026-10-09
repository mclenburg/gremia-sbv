import { useState } from "react";
import type { FormEvent } from "react";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { recordRendererDiagnostic } from "../../core/diagnostics/rendererDiagnostics";
import { validatePassword } from "./passwordValidation";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setWarning("");
    setError("");

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== repeatPassword) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError(
          "Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.",
        );
        return;
      }

      const result = await bridge.security.changePassword(
        currentPassword,
        newPassword,
      );
      if (!result.ok) {
        setError(result.error ?? "Das Passwort konnte nicht geändert werden.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setMessage("Passwort wurde geändert.");
      setWarning(result.warning ?? "");
    } catch (error) {
      recordRendererDiagnostic("error", "Passwortänderung konnte nicht verarbeitet werden.", error);
      setError(
        "Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.",
      );
    }
  }

  return (
    <form onSubmit={submit} className="industrial-settings-form settings-section-narrow">
      <h3>Passwort ändern</h3>
      <label>
        <span>Aktuelles Passwort</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)} className="industrial-input" />
      </label>
      <label>
        <span>Neues Passwort</span>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)} className="industrial-input" />
      </label>
      <label>
        <span>Neues Passwort wiederholen</span>
        <input
          type="password"
          value={repeatPassword}
          onChange={(event) => setRepeatPassword(event.target.value)} className="industrial-input" />
      </label>

      {error && (
        <div className="industrial-message industrial-message-warning" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="industrial-message industrial-message-ok" role="status">
          {message}
        </div>
      )}

      {warning && (
        <div className="industrial-message industrial-message-warning" role="status">
          {warning}
        </div>
      )}

      <button type="submit" className="industrial-button">
        Passwort ändern
      </button>
    </form>
  );
}
