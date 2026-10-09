import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { OWNER_ONLY_DIRECTORY_MODE, restrictDirectoryToOwner, restrictFileToOwner } from './secureFilePermissions.js';

export interface PreMigrationVaultBackupResult {
  filePath: string;
  anchorFilePath?: string;
  sizeBytes: number;
  sha256: string;
}

const MAX_RETAINED_MIGRATION_BACKUPS = 3;
const MAX_MIGRATION_BACKUP_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MIGRATION_BACKUP_NAME = /^pre-migration-\d{4}-.*\.vault\.sqlite$/;

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
  anchorPath?: string;
  backupDirectory: string;
  migrationVersions: readonly string[];
  now?: Date;
}): Promise<PreMigrationVaultBackupResult | undefined> {
  if (!hasExistingApplicationSchema(input.db)) {
    return undefined;
  }
  const pending = input.migrationVersions.filter((version) => /^\d{4}$/.test(version) && !hasMigration(input.db, version));
  if (pending.length === 0) return undefined;
  const migrationVersion = pending.sort().at(-1)!;

  try {
    input.db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // Der Tresor nutzt regulär journal_mode=DELETE; dann existiert kein WAL zum Checkpointen.
  }

  await mkdir(input.backupDirectory, { recursive: true, mode: OWNER_ONLY_DIRECTORY_MODE });
  await restrictDirectoryToOwner(input.backupDirectory);
  const filename = [
    'pre-migration',
    migrationVersion,
    safeTimestamp(input.now ?? new Date()),
    randomBytes(4).toString('hex'),
  ].join('-') + '.vault.sqlite';
  const filePath = path.join(input.backupDirectory, filename);
  const anchorFilePath = input.anchorPath && existsSync(input.anchorPath) ? `${filePath}.anchor` : undefined;

  try {
    await copyFile(input.vaultPath, filePath);
    await restrictFileToOwner(filePath);
    if (anchorFilePath && input.anchorPath) {
      await copyFile(input.anchorPath, anchorFilePath);
      await restrictFileToOwner(anchorFilePath);
      const [sourceAnchorHash, backupAnchorHash] = await Promise.all([
        sha256File(input.anchorPath), sha256File(anchorFilePath)
      ]);
      if (sourceAnchorHash !== backupAnchorHash) throw new Error('Die Audit-Ankerkopie konnte nicht verifiziert werden.');
    }
    const [sourceStat, backupStat, sourceHash, backupHash] = await Promise.all([
      stat(input.vaultPath),
      stat(filePath),
      sha256File(input.vaultPath),
      sha256File(filePath),
    ]);
    if (sourceStat.size === 0 || sourceStat.size !== backupStat.size || sourceHash !== backupHash) {
      throw new Error('Die Sicherung vor der Datenbankmigration konnte nicht bytegenau verifiziert werden.');
    }
    const candidates = (await readdir(input.backupDirectory))
      .filter((name) => MIGRATION_BACKUP_NAME.test(name))
      .map(async (name) => ({ name, details: await stat(path.join(input.backupDirectory, name)) }));
    const existing = (await Promise.all(candidates))
      .filter((entry) => entry.details.isFile())
      .sort((left, right) => right.details.mtimeMs - left.details.mtimeMs);
    const referenceTime = (input.now ?? new Date()).getTime();
    for (const [index, entry] of existing.entries()) {
      if (entry.name === filename) continue;
      if (index >= MAX_RETAINED_MIGRATION_BACKUPS || referenceTime - entry.details.mtimeMs > MAX_MIGRATION_BACKUP_AGE_MS) {
        await rm(path.join(input.backupDirectory, entry.name), { force: true });
        await rm(path.join(input.backupDirectory, `${entry.name}.anchor`), { force: true });
      }
    }
    return { filePath, anchorFilePath, sizeBytes: backupStat.size, sha256: backupHash };
  } catch (error) {
    await rm(filePath, { force: true }).catch(() => undefined);
    if (anchorFilePath) await rm(anchorFilePath, { force: true }).catch(() => undefined);
    throw error;
  }
}
