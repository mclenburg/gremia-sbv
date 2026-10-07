import path from 'node:path';

export function normalizeStoragePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function isTemporaryStoragePath(relativePath: string): boolean {
  const normalized = normalizeStoragePath(relativePath);
  return normalized === 'tmp' || normalized.startsWith('tmp/') || normalized.includes('/tmp/');
}

function isBackupStoragePath(relativePath: string): boolean {
  const normalized = normalizeStoragePath(relativePath);
  return normalized === 'backups' || normalized.startsWith('backups/');
}

export function shouldIncludePathInBackup(relativePath: string): boolean {
  const normalized = normalizeStoragePath(relativePath);
  if (!normalized || normalized.startsWith('../') || path.isAbsolute(normalized)) return false;
  if (isTemporaryStoragePath(normalized) || isBackupStoragePath(normalized)) return false;
  return true;
}
