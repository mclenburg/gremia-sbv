import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BackupService } from '../services/backupService';

const PASSPHRASE = 'GremiaSBV-Backup-Release-Check-2026!';

type DbStub = {
  prepare: (sql: string) => { get: () => { value: string } | undefined };
  pragma: () => void;
};

function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

function createSecurityStub(dataDir: string) {
  const db: DbStub = {
    prepare: () => ({ get: () => ({ value: '0044' }) }),
    pragma: () => undefined,
  };
  return {
    getDataDirectory: () => dataDir,
    getActiveDatabase: () => db,
    lock: () => undefined,
  };
}

const RELEASE_DOMAIN_SENTINEL = JSON.stringify({
  schemaVersion: '0044',
  requiredTables: [
    'activity_journal_entries',
    'activity_journal_links',
    'sbv_participation_violations',
    'sbv_participation_violation_events',
    'sbv_participation_violation_documents',
    'generated_documents'
  ]
});

function writeReleaseVaultFixture(dataDir: string): void {
  mkdirSync(path.join(dataDir, 'documents', 'case-42'), { recursive: true });
  mkdirSync(path.join(dataDir, 'documents', 'generated'), { recursive: true });
  mkdirSync(path.join(dataDir, 'tmp'), { recursive: true });
  mkdirSync(path.join(dataDir, 'backups'), { recursive: true });
  writeFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), RELEASE_DOMAIN_SENTINEL);
  writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify({ version: 4 }));
  writeFileSync(path.join(dataDir, 'vault-manifest.json'), JSON.stringify({ version: 3, check: 'release' }));
  writeFileSync(path.join(dataDir, 'documents', 'case-42', 'attest.gsbvdoc'), 'encrypted-document-container');
  writeFileSync(path.join(dataDir, 'documents', 'generated', 'participation-violation.gsbvdoc'), 'encrypted-participation-violation-document');
  writeFileSync(path.join(dataDir, 'tmp', 'must-not-restore.txt'), 'tmp');
  writeFileSync(path.join(dataDir, 'backups', 'nested.gsbvbackup'), 'nested');
}

function assertRestoredFile(dataDir: string, relativePath: string, expectedContent: string): void {
  const content = readFileSync(path.join(dataDir, relativePath), 'utf8');
  if (content !== expectedContent) {
    throw new Error(`Restore-Inhalt weicht ab: ${relativePath}`);
  }
}

function main(): void {
  const root = mkdtempSync(path.join(tmpdir(), 'gremia-sbv-backup-restore-release-'));
  const dataDir = path.join(root, 'vault');
  const backupDir = path.join(root, 'out');
  const backupFile = path.join(backupDir, 'release-check.gsbvbackup');

  try {
    mkdirSync(dataDir, { recursive: true });
    mkdirSync(backupDir, { recursive: true });
    writeReleaseVaultFixture(dataDir);

    const originalDocumentHash = sha256(readFileSync(path.join(dataDir, 'documents', 'case-42', 'attest.gsbvdoc')));
    const service = new BackupService(createSecurityStub(dataDir) as never);
    const backup = service.createBackup(backupFile, PASSPHRASE);
    if (!backup.ok) throw new Error(`Backup fehlgeschlagen: ${backup.error}`);

    const inspection = service.inspectBackup(backupFile, PASSPHRASE);
    if (!inspection.ok) throw new Error(`Backup-Inspektion fehlgeschlagen: ${inspection.error}`);
    const paths = inspection.files?.map((file) => file.relativePath) ?? [];
    for (const required of ['gremia-sbv.vault.sqlite', 'security.json', 'vault-manifest.json', 'documents/case-42/attest.gsbvdoc', 'documents/generated/participation-violation.gsbvdoc']) {
      if (!paths.includes(required)) throw new Error(`Pflichtdatei fehlt im Backup-Manifest: ${required}`);
    }
    if (paths.some((entry) => entry.startsWith('tmp/') || entry.startsWith('backups/'))) {
      throw new Error('Backup enthaelt temporaere oder verschachtelte Backup-Dateien.');
    }

    rmSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), { force: true });
    rmSync(path.join(dataDir, 'documents'), { recursive: true, force: true });
    writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify({ tampered: true }));

    const restored = service.restoreBackup(backupFile, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN');
    if (!restored.ok) throw new Error(`Restore fehlgeschlagen: ${restored.error}`);

    assertRestoredFile(dataDir, 'gremia-sbv.vault.sqlite', RELEASE_DOMAIN_SENTINEL);
    const restoredVault = readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8');
    for (const table of JSON.parse(RELEASE_DOMAIN_SENTINEL).requiredTables as string[]) {
      if (!restoredVault.includes(table)) throw new Error(`Domain-Tabelle fehlt im wiederhergestellten Vault-Sentinel: ${table}`);
    }
    assertRestoredFile(dataDir, 'documents/case-42/attest.gsbvdoc', 'encrypted-document-container');
    assertRestoredFile(dataDir, 'documents/generated/participation-violation.gsbvdoc', 'encrypted-participation-violation-document');
    const restoredDocumentHash = sha256(readFileSync(path.join(dataDir, 'documents', 'case-42', 'attest.gsbvdoc')));
    if (restoredDocumentHash !== originalDocumentHash) throw new Error('Dokumentcontainer wurde nicht bitgleich wiederhergestellt.');
    if (!existsSync(path.join(dataDir, 'tmp'))) throw new Error('Restore hat den tmp-Arbeitsordner nicht wieder angelegt.');
    if (!existsSync(path.join(dataDir, 'backups'))) throw new Error('Restore hat den backups-Arbeitsordner nicht wieder angelegt.');

    console.log('Backup-/Restore-Release-Check OK: Tresor, Manifest und Dokumentcontainer wiederhergestellt.');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

main();
