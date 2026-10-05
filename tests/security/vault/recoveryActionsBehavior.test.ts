import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRecoveryActions } from '../../../src/app/features/auth/recoveryActions';

const password = 'neues-langes-passwort';
const recoveryKey = ' ABCD-EFGH-IJKL-MNOP ';

function setup() {
  const security = {
    resetPasswordWithRecoveryKey: vi.fn().mockResolvedValue({ ok: true, unlocked: true, warning: 'Datenschutz prüfen' }),
    destroyLocalVault: vi.fn().mockResolvedValue({ ok: true }),
  };
  const dispatchEvent = vi.fn();
  vi.stubGlobal('window', { gremiaSbv: { security }, dispatchEvent });
  const callbacks = {
    setError: vi.fn(), setMessage: vi.fn(), onUnlock: vi.fn(), onResetToSetup: vi.fn(),
  };
  return { security, callbacks, dispatchEvent, actions: createRecoveryActions(callbacks) };
}

describe('Recovery actions', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('does not access security or clear feedback until the user runs an action', () => {
    const { security, callbacks } = setup();
    expect(security.resetPasswordWithRecoveryKey).not.toHaveBeenCalled();
    expect(security.destroyLocalVault).not.toHaveBeenCalled();
    for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled();
  });

  it.each(['zu-kurz', 'Passwort!!!2026', 'aaa-besser-nicht'])('rejects invalid new password %s without a security operation', async (invalid) => {
    const { actions, callbacks, security } = setup();
    await actions.resetPassword(recoveryKey, invalid, invalid);
    expect(security.resetPasswordWithRecoveryKey).not.toHaveBeenCalled();
    expect(callbacks.onUnlock).not.toHaveBeenCalled();
    expect(callbacks.setMessage.mock.calls).toEqual([['']]);
    expect(callbacks.setError.mock.lastCall?.[0]).not.toBe('');
  });

  it('rejects mismatched passwords before using the recovery key', async () => {
    const { actions, callbacks, security } = setup();
    await actions.resetPassword(recoveryKey, password, 'anderes-lang-passwort');
    expect(security.resetPasswordWithRecoveryKey).not.toHaveBeenCalled();
    expect(callbacks.setError).toHaveBeenLastCalledWith('Die neuen Passwörter stimmen nicht überein.');
    expect(callbacks.onUnlock).not.toHaveBeenCalled();
  });

  it('forwards key and password unchanged and unlocks only after a confirmed response', async () => {
    const { actions, callbacks, security } = setup();
    let resolve!: (value: { ok: boolean; unlocked: boolean; warning: string }) => void;
    security.resetPasswordWithRecoveryKey.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = actions.resetPassword(recoveryKey, ' 1234567890 ', ' 1234567890 ');
    await vi.waitFor(() => expect(security.resetPasswordWithRecoveryKey).toHaveBeenCalledExactlyOnceWith(recoveryKey, ' 1234567890 '));
    expect(callbacks.onUnlock).not.toHaveBeenCalled();
    expect(callbacks.setError.mock.calls).toEqual([['']]);
    expect(callbacks.setMessage.mock.calls).toEqual([['']]);
    resolve({ ok: true, unlocked: true, warning: 'Datenschutz prüfen' });
    await pending;
    expect(callbacks.onUnlock).toHaveBeenCalledExactlyOnceWith('Datenschutz prüfen');
    expect(callbacks.onResetToSetup).not.toHaveBeenCalled();
    expect(security.destroyLocalVault).not.toHaveBeenCalled();
  });

  it.each([{ ok: false, unlocked: false }, { ok: true, unlocked: false }])('retains the recovery view for unsuccessful reset %j', async (result) => {
    const { actions, callbacks, security } = setup();
    security.resetPasswordWithRecoveryKey.mockResolvedValue(result);
    await actions.resetPassword(recoveryKey, password, password);
    expect(callbacks.setError).toHaveBeenLastCalledWith('Das Passwort konnte nicht zurückgesetzt werden.');
    expect(callbacks.onUnlock).not.toHaveBeenCalled();
  });

  it('preserves a concrete reset error without claiming success', async () => {
    const { actions, callbacks, security } = setup();
    security.resetPasswordWithRecoveryKey.mockResolvedValue({ ok: false, error: 'Recovery-Key ist ungültig.' });
    await actions.resetPassword(recoveryKey, password, password);
    expect(callbacks.setError).toHaveBeenLastCalledWith('Recovery-Key ist ungültig.');
    expect(callbacks.onUnlock).not.toHaveBeenCalled();
  });

  it('forwards explicit deletion confirmation and waits for success before returning to setup', async () => {
    const { actions, callbacks, security } = setup();
    let resolve!: (value: { ok: boolean }) => void;
    security.destroyLocalVault.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = actions.destroyVault('DATENBESTAND LÖSCHEN');
    await vi.waitFor(() => expect(security.destroyLocalVault).toHaveBeenCalledExactlyOnceWith('DATENBESTAND LÖSCHEN'));
    expect(callbacks.onResetToSetup).not.toHaveBeenCalled();
    expect(callbacks.setMessage.mock.calls).toEqual([['']]);
    resolve({ ok: true });
    await pending;
    expect(callbacks.setMessage).toHaveBeenLastCalledWith('Der lokale Datenbestand wurde verworfen. Es kann ein neuer leerer Datenbestand eingerichtet werden.');
    expect(callbacks.onResetToSetup).toHaveBeenCalledExactlyOnceWith();
    expect(callbacks.setMessage.mock.invocationCallOrder.at(-1)).toBeLessThan(callbacks.onResetToSetup.mock.invocationCallOrder[0]);
    expect(callbacks.onUnlock).not.toHaveBeenCalled();
    expect(security.resetPasswordWithRecoveryKey).not.toHaveBeenCalled();
  });

  it.each([undefined, 'Bestätigung fehlt.'])('reports refused deletion with error %s without returning to setup', async (error) => {
    const { actions, callbacks, security } = setup();
    security.destroyLocalVault.mockResolvedValue({ ok: false, error });
    await actions.destroyVault('unvollständige Bestätigung');
    expect(security.destroyLocalVault).toHaveBeenCalledExactlyOnceWith('unvollständige Bestätigung');
    expect(callbacks.setError).toHaveBeenLastCalledWith(error ?? 'Der lokale Datenbestand konnte nicht verworfen werden.');
    expect(callbacks.setMessage.mock.calls).toEqual([['']]);
    expect(callbacks.onResetToSetup).not.toHaveBeenCalled();
  });

  it.each(['resetPassword', 'destroyVault'] as const)('reports missing security during %s without claiming success', async (action) => {
    const { actions, callbacks } = setup();
    vi.useFakeTimers();
    vi.stubGlobal('window', { gremiaSbv: {}, setTimeout });
    const pending = action === 'resetPassword'
      ? actions.resetPassword(recoveryKey, password, password)
      : actions.destroyVault('DATENBESTAND LÖSCHEN');
    await vi.advanceTimersByTimeAsync(2500);
    await pending;
    expect(callbacks.setError).toHaveBeenLastCalledWith('Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.');
    expect(callbacks.onUnlock).not.toHaveBeenCalled();
    expect(callbacks.onResetToSetup).not.toHaveBeenCalled();
    expect(callbacks.setMessage.mock.calls).toEqual([['']]);
  });

  it.each([
    ['resetPasswordWithRecoveryKey', 'Wiederherstellungsoperation konnte nicht verarbeitet werden.'],
    ['destroyLocalVault', 'Lokaler Datenbestand konnte nicht verworfen werden.'],
  ] as const)('sanitizes rejected %s in feedback and diagnostics', async (method, diagnostic) => {
    const { actions, callbacks, security, dispatchEvent } = setup();
    security[method].mockRejectedValue(new Error('private-key-password-file-path'));
    if (method === 'destroyLocalVault') await actions.destroyVault('DATENBESTAND LÖSCHEN');
    else await actions.resetPassword(recoveryKey, password, password);
    expect(callbacks.setError).toHaveBeenLastCalledWith('Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.');
    expect(dispatchEvent).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      type: 'gremia-sbv:renderer-diagnostic',
      detail: { level: 'error', message: diagnostic, errorName: 'Error' },
    }));
    expect(callbacks.onUnlock).not.toHaveBeenCalled();
    expect(callbacks.onResetToSetup).not.toHaveBeenCalled();
    expect(callbacks.setMessage.mock.calls).toEqual([['']]);
  });

  it('uses the current security bridge at action time', async () => {
    const { actions, callbacks, security } = setup();
    const replacement = { resetPasswordWithRecoveryKey: vi.fn().mockResolvedValue({ ok: true, unlocked: true }) };
    vi.stubGlobal('window', { gremiaSbv: { security: replacement } });
    await actions.resetPassword(recoveryKey, password, password);
    expect(replacement.resetPasswordWithRecoveryKey).toHaveBeenCalledExactlyOnceWith(recoveryKey, password);
    expect(security.resetPasswordWithRecoveryKey).not.toHaveBeenCalled();
    expect(callbacks.onUnlock).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});
