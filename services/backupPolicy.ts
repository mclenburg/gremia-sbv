import { createHash } from 'node:crypto';
import path from 'node:path';
import { normalizeStoragePath, shouldIncludePathInBackup } from './documentStoragePolicy.js';

export const REQUIRED_BACKUP_FILES = ['gremia-sbv.vault.sqlite', 'security.json', 'vault-manifest.json'] as const;

export interface BackupManifestFileLike {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
}

export interface BackupManifestValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function backupSha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function isSafeBackupRelativePath(relativePath: string): boolean {
  const normalized = normalizeStoragePath(relativePath);
  if (!normalized || normalized.includes('\0')) return false;
  if (path.isAbsolute(normalized) || normalized.startsWith('../') || normalized.includes('/../')) return false;
  return shouldIncludePathInBackup(normalized);
}

export function validateBackupManifestFiles(files: BackupManifestFileLike[]): BackupManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const normalized = normalizeStoragePath(file.relativePath);
    if (!isSafeBackupRelativePath(normalized)) {
      errors.push(`Unsicherer oder ausgeschlossener Pfad im Backup: ${file.relativePath}`);
      continue;
    }
    if (seen.has(normalized)) errors.push(`Doppelter Dateieintrag im Backup: ${normalized}`);
    seen.add(normalized);
    if (!file.sha256 || !/^[a-f0-9]{64}$/i.test(file.sha256)) errors.push(`Ungültige SHA-256-Prüfsumme: ${normalized}`);
    if (!Number.isFinite(file.sizeBytes) || file.sizeBytes < 0) errors.push(`Ungültige Dateigröße: ${normalized}`);
  }

  for (const required of REQUIRED_BACKUP_FILES) {
    if (!seen.has(required)) errors.push(`Pflichtdatei fehlt im Backup: ${required}`);
  }

  if (!files.some((file) => normalizeStoragePath(file.relativePath).startsWith('documents/'))) {
    warnings.push('Backup enthält keinen Dokumentenspeicher. Das kann bei leerem Bestand korrekt sein.');
  }

  return { ok: errors.length === 0, errors, warnings };
}
