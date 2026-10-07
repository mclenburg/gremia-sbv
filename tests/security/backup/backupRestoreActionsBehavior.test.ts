import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBackupRestoreActions } from '../../../src/app/features/settings/backupRestoreActions';

const passphrase = 'Lange Backup-Passphrase';

function setup() {
  const result = { ok: true, fileName: 'tresor.gsbvbackup', fileCount: 3, totalBytes: 1024 };
  const service = {
    create: vi.fn().mockResolvedValue(result),
    inspect: vi.fn().mockResolvedValue({ ...result, verifiedAt: '2030-01-01T12:00:00Z' }),
    restore: vi.fn().mockResolvedValue({ ...result, restartRequired: true }),
  };
  vi.stubGlobal('window', { gremiaSbv: { security: {}, backup: service } });
  const setBusy = vi.fn();
  const setResult = vi.fn();
  const setError = vi.fn();
  return { service, setBusy, setResult, setError, actions: createBackupRestoreActions({ setBusy, setResult, setError }) };
}

describe('Backup form operations', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(['createBackup', 'inspectBackup', 'restoreBackup'] as const)('rejects a short passphrase before %s reaches the service', async (action) => {
    const state = setup();
    await state.actions[action]('zu kurz', 'BACKUP WIEDERHERSTELLEN');
    expect(state.service.create).not.toHaveBeenCalled();
    expect(state.service.inspect).not.toHaveBeenCalled();
    expect(state.service.restore).not.toHaveBeenCalled();
    expect(state.setResult).toHaveBeenCalledExactlyOnceWith(null);
    expect(state.setError).toHaveBeenLastCalledWith('Die Backup-Passphrase muss mindestens 12 Zeichen lang sein.');
    expect(state.setBusy).not.toHaveBeenCalled();
  });

  it('waits for backup creation before displaying the service result', async () => {
    const state = setup();
    let resolve!: (result: { ok: boolean; fileName: string }) => void;
    state.service.create.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = state.actions.createBackup(passphrase);
    await vi.waitFor(() => expect(state.service.create).toHaveBeenCalledExactlyOnceWith(passphrase));
    expect(state.setBusy.mock.calls).toEqual([[true]]);
    expect(state.setResult.mock.calls).toEqual([[null]]);
    const result = { ok: true, fileName: 'gesichert.gsbvbackup' };
    resolve(result);
    await pending;
    expect(state.setResult).toHaveBeenLastCalledWith(result);
    expect(state.setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it('accepts exactly twelve characters without trimming the passphrase', async () => {
    const state = setup();
    const boundaryPassphrase = ' 1234567890 ';
    await state.actions.createBackup(boundaryPassphrase);
    expect(state.service.create).toHaveBeenCalledExactlyOnceWith(boundaryPassphrase);
    expect(state.setError.mock.calls).toEqual([['']]);
  });

  it('inspects the backup without invoking restore or create', async () => {
    const state = setup();
    await state.actions.inspectBackup(passphrase);
    expect(state.service.inspect).toHaveBeenCalledExactlyOnceWith(passphrase);
    expect(state.service.restore).not.toHaveBeenCalled();
    expect(state.service.create).not.toHaveBeenCalled();
    expect(state.setResult).toHaveBeenLastCalledWith(expect.objectContaining({ ok: true, verifiedAt: '2030-01-01T12:00:00Z' }));
  });

  it('forwards the explicit restore confirmation unchanged and retains the restart requirement', async () => {
    const state = setup();
    await state.actions.restoreBackup(passphrase, 'BACKUP WIEDERHERSTELLEN');
    expect(state.service.restore).toHaveBeenCalledExactlyOnceWith(passphrase, 'BACKUP WIEDERHERSTELLEN');
    expect(state.setResult).toHaveBeenLastCalledWith(expect.objectContaining({ ok: true, restartRequired: true }));
  });

  it.each([
    ['createBackup', 'create', 'Backup konnte nicht erstellt werden.'],
    ['inspectBackup', 'inspect', 'Backup konnte nicht geprüft werden.'],
    ['restoreBackup', 'restore', 'Backup konnte nicht wiederhergestellt werden.'],
  ] as const)('reports an unsuccessful %s with the operation fallback', async (action, method, message) => {
    const state = setup();
    state.service[method].mockResolvedValue({ ok: false });
    await state.actions[action](passphrase, 'BACKUP WIEDERHERSTELLEN');
    expect(state.setError).toHaveBeenLastCalledWith(message);
    expect(state.setResult).toHaveBeenLastCalledWith({ ok: false });
    expect(state.setBusy).toHaveBeenLastCalledWith(false);
  });

  it('retains the concrete service error instead of replacing it with a fallback', async () => {
    const state = setup();
    state.service.inspect.mockResolvedValue({ ok: false, error: 'Integritätsprüfung fehlgeschlagen' });
    await state.actions.inspectBackup(passphrase);
    expect(state.setError).toHaveBeenLastCalledWith('Integritätsprüfung fehlgeschlagen');
    expect(state.setResult).toHaveBeenLastCalledWith({ ok: false, error: 'Integritätsprüfung fehlgeschlagen' });
  });

  it('clears busy state and reports a rejected restore without fabricating a result', async () => {
    const state = setup();
    state.service.restore.mockRejectedValue(new Error('Bestätigung erforderlich'));
    await state.actions.restoreBackup(passphrase, 'unvollständig');
    expect(state.setError).toHaveBeenLastCalledWith('Bestätigung erforderlich');
    expect(state.setResult.mock.calls).toEqual([[null]]);
    expect(state.setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it('reports an unavailable backup service without claiming success', async () => {
    const state = setup();
    vi.stubGlobal('window', { gremiaSbv: { security: {} } });
    await state.actions.createBackup(passphrase);
    expect(state.setError).toHaveBeenLastCalledWith('Backup-Dienst ist nicht erreichbar.');
    expect(state.setResult.mock.calls).toEqual([[null]]);
    expect(state.setBusy).toHaveBeenLastCalledWith(false);
  });
});
