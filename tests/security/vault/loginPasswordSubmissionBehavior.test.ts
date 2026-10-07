import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitLoginPassword } from '../../../src/app/features/auth/loginPasswordSubmission';

const password = 'korrekt-pferd-batterie';

function setup(isSetup = false) {
  const security = {
    unlock: vi.fn().mockResolvedValue({ ok: true, unlocked: true }),
    setupInitialPassword: vi.fn().mockResolvedValue({ ok: true, recoveryKey: 'synthetischer-key' }),
  };
  const dispatchEvent = vi.fn();
  vi.stubGlobal('window', { gremiaSbv: { security }, dispatchEvent });
  const input = {
    password, passwordRepeat: password, isSetup,
    setError: vi.fn(), setPendingRecoveryKey: vi.fn(), onUnlock: vi.fn(),
  };
  return { security, dispatchEvent, input };
}

describe('Login password submission', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it.each(['zu-kurz', 'Passwort!!!2026', 'aaa-besser-nicht'])('blocks invalid password %s before accessing security', async (invalid) => {
    const { security, input } = setup(true);
    await submitLoginPassword({ ...input, password: invalid, passwordRepeat: invalid });
    expect(security.setupInitialPassword).not.toHaveBeenCalled();
    expect(security.unlock).not.toHaveBeenCalled();
    expect(input.onUnlock).not.toHaveBeenCalled();
    expect(input.setError).toHaveBeenLastCalledWith(expect.any(String));
    expect(input.setError.mock.lastCall?.[0]).not.toBe('');
  });

  it('requires matching passwords for setup before persisting', async () => {
    const { security, input } = setup(true);
    await submitLoginPassword({ ...input, passwordRepeat: 'anderes-lang-passwort' });
    expect(security.setupInitialPassword).not.toHaveBeenCalled();
    expect(input.setError).toHaveBeenLastCalledWith('Die Passwörter stimmen nicht überein.');
  });

  it('passes a valid password unchanged and preserves unlock warnings', async () => {
    const { security, input } = setup();
    security.unlock.mockResolvedValue({ ok: true, unlocked: true, warning: 'Bereinigung prüfen' });
    await submitLoginPassword({ ...input, password: ' 1234567890 ' });
    expect(security.unlock).toHaveBeenCalledExactlyOnceWith(' 1234567890 ');
    expect(security.setupInitialPassword).not.toHaveBeenCalled();
    expect(input.setError.mock.calls).toEqual([['']]);
    expect(input.onUnlock).toHaveBeenCalledExactlyOnceWith('Bereinigung prüfen');
  });

  it('waits for confirmed setup and stages the recovery key without unlocking', async () => {
    const { security, input } = setup(true);
    let resolve!: (value: { ok: boolean; recoveryKey: string }) => void;
    security.setupInitialPassword.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = submitLoginPassword(input);
    await vi.waitFor(() => expect(security.setupInitialPassword).toHaveBeenCalledExactlyOnceWith(password));
    expect(input.setPendingRecoveryKey).not.toHaveBeenCalled();
    expect(input.onUnlock).not.toHaveBeenCalled();
    resolve({ ok: true, recoveryKey: 'synthetischer-key' });
    await pending;
    expect(input.setPendingRecoveryKey).toHaveBeenCalledExactlyOnceWith('synthetischer-key');
    expect(input.onUnlock).not.toHaveBeenCalled();
    expect(security.unlock).not.toHaveBeenCalled();
  });

  it('unlocks after successful setup when the service supplies no recovery key', async () => {
    const { security, input } = setup(true);
    security.setupInitialPassword.mockResolvedValue({ ok: true });
    await submitLoginPassword(input);
    expect(input.onUnlock).toHaveBeenCalledExactlyOnceWith();
    expect(input.setPendingRecoveryKey).not.toHaveBeenCalled();
  });

  it.each([{ ok: false, unlocked: false }, { ok: true, unlocked: false }])('does not unlock for unsuccessful login %j', async (result) => {
    const { security, input } = setup();
    security.unlock.mockResolvedValue(result);
    await submitLoginPassword(input);
    expect(input.onUnlock).not.toHaveBeenCalled();
    expect(input.setError).toHaveBeenLastCalledWith('Entsperren fehlgeschlagen.');
  });

  it.each([false, true])('keeps concrete service errors and prevents success for setup=%s', async (isSetup) => {
    const { security, input } = setup(isSetup);
    security.unlock.mockResolvedValue({ ok: false, error: 'Zugriff abgelehnt' });
    security.setupInitialPassword.mockResolvedValue({ ok: false, error: 'Zugriff abgelehnt' });
    await submitLoginPassword(input);
    expect(input.setError).toHaveBeenLastCalledWith('Zugriff abgelehnt');
    expect(input.onUnlock).not.toHaveBeenCalled();
    expect(input.setPendingRecoveryKey).not.toHaveBeenCalled();
  });

  it('reports missing security without claiming success', async () => {
    const { input } = setup();
    vi.useFakeTimers();
    vi.stubGlobal('window', { gremiaSbv: {}, setTimeout });
    const pending = submitLoginPassword(input);
    await vi.advanceTimersByTimeAsync(2500);
    await pending;
    expect(input.setError).toHaveBeenLastCalledWith('Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.');
    expect(input.onUnlock).not.toHaveBeenCalled();
  });

  it.each([false, true])('sanitizes rejected operations for setup=%s in feedback and diagnostics', async (isSetup) => {
    const { security, input, dispatchEvent } = setup(isSetup);
    const error = new Error('secret-password-and-path');
    security.unlock.mockRejectedValue(error);
    security.setupInitialPassword.mockRejectedValue(error);
    await submitLoginPassword(input);
    expect(input.setError).toHaveBeenLastCalledWith('Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.');
    expect(input.onUnlock).not.toHaveBeenCalled();
    expect(input.setPendingRecoveryKey).not.toHaveBeenCalled();
    expect(dispatchEvent).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      type: 'gremia-sbv:renderer-diagnostic',
      detail: { level: 'error', message: 'Sicherheitsoperation konnte nicht verarbeitet werden.', errorName: 'Error' },
    }));
  });
});
