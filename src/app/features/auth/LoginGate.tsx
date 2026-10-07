import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import type { AuthMode } from "../../core/auth/authTypes";
import appIconUrl from "../../../../assets/icons/png/512x512.png";
import { SecurityUnavailable, RecoveryGate, RecoveryKeyPanel } from './AuthRecoveryViews';
import { LoginPasswordForm } from "./LoginPasswordForm";
import { submitLoginPassword } from "./loginPasswordSubmission";

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
            <LockKeyhole className="industrial-icon-md" />
          </div>
          <p className="auth-panel-kicker">
            {isSetup ? "Ersteinrichtung" : "Entsperren"}
          </p>
          <h1 className="auth-panel-title">
            Gremia.SBV
          </h1>
        </div>

        <LoginPasswordForm
          isSetup={isSetup}
          password={password}
          passwordRepeat={passwordRepeat}
          error={error}
          onPasswordChange={(value) => { setPassword(value); setError(""); }}
          onRepeatChange={(value) => { setPasswordRepeat(value); setError(""); }}
          onSubmit={(event) => {
            event.preventDefault();
            void submitLoginPassword({ password, passwordRepeat, isSetup, setError, setPendingRecoveryKey, onUnlock });
          }}
        />

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
