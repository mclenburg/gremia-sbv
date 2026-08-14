import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseService, type DatabaseAdapter } from '../../../services/databaseService';
import { MigrationService } from '../../../services/migrationService';
import { DeadlineService } from '../../../services/deadlineService';
import { buildGlobalDeadlineInput } from '../../../src/app/shared/textCommands/globalTextCommandActions';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages: Record<string, { version?: string; dependencies?: Record<string, string> }>;
};



type SqlCipherConstructor = new (filename: string) => DatabaseAdapter;
const compatibilityDirs: string[] = [];

afterEach(() => {
  while (compatibilityDirs.length) rmSync(compatibilityDirs.pop()!, { recursive: true, force: true });
});

async function createSqlCipherV4Fixture(databasePath: string, keyHex: string): Promise<void> {
  const loaded = await import('better-sqlite3-multiple-ciphers');
  const candidate = (loaded as { default?: unknown }).default ?? loaded;
  if (typeof candidate !== 'function') throw new Error('SQLCipher-Testtreiber konnte nicht geladen werden.');
  const db = new (candidate as SqlCipherConstructor)(databasePath);
  try {
    db.pragma("cipher='sqlcipher'");
    db.pragma('cipher_compatibility = 4');
    db.pragma(`key = "x'${keyHex}'"`);
    db.exec('CREATE TABLE legacy_probe (id TEXT PRIMARY KEY, value TEXT NOT NULL);');
    db.prepare('INSERT INTO legacy_probe (id, value) VALUES (?, ?)').run('before-upgrade', 'Altbestand');
  } finally {
    db.close();
  }
}



async function openMigratedDatabase(databasePath: string, keyHex: string): Promise<{ runtime: DatabaseService; db: DatabaseAdapter }> {
  const runtime = new DatabaseService();
  const db = await runtime.open(databasePath, keyHex);
  new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
  return { runtime, db };
}

function majorOf(versionOrRange: string | undefined): number | null {
  const match = versionOrRange?.match(/^(?:[~^>=<\s]*)(\d+)\./);
  return match ? Number(match[1]) : null;
}

describe('Electron-/SQLCipher-Kompatibilitätsvertrag', () => {
  it('kombiniert Electron 43+ nur mit der Node-API-basierten SQLCipher-Treiberlinie 13+', () => {
    const electronRange = packageJson.devDependencies?.electron;
    const lockedElectron = packageLock.packages['node_modules/electron'];

    const sqlcipherRange = packageJson.dependencies?.['better-sqlite3-multiple-ciphers'];
    const lockedSqlcipher = packageLock.packages['node_modules/better-sqlite3-multiple-ciphers'];

    expect(majorOf(electronRange)).toBeGreaterThanOrEqual(43);
    expect(majorOf(sqlcipherRange)).toBeGreaterThanOrEqual(13);
    expect(majorOf(lockedElectron?.version)).toBeGreaterThanOrEqual(43);
    expect(majorOf(lockedSqlcipher?.version)).toBeGreaterThanOrEqual(13);
    expect(lockedSqlcipher?.dependencies?.['node-addon-api']).toBeDefined();
  });

  it('richtet die TypeScript-Node-Typen an der Node-24-Laufzeit von Electron und Build aus', () => {
    expect(majorOf(packageJson.devDependencies?.['@types/node'])).toBe(24);
    expect(majorOf(packageLock.packages['node_modules/@types/node']?.version)).toBe(24);
  });

  it('öffnet einen bestehenden SQLCipher-v4-Datenbestand, schreibt weiter und öffnet ihn erneut', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'gremia-sqlcipher-compat-'));
    compatibilityDirs.push(directory);
    const databasePath = path.join(directory, 'gremia-sbv.sqlite3');
    const keyHex = '31'.repeat(32);
    await createSqlCipherV4Fixture(databasePath, keyHex);

    const firstRuntime = new DatabaseService();
    const firstDb = await firstRuntime.open(databasePath, keyHex);
    expect(firstDb.prepare<{ value: string }>('SELECT value FROM legacy_probe WHERE id = ?').get('before-upgrade')?.value).toBe('Altbestand');
    firstDb.prepare('INSERT INTO legacy_probe (id, value) VALUES (?, ?)').run('after-upgrade', 'Neuer Lauf');
    firstRuntime.close();

    const secondRuntime = new DatabaseService();
    const secondDb = await secondRuntime.open(databasePath, keyHex);
    expect(secondDb.prepare<{ id: string }>('SELECT id FROM legacy_probe ORDER BY id').all().map((row) => row.id)).toEqual(['after-upgrade', 'before-upgrade']);
    secondRuntime.close();

    const wrongKeyRuntime = new DatabaseService();
    await expect(wrongKeyRuntime.open(databasePath, '32'.repeat(32))).rejects.toThrow();
  });

  it('persistiert eine per globalem //-Kurzbefehl angelegte Frist über Schließen und erneutes Öffnen der verschlüsselten Datenbank', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'gremia-deadline-persist-'));
    compatibilityDirs.push(directory);
    const databasePath = path.join(directory, 'gremia-sbv.sqlite3');
    const keyHex = '41'.repeat(32);
    const title = 'Persistente Kurzbefehlsfrist';
    const input = buildGlobalDeadlineInput({ kind: 'deadline', title, dueAt: '2026-08-20T10:30', severity: 'critical' });

    const first = await openMigratedDatabase(databasePath, keyHex);
    const created = new DeadlineService(first.db).create(input);
    expect(created.title).toBe(title);
    expect(new DeadlineService(first.db).list().some((deadline) => deadline.id === created.id)).toBe(true);
    first.runtime.close();

    const second = await openMigratedDatabase(databasePath, keyHex);
    const persisted = new DeadlineService(second.db).list().find((deadline) => deadline.id === created.id);
    expect(persisted).toMatchObject({ title, dueAt: new Date('2026-08-20T10:30').toISOString(), status: 'open' });
    second.runtime.close();
  });

  it('rollt eine Fristanlage vollständig zurück, wenn ein verpflichtender Audit-Schritt nach dem INSERT scheitert', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'gremia-deadline-rollback-'));
    compatibilityDirs.push(directory);
    const databasePath = path.join(directory, 'gremia-sbv.sqlite3');
    const keyHex = '42'.repeat(32);
    const opened = await openMigratedDatabase(databasePath, keyHex);
    const service = new DeadlineService(opened.db);
    opened.db.exec('DROP TABLE deadline_audit');

    expect(() => service.create(buildGlobalDeadlineInput({
      kind: 'deadline', title: 'Darf nicht teilweise gespeichert werden', dueAt: '2026-08-21T09:00', severity: 'important',
    }))).toThrow();
    expect(opened.db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM deadlines').get()?.count).toBe(0);
    opened.runtime.close();
  });

  it('nutzt den npm-11-sicheren Wrapper explizit im Build und nicht mehr als postinstall-Seiteneffekt', () => {
    expect(packageJson.devDependencies?.['@electron/rebuild']).toBeUndefined();
    expect(packageJson.scripts?.postinstall).toBeUndefined();
    expect(packageJson.scripts?.['native:install-app-deps']).toBe('node scripts/install-electron-app-deps.cjs');
    expect(packageJson.scripts?.['native:rebuild:electron']).toBe('node scripts/install-electron-app-deps.cjs');
  });
});
