import type { IpcMain } from 'electron';
import type { ApplicationServices } from '../applicationServices.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertAllowedEnum, assertRecordInput, assertString, IpcValidationError } from './ipcValidation.js';
import { resolveSelectedFileCapability, SELECTED_FILE_PURPOSE } from './selectedFileCapability.js';
import type { VacationV5ReturnChoice, VacationV5ReturnImportInput } from '../../src/domain/transfer/vacationV5ReturnReview.js';

function validateV5ReturnChoices(input: unknown): VacationV5ReturnChoice[] {
  if (!Array.isArray(input) || !input.length || input.length > 20_000) {
    throw new IpcValidationError('caseHandover:v5:return:import', 'Bitte alle Rückgabeänderungen einzeln entscheiden.');
  }
  return input.map((candidate) => {
    const item = assertRecordInput<Record<string, unknown>>(candidate, 'caseHandover:v5:return:import');
    const ref = assertString(item.ref, 'caseHandover:v5:return:import', 'Rückgabereferenz',
      { minLength: 1, maxLength: 120 });
    const action = assertAllowedEnum<VacationV5ReturnChoice['action']>(item.action,
      'caseHandover:v5:return:import', 'Entscheidung',
      ['accept_update', 'accept_conflict_update', 'accept_addition', 'keep_origin', 'acknowledge_cancellation']);
    const hash = item.expectedOriginSha256;
    if (hash !== null && (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash))) {
      throw new IpcValidationError('caseHandover:v5:return:import', 'Die bestätigte Ursprungsfassung ist ungültig.');
    }
    return { ref, action, expectedOriginSha256: hash };
  });
}

export function registerVacationV5ReturnIpc(ipcMain: IpcMain, services: ApplicationServices): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5ReturnReview,
    async (_event, fileToken: unknown, passphrase: unknown) => {
      const filePath = resolveSelectedFileCapability(fileToken, SELECTED_FILE_PURPOSE.caseHandover,
        'caseHandover:v5:return:review');
      return services.vacationV5Return().reviewFromFile(filePath,
        assertString(passphrase, 'caseHandover:v5:return:review', 'Transport-Passphrase', { minLength: 0, maxLength: 500 }));
    });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverV5ReturnImport, async (_event, input: unknown) => {
    const value = assertRecordInput<VacationV5ReturnImportInput>(input, 'caseHandover:v5:return:import');
    const filePath = resolveSelectedFileCapability(value.filePath, SELECTED_FILE_PURPOSE.caseHandover,
      'caseHandover:v5:return:import');
    const passphrase = assertString(value.passphrase, 'caseHandover:v5:return:import',
      'Transport-Passphrase', { minLength: 0, maxLength: 500 });
    return services.vacationV5Return().importConfirmedFromFile(filePath, passphrase,
      validateV5ReturnChoices(value.choices));
  });
}
