import { chmodSync, statSync } from 'node:fs';
import { chmod } from 'node:fs/promises';

export const OWNER_ONLY_FILE_MODE = 0o600;
export const OWNER_ONLY_DIRECTORY_MODE = 0o700;

export function supportsPosixPermissionBits(platform: NodeJS.Platform = process.platform): boolean {
  return platform !== 'win32';
}

export function posixModeBits(filePath: string): number {
  return statSync(filePath).mode & 0o777;
}

export function isOwnerOnlyFileMode(mode: number): boolean {
  return (mode & 0o777) === OWNER_ONLY_FILE_MODE;
}

export function isOwnerOnlyDirectoryMode(mode: number): boolean {
  return (mode & 0o777) === OWNER_ONLY_DIRECTORY_MODE;
}

export async function restrictFileToOwner(filePath: string): Promise<void> {
  if (!supportsPosixPermissionBits()) return;
  await chmod(filePath, OWNER_ONLY_FILE_MODE);
}

export function restrictFileToOwnerSync(filePath: string): void {
  if (!supportsPosixPermissionBits()) return;
  chmodSync(filePath, OWNER_ONLY_FILE_MODE);
}

export function restrictDirectoryToOwnerSync(directoryPath: string): void {
  if (!supportsPosixPermissionBits()) return;
  chmodSync(directoryPath, OWNER_ONLY_DIRECTORY_MODE);
}

export async function restrictDirectoryToOwner(directoryPath: string): Promise<void> {
  if (!supportsPosixPermissionBits()) return;
  await chmod(directoryPath, OWNER_ONLY_DIRECTORY_MODE);
}
