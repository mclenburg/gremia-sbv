import { describe, expect, it, vi } from 'vitest';
import { app, dialog } from 'electron';
import { registerVacationV5FileIpc } from '../../../electron/ipc/vacationV5FileIpc';
import { IPC_CHANNELS } from '../../../electron/ipc/channels';
import { issueSelectedFileCapability, SELECTED_FILE_PURPOSE } from '../../../electron/ipc/selectedFileCapability';
import { trustedIpcEvent } from '../../helpers/trustedIpcEvent';

vi.mock('electron', () => ({ app: { getVersion: vi.fn(() => '0.9.8') },
  dialog: { showSaveDialog: vi.fn() } }));

function harness() {
  const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
  const ipcMain = { handle: (channel: string, handler: (...args: unknown[]) => Promise<unknown>) =>
    handlers.set(channel, handler) };
  const createCapability = vi.fn().mockReturnValue({ capabilities: {
    protocolVersion: 1, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
    features: ['manual_capability_exchange', 'vacation_scope_v5', 'return_scope_v5'],
    buildVersion: '0.9.8', revision: 1, issuedAt: '2026-11-12T10:00:00.000Z',
  } });
  const exportToFile = vi.fn().mockResolvedValue({ packageId: 'handover-1', targetInstanceId: 'target', sectionCounts: [] });
  const previewExport = vi.fn().mockReturnValue({ digest: 'a'.repeat(64), sectionCounts: [], documents: [],
    documentBytes: 0, sensitiveTextCount: 0 });
  const listCandidates = vi.fn().mockReturnValue([]);
  const importFromFile = vi.fn().mockReturnValue({ importId: 'import-1', importedCount: 1, packageId: 'handover-1' });
  const reviewFromFile = vi.fn().mockReturnValue({ packageId: 'handover-1', sectionCounts: [] });
  const exportReturn = vi.fn().mockResolvedValue({ packageId: 'return-1', changeCount: 1, targetInstanceId: 'target' });
  const previewReturn = vi.fn().mockReturnValue({ digest: 'b'.repeat(64), changes: [], documentBytes: 0 });
  const listReturnPackages = vi.fn().mockReturnValue([]);
  const reviewExportInventory = vi.fn().mockReturnValue({ items: [], additions: [] });
  registerVacationV5FileIpc(ipcMain as never, {
    transferRecipientProfiles: () => ({ createCapability }),
    transferIdentity: () => ({ getPrivateIdentity: () => ({}) }),
    vacationV5: () => ({ exportToFile, importFromFile, reviewFromFile, previewExport, listCandidates }),
    vacationV5Return: () => ({ exportToFile: exportReturn, previewExport: previewReturn,
      listReturnPackages, reviewExportInventory }),
  } as never);
  return { invoke: (channel: string, ...args: unknown[]) => handlers.get(channel)?.(trustedIpcEvent(ipcMain), ...args),
    createCapability, exportToFile, importFromFile, reviewFromFile, previewExport, exportReturn,
    previewReturn, listReturnPackages, reviewExportInventory };
}

const selection = { caseIds: [], standaloneDeadlineIds: [], meetingIds: ['meeting-1'], recruitingIds: [],
  employerObligationIds: [], inclusionAgreementIds: [], violationIds: [], assemblyIds: [] };
const request = { selection, profileId: 'profile-1', expiresAt: '2026-12-01T00:00:00.000Z',
  passphrase: 'lange Passphrase', previewDigest: 'a'.repeat(64) };

describe('Format-5-Dateiwege über IPC', () => {
  it('schreibt erst nach Dialogbestätigung und nimmt den Zielpfad ausschließlich aus dem Dialog', async () => {
    const { invoke, createCapability, exportToFile } = harness();
    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({ canceled: true, filePath: '' });
    await expect(invoke(IPC_CHANNELS.caseHandoverV5Export, request, undefined)).resolves.toEqual({ exported: false });
    expect(createCapability).not.toHaveBeenCalled();
    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({ canceled: false, filePath: '/chosen/handover.gsbvtransfer' });
    await expect(invoke(IPC_CHANNELS.caseHandoverV5Export,
      { ...request, targetPath: '/renderer/forbidden.gsbvtransfer' }, undefined)).resolves.toMatchObject({ exported: true, packageId: 'handover-1' });
    expect(exportToFile).toHaveBeenCalledWith(expect.objectContaining({ targetPath: '/chosen/handover.gsbvtransfer',
      selection }));
    expect(app.getVersion).toHaveBeenCalled();
  });

  it('akzeptiert beim Import ausschließlich einen nativ ausgewählten Datei-Token', async () => {
    const { invoke, importFromFile, reviewFromFile } = harness();
    await expect(invoke(IPC_CHANNELS.caseHandoverV5Import, '/chosen/handover.gsbvtransfer', 'lange Passphrase', 'handover-1'))
      .rejects.toThrow(/VALIDATION_FAILED/);
    const token = issueSelectedFileCapability('/chosen/handover.gsbvtransfer', SELECTED_FILE_PURPOSE.caseHandover).fileToken;
    await expect(invoke(IPC_CHANNELS.caseHandoverV5Review, token, 'lange Passphrase'))
      .resolves.toMatchObject({ packageId: 'handover-1' });
    expect(reviewFromFile).toHaveBeenCalledWith('/chosen/handover.gsbvtransfer', 'lange Passphrase');
    await expect(invoke(IPC_CHANNELS.caseHandoverV5Import, token, 'lange Passphrase', 'handover-1'))
      .resolves.toMatchObject({ importedCount: 1 });
    expect(importFromFile).toHaveBeenCalledWith('/chosen/handover.gsbvtransfer', 'lange Passphrase', 'handover-1');
  });

  it('prüft Rückgabeauswahl vor dem Dialog und schützt den Exportpfad', async () => {
    const { invoke, exportReturn, previewReturn } = harness();
    await expect(invoke(IPC_CHANNELS.caseHandoverV5ReturnPackages)).resolves.toEqual([]);
    await expect(invoke(IPC_CHANNELS.caseHandoverV5ReturnInventory, 'source-1'))
      .resolves.toMatchObject({ items: [] });
    await expect(invoke(IPC_CHANNELS.caseHandoverV5ReturnPreviewExport,
      { sourcePackageId: 'source-1' })).resolves.toMatchObject({ digest: 'b'.repeat(64) });
    await expect(invoke(IPC_CHANNELS.caseHandoverV5ReturnExport,
      { ...request, sourcePackageId: 'source-1', additionalItems: [{ kind: 'unbekannt', localId: '1' }] }, undefined))
      .rejects.toThrow(/VALIDATION_FAILED/);
    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({ canceled: false, filePath: '/chosen/return.gsbvtransfer' });
    await expect(invoke(IPC_CHANNELS.caseHandoverV5ReturnExport,
      { ...request, sourcePackageId: 'source-1', previewDigest: 'b'.repeat(64) }, undefined))
      .resolves.toMatchObject({ exported: true, changeCount: 1 });
    expect(previewReturn).toHaveBeenCalled();
    expect(exportReturn).toHaveBeenCalledWith(expect.objectContaining({ targetPath: '/chosen/return.gsbvtransfer',
      sourcePackageId: 'source-1' }));
  });
});
