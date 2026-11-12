import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { CaseHandoverService } from '../../../../services/caseHandoverService';
import { MigrationService } from '../../../../services/migrationService';
import { TransferInstanceIdentityService } from '../../../../services/transferInstanceIdentityService';
import { openTestDatabase } from '../../../helpers/openTestDatabase';

let source: DatabaseAdapter;
let target: DatabaseAdapter;
let temporaryRoot: string;

async function migratedDatabase(): Promise<DatabaseAdapter> {
  const database = await openTestDatabase();
  new MigrationService(database, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
  return database;
}

beforeEach(async () => {
  source = await migratedDatabase();
  target = await migratedDatabase();
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-sbv-key-only-handover-'));
});

afterEach(() => {
  source.close();
  target.close();
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

function insertSourceCase(): void {
  const timestamp = '2026-09-06T08:00:00.000Z';
  source.prepare(`
    INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      summary, is_pseudonymized, is_locked, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).run('case-key-only-1', 'SBV-2026-P3', 'P3 Übergabeakte', 'sonstiges', 'offen', 'normal', timestamp, 'Sachstand für Vertretung', timestamp, timestamp);
}

describe('Fallübergabe mit öffentlichem Empfängerschlüssel', () => {
  it('exportiert und importiert zielgebunden ohne gemeinsame Transport-Passphrase', async () => {
    insertSourceCase();
    const packagePath = path.join(temporaryRoot, 'key-only.gsbvtransfer');
    const targetIdentity = new TransferInstanceIdentityService(target).getPublicIdentity();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const exported = await new CaseHandoverService(source, () => path.join(temporaryRoot, 'source-data')).exportToFile({
      caseIds: ['case-key-only-1'],
      passphrase: '',
      targetRecipientToken: targetIdentity.recipientToken,
      protectionMode: 'recipient_key_only',
      expiresAt,
      purpose: 'Urlaubsvertretung ohne geteilte Passphrase',
    }, packagePath);

    expect(exported).toMatchObject({
      exported: true,
      protectionMode: 'recipient_key_only',
      targetInstanceId: targetIdentity.instanceId,
    });
    const envelope = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as { version: number; crypto: { kdf: string; kdfParams?: unknown }; recipientBinding: { scheme: string } };
    expect(envelope.crypto.kdf).toBe('hkdf-sha256');
    expect(envelope.crypto.kdfParams).toBeUndefined();
    expect(envelope.recipientBinding.scheme).toBe('x25519-hkdf-sha256');

    const targetService = new CaseHandoverService(target, () => path.join(temporaryRoot, 'target-data'));
    const inspection = targetService.inspect(packagePath, '');
    expect(inspection).toMatchObject({
      valid: true,
      protectionMode: 'recipient_key_only',
      legacyImportConfirmationRequired: false,
    });

    const imported = await targetService.importFromFile({
      filePath: packagePath,
      passphrase: '',
      mode: 'create_new',
    });
    expect(imported.createdCaseIds).toHaveLength(1);
    expect(target.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM cases').get()?.count).toBe(1);
  });

  it('exportiert Urlaubsvertretungen auf Wunsch im ersten zielgebundenen Format für ältere Instanzen', async () => {
    insertSourceCase();
    const packagePath = path.join(temporaryRoot, 'legacy-target.gsbvtransfer');
    const targetIdentity = new TransferInstanceIdentityService(target).getPublicIdentity();
    const exported = await new CaseHandoverService(source, () => path.join(temporaryRoot, 'source-data')).exportToFile({
      caseIds: ['case-key-only-1'],
      passphrase: 'Transport-Passphrase für ältere Instanz',
      targetRecipientToken: targetIdentity.recipientToken,
      protectionMode: 'passphrase_and_recipient_key',
      targetFormatVersion: 2,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, packagePath);

    const envelope = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as { version: number; crypto: { kdf: string }; recipientBinding: { scheme: string } };
    expect(envelope.version).toBe(2);
    expect(envelope.crypto.kdf).toBe('scrypt');
    expect(envelope.recipientBinding.scheme).toBe('x25519-scrypt-hkdf-sha256');
    expect(exported.formatVersion).toBe(2);

    const recipient = new CaseHandoverService(target, () => path.join(temporaryRoot, 'target-data'));
    expect(recipient.inspect(packagePath, 'Transport-Passphrase für ältere Instanz')).toMatchObject({ valid: true, integrity: { formatVersion: 2 } });
    const imported = await recipient.importFromFile({
      filePath: packagePath,
      passphrase: 'Transport-Passphrase für ältere Instanz',
      mode: 'create_new',
      allowLegacyPackage: true,
    });
    expect(imported.createdCaseIds).toHaveLength(1);
    await expect(new CaseHandoverService(source).exportToFile({
      caseIds: ['case-key-only-1'], passphrase: '', targetRecipientToken: targetIdentity.recipientToken,
      protectionMode: 'recipient_key_only', targetFormatVersion: 2,
    }, path.join(temporaryRoot, 'invalid.gsbvtransfer'))).rejects.toThrow(/Passphrase|Schutzart/);
  });
});
