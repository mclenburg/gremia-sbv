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

    const exported = await new CaseHandoverService(source, () => path.join(temporaryRoot, 'source-data')).exportToFile({
      caseIds: ['case-key-only-1'],
      passphrase: '',
      targetRecipientToken: targetIdentity.recipientToken,
      protectionMode: 'recipient_key_only',
      expiresAt: '2026-10-01T21:59:59.000Z',
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
});
