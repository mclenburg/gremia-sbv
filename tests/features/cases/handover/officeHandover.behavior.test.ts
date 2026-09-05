import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { CaseHandoverService } from '../../../../services/caseHandoverService';
import { MigrationService } from '../../../../services/migrationService';
import { RetentionService } from '../../../../services/retentionService';
import { SbvOfficeWorkflowDocumentAdapter } from '../../../../services/sbvOfficeWorkflowDocumentAdapter';
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
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-sbv-office-handover-'));
});

afterEach(() => {
  source.close();
  target.close();
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

function insertCaseWithPrivacyReview(): void {
  const createdAt = '2026-09-01T08:00:00.000Z';
  source.prepare(`
    INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      is_pseudonymized, is_locked, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).run('case-office-1', 'SBV-2026-AMT-1', 'Laufender Amtsvorgang', 'sonstiges', 'offen', 'hoch', createdAt, createdAt, createdAt);
  source.prepare(`
    INSERT INTO privacy_review_items (
      id, case_id, reason, priority, due_at, free_text_review_required,
      context_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, '{}', 'open', ?, ?)
  `).run('privacy-office-1', 'case-office-1', 'retention_due', 'high', '2026-10-01T08:00:00.000Z', createdAt, createdAt);
}

function insertCustomTemplateAndJournal(): void {
  const createdAt = '2026-09-01T08:00:00.000Z';
  source.prepare(`
    INSERT INTO document_templates (
      id, template_key, title, category, description, subject, body,
      legal_basis_json, tags_json, is_system, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', 0, ?, ?)
  `).run('template-office-1', 'betrieb.individuell', 'Betriebliche Vorlage', 'sonstiges', 'Individuelle Vorlage', 'Betreff', 'Text {{signatur}}', createdAt, createdAt);
  source.prepare(`
    INSERT INTO activity_journal_entries (
      id, entry_date, time_mode, category, title, confidentiality_level,
      status, created_from, performed_outside_contract_work_time, created_at, updated_at
    ) VALUES (?, ?, 'none', 'documentation', ?, 'confidential', 'final', 'manual', 0, ?, ?)
  `).run('journal-private-1', '2026-09-01', 'Persönlicher Tätigkeitsnachweis', createdAt, createdAt);
}

async function insertElectionWithDocument(): Promise<void> {
  const createdAt = '2026-08-01T08:00:00.000Z';
  source.prepare(`
    INSERT INTO sbv_elections (
      id, kind, legal_rule_version, status, deputy_count, created_at, updated_at
    ) VALUES (?, 'regular', 'test-rule', 'closed', 1, ?, ?)
  `).run('election-office-1', createdAt, createdAt);
  await new SbvOfficeWorkflowDocumentAdapter(source, path.join(temporaryRoot, 'source-data')).store({
    owner: { type: 'election', id: 'election-office-1' },
    title: 'Wahlniederschrift',
    filename: 'wahlniederschrift.pdf',
    mimeType: 'application/pdf',
    purpose: 'Wahlakte',
    documentClass: 'generated_document',
    plain: Buffer.from('%PDF-1.4\nVollständige Wahlniederschrift', 'utf8'),
  });
}

describe('P2 – Amtsübergabe', () => {
  it('überträgt Amtsbestand und Wahlakte, aber niemals das persönliche Tätigkeitsjournal', async () => {
    insertCaseWithPrivacyReview();
    insertCustomTemplateAndJournal();
    await insertElectionWithDocument();
    new RetentionService(source, () => path.join(temporaryRoot, 'source-data')).updateSettings({
      inactiveOpenCaseMonths: 9,
      moduleRules: { case_file: { kind: 'months_after_completion', months: 48 } },
    });

    const passphrase = 'Produktionsreife Amtsübergabe 0.9.8';
    const packagePath = path.join(temporaryRoot, 'amtsuebergabe.gsbvtransfer');
    const targetIdentity = new TransferInstanceIdentityService(target).getPublicIdentity();
    const sourceService = new CaseHandoverService(source, () => path.join(temporaryRoot, 'source-data'));
    const targetService = new CaseHandoverService(target, () => path.join(temporaryRoot, 'target-data'));

    const exported = await sourceService.exportToFile({
      packageType: 'office_handover',
      caseIds: ['case-office-1'],
      passphrase,
      targetRecipientToken: targetIdentity.recipientToken,
      purpose: 'Amtsübergabe an die gewählte Nachfolge',
    }, packagePath);

    expect(exported).toMatchObject({
      exported: true,
      packageType: 'office_handover',
      officeScope: {
        templateCount: 1,
        electionCount: 1,
        electionDocumentCount: 1,
        privacyReviewCount: 1,
        activityJournalIncluded: false,
      },
    });

    const inspection = targetService.inspect(packagePath, passphrase);
    expect(inspection.packageType).toBe('office_handover');
    expect(inspection.expiresAt).toBeUndefined();
    expect(inspection.officeScope?.activityJournalIncluded).toBe(false);
    expect(inspection.importPlan.officeScopeIncluded).toBe(true);

    const imported = await targetService.importFromFile({
      filePath: packagePath,
      passphrase,
      mode: 'create_new',
      applyOfficeConfiguration: true,
    });

    expect(imported.officeImport).toMatchObject({
      templateCount: 1,
      electionCount: 1,
      electionDocumentCount: 1,
      privacyReviewCount: 1,
    });
    expect(target.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM activity_journal_entries').get()?.count).toBe(0);
    expect(target.prepare<{ count: number }>("SELECT COUNT(*) AS count FROM document_templates WHERE template_key = 'betrieb.individuell'").get()?.count).toBe(1);
    expect(new RetentionService(target, () => path.join(temporaryRoot, 'target-data')).getSettings()).toMatchObject({
      inactiveOpenCaseMonths: 9,
      moduleRules: { case_file: { kind: 'months_after_completion', months: 48 } },
    });

    const importedElection = target.prepare<{ id: string }>('SELECT id FROM sbv_elections').get();
    expect(importedElection?.id).toBeTruthy();
    const importedDocument = target.prepare<{ document_id: string }>(
      "SELECT document_id FROM sbv_workflow_document_links WHERE owner_type = 'election' AND owner_id = ?",
    ).get(importedElection?.id)?.document_id;
    expect(importedDocument).toBeTruthy();
    const document = await new SbvOfficeWorkflowDocumentAdapter(target, path.join(temporaryRoot, 'target-data')).read(importedDocument!);
    expect(document.toString('utf8')).toContain('Vollständige Wahlniederschrift');
    document.fill(0);

    const importedCaseId = imported.createdCaseIds[0];
    expect(target.prepare<{ case_number: string; display_name: string }>('SELECT case_number, display_name FROM cases WHERE id = ?').get(importedCaseId)).toEqual({
      case_number: 'SBV-2026-AMT-1',
      display_name: 'Laufender Amtsvorgang',
    });
    const reasons = target.prepare<{ reason: string }>(
      "SELECT reason FROM privacy_review_items WHERE case_id = ? AND status = 'open' ORDER BY reason",
    ).all(importedCaseId).map((row) => row.reason);
    expect(reasons).toEqual(['handover_imported', 'retention_due']);
  });

  it('rollt Datenbank und neu geschriebene Dokumentcontainer gemeinsam zurück', async () => {
    insertCaseWithPrivacyReview();
    insertCustomTemplateAndJournal();
    await insertElectionWithDocument();
    target.exec(`
      CREATE TRIGGER reject_imported_privacy_review
      BEFORE INSERT ON privacy_review_items
      BEGIN
        SELECT RAISE(ABORT, 'simulierter Importfehler');
      END;
    `);

    const passphrase = 'Atomare Amtsübergabe 0.9.8';
    const packagePath = path.join(temporaryRoot, 'amtsuebergabe-rollback.gsbvtransfer');
    const targetData = path.join(temporaryRoot, 'target-data');
    const targetIdentity = new TransferInstanceIdentityService(target).getPublicIdentity();
    await new CaseHandoverService(source, () => path.join(temporaryRoot, 'source-data')).exportToFile({
      packageType: 'office_handover',
      caseIds: ['case-office-1'],
      passphrase,
      targetRecipientToken: targetIdentity.recipientToken,
    }, packagePath);

    await expect(new CaseHandoverService(target, () => targetData).importFromFile({
      filePath: packagePath,
      passphrase,
      mode: 'create_new',
      applyOfficeConfiguration: true,
    })).rejects.toThrow();

    expect(target.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM cases').get()?.count).toBe(0);
    expect(target.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM sbv_elections').get()?.count).toBe(0);
    const electionDirectory = path.join(targetData, 'office', 'election');
    expect(fs.existsSync(electionDirectory) ? fs.readdirSync(electionDirectory) : []).toEqual([]);
  });
});
