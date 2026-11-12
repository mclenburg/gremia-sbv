import { app, dialog, type IpcMain } from 'electron';
import type { ApplicationServices } from '../applicationServices.js';
import type { VacationV5ExportRequest, VacationV5ReturnExportRequest,
  VacationV5SelectionRequest } from '../../src/domain/transfer/vacationV5File.js';
import { isVacationV5PackageSourceKind, type VacationV5PackageSourceKind } from '../../services/vacationV5PackageSource.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertRecordInput, assertString, IpcValidationError, sanitizeDialogFileName } from './ipcValidation.js';
import { resolveSelectedFileCapability, SELECTED_FILE_PURPOSE } from './selectedFileCapability.js';

const scopeKeys = ['caseIds', 'standaloneDeadlineIds', 'meetingIds', 'recruitingIds',
  'employerObligationIds', 'inclusionAgreementIds', 'violationIds', 'assemblyIds'] as const;

function ids(input: unknown, channel: string, label: string): string[] {
  if (!Array.isArray(input) || input.length > 20_000) throw new IpcValidationError(channel, `${label} ist ungültig.`);
  const result = input.map((item) => assertString(item, channel, label, { minLength: 1, maxLength: 120 }));
  if (new Set(result).size !== result.length) throw new IpcValidationError(channel, `${label} enthält Dubletten.`);
  return result;
}

function requestFields(input: Record<string, unknown>, channel: string) {
  return {
    profileId: assertString(input.profileId, channel, 'Empfängerprofil', { minLength: 1, maxLength: 120 }),
    expiresAt: assertString(input.expiresAt, channel, 'Vertretungsende', { minLength: 1, maxLength: 60 }),
    passphrase: assertString(input.passphrase, channel, 'Transport-Passphrase', { minLength: 10, maxLength: 500 }),
  };
}

function selectionRequest(input: unknown, channel: string): VacationV5SelectionRequest {
  const value = assertRecordInput<Record<string, unknown>>(input, channel);
  const scope = assertRecordInput<Record<string, unknown>>(value.selection, channel, 'Umfang');
  const selection = Object.fromEntries(scopeKeys.map((key) => [key, ids(scope[key], channel, key)])) as unknown as VacationV5SelectionRequest['selection'];
  if (scope.inclusionOfficerSnapshotId !== undefined) selection.inclusionOfficerSnapshotId =
    assertString(scope.inclusionOfficerSnapshotId, channel, 'Inklusionsbeauftragten-Stand', { minLength: 1, maxLength: 120 });
  return { selection,
    measureIds: ids(value.measureIds ?? [], channel, 'Maßnahmen'),
    documentIds: ids(value.documentIds ?? [], channel, 'Falldokumente'),
    officeDocumentIds: ids(value.officeDocumentIds ?? [], channel, 'Amtsdokumente'),
    ...(value.handoverNote === undefined ? {} : { handoverNote: assertString(value.handoverNote,
      channel, 'Übergabehinweis', { minLength: 0, maxLength: 2000 }) }) };
}

function exportRequest(input: unknown): VacationV5ExportRequest {
  const channel = IPC_CHANNELS.caseHandoverV5Export;
  const value = assertRecordInput<Record<string, unknown>>(input, channel);
  const previewDigest = assertString(value.previewDigest, channel, 'bestätigte Vorschau', { minLength: 64, maxLength: 64 });
  if (!/^[0-9a-f]{64}$/.test(previewDigest)) throw new IpcValidationError(channel, 'Bestätigte Vorschau ist ungültig.');
  return { ...selectionRequest(value, channel), ...requestFields(value, channel), previewDigest };
}

function returnSelection(input: unknown, channel: string): { sourcePackageId: string;
  cancellationRequests: Array<{ ref: string; reason: string }>;
  additionalItems: Array<{ kind: VacationV5PackageSourceKind; localId: string }> } {
  const value = assertRecordInput<Record<string, unknown>>(input, channel);
  const cancellations = value.cancellationRequests ?? [];
  const additions = value.additionalItems ?? [];
  if (!Array.isArray(cancellations) || cancellations.length > 20_000
    || !Array.isArray(additions) || additions.length > 20_000) throw new IpcValidationError(channel, 'Rückgabeauswahl ist ungültig.');
  return { sourcePackageId: assertString(value.sourcePackageId, channel, 'Ausgangspaket', { minLength: 1, maxLength: 120 }),
    cancellationRequests: cancellations.map((item) => {
      const row = assertRecordInput<Record<string, unknown>>(item, channel);
      return { ref: assertString(row.ref, channel, 'Referenz', { minLength: 1, maxLength: 120 }),
        reason: assertString(row.reason, channel, 'Begründung', { minLength: 3, maxLength: 2000 }) };
    }),
    additionalItems: additions.map((item) => {
      const row = assertRecordInput<Record<string, unknown>>(item, channel);
      const kind = assertString(row.kind, channel, 'Vorgangsart', { minLength: 1, maxLength: 80 });
      if (!isVacationV5PackageSourceKind(kind)) throw new IpcValidationError(channel, 'Vorgangsart ist ungültig.');
      return { kind, localId: assertString(row.localId, channel, 'Vorgang', { minLength: 1, maxLength: 120 }) };
    }) };
}

function returnRequest(input: unknown): VacationV5ReturnExportRequest {
  const channel = IPC_CHANNELS.caseHandoverV5ReturnExport;
  const value = assertRecordInput<Record<string, unknown>>(input, channel);
  const previewDigest = assertString(value.previewDigest, channel, 'bestätigte Rückgabevorschau',
    { minLength: 64, maxLength: 64 });
  if (!/^[0-9a-f]{64}$/.test(previewDigest)) throw new IpcValidationError(channel, 'Rückgabevorschau ist ungültig.');
  return { ...returnSelection(value, channel), ...requestFields(value, channel), previewDigest };
}

async function savePath(channel: string, suggestedFileName: unknown, fallback: string): Promise<string | null> {
  const safeName = sanitizeDialogFileName(suggestedFileName, channel, 'Dateiname') ?? fallback;
  const result = await dialog.showSaveDialog({ title: 'Verschlüsseltes Format-5-Paket speichern',
    defaultPath: safeName.endsWith('.gsbvtransfer') ? safeName : `${safeName}.gsbvtransfer`,
    buttonLabel: 'Paket speichern', filters: [{ name: 'Gremia.SBV Übergabe', extensions: ['gsbvtransfer'] }] });
  return result.canceled ? null : result.filePath ?? null;
}

export function registerVacationV5FileIpc(ipcMain: IpcMain, services: ApplicationServices): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5Candidates, async (_event, expiresAt: unknown) =>
    services.vacationV5().listCandidates(assertString(expiresAt, IPC_CHANNELS.caseHandoverV5Candidates,
      'Vertretungsende', { minLength: 1, maxLength: 60 })));

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5Preview, async (_event, input: unknown) =>
    services.vacationV5().previewExport(selectionRequest(input, IPC_CHANNELS.caseHandoverV5Preview)));

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5Export, async (_event, input: unknown, suggestedName?: unknown) => {
    const request = exportRequest(input);
    if (services.vacationV5().previewExport(request).digest !== request.previewDigest) {
      throw new IpcValidationError(IPC_CHANNELS.caseHandoverV5Export, 'Auswahl weicht von der bestätigten Vorschau ab.');
    }
    const targetPath = await savePath(IPC_CHANNELS.caseHandoverV5Export, suggestedName, 'urlaubsvertretung-format-5.gsbvtransfer');
    if (!targetPath) return { exported: false };
    const capabilities = services.transferRecipientProfiles().createCapability(request.profileId,
      services.transferIdentity().getPrivateIdentity(), app.getVersion()).capabilities;
    const result = await services.vacationV5().exportToFile({ ...request, capabilities, targetPath });
    return { exported: true, filePath: targetPath, ...result };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5Import, async (_event, fileToken: unknown, passphrase: unknown, packageId: unknown) => {
    const filePath = resolveSelectedFileCapability(fileToken, SELECTED_FILE_PURPOSE.caseHandover,
      IPC_CHANNELS.caseHandoverV5Import);
    return services.vacationV5().importFromFile(filePath,
      assertString(passphrase, IPC_CHANNELS.caseHandoverV5Import, 'Transport-Passphrase', { minLength: 0, maxLength: 500 }),
      assertString(packageId, IPC_CHANNELS.caseHandoverV5Import, 'bestätigte Paketkennung', { minLength: 1, maxLength: 130 }));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5Review, async (_event, fileToken: unknown, passphrase: unknown) => {
    const filePath = resolveSelectedFileCapability(fileToken, SELECTED_FILE_PURPOSE.caseHandover,
      IPC_CHANNELS.caseHandoverV5Review);
    return services.vacationV5().reviewFromFile(filePath,
      assertString(passphrase, IPC_CHANNELS.caseHandoverV5Review, 'Transport-Passphrase', { minLength: 0, maxLength: 500 }));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5ReturnExport,
    async (_event, input: unknown, suggestedName?: unknown) => {
      const request = returnRequest(input);
      if (services.vacationV5Return().previewExport(request as Parameters<ReturnType<ApplicationServices['vacationV5Return']>['previewExport']>[0]).digest
        !== request.previewDigest) throw new IpcValidationError(IPC_CHANNELS.caseHandoverV5ReturnExport,
          'Rückgabe weicht von der bestätigten Vorschau ab.');
      const targetPath = await savePath(IPC_CHANNELS.caseHandoverV5ReturnExport, suggestedName,
        'rueckgabe-format-5.gsbvtransfer');
      if (!targetPath) return { exported: false };
      const capabilities = services.transferRecipientProfiles().createCapability(request.profileId,
        services.transferIdentity().getPrivateIdentity(), app.getVersion()).capabilities;
      const result = await services.vacationV5Return().exportToFile({ ...request,
        additionalItems: request.additionalItems as Parameters<ReturnType<ApplicationServices['vacationV5Return']>['exportToFile']>[0]['additionalItems'],
        capabilities, targetPath });
      return { exported: true, filePath: targetPath, ...result };
    });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5ReturnPackages, async () =>
    services.vacationV5Return().listReturnPackages());

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5ReturnInventory, async (_event, sourcePackageId: unknown) =>
    services.vacationV5Return().reviewExportInventory(assertString(sourcePackageId,
      IPC_CHANNELS.caseHandoverV5ReturnInventory, 'Ausgangspaket', { minLength: 1, maxLength: 120 })));

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5ReturnPreviewExport, async (_event, input: unknown) =>
    services.vacationV5Return().previewExport(returnSelection(input, IPC_CHANNELS.caseHandoverV5ReturnPreviewExport)));
}
