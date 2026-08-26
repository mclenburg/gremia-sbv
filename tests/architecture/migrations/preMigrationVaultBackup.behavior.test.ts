import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { createVerifiedPreMigrationVaultBackup } from '../../../services/preMigrationVaultBackup';
import { isOwnerOnlyFileMode, posixModeBits, supportsPosixPermissionBits } from '../../../services/secureFilePermissions';

class MigrationStateDatabase implements DatabaseAdapter {
  constructor(
    private readonly applicationTableCount: number,
    private readonly appliedVersions: ReadonlySet<string>,
  ) {}

  prepare<T>(sql: string) {
    return {
      all: (..._params: unknown[]) => [] as T[],
      get: (...params: unknown[]) => {
        if (sql.includes('COUNT(*) AS count')) return { count: this.applicationTableCount } as T;
        if (sql.includes("name = 'schema_migrations'")) return { found: 1 } as T;
        if (sql.includes('SELECT version FROM schema_migrations')) {
          const version = String(params[0]);
          return (this.appliedVersions.has(version) ? { version } : undefined) as T | undefined;
        }
        return undefined;
      },
      run: (..._params: unknown[]) => undefined,
    };
  }

  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-pre-migration-'));
  temporaryDirectories.push(root);
  const vaultPath = path.join(root, 'gremia-sbv.vault.sqlite');
  const backupDirectory = path.join(root, 'backups');
  const encryptedVaultBytes = Buffer.from('SQLCipher-verschluesselter-Testtresor-0051');
  fs.writeFileSync(vaultPath, encryptedVaultBytes, { mode: 0o600 });
  return { vaultPath, backupDirectory, encryptedVaultBytes };
}

describe('verifizierte Sicherung vor Migration 0052', () => {
  it('erstellt vor einer ausstehenden Migration eine bytegleiche, nur für den Benutzer lesbare Kopie', async () => {
    const files = fixture();
    const result = await createVerifiedPreMigrationVaultBackup({
      db: new MigrationStateDatabase(12, new Set(['0051'])),
      vaultPath: files.vaultPath,
      backupDirectory: files.backupDirectory,
      migrationVersion: '0052',
      now: new Date('2026-08-24T12:00:00.000Z'),
    });

    expect(result).toBeDefined();
    expect(fs.readFileSync(result!.filePath)).toEqual(files.encryptedVaultBytes);
    expect(fs.statSync(result!.filePath).isFile()).toBe(true);
    if (supportsPosixPermissionBits()) expect(isOwnerOnlyFileMode(posixModeBits(result!.filePath))).toBe(true);
  });

  it('legt für einen bereits migrierten oder noch leeren Tresor keine unnötige Kopie an', async () => {
    const files = fixture();
    const current = await createVerifiedPreMigrationVaultBackup({
      db: new MigrationStateDatabase(12, new Set(['0052'])),
      vaultPath: files.vaultPath,
      backupDirectory: files.backupDirectory,
      migrationVersion: '0052',
    });
    const fresh = await createVerifiedPreMigrationVaultBackup({
      db: new MigrationStateDatabase(0, new Set()),
      vaultPath: files.vaultPath,
      backupDirectory: files.backupDirectory,
      migrationVersion: '0052',
    });

    expect(current).toBeUndefined();
    expect(fresh).toBeUndefined();
    expect(fs.existsSync(files.backupDirectory)).toBe(false);
  });
});
