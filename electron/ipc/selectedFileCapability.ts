import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { IpcValidationError } from './ipcValidation.js';

type SelectedFilePurpose = 'case-handover' | 'person-import';

interface SelectedFileCapability {
  readonly filePath: string;
  readonly purpose: SelectedFilePurpose;
  readonly expiresAt: number;
}

const CAPABILITY_TTL_MS = 30 * 60 * 1000;
const capabilities = new Map<string, SelectedFileCapability>();

function purgeExpired(now = Date.now()): void {
  for (const [token, capability] of capabilities) {
    if (capability.expiresAt <= now) capabilities.delete(token);
  }
}

export function issueSelectedFileCapability(
  filePath: string,
  purpose: SelectedFilePurpose,
): { fileToken: string; fileName: string } {
  purgeExpired();
  const fileToken = `gremia-file:${randomBytes(24).toString('hex')}`;
  capabilities.set(fileToken, {
    filePath: path.resolve(filePath),
    purpose,
    expiresAt: Date.now() + CAPABILITY_TTL_MS,
  });
  return { fileToken, fileName: path.basename(filePath) };
}

export function resolveSelectedFileCapability(
  fileToken: unknown,
  purpose: SelectedFilePurpose,
  channel: string,
): string {
  purgeExpired();
  if (typeof fileToken !== 'string' || !/^gremia-file:[0-9a-f]{48}$/i.test(fileToken)) {
    throw new IpcValidationError(channel, 'Die Dateiauswahl ist ungültig oder abgelaufen. Bitte die Datei erneut auswählen.');
  }
  const capability = capabilities.get(fileToken);
  if (!capability || capability.purpose !== purpose || capability.expiresAt <= Date.now()) {
    capabilities.delete(fileToken);
    throw new IpcValidationError(channel, 'Die Dateiauswahl ist ungültig oder abgelaufen. Bitte die Datei erneut auswählen.');
  }
  return capability.filePath;
}

export function resolveSelectedFileInput<T extends { readonly filePath?: string }>(
  input: T,
  purpose: SelectedFilePurpose,
  channel: string,
): T {
  if (!input.filePath) return input;
  return {
    ...input,
    filePath: resolveSelectedFileCapability(input.filePath, purpose, channel),
  };
}

export function clearSelectedFileCapabilities(): void {
  capabilities.clear();
}
