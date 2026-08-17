import type { IpcRenderer } from "electron";
import type { ApplicationErrorCode, ApplicationErrorPayload } from "../../src/domain/models/application-error.model.js";
import type { IpcChannel } from "../ipc/channels.js";
import { IPC_ENDPOINT_CONTRACTS, type IpcArgumentKind } from "../ipc/contracts.js";
import { IPC_ERROR_PREFIX } from "../ipc/errorProtocol.js";

export class RendererApplicationError extends Error {
  readonly name = "RendererApplicationError";
  constructor(readonly code: ApplicationErrorCode, message: string, readonly operation?: string, options?: { cause?: unknown }) { super(message, options); }
}

export function parseApplicationErrorPayload(message: string): ApplicationErrorPayload | null {
  const markerIndex = message.indexOf(IPC_ERROR_PREFIX);
  if (markerIndex < 0) return null;
  try {
    const parsed: unknown = JSON.parse(message.slice(markerIndex + IPC_ERROR_PREFIX.length));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const payload = parsed as Record<string, unknown>;
    if (typeof payload.code !== "string" || typeof payload.message !== "string") return null;
    if (payload.operation !== undefined && typeof payload.operation !== "string") return null;
    return { code: payload.code as ApplicationErrorCode, message: payload.message, ...(typeof payload.operation === "string" ? { operation: payload.operation } : {}) };
  } catch { return null; }
}

function isStructuredCloneSafe(value: unknown): boolean {
  try { structuredClone(value); return true; } catch { return false; }
}

function isAbsolutePath(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.startsWith("/")
    || value.startsWith("\\")
    || /^[A-Za-z]:[\\/]/.test(value);
}

function containsRendererControlledPath(value: unknown, key = ""): boolean {
  if (isAbsolutePath(value) && /(?:^|_)(?:file)?path$|directory$|folder$/i.test(key)) return true;
  if (Array.isArray(value)) return value.some((entry) => containsRendererControlledPath(entry, key));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>)
    .some(([entryKey, entryValue]) => containsRendererControlledPath(entryValue, entryKey));
}


function matchesArgumentKind(value: unknown, kind: IpcArgumentKind): boolean {
  const optional = kind.startsWith("optional-");
  if (optional && (value === undefined || value === null)) return true;
  const requiredKind = optional ? kind.slice("optional-".length) : kind;
  switch (requiredKind) {
    case "string": return typeof value === "string";
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "boolean": return typeof value === "boolean";
    case "array": return Array.isArray(value);
    case "record": return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    case "unknown": return true;
    default: return false;
  }
}

export function validateIpcInvocation(channel: IpcChannel, args: readonly unknown[]): void {
  const contract = IPC_ENDPOINT_CONTRACTS[channel];
  if (!contract) throw new RendererApplicationError("VALIDATION_FAILED", "Für diese Aktion fehlt ein IPC-Vertrag.", channel);
  if (args.length !== contract.arguments.length) {
    throw new RendererApplicationError("VALIDATION_FAILED", "Die Anzahl der Eingaben entspricht nicht dem IPC-Vertrag.", channel);
  }
  for (let index = 0; index < contract.arguments.length; index += 1) {
    if (!matchesArgumentKind(args[index], contract.arguments[index])) {
      throw new RendererApplicationError("VALIDATION_FAILED", `Eingabe ${index + 1} entspricht nicht dem IPC-Schema.`, channel);
    }
  }
  if (!isStructuredCloneSafe(args)) {
    throw new RendererApplicationError("VALIDATION_FAILED", "Die Eingabe kann nicht sicher übertragen werden.", channel);
  }
  if (contract.rejectsAbsoluteRendererPaths && args.some((argument) => isAbsolutePath(argument) || containsRendererControlledPath(argument))) {
    throw new RendererApplicationError("VALIDATION_FAILED", "Dateipfade dürfen nicht direkt aus der Oberfläche übergeben werden.", channel);
  }
}

export type IpcInvoker = <T = never>(channel: IpcChannel, ...args: unknown[]) => Promise<T>;

export function createIpcInvoker(ipcRenderer: Pick<IpcRenderer, "invoke">): IpcInvoker {
  return async <T = never>(channel: IpcChannel, ...args: unknown[]): Promise<T> => {
    validateIpcInvocation(channel, args);
    try {
      const result: unknown = await ipcRenderer.invoke(channel, ...args);
      if (!isStructuredCloneSafe(result)) throw new RendererApplicationError("UNEXPECTED_ERROR", "Die Antwort der Anwendung konnte nicht sicher übertragen werden.", channel);
      return result as T;
    } catch (error) {
      if (error instanceof RendererApplicationError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      const payload = parseApplicationErrorPayload(message);
      if (payload) throw new RendererApplicationError(payload.code, payload.message, payload.operation, { cause: error });
      throw new RendererApplicationError("UNEXPECTED_ERROR", "Die angeforderte Aktion konnte nicht ausgeführt werden.", channel, { cause: error });
    }
  };
}
