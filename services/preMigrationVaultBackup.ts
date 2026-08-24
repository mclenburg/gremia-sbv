import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, copyFile, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';

export interface PreMigrationVaultBackupResult {
  filePath: string;
  sizeBytes: number;
  sha256: string;
}

function hasExistingApplicationSchema(db: DatabaseAdapter): boolean {
  const row = db.prepare<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM sqlite_master
    WHERE type IN ('table', 'view')
      AND name NOT LIKE 'sqlite_%'
      AND name NOT IN ('schema_migrations', 'schema_migration_log')
  `).get();
  return (row?.count ?? 0) > 0;
}

function hasMigration(db: DatabaseAdapter, version: string): boolean {
  const migrationTable = db.prepare<{ found: number }>(`
    SELECT 1 AS found FROM sqlite_master
    WHERE type = 'table' AND name = 'schema_migrations'
  `).get();
  if (!migrationTable?.found) return false;
  return Boolean(db.prepare<{ version: string }>(
    'SELECT version FROM schema_migrations WHERE version = ?',
  ).get(version));
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

export async function createVerifiedPreMigrationVaultBackup(input: {
  db: DatabaseAdapter;
  vaultPath: string;
  backupDirectory: string;
  migrationVersion: string;
  now?: Date;
}): Promise<PreMigrationVaultBackupResult | undefined> {
  if (!hasExistingApplicationSchema(input.db) || hasMigration(input.db, input.migrationVersion)) {
    return undefined;
  }

  try {
    input.db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // Der Tresor nutzt regulär journal_mode=DELETE; dann existiert kein WAL zum Checkpointen.
  }

  await mkdir(input.backupDirectory, { recursive: true, mode: 0o700 });
  await chmod(input.backupDirectory, 0o700);
  const filename = [
    'pre-migration',
    input.migrationVersion,
    safeTimestamp(input.now ?? new Date()),
    randomBytes(4).toString('hex'),
  ].join('-') + '.vault.sqlite';
  const filePath = path.join(input.backupDirectory, filename);

  try {
    await copyFile(input.vaultPath, filePath);
    await chmod(filePath, 0o600);
    const [sourceStat, backupStat, sourceHash, backupHash] = await Promise.all([
      stat(input.vaultPath),
      stat(filePath),
      sha256File(input.vaultPath),
      sha256File(filePath),
    ]);
    if (sourceStat.size === 0 || sourceStat.size !== backupStat.size || sourceHash !== backupHash) {
      throw new Error('Die Sicherung vor der Datenbankmigration konnte nicht bytegenau verifiziert werden.');
    }
    return { filePath, sizeBytes: backupStat.size, sha256: backupHash };
  } catch (error) {
    await rm(filePath, { force: true }).catch(() => undefined);
    throw error;
  }
}
