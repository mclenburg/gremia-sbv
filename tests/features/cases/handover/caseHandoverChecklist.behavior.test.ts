import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { CaseHandoverChecklistService } from '../../../../services/caseHandoverChecklistService';
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
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-sbv-handover-checklist-'));
});

afterEach(() => {
  source.close();
  target.close();
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

function insertCaseWithOpenReviewItems(): void {
  const timestamp = '2026-09-06T08:00:00.000Z';
  source.prepare(`
    INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      summary, is_pseudonymized, is_locked, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).run('case-checklist-1', 'SBV-2026-P3-CHECK', 'Übergabe mit Prüfpunkten', 'sonstiges', 'offen', 'normal', timestamp, 'Sachstand', timestamp, timestamp);
  source.prepare(`
    INSERT INTO deadlines (
      id, case_id, process_type, deadline_type, title, due_at, status, created_at, updated_at
    ) VALUES (?, ?, 'case', 'follow_up', ?, ?, 'open', ?, ?)
  `).run('deadline-checklist-1', 'case-checklist-1', 'Rückmeldung prüfen', '2099-10-01T08:00:00.000Z', timestamp, timestamp);
  source.prepare(`
    INSERT INTO privacy_review_items (
      id, case_id, reason, priority, due_at, status, created_at, updated_at
    ) VALUES (?, ?, 'handover_imported', 'high', ?, 'open', ?, ?)
  `).run('privacy-checklist-1', 'case-checklist-1', '2099-10-02T08:00:00.000Z', timestamp, timestamp);
}

describe('Fallübergabe P3 – assistierte Übergabe-Checkliste', () => {
  it('verweigert Exporte mit prüfpflichtigen Inhalten ohne bewusste Bestätigung', async () => {
    insertCaseWithOpenReviewItems();
    const checklist = new CaseHandoverChecklistService(source).build({
      packageType: 'vacation_handover',
      caseIds: ['case-checklist-1'],
      expiresAt: '2099-10-03T21:59:59.000Z',
    });

    expect(checklist.blockingItemIds).toEqual([]);
    expect(checklist.requiredAcknowledgementIds).toEqual(['open_deadlines', 'open_privacy_reviews']);

    const targetIdentity = new TransferInstanceIdentityService(target).getPublicIdentity();
    const service = new CaseHandoverService(source, () => path.join(temporaryRoot, 'source-data'));
    await expect(service.exportToFile({
      caseIds: ['case-checklist-1'],
      expiresAt: '2099-10-03T21:59:59.000Z',
      passphrase: 'lange Passphrase fuer Checkliste',
      targetRecipientToken: targetIdentity.recipientToken,
    }, path.join(temporaryRoot, 'blocked.gsbvtransfer'))).rejects.toThrow('Übergabe-Checkliste bestätigen');

    const exported = await service.exportToFile({
      caseIds: ['case-checklist-1'],
      expiresAt: '2099-10-03T21:59:59.000Z',
      passphrase: 'lange Passphrase fuer Checkliste',
      targetRecipientToken: targetIdentity.recipientToken,
      checklist: { version: 1, acknowledgedItemIds: checklist.requiredAcknowledgementIds },
    }, path.join(temporaryRoot, 'confirmed.gsbvtransfer'));

    expect(exported.exported).toBe(true);
    expect(exported.deadlineCount).toBe(1);
  });
});
