import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, LockKeyhole, ShieldAlert } from "lucide-react";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import { FormActions, TextInput } from "../../shared/components/IndustrialForm";
import { recordRendererDiagnostic, waitForBridge } from "../../core/bridge/waitForBridge";
import { validateAppPassword } from "../../../domain/security/passwordPolicy";
export function SecurityUnavailable() {
  return (
    <main className="industrial-shell login-shell">
      <section className="login-panel login-panel-compact">
        <div className="scanline" />
        <div className="auth-panel-header auth-panel-header-row">
          <div className="auth-panel-icon">
            <AlertTriangle className="industrial-icon-lg" />
          </div>
          <div>
            <p className="industrial-kicker">Gremia.SBV</p>
            <h1 className="auth-panel-title">
              Start nicht abgeschlossen
            </h1>
          </div>
        </div>
        <p className="auth-copy">
          Die interne Sicherheitsbrücke wurde nicht geladen. Bitte die Anwendung
          schließen, neu starten und bei erneutem Auftreten die Terminalausgabe
          prüfen.
        </p>
      </section>
    </main>
  );
}

export function RecoveryKeyPanel({
  recoveryKey,
  onConfirm,
}: {
  recoveryKey: string;
  onConfirm: () => void;
}) {
  return (
    <main className="industrial-shell login-shell">
      <section className="login-panel login-panel-medium">
        <div className="scanline" />
        <div className="auth-panel-header auth-panel-header-row">
          <div className="auth-panel-icon">
            <LockKeyhole className="industrial-icon-lg" />
          </div>
          <div>
            <p className="industrial-kicker">Recovery-Key</p>
            <h1 className="auth-panel-title">
              Sicher verwahren
            </h1>
          </div>
        </div>

        <div className="auth-body">
          <p>
            Dieser Recovery-Key ist die einzige Möglichkeit, das Passwort
            zurückzusetzen, wenn das aktuelle Passwort nicht mehr bekannt ist.
            Er wird nicht im Klartext gespeichert und später nicht erneut
            angezeigt.
          </p>
          <code className="auth-secret">
            {recoveryKey}
          </code>
          <p className="industrial-muted">
            Bitte außerhalb der App sicher ablegen, zum Beispiel in einem
            versiegelten Umschlag oder einem freigegebenen Passwort-Tresor der
            berechtigten SBV-Person.
          </p>
          <IndustrialButton type="button" wide onClick={onConfirm}>
            Ich habe den Recovery-Key sicher gespeichert
          </IndustrialButton>
        </div>
      </section>
    </main>
  );
}

export function RecoveryGate({
  onUnlock,
  onResetToSetup,
  onCancel,
  triggeredFromLogin = false,
}: {
  onUnlock: (warning?: string) => void;
  onResetToSetup: () => void;
  onCancel?: () => void;
  triggeredFromLogin?: boolean;
}) {
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showDestroyVault, setShowDestroyVault] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateAppPassword(newPassword);
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

      const result = await bridge.security.resetPasswordWithRecoveryKey(
        recoveryKey,
        newPassword,
      );
      if (!result.ok || !result.unlocked) {
        setError(
          result.error ?? "Das Passwort konnte nicht zurückgesetzt werden.",
        );
        return;
      }

      onUnlock(result.warning);
    } catch (error) {
      recordRendererDiagnostic("error", "Wiederherstellungsoperation konnte nicht verarbeitet werden.", error);
      setError(
        "Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.",
      );
    }
  }

  async function destroyVault() {
    setError("");
    setMessage("");

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError(
          "Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.",
        );
        return;
      }

      const result = await bridge.security.destroyLocalVault(confirmation);
      if (!result.ok) {
        setError(
          result.error ??
            "Der lokale Datenbestand konnte nicht verworfen werden.",
        );
        return;
      }

      setMessage(
        "Der lokale Datenbestand wurde verworfen. Es kann ein neuer leerer Datenbestand eingerichtet werden.",
      );
      onResetToSetup();
    } catch (error) {
      recordRendererDiagnostic("error", "Lokaler Datenbestand konnte nicht verworfen werden.", error);
      setError(
        "Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.",
      );
    }
  }

  return (
    <main className="industrial-shell login-shell">
      <section className="login-panel login-panel-wide">
        <div className="scanline" />
        <div className="auth-panel-header auth-panel-header-row">
          <div className="auth-panel-icon">
            <ShieldAlert className="industrial-icon-lg" />
          </div>
          <div>
            <p className="industrial-kicker">Geschützter Datenbestand</p>
            <h1 className="auth-panel-title">
              {triggeredFromLogin
                ? "Passwort vergessen"
                : "Wiederherstellung erforderlich"}
            </h1>
          </div>
        </div>

        <div className="auth-recovery-grid">
          <form onSubmit={resetPassword} className="auth-body">
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

          <div className="auth-danger-panel">
            <h2 className="auth-section-title auth-section-title-danger">
              Datenbestand verwerfen
            </h2>
            <p className="industrial-muted">
              Ohne Passwort und ohne Recovery-Key ist ein Zugriff auf den
              vorhandenen Datenbestand nicht vorgesehen. Diese Option legt nach
              ausdrücklicher Bestätigung nur einen neuen leeren Datenbestand an.
            </p>
            {!showDestroyVault ? (
              <IndustrialButton
                type="button"
                variant="secondary"
                wide
                onClick={() => setShowDestroyVault(true)}
              >
                Löschbereich bewusst öffnen
              </IndustrialButton>
            ) : (
              <div className="auth-body">
                <TextInput
                  label="Bestätigung"
                  aria-label="Bestätigung Datenbestand löschen"
                  value={confirmation}
                  onValueChange={setConfirmation}
                  placeholder="DATENBESTAND LÖSCHEN"
                  autoComplete="off"
                />
                <IndustrialButton
                  type="button"
                  variant="danger"
                  wide
                  onClick={destroyVault}
                >
                  Lokalen Datenbestand unwiderruflich löschen
                </IndustrialButton>
              </div>
            )}
          </div>
        </div>

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
      </section>
    </main>
  );
}
