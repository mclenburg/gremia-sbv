import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { CaseHandoverService } from '../../../../services/caseHandoverService';
import { encryptCaseHandoverPayloadV2 } from '../../../../services/caseHandoverCrypto';
import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_VERSION } from '../../../../services/caseHandoverPolicy';

class SqliteAdapter implements DatabaseAdapter {
  constructor(private readonly database: DatabaseSync) {}

  prepare<T = unknown>(sql: string) {
    const statement = this.database.prepare(sql);
    return {
      all: (...params: unknown[]) => statement.all(...params as []) as T[],
      get: (...params: unknown[]) => statement.get(...params as []) as T | undefined,
      run: (...params: unknown[]) => statement.run(...params as []),
    };
  }

  exec(sql: string): void {
    this.database.exec(sql);
  }

  pragma(sql: string): unknown {
    return this.database.exec(`PRAGMA ${sql}`);
  }

  close(): void {
    this.database.close();
  }
}

function openDatabase(): { raw: DatabaseSync; database: DatabaseAdapter } {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  return { raw, database: new SqliteAdapter(raw) };
}

const tempRoots: string[] = [];

function createTransferFile(): { filePath: string; passphrase: string; dataDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-transfer-p0-'));
  tempRoots.push(root);
  const filePath = path.join(root, 'falluebergabe.gsbvtransfer');
  const dataDir = path.join(root, 'data');
  const passphrase = 'lange Transport-Passphrase 0.9.8';
  const packageId = 'handover_privacy_review';
  const createdAt = '2026-09-03T08:00:00.000Z';
  const payload = {
    format: CASE_HANDOVER_FORMAT,
    version: CASE_HANDOVER_VERSION,
    packageId,
    createdAt,
    expiresAt: '2026-09-30T21:59:59.000Z',
    purpose: 'Urlaubsvertretung',
    cases: [{
      ref: 'case_1',
      data: {
        id: 'source-case-1',
        case_number: 'SBV-2026-42',
        display_name: 'Muster, Maya',
        category: 'bem',
        status: 'offen',
        priority: 'normal',
        opened_at: '2026-08-20T08:00:00.000Z',
        closed_at: null,
        summary: 'laufendes BEM',
        is_pseudonymized: 0,
        protected_person_id: 'source-person-1',
        person_binding_state: 'active',
      },
    }],
    protectedPersons: [{
      ref: 'person_1',
      data: {
        id: 'source-person-1',
        record_kind: 'identified_person',
        first_name: 'Maya',
        last_name: 'Muster',
        personnel_number: 'P-42',
        work_email: 'maya.muster@example.invalid',
        organizational_unit: 'Produktion',
        location: 'Werk 1',
        employment_state: 'active_employee',
        protection_status: 'severely_disabled',
        status_source: 'employer_list',
        lifecycle_state: 'active',
      },
    }],
    notes: [],
    measures: [],
    measureNotes: [],
    deadlines: [],
    documents: [],
  };
  const envelope = encryptCaseHandoverPayloadV2({
    payloadText: JSON.stringify(payload),
    passphrase,
    packageId,
    createdAt,
    expiresAt: payload.expiresAt,
  });
  fs.writeFileSync(filePath, JSON.stringify(envelope), { mode: 0o600 });
  return { filePath, passphrase, dataDir };
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('Fallübergabe-Import Datenschutzfolge 0.9.8', () => {
  it('markiert importierte Übergabeakten als Datenschutzprüfung und hält das Audit datensparsam', async () => {
    const { database, raw } = openDatabase();
    const transfer = createTransferFile();
    const service = new CaseHandoverService(database, () => transfer.dataDir);

    const result = await service.importFromFile({
      filePath: transfer.filePath,
      passphrase: transfer.passphrase,
      mode: 'create_new',
    });

    expect(result.createdCaseIds).toHaveLength(1);
    expect(result.privacyReviewCaseIds).toEqual(result.createdCaseIds);

    const importedCase = database.prepare<{ privacy_review_required: number; privacy_review_reason: string; handover_status: string }>(
      'SELECT privacy_review_required, privacy_review_reason, handover_status FROM cases WHERE id = ?'
    ).get(result.createdCaseIds[0]);
    expect(importedCase).toEqual({
      privacy_review_required: 1,
      privacy_review_reason: 'handover_imported',
      handover_status: 'active',
    });

    const reviewCount = database.prepare<{ value: number }>(
      "SELECT COUNT(*) AS value FROM privacy_review_items WHERE case_id = ? AND reason = 'handover_imported' AND status = 'open'"
    ).get(result.createdCaseIds[0])?.value;
    expect(reviewCount).toBe(1);

    const auditMetadata = database.prepare<{ metadata_json: string }>(
      "SELECT metadata_json FROM personal_data_audit_log WHERE subject_type = 'case_handover' ORDER BY sequence DESC LIMIT 1"
    ).get()?.metadata_json ?? '';
    expect(auditMetadata).toContain('handover_privacy_review');
    expect(auditMetadata).not.toMatch(/Maya|Muster|P-42|BEM|Produktion|example/i);

    raw.close();
  });

  it('verweigert serverseitig das Zusammenführen bei echten Identitätskonflikten', async () => {
    const { database, raw } = openDatabase();
    const transfer = createTransferFile();
    const now = '2026-09-03T08:30:00.000Z';
    database.prepare(`
      INSERT INTO protected_persons (
        id, created_at, updated_at, first_name, last_name, employment_state, protection_status, status_source, lifecycle_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('local-person-conflict', now, now, 'Erika', 'Beispiel', 'active_employee', 'severely_disabled', 'manual', 'active');
    database.prepare(`
      INSERT INTO cases (
        id, case_number, display_name, category, status, priority, opened_at, is_pseudonymized, is_locked,
        created_at, updated_at, protected_person_id, person_binding_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('local-case-conflict', 'SBV-2026-42', 'Beispiel, Erika', 'bem', 'offen', 'normal', now, 0, 0, now, now, 'local-person-conflict', 'active');

    const service = new CaseHandoverService(database, () => transfer.dataDir);

    await expect(service.importFromFile({
      filePath: transfer.filePath,
      passphrase: transfer.passphrase,
      mode: 'merge_existing',
      targetCaseId: 'local-case-conflict',
    })).rejects.toThrow(/echte Konflikte/i);

    const importedCount = database.prepare<{ value: number }>(
      "SELECT COUNT(*) AS value FROM case_handover_imports WHERE package_id = 'handover_privacy_review'"
    ).get()?.value;
    expect(importedCount).toBe(0);

    raw.close();
  });
});
