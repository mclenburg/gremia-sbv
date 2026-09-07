import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Lock, LockKeyhole } from "lucide-react";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import { TextInput } from "../../shared/components/IndustrialForm";
import { recordRendererDiagnostic, waitForBridge } from "../../core/bridge/waitForBridge";
import type { AuthMode } from "../../core/auth/authTypes";
import { validateAppPassword } from "../../../domain/security/passwordPolicy";
import appIconUrl from "../../../../assets/icons/png/512x512.png";
import { SecurityUnavailable, RecoveryGate, RecoveryKeyPanel } from './AuthRecoveryViews';
export function LoginGate({
  mode,
  onUnlock,
  onResetToSetup,
}: {
  mode: AuthMode;
  onUnlock: (warning?: string) => void;
  onResetToSetup: () => void;
}) {
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState("");
  const [recoveryRequested, setRecoveryRequested] = useState(false);
  const [error, setError] = useState("");

  const isSetup = mode === "setup";

  if (mode === "unavailable") {
    return <SecurityUnavailable />;
  }

  if (mode === "recovery") {
    return <RecoveryGate onUnlock={onUnlock} onResetToSetup={onResetToSetup} />;
  }

  if (mode === "login" && recoveryRequested) {
    return (
      <RecoveryGate
        onUnlock={onUnlock}
        onResetToSetup={onResetToSetup}
        onCancel={() => {
          setRecoveryRequested(false);
          setError("");
        }}
        triggeredFromLogin
      />
    );
  }

  if (pendingRecoveryKey) {
    return (
      <RecoveryKeyPanel recoveryKey={pendingRecoveryKey} onConfirm={() => onUnlock()} />
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateAppPassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isSetup && password !== passwordRepeat) {
      setError("Die Passwörter stimmen nicht überein.");
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

      if (isSetup) {
        const result = await bridge.security.setupInitialPassword(password);
        if (!result.ok) {
          setError(
            result.error ??
              "Das Initialpasswort konnte nicht gespeichert werden.",
          );
          return;
        }
        if (result.recoveryKey) {
          setPendingRecoveryKey(result.recoveryKey);
          return;
        }
        onUnlock();
        return;
      }

      const result = await bridge.security.unlock(password);
      if (!result.ok || !result.unlocked) {
        setError(result.error ?? "Entsperren fehlgeschlagen.");
        return;
      }
      onUnlock(result.warning);
    } catch (error) {
      recordRendererDiagnostic("error", "Sicherheitsoperation konnte nicht verarbeitet werden.", error);
      setError(
        "Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.",
      );
    }
  }

  if (mode === "loading") {
    return (
      <main className="industrial-shell login-shell">
        <section className="login-panel login-panel-compact">
          <div className="scanline" />
          <p className="industrial-kicker">Gremia.SBV</p>
          <h1 className="auth-panel-title">
            Initialisierung
          </h1>
        </section>
      </main>
    );
  }

  return (
    <main className="industrial-shell login-shell">
      <section className="login-panel login-panel-compact">
        <div className="scanline" />
        <img
          src={appIconUrl}
          alt=""
          aria-hidden="true"
          className="auth-background-mark"
        />
        <div className="auth-panel-header">
          <div className="auth-panel-icon auth-panel-icon-small">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <p className="auth-panel-kicker">
            {isSetup ? "Ersteinrichtung" : "Entsperren"}
          </p>
          <h1 className="auth-panel-title">
            Gremia.SBV
          </h1>
        </div>

        <form onSubmit={submit} className="auth-form">
          <TextInput
            autoFocus
            type="password"
            label={isSetup ? "Initialpasswort" : "App-Passwort"}
            value={password}
            onValueChange={(value) => {
              setPassword(value);
              setError("");
            }}
            aria-label={isSetup ? "Initialpasswort" : "App-Passwort"}
            placeholder={isSetup ? "Initialpasswort festlegen" : "Passwort eingeben"}
            autoComplete={isSetup ? "new-password" : "current-password"}
          />

          {isSetup && (
            <TextInput
              type="password"
              label="Wiederholung"
              value={passwordRepeat}
              onValueChange={(value) => {
                setPasswordRepeat(value);
                setError("");
              }}
              aria-label="Initialpasswort wiederholen"
              placeholder="Initialpasswort wiederholen"
              autoComplete="new-password"
            />
          )}

          {error && (
            <div className="industrial-message industrial-message-warning auth-inline-alert">
              <AlertTriangle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          <IndustrialButton type="submit" wide>
            <Lock className="h-4 w-4" />
            {isSetup ? "Initialpasswort speichern" : "Entsperren"}
          </IndustrialButton>
        </form>

        {!isSetup && (
          <div className="auth-recovery-footer">
            <p className="auth-recovery-note">
              Passwort vergessen? Dafür brauchst du den langen Recovery-Key aus
              der Ersteinrichtung.
            </p>
            <IndustrialButton
              type="button"
              variant="secondary"
              wide
              onClick={() => {
                setPassword("");
                setError("");
                setRecoveryRequested(true);
              }}
            >
              Passwort vergessen? Recovery-Key verwenden
            </IndustrialButton>
          </div>
        )}
      </section>
    </main>
  );
}
