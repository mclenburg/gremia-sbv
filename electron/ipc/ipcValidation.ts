import path from "node:path";

export class IpcValidationError extends Error {
  readonly channel: string;

  constructor(channel: string, message: string) {
    super(`Ungültige Eingabe für ${channel}: ${message}`);
    this.name = "IpcValidationError";
    this.channel = channel;
  }
}

export type PlainObject = Record<string, unknown>;

function fail(channel: string, message: string): never {
  throw new IpcValidationError(channel, message);
}

export function assertPlainObject(
  value: unknown,
  channel: string,
  label = "Eingabe",
): PlainObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(channel, `${label} muss ein Objekt sein.`);
  }
  return value as PlainObject;
}

export function assertString(
  value: unknown,
  channel: string,
  label: string,
  options: { minLength?: number; maxLength?: number } = {},
): string {
  if (typeof value !== "string") {
    fail(channel, `${label} muss Text sein.`);
  }
  const minLength = options.minLength ?? 0;
  const maxLength = options.maxLength ?? 20_000;
  if (value.length < minLength) {
    fail(channel, `${label} ist zu kurz.`);
  }
  if (value.length > maxLength) {
    fail(channel, `${label} ist zu lang.`);
  }
  return value;
}

export function assertOptionalString(
  value: unknown,
  channel: string,
  label: string,
  options: { maxLength?: number } = {},
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return assertString(value, channel, label, {
    minLength: 0,
    maxLength: options.maxLength ?? 20_000,
  });
}

export function assertBoolean(
  value: unknown,
  channel: string,
  label: string,
): boolean {
  if (typeof value !== "boolean") {
    fail(channel, `${label} muss wahr oder falsch sein.`);
  }
  return value;
}

export function assertOptionalBoolean(
  value: unknown,
  channel: string,
  label: string,
  defaultValue: boolean,
): boolean {
  if (value === undefined || value === null) return defaultValue;
  return assertBoolean(value, channel, label);
}

export function assertOptionalPositiveInteger(
  value: unknown,
  channel: string,
  label: string,
  options: { defaultValue?: number; max?: number } = {},
): number | undefined {
  if (value === undefined || value === null) return options.defaultValue;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    fail(channel, `${label} muss eine positive ganze Zahl sein.`);
  }
  const max = options.max ?? 500;
  if (value > max) {
    fail(channel, `${label} ist zu groß.`);
  }
  return value;
}

export function assertOptionalObject<T = PlainObject>(
  value: unknown,
  channel: string,
  label: string,
): T | undefined {
  if (value === undefined || value === null) return undefined;
  return assertPlainObject(value, channel, label) as T;
}

export function assertRecordInput<T>(
  value: unknown,
  channel: string,
  label = "Eingabe",
): T {
  return assertPlainObject(value, channel, label) as T;
}

export function sanitizeDialogFileName(
  value: unknown,
  channel: string,
  label: string,
): string | undefined {
  const raw = assertOptionalString(value, channel, label, { maxLength: 180 });
  if (!raw) return undefined;
  const baseName = path.basename(raw).replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!baseName || baseName === "." || baseName === "..") {
    fail(channel, `${label} ist kein gültiger Dateiname.`);
  }
  return baseName;
}

export function assertAllowedEnum<T extends string>(
  value: unknown,
  channel: string,
  label: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(channel, `${label} hat keinen zulässigen Wert.`);
  }
  return value as T;
}

export function ensurePathInside(
  filePath: string,
  root: string,
  channel: string,
  label = "Dateipfad",
): string {
  const resolvedFile = path.resolve(filePath);
  const resolvedRoot = path.resolve(root);
  const relative = path.relative(resolvedRoot, resolvedFile);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(channel, `${label} liegt außerhalb des erlaubten Gremia.SBV-Bereichs.`);
  }
  return resolvedFile;
}

export function assertExtension(
  filePath: string,
  channel: string,
  allowedExtensions: readonly string[],
): string {
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, "");
  if (!allowedExtensions.includes(ext)) {
    fail(channel, `Dateityp .${ext || "<ohne>"} ist nicht zulässig.`);
  }
  return filePath;
}

export function safeIpcError(error: unknown): Error {
  if (error instanceof IpcValidationError) return error;
  if (error instanceof Error) return error;
  return new Error(String(error));
}
