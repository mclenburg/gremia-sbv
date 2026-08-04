import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { IpcValidationError } from './ipcValidation.js';
import {
  ApplicationError,
  type ApplicationErrorCode,
  type ApplicationErrorPayload,
} from '../../src/app/core/models/application-error.model.js';

const IPC_ERROR_PREFIX = 'GREMIA_SBV_APPLICATION_ERROR:';

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return 'Die angeforderte Aktion konnte nicht ausgeführt werden.';
}

function classifyError(error: unknown): ApplicationErrorCode {
  if (error instanceof ApplicationError) return error.code;
  if (error instanceof IpcValidationError) return 'VALIDATION_FAILED';
  if (error instanceof Error && (error.name === 'ActivityReportIntegrityError' || error.name === 'DomainAggregateIntegrityError')) {
    return 'DATABASE_INTEGRITY_FAILED';
  }
  if (error instanceof Error && error.name === 'GremiaBrHttpError') return 'SECURITY_OPERATION_FAILED';
  const message = messageOf(error).toLowerCase();
  if (/valid|ungültig|erforderlich|muss|darf nicht|format|eingabe/.test(message)) return 'VALIDATION_FAILED';
  if (/nicht gefunden|not found|existiert nicht/.test(message)) return 'NOT_FOUND';
  if (/integrität|integrity|hashchain|hash-chain|verwaist|foreign key/.test(message)) return 'DATABASE_INTEGRITY_FAILED';
  if (/audit|protokoll.*fehl|hash.*schreib/.test(message)) return 'AUDIT_WRITE_FAILED';
  if (/migration|schema/.test(message)) return 'MIGRATION_FAILED';
  if (/export|bericht|pdf|ical|docx/.test(message)) return 'EXPORT_FAILED';
  if (/datei|file|pfad|path|verzeichnis|directory/.test(message)) return 'FILE_OPERATION_FAILED';
  if (/passwort|entsperr|vault|tresor|security|verschlüssel/.test(message)) return 'SECURITY_OPERATION_FAILED';
  if (/berechtigung|permission|verweigert|forbidden/.test(message)) return 'PERMISSION_DENIED';
  if (/bereits|konflikt|conflict|doppelt/.test(message)) return 'CONFLICT';
  return 'UNEXPECTED_ERROR';
}

export function normalizeApplicationError(error: unknown, operation: string): ApplicationError {
  if (error instanceof ApplicationError) {
    return error.operation ? error : new ApplicationError(error.code, error.message, operation, { cause: error });
  }
  return new ApplicationError(classifyError(error), messageOf(error), operation, { cause: error });
}

export function serializeApplicationError(error: unknown, operation: string): string {
  const payload: ApplicationErrorPayload = normalizeApplicationError(error, operation).toPayload();
  return `${IPC_ERROR_PREFIX}${JSON.stringify(payload)}`;
}

type RegisteredIpcHandler<Args extends unknown[], Result> = (
  event: IpcMainInvokeEvent,
  ...args: Args
) => Result | Promise<Result>;

function assertIpcArgumentCount(
  channel: string,
  args: readonly unknown[],
  maximumArgumentCount: number,
): void {
  if (args.length > maximumArgumentCount) {
    throw new IpcValidationError(
      channel,
      `zu viele Argumente (erwartet höchstens ${maximumArgumentCount}, erhalten ${args.length})`,
    );
  }
}

export function registerIpcHandler<Args extends unknown[], Result>(
  ipcMain: IpcMain,
  channel: string,
  handler: RegisteredIpcHandler<Args, Result>,
): void {
  const maximumArgumentCount = Math.max(0, handler.length - 1);

  ipcMain.handle(channel, async (event, ...args) => {
    try {
      assertIpcArgumentCount(channel, args, maximumArgumentCount);
      return await Reflect.apply(handler, undefined, [event, ...args]);
    } catch (error) {
      throw new Error(serializeApplicationError(error, channel));
    }
  });
}

export { IPC_ERROR_PREFIX };
