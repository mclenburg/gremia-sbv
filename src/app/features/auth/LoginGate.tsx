import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Lock, LockKeyhole } from "lucide-react";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import { TextInput } from "../../shared/components/IndustrialForm";
import { waitForBridge } from "../../core/bridge/waitForBridge";
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
      console.error("Gremia.SBV security operation failed", error);
      setError(
        "Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.",
      );
    }
  }

  if (mode === "loading") {
    return (
      <main className="industrial-shell login-shell min-h-screen items-center justify-center text-zinc-100">
        <section className="login-panel login-panel-compact relative w-full overflow-hidden rounded-none border border-zinc-700 bg-zinc-950/95 p-7 shadow-2xl">
          <div className="scanline" />
          <p className="industrial-kicker">Gremia.SBV</p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">
            Initialisierung
          </h1>
        </section>
      </main>
    );
  }

  return (
    <main className="industrial-shell login-shell min-h-screen items-center justify-center text-zinc-100">
      <section className="login-panel login-panel-compact relative w-full overflow-hidden rounded-none border border-zinc-700 bg-zinc-950/95 p-7 shadow-2xl">
        <div className="scanline" />
        <img
          src={appIconUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-10 h-44 w-44 opacity-[0.08] saturate-0"
        />
        <div className="relative mb-7 border-b border-zinc-800 pb-5">
          <div className="mb-2 grid h-9 w-9 place-items-center border border-yellow-400 bg-yellow-400/10 text-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.18)]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.35em] text-yellow-300">
            {isSetup ? "Ersteinrichtung" : "Entsperren"}
          </p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">
            Gremia.SBV
          </h1>
        </div>

        <form onSubmit={submit} className="auth-form space-y-5">
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
            <div className="flex gap-3 border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
              <p>{error}</p>
            </div>
          )}

          <IndustrialButton type="submit" wide>
            <Lock className="h-4 w-4" />
            {isSetup ? "Initialpasswort speichern" : "Entsperren"}
          </IndustrialButton>
        </form>

        {!isSetup && (
          <div className="auth-recovery-footer mt-6 border-t border-zinc-800 pt-4 text-center">
            <p className="mb-3 text-xs leading-5 text-zinc-500">
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
