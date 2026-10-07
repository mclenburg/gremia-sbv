import { useState } from "react";
import { AlertTriangle, LockKeyhole, ShieldAlert } from "lucide-react";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import { TextInput } from "../../shared/components/IndustrialForm";
import { createRecoveryActions } from "./recoveryActions";
import { RecoveryPasswordForm } from "./RecoveryPasswordForm";

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

  const actions = createRecoveryActions({ setError, setMessage, onUnlock, onResetToSetup });

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
          <RecoveryPasswordForm
            recoveryKey={recoveryKey}
            newPassword={newPassword}
            repeatPassword={repeatPassword}
            setRecoveryKey={setRecoveryKey}
            setNewPassword={setNewPassword}
            setRepeatPassword={setRepeatPassword}
            triggeredFromLogin={triggeredFromLogin}
            onCancel={onCancel}
            onSubmit={(event) => {
              event.preventDefault();
              void actions.resetPassword(recoveryKey, newPassword, repeatPassword);
            }}
          />

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
                  onClick={() => { void actions.destroyVault(confirmation); }}
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
