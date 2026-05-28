import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Lock, LockKeyhole, ShieldAlert } from 'lucide-react';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import type { AuthMode } from '../../core/auth/authTypes';
import { validateAppPassword } from '@services/passwordPolicy';
import appIconUrl from '../../../../assets/icons/png/512x512.png';


function SecurityUnavailable() {
  return (
    <main className="industrial-shell login-shell min-h-screen items-center justify-center text-zinc-100">
      <section className="login-panel login-panel-compact relative w-full overflow-hidden rounded-none border border-yellow-500/40 bg-zinc-950/95 p-7 shadow-2xl">
        <div className="scanline" />
        <div className="mb-5 flex items-center gap-3 border-b border-zinc-800 pb-5">
          <div className="grid h-11 w-11 place-items-center border border-yellow-400 bg-yellow-400/10 text-yellow-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="industrial-kicker">Gremia.SBV</p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">Start nicht abgeschlossen</h1>
          </div>
        </div>
        <p className="text-sm leading-6 text-zinc-300">
          Die interne Sicherheitsbrücke wurde nicht geladen. Bitte die Anwendung schließen, neu starten und bei erneutem Auftreten die Terminalausgabe prüfen.
        </p>
      </section>
    </main>
  );
}

function RecoveryKeyPanel({ recoveryKey, onConfirm }: { recoveryKey: string; onConfirm: () => void }) {
  return (
    <main className="industrial-shell login-shell min-h-screen items-center justify-center text-zinc-100">
      <section className="login-panel login-panel-medium relative w-full overflow-hidden rounded-none border border-yellow-500/40 bg-zinc-950/95 p-7 shadow-2xl">
        <div className="scanline" />
        <div className="mb-6 flex items-center gap-3 border-b border-zinc-800 pb-5">
          <div className="grid h-11 w-11 place-items-center border border-yellow-400 bg-yellow-400/10 text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.22)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <p className="industrial-kicker">Recovery-Key</p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">Sicher verwahren</h1>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-6 text-zinc-300">
          <p>
            Dieser Recovery-Key ist die einzige Möglichkeit, das Passwort zurückzusetzen, wenn das aktuelle Passwort nicht mehr bekannt ist.
            Er wird nicht im Klartext gespeichert und später nicht erneut angezeigt.
          </p>
          <div className="border border-yellow-500/50 bg-yellow-500/10 p-4 font-mono text-lg font-black tracking-[0.18em] text-yellow-100 select-all">
            {recoveryKey}
          </div>
          <p className="text-zinc-400">
            Bitte außerhalb der App sicher ablegen, zum Beispiel in einem versiegelten Umschlag oder einem freigegebenen Passwort-Tresor der berechtigten SBV-Person.
          </p>
          <button type="button" className="industrial-button w-full" onClick={onConfirm}>
            Ich habe den Recovery-Key sicher gespeichert
          </button>
        </div>
      </section>
    </main>
  );
}

function RecoveryGate({ onUnlock, onResetToSetup }: { onUnlock: () => void; onResetToSetup: () => void }) {
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const validationError = validateAppPassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== repeatPassword) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError('Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.');
        return;
      }

      const result = await bridge.security.resetPasswordWithRecoveryKey(recoveryKey, newPassword);
      if (!result.ok || !result.unlocked) {
        setError(result.error ?? 'Das Passwort konnte nicht zurückgesetzt werden.');
        return;
      }

      onUnlock();
    } catch (error) {
      console.error('Gremia.SBV recovery operation failed', error);
      setError('Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.');
    }
  }

  async function destroyVault() {
    setError('');
    setMessage('');

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError('Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.');
        return;
      }

      const result = await bridge.security.destroyLocalVault(confirmation);
      if (!result.ok) {
        setError(result.error ?? 'Der lokale Datenbestand konnte nicht verworfen werden.');
        return;
      }

      setMessage('Der lokale Datenbestand wurde verworfen. Es kann ein neuer leerer Datenbestand eingerichtet werden.');
      onResetToSetup();
    } catch (error) {
      console.error('Gremia.SBV destructive reset failed', error);
      setError('Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.');
    }
  }

  return (
    <main className="industrial-shell login-shell min-h-screen items-center justify-center text-zinc-100">
      <section className="login-panel login-panel-wide relative w-full overflow-hidden rounded-none border border-yellow-500/40 bg-zinc-950/95 p-7 shadow-2xl">
        <div className="scanline" />
        <div className="mb-7 flex items-center gap-3 border-b border-zinc-800 pb-5">
          <div className="grid h-11 w-11 place-items-center border border-yellow-400 bg-yellow-400/10 text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.22)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="industrial-kicker">Geschützter Datenbestand</p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">Wiederherstellung erforderlich</h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={resetPassword} className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-zinc-100">Passwort zurücksetzen</h2>
            <p className="text-sm leading-6 text-zinc-400">
              Ein vorhandener Datenbestand wurde erkannt. Ein neues Passwort kann nur mit dem Recovery-Key gesetzt werden.
            </p>
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">Recovery-Key</span>
              <input className="industrial-input w-full" value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">Neues Passwort</span>
              <input className="industrial-input w-full" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">Wiederholung</span>
              <input className="industrial-input w-full" type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} />
            </label>
            <button type="submit" className="industrial-button w-full">
              Passwort zurücksetzen
            </button>
          </form>

          <div className="border border-red-500/35 bg-red-500/5 p-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-red-100">Datenbestand verwerfen</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Ohne Passwort und ohne Recovery-Key ist ein Zugriff auf den vorhandenen Datenbestand nicht vorgesehen. Es kann nur ein neuer leerer Datenbestand angelegt werden.
            </p>
            <label className="mt-4 block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">Bestätigung</span>
              <input
                className="industrial-input w-full"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DATENBESTAND LÖSCHEN"
              />
            </label>
            <button type="button" className="industrial-danger-button mt-4 w-full" onClick={destroyVault}>
              Lokalen Datenbestand unwiderruflich löschen
            </button>
          </div>
        </div>

        {error && <div className="industrial-message industrial-message-warning mt-5">{error}</div>}
        {message && <div className="industrial-message industrial-message-ok mt-5">{message}</div>}
      </section>
    </main>
  );
}

export function LoginGate({ mode, onUnlock, onResetToSetup }: { mode: AuthMode; onUnlock: () => void; onResetToSetup: () => void }) {
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState('');
  const [error, setError] = useState('');

  const isSetup = mode === 'setup';

  if (mode === 'unavailable') {
    return <SecurityUnavailable />;
  }

  if (mode === 'recovery') {
    return <RecoveryGate onUnlock={onUnlock} onResetToSetup={onResetToSetup} />;
  }

  if (pendingRecoveryKey) {
    return <RecoveryKeyPanel recoveryKey={pendingRecoveryKey} onConfirm={onUnlock} />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const validationError = validateAppPassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isSetup && password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError('Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.');
        return;
      }

      if (isSetup) {
        const result = await bridge.security.setupInitialPassword(password);
        if (!result.ok) {
          setError(result.error ?? 'Das Initialpasswort konnte nicht gespeichert werden.');
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
        setError(result.error ?? 'Entsperren fehlgeschlagen.');
        return;
      }
      onUnlock();
    } catch (error) {
      console.error('Gremia.SBV security operation failed', error);
      setError('Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.');
    }
  }

  if (mode === 'loading') {
    return (
      <main className="industrial-shell login-shell min-h-screen items-center justify-center text-zinc-100">
        <section className="login-panel login-panel-compact relative w-full overflow-hidden rounded-none border border-zinc-700 bg-zinc-950/95 p-7 shadow-2xl">
          <div className="scanline" />
          <p className="industrial-kicker">Gremia.SBV</p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">Initialisierung</h1>
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
            {isSetup ? 'Ersteinrichtung' : 'Entsperren'}
          </p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">Gremia.SBV</h1>
        </div>

        <form onSubmit={submit} className="auth-form space-y-5">
          <label className="block">
            <span className="auth-field-label mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">
              {isSetup ? 'Initialpasswort' : 'App-Passwort'}
            </span>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              className="industrial-input w-full"
              placeholder={isSetup ? 'Initialpasswort festlegen' : 'Passwort eingeben'}
            />
          </label>

          {isSetup && (
            <label className="block">
              <span className="auth-field-label mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">
                Wiederholung
              </span>
              <input
                type="password"
                value={passwordRepeat}
                onChange={(event) => {
                  setPasswordRepeat(event.target.value);
                  setError('');
                }}
                className="industrial-input w-full"
                placeholder="Initialpasswort wiederholen"
              />
            </label>
          )}

          {error && (
            <div className="flex gap-3 border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
              <p>{error}</p>
            </div>
          )}

          <button type="submit" className="industrial-button w-full">
            <Lock className="h-4 w-4" />
            {isSetup ? 'Initialpasswort speichern' : 'Entsperren'}
          </button>
        </form>
      </section>
    </main>
  );
}
