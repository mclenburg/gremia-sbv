import { describe, expect, it, vi } from 'vitest';
import { ApplicationError } from '../../src/app/core/models/application-error.model.js';
import { normalizeApplicationError, registerIpcHandler, serializeApplicationError } from '../../electron/ipc/ipcHandler.js';
import { IPC_CHANNELS } from '../../electron/ipc/channels.js';

describe('zentrale IPC-Fehlergrenze', () => {
  it('klassifiziert Validierungs-, Integritäts- und Auditfehler stabil', () => {
    expect(normalizeApplicationError(new Error('Eingabe ist ungültig'), 'cases:create').code).toBe('VALIDATION_FAILED');
    expect(normalizeApplicationError(new Error('Hash-Chain Integrität verletzt'), 'reports:generate').code).toBe('DATABASE_INTEGRITY_FAILED');
    expect(normalizeApplicationError(new Error('Audit konnte nicht geschrieben werden'), 'bem:update').code).toBe('AUDIT_WRITE_FAILED');
  });

  it('bewahrt explizite Anwendungscodes und ergänzt nur die Operation', () => {
    const normalized = normalizeApplicationError(
      new ApplicationError('NOT_FOUND', 'Vorgang nicht gefunden'),
      'participation:get',
    );
    expect(normalized.toPayload()).toEqual({
      code: 'NOT_FOUND',
      message: 'Vorgang nicht gefunden',
      operation: 'participation:get',
    });
  });

  it('lässt Erfolgswerte unverändert passieren und serialisiert Fehler ohne Stack oder Ursache', async () => {
    let registered: ((event: unknown, ...args: unknown[]) => Promise<unknown>) | undefined;
    const ipcMain = {
      handle: vi.fn((_channel: string, handler: (event: unknown, ...args: unknown[]) => Promise<unknown>) => {
        registered = handler;
      }),
    };
    registerIpcHandler(ipcMain as never, IPC_CHANNELS.casesList, async () => ({ ok: true }));
    await expect(registered?.({})).resolves.toEqual({ ok: true });
    await expect(registered?.({}, 'unerwartet')).rejects.toThrow('VALIDATION_FAILED');

    registerIpcHandler(ipcMain as never, IPC_CHANNELS.casesList, async () => {
      throw new Error('Datei konnte nicht geschrieben werden');
    });
    await expect(registered?.({})).rejects.toThrow('GREMIA_SBV_APPLICATION_ERROR:');
    const serialized = serializeApplicationError(new Error('Datei konnte nicht geschrieben werden'), IPC_CHANNELS.casesList);
    expect(serialized).toContain('"code":"FILE_OPERATION_FAILED"');
    expect(serialized).not.toContain('stack');
  });
});
