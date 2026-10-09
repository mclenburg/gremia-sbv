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
  const anchorPath = path.join(root, 'audit-integrity.anchor');
  const encryptedAnchorBytes = Buffer.from('verschluesselter-audit-anker');
  fs.writeFileSync(vaultPath, encryptedVaultBytes, { mode: 0o600 });
  fs.writeFileSync(anchorPath, encryptedAnchorBytes, { mode: 0o600 });
  return { vaultPath, anchorPath, backupDirectory, encryptedVaultBytes, encryptedAnchorBytes };
}

describe('verifizierte Sicherung vor jeder ausstehenden Migration', () => {
  it('erstellt vor einer ausstehenden Migration eine bytegleiche, nur für den Benutzer lesbare Kopie', async () => {
    const files = fixture();
    const result = await createVerifiedPreMigrationVaultBackup({
      db: new MigrationStateDatabase(12, new Set(['0051'])),
      vaultPath: files.vaultPath,
      anchorPath: files.anchorPath,
      backupDirectory: files.backupDirectory,
      migrationVersions: ['0052', '0060'],
      now: new Date('2026-08-24T12:00:00.000Z'),
    });

    expect(result).toBeDefined();
    expect(fs.readFileSync(result!.filePath)).toEqual(files.encryptedVaultBytes);
    expect(fs.readFileSync(result!.anchorFilePath!)).toEqual(files.encryptedAnchorBytes);
    expect(fs.statSync(result!.filePath).isFile()).toBe(true);
    if (supportsPosixPermissionBits()) expect(isOwnerOnlyFileMode(posixModeBits(result!.filePath))).toBe(true);
  });

  it('sichert auch nach 0052 vor einer späteren Migration', async () => {
    const files = fixture();
    const result = await createVerifiedPreMigrationVaultBackup({
      db: new MigrationStateDatabase(12, new Set(['0052'])),
      vaultPath: files.vaultPath,
      backupDirectory: files.backupDirectory,
      migrationVersions: ['0052', '0060'],
    });
    expect(result?.filePath).toContain('pre-migration-0060-');
  });

  it('legt für einen bereits migrierten oder noch leeren Tresor keine unnötige Kopie an', async () => {
    const files = fixture();
    const current = await createVerifiedPreMigrationVaultBackup({
      db: new MigrationStateDatabase(12, new Set(['0052', '0060'])),
      vaultPath: files.vaultPath,
      backupDirectory: files.backupDirectory,
      migrationVersions: ['0052', '0060'],
    });
    const fresh = await createVerifiedPreMigrationVaultBackup({
      db: new MigrationStateDatabase(0, new Set()),
      vaultPath: files.vaultPath,
      backupDirectory: files.backupDirectory,
      migrationVersions: ['0052', '0060'],
    });

    expect(current).toBeUndefined();
    expect(fresh).toBeUndefined();
    expect(fs.existsSync(files.backupDirectory)).toBe(false);
  });

  it('behält höchstens drei aktuelle Migrationskopien und löscht keine anderen Backups', async () => {
    const files = fixture();
    fs.mkdirSync(files.backupDirectory);
    const now = new Date();
    for (let index = 0; index < 4; index += 1) {
      const old = path.join(files.backupDirectory, `pre-migration-0052-alt-${index}.vault.sqlite`);
      fs.writeFileSync(old, `alt-${index}`);
      const time = new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000);
      fs.utimesSync(old, time, time);
    }
    const userBackup = path.join(files.backupDirectory, 'mein-backup.gsbvbackup');
    fs.writeFileSync(userBackup, 'behalten');
    await createVerifiedPreMigrationVaultBackup({
      db: new MigrationStateDatabase(12, new Set(['0052'])),
      vaultPath: files.vaultPath,
      backupDirectory: files.backupDirectory,
      migrationVersions: ['0052', '0060'],
      now,
    });
    expect(fs.readdirSync(files.backupDirectory).filter((name) => name.endsWith('.vault.sqlite'))).toHaveLength(3);
    expect(fs.readFileSync(userBackup, 'utf8')).toBe('behalten');
  });
});
