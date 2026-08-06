import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { IpcChannel } from './channels.js';
import { IPC_ENDPOINT_CONTRACTS } from './contracts.js';
import { IpcValidationError } from './ipcValidation.js';
import { IPC_ERROR_PREFIX } from './errorProtocol.js';
export { issueSelectedFileCapability, resolveSelectedFileInput } from './selectedFileCapability.js';
import {
  ApplicationError,
  type ApplicationErrorCode,
  type ApplicationErrorPayload,
} from '../../src/app/core/models/application-error.model.js';


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
  const rawMessage = messageOf(error);
  if (/(?:^|[^a-z0-9])(?:sqlite|sqlcipher|internal|secret|private)[a-z0-9_:-]*\s*=|\/private\/|\\private\\/i.test(rawMessage)) {
    return 'UNEXPECTED_ERROR';
  }
  const message = rawMessage.toLowerCase();
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

function rendererSafeMessage(code: ApplicationErrorCode, originalMessage: string): string {
  switch (code) {
    case "UNEXPECTED_ERROR":
      return "Die angeforderte Aktion konnte nicht ausgeführt werden.";
    case "FILE_OPERATION_FAILED":
      return "Die Dateioperation konnte nicht sicher ausgeführt werden.";
    case "SECURITY_OPERATION_FAILED":
      return "Die Sicherheitsoperation konnte nicht ausgeführt werden.";
    case "DATABASE_INTEGRITY_FAILED":
      return "Die Datenintegrität konnte nicht bestätigt werden.";
    case "AUDIT_WRITE_FAILED":
      return "Die Protokollierung konnte nicht sicher abgeschlossen werden.";
    case "MIGRATION_FAILED":
      return "Die Datenaktualisierung konnte nicht abgeschlossen werden.";
    default:
      return originalMessage;
  }
}

export function normalizeApplicationError(error: unknown, operation: string): ApplicationError {
  if (error instanceof ApplicationError) {
    const safeMessage = rendererSafeMessage(error.code, error.message);
    return new ApplicationError(error.code, safeMessage, error.operation ?? operation, { cause: error });
  }
  const code = classifyError(error);
  return new ApplicationError(code, rendererSafeMessage(code, messageOf(error)), operation, { cause: error });
}

export function serializeApplicationError(error: unknown, operation: string): string {
  const payload: ApplicationErrorPayload = normalizeApplicationError(error, operation).toPayload();
  return `${IPC_ERROR_PREFIX}${JSON.stringify(payload)}`;
}


function assertAllowedSender(event: IpcMainInvokeEvent, channel: string): void {
  const senderUrl = event.senderFrame?.url;
  if (!senderUrl) {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
    throw new IpcValidationError(channel, "Aufruf ohne nachweisbaren Anwendungskontext.");
  }
  let parsed: URL;
  try { parsed = new URL(senderUrl); } catch { throw new IpcValidationError(channel, "Aufruf aus einem ungültigen Anwendungskontext."); }
  const localDevelopment = parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname) && ["5173", "5174"].includes(parsed.port);
  if (parsed.protocol !== "file:" && !localDevelopment) {
    throw new IpcValidationError(channel, "Aufruf aus einem nicht erlaubten Anwendungskontext.");
  }
}

function assertSerializableResult(value: unknown, channel: string): void {
  try { structuredClone(value); } catch {
    throw new ApplicationError("UNEXPECTED_ERROR", "Die Antwort konnte nicht sicher übertragen werden.", channel);
  }
}

type RegisteredIpcHandler<Args extends unknown[], Result> = (
  event: IpcMainInvokeEvent,
  ...args: Args
) => Result | Promise<Result>;

function assertIpcArgumentCount(
  channel: IpcChannel,
  args: readonly unknown[],
): void {
  const expectedArgumentCount = IPC_ENDPOINT_CONTRACTS[channel]?.arguments.length;
  if (expectedArgumentCount === undefined || args.length !== expectedArgumentCount) {
    throw new IpcValidationError(
      channel,
      `falsche Argumentanzahl (erwartet ${expectedArgumentCount ?? "registriert"}, erhalten ${args.length})`,
    );
  }
}

export function registerIpcHandler<Args extends unknown[], Result>(
  ipcMain: IpcMain,
  channel: IpcChannel,
  handler: RegisteredIpcHandler<Args, Result>,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      assertAllowedSender(event, channel);
      assertIpcArgumentCount(channel, args);
      const result = await Reflect.apply(handler, undefined, [event, ...args]);
      assertSerializableResult(result, channel);
      return result;
    } catch (error) {
      throw new Error(serializeApplicationError(error, channel));
    }
  });
}

export { IPC_CHANNELS } from "./channels.js";
export { IPC_ERROR_PREFIX };
