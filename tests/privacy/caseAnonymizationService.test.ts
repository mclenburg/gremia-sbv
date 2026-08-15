import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CaseAnonymizationService } from '../../services/caseAnonymizationService';
import { DocumentContainerService } from '../../services/documentContainerService';
import { PersonalDataAuditLogService } from '../../services/auditLogService';
import { PrivacyReviewService } from '../../services/privacyReviewService';
import { REMOVED_FREETEXT_PREFIX, REMOVED_PARTICIPANTS_TEXT } from '../../services/caseAnonymizationPolicy';
import { openTestDatabase } from '../helpers/openTestDatabase';
import type { DatabaseAdapter } from '../../services/databaseService';

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-case-anonymization-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

async function seedCase(db: DatabaseAdapter, dataDir: string, noteContent: string) {
  db.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  new PrivacyReviewService(db).ensureSchema();
  const now = '2026-08-15T12:00:00.000Z';
  db.prepare(`INSERT INTO protected_persons (id, created_at, updated_at, first_name, last_name, protection_status) VALUES ('person-1', ?, ?, 'Max', 'Mustermann', 'severely_disabled')`).run(now, now);
  db.prepare(`INSERT INTO persons (id, first_name, last_name, display_name, created_at, updated_at) VALUES ('legacy-person-1', 'Max', 'Mustermann', 'Max Mustermann', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO contacts (id, first_name, last_name, created_at, updated_at) VALUES ('contact-1', 'Erika', 'Kontakt', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO cases (id, case_number, person_id, display_name, category, opened_at, created_at, updated_at, protected_person_id, person_binding_state, summary) VALUES ('case-1', 'SBV-2026-001', 'legacy-person-1', 'Max Mustermann', 'beratung', ?, ?, ?, 'person-1', 'active', 'Zusammenfassung Max Mustermann')`).run(now, now, now);
  db.prepare(`INSERT INTO person_case_links (id, protected_person_id, case_file_id, link_state, created_at) VALUES ('pcl-1', 'person-1', 'case-1', 'active', ?)`).run(now);
  db.prepare(`INSERT INTO case_contacts (case_id, contact_id, note) VALUES ('case-1', 'contact-1', 'direkter Fallkontakt')`).run();
  db.prepare(`INSERT INTO case_notes (id, case_id, title, note_date, note_type, participants, content, next_steps, created_at, updated_at) VALUES ('note-1', 'case-1', 'Gespräch Max Mustermann', ?, 'gespraech', 'Max Mustermann, Erika Kontakt', ?, 'Nächster Schritt Max', ?, ?)`).run(now, noteContent, now, now);
  db.prepare(`INSERT INTO case_note_cases (note_id, case_id, is_primary, created_at) VALUES ('note-1', 'case-1', 1, ?)`).run(now);
  db.prepare(`INSERT INTO contact_text_references (id, contact_id, source_type, source_id, field_name, matched_text, created_at, updated_at) VALUES ('ctr-1', 'contact-1', 'case_note', 'note-1', 'participants', 'Erika Kontakt', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO bem_processes (id, case_id, participants, created_at, updated_at) VALUES ('bem-1', 'case-1', 'Erika Kontakt', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO bem_process_contacts (process_id, contact_id, created_at) VALUES ('bem-1', 'contact-1', ?)`).run(now);
  db.prepare(`INSERT INTO prevention_processes (id, case_id, hazard_description, created_at, updated_at) VALUES ('prev-1', 'case-1', 'Gefährdung Max Mustermann', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO prevention_process_contacts (process_id, contact_id, created_at) VALUES ('prev-1', 'contact-1', ?)`).run(now);
  db.prepare(`INSERT INTO privacy_review_items (
    id, case_id, protected_person_id, reason, priority, due_at, free_text_review_required, context_json, status, created_at, updated_at
  ) VALUES ('review-1', 'case-1', 'person-1', 'linked_person_anonymized', 'normal', ?, 1, ?, 'open', ?, ?)`).run(
    now,
    JSON.stringify({ person: { id: 'person-1', firstName: 'Max', lastName: 'Mustermann' }, caseFile: { id: 'case-1', displayName: 'Max Mustermann' } }),
    now,
    now,
  );

  const documentService = new DocumentContainerService();
  for (let index = 1; index <= 2; index += 1) {
    const id = `doc-${index}`;
    const plain = Buffer.from(`Dokument ${index} Max Mustermann`, 'utf8');
    const container = await documentService.writeEncryptedContainer({ plain, storageRoot: dataDir, subdirectory: 'documents/case-1', documentId: id, filename: `${id}.txt`, mimeType: 'text/plain' });
    db.prepare(`INSERT INTO case_documents (id, case_id, filename, display_title, mime_type, storage_path, sha256, extracted_text, document_key, iv, auth_tag, size_bytes, contains_health_data, extraction_quality, text_extraction_status, ocr_status, created_at, imported_at) VALUES (?, 'case-1', ?, ?, 'text/plain', ?, ?, ?, ?, ?, ?, ?, 1, 'high', 'completed', 'not_required', ?, ?)`)
      .run(id, `${id}.txt`, `${id}.txt`, container.storagePath, container.sha256, plain.toString('utf8'), container.documentKey, container.iv, container.authTag, plain.length, now, now);
    plain.fill(0);
  }

  const audit = new PersonalDataAuditLogService(db);
  audit.append({ action: 'create', subjectType: 'case', subjectId: 'case-1', caseId: 'case-1', purpose: 'Fallakte angelegt', metadata: { schemaVersion: 1 } });
  return audit;
}

async function seedExtendedCaseData(db: DatabaseAdapter, dataDir: string): Promise<{ generatedPaths: string[] }> {
  const now = '2026-08-15T12:00:00.000Z';
  const pii = 'Max Mustermann Personalnummer 4711';

  db.prepare(`INSERT INTO deadlines (
    id, case_id, person_id, process_type, deadline_type, title, confidential_title, description, due_at,
    legal_basis, source_event, status, completed_note, cancelled_reason, notes, created_at, updated_at
  ) VALUES ('deadline-1', 'case-1', 'legacy-person-1', 'case', 'follow_up', ?, ?, ?, '2026-09-01T10:00:00.000Z', '§ 178 Abs. 2 SGB IX', ?, 'open', ?, ?, ?, ?, ?)`)
    .run(pii, pii, pii, `Protokoll: ${pii}`, pii, pii, pii, now, now);
  db.prepare(`INSERT INTO deadline_audit (id, deadline_id, action, old_value, new_value, reason, created_at) VALUES ('deadline-audit-1', 'deadline-1', 'updated', ?, ?, ?, ?)`)
    .run(JSON.stringify({ title: pii }), JSON.stringify({ title: `${pii} geändert` }), pii, now);

  db.prepare(`UPDATE bem_processes SET title = ?, trigger_description = ?, consent_scope = ?, data_retention_note = ?, participants = ?, measures = ?, measure_owners = ?, result = ?, completion_reason = ?, confidential_notes = ? WHERE id = 'bem-1'`)
    .run(pii, pii, pii, pii, pii, pii, pii, pii, pii, pii);
  db.prepare(`INSERT INTO bem_process_events (id, process_id, event_type, title, description, created_at) VALUES ('bem-event-1', 'bem-1', 'updated', ?, ?, ?)`)
    .run(pii, pii, now);
  db.prepare(`UPDATE prevention_processes SET employer_request_summary = ?, measures = ?, result = ? WHERE id = 'prev-1'`).run(pii, pii, pii);
  db.prepare(`INSERT INTO prevention_process_events (id, process_id, event_type, title, description, created_at) VALUES ('prev-event-1', 'prev-1', 'updated', ?, ?, ?)`)
    .run(pii, pii, now);
  db.prepare(`INSERT INTO equalization_processes (id, case_id, agency_reference, outcome, notes, created_at, updated_at) VALUES ('equal-1', 'case-1', ?, ?, ?, ?, ?)`)
    .run(pii, pii, pii, now, now);
  db.prepare(`INSERT INTO termination_hearings (id, case_id, integration_office_decision, employer_reason, missing_information, sbv_assessment, statement, handover_package_id, handover_status, handover_continue_reason, created_at, updated_at) VALUES ('term-1', 'case-1', ?, ?, ?, ?, ?, 'package-secret', 'continued', ?, ?, ?)`)
    .run(pii, pii, pii, pii, pii, pii, now, now);
  db.prepare(`INSERT INTO sbv_participations (id, case_id, title, violation_summary, sbv_position, next_step, created_at, updated_at) VALUES ('participation-1', 'case-1', ?, ?, ?, ?, ?, ?)`)
    .run(pii, pii, pii, pii, now, now);
  db.prepare(`INSERT INTO sbv_participation_events (id, participation_id, event_type, title, description, created_at) VALUES ('participation-event-1', 'participation-1', 'updated', ?, ?, ?)`)
    .run(pii, pii, now);

  db.prepare(`INSERT INTO case_measures (id, case_id, type, title, summary, next_step, opened_at, handover_package_id, handover_status, handover_continue_reason, created_at, updated_at) VALUES ('measure-1', 'case-1', 'participation', ?, ?, ?, ?, 'measure-package-secret', 'continued', ?, ?, ?)`)
    .run(pii, pii, pii, now, pii, now, now);
  db.prepare(`INSERT INTO case_measure_participation (measure_id, violation_summary, sbv_position, created_at, updated_at) VALUES ('measure-1', ?, ?, ?, ?)`).run(pii, pii, now, now);
  db.prepare(`INSERT INTO case_measure_events (id, measure_id, event_type, title, description, created_at) VALUES ('measure-event-1', 'measure-1', 'updated', ?, ?, ?)`)
    .run(pii, pii, now);
  db.prepare(`INSERT INTO case_measure_workplace_accommodation (measure_id, requested_adjustment, barrier_or_limitation, workplace_context, proposed_solution, outcome, created_at, updated_at) VALUES ('measure-1', ?, ?, ?, ?, ?, ?, ?)`)
    .run(pii, pii, pii, pii, pii, now, now);
  db.prepare(`INSERT INTO case_measure_notes (id, case_id, measure_type, measure_id, title, note_at, participants, content, next_steps, created_at, updated_at) VALUES ('measure-note-1', 'case-1', 'participation', 'measure-1', ?, ?, ?, ?, ?, ?, ?)`)
    .run(pii, now, pii, pii, pii, now, now);

  db.prepare(`INSERT INTO case_note_links (id, case_note_id, target_type, target_id, case_id, label, accessible_label, created_at) VALUES ('note-link-1', 'note-1', 'deadline', 'deadline-1', 'case-1', ?, ?, ?)`)
    .run(`Frist ${pii}`, `Frist ${pii} öffnen`, now);
  db.prepare(`INSERT INTO legal_norms (id, source, paragraph, title, short_text, created_at, updated_at) VALUES ('norm-1', 'SGB IX', '§ 178', 'SBV', 'Beteiligung', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO case_legal_references (id, case_id, legal_norm_id, note, created_at) VALUES ('legal-ref-1', 'case-1', 'norm-1', ?, ?)`).run(pii, now);
  db.prepare(`INSERT INTO document_templates (id, template_key, title, category, subject, body, created_at, updated_at) VALUES ('template-1', 'test', 'Test', 'test', 'Betreff', 'Text', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO template_renders (id, template_id, case_id, subject, body, created_at) VALUES ('render-1', 'template-1', 'case-1', ?, ?, ?)`).run(pii, `${pii} im Schreiben`, now);

  db.prepare(`INSERT INTO activity_journal_entries (id, entry_date, time_mode, category, title, description, result_note, confidentiality_level, status, created_from, created_at, updated_at) VALUES ('journal-1', '2026-08-15', 'none', 'case_work', ?, ?, ?, 'confidential', 'final', 'manual', ?, ?)`)
    .run(pii, pii, pii, now, now);
  db.prepare(`INSERT INTO activity_journal_links (id, entry_id, target_type, target_id, created_at) VALUES ('journal-case-link', 'journal-1', 'case', 'case-1', ?)`).run(now);
  db.prepare(`INSERT INTO activity_journal_links (id, entry_id, target_type, target_id, created_at) VALUES ('journal-person-link', 'journal-1', 'person', 'legacy-person-1', ?)`).run(now);
  db.prepare(`INSERT INTO activity_journal_links (id, entry_id, target_type, target_id, created_at) VALUES ('journal-document-link', 'journal-1', 'document', 'doc-1', ?)`).run(now);

  db.prepare(`INSERT INTO sbv_participation_violations (
    id, stage, status, violation_type, source_context_type, source_context_id, case_id,
    subject, measure_description, wrong_behavior, required_behavior, consequence_warning, created_at, updated_at
  ) VALUES ('violation-1', 'request', 'open', 'not_informed', 'case', 'case-1', 'case-1', ?, ?, ?, ?, ?, ?, ?)`)
    .run(pii, pii, pii, pii, pii, now, now);
  db.prepare(`INSERT INTO sbv_participation_violation_events (id, violation_id, event_type, note, created_at) VALUES ('violation-event-1', 'violation-1', 'created', ?, ?)`).run(pii, now);

  const generatedPlain = Buffer.from(`Erzeugtes Dokument ${pii}`, 'utf8');
  const generated = await new DocumentContainerService().writeEncryptedContainer({
    plain: generatedPlain,
    storageRoot: dataDir,
    subdirectory: 'generated-documents/sbv-participation-violations',
    documentId: 'generated-1',
    filename: 'generated-max.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  generatedPlain.fill(0);
  db.prepare(`INSERT INTO generated_documents (id, case_id, violation_id, document_kind, title, storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at) VALUES ('generated-1', 'case-1', 'violation-1', 'sbv_participation_violation', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(pii, generated.storagePath, generated.filename, generated.mimeType, generated.sha256, generated.documentKey, generated.iv, generated.authTag, generated.sizeBytes, now);
  db.prepare(`INSERT INTO sbv_participation_violation_documents (id, violation_id, document_id, stage, template_key, template_version, created_at) VALUES ('violation-doc-1', 'violation-1', 'generated-1', 'request', 'request', '1', ?)`)
    .run(now);
  db.prepare(`INSERT INTO activity_journal_links (id, entry_id, target_type, target_id, created_at) VALUES ('journal-generated-link', 'journal-1', 'document', 'generated-1', ?)`).run(now);

  const genericPlain = Buffer.from(`Generisches Schreiben ${pii}`, 'utf8');
  const genericGenerated = await new DocumentContainerService().writeEncryptedContainer({
    plain: genericPlain,
    storageRoot: dataDir,
    subdirectory: 'generated-documents/generic',
    documentId: 'generated-2',
    filename: 'generic-max.txt',
    mimeType: 'text/plain',
  });
  genericPlain.fill(0);
  db.prepare(`INSERT INTO generated_documents (id, case_id, document_kind, title, storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at) VALUES ('generated-2', 'case-1', 'generic', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(pii, genericGenerated.storagePath, genericGenerated.filename, genericGenerated.mimeType, genericGenerated.sha256, genericGenerated.documentKey, genericGenerated.iv, genericGenerated.authTag, genericGenerated.sizeBytes, now);

  db.prepare(`INSERT INTO case_external_references (id, case_id, source_type, source_id, title, description, source_url, snapshot_json, fetched_at, created_at, updated_at) VALUES ('external-1', 'case-1', 'protokoll', 'br-person-4711', ?, ?, 'gremia://max-mustermann', ?, ?, ?, ?)`)
    .run(pii, pii, JSON.stringify({ person: pii }), now, now, now);
  db.prepare(`INSERT INTO case_handover_imports (id, package_id, imported_at, status, metadata_json) VALUES ('handover-1', 'handover-package-max', ?, 'active', ?)`).run(now, JSON.stringify({ person: pii }));
  db.prepare(`INSERT INTO case_handover_import_items (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at) VALUES ('handover-case-item', 'handover-1', 'case', 'case-1', 'max-case-ref', ?)`).run(now);
  db.prepare(`INSERT INTO case_handover_import_items (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at) VALUES ('handover-measure-item', 'handover-1', 'case_measure', 'measure-1', 'max-measure-ref', ?)`).run(now);
  db.prepare(`UPDATE cases SET handover_import_id = 'handover-1', handover_package_id = 'handover-package-max', handover_status = 'continued', handover_continue_reason = ? WHERE id = 'case-1'`).run(pii);

  return { generatedPaths: [generated.storagePath, genericGenerated.storagePath] };
}

describe('CaseAnonymizationService', () => {
  it('uses marked-only mode, always removes participants and identity/contact links, replaces uploads with one neutral evidence document and only appends the hash chain', async () => {
    const db = await openTestDatabase();
    const dataDir = tempDir();
    try {
      const audit = await seedCase(db, dataDir, 'Gespräch mit Max Mustermann. [Anonymisierung vormerken: Personalnummer 4711]');
      const chainBefore = db.prepare<Record<string, unknown>>('SELECT * FROM personal_data_audit_log ORDER BY sequence').all();
      const originalPaths = db.prepare<{ storage_path: string }>('SELECT storage_path FROM case_documents WHERE case_id = ?').all('case-1').map((row) => row.storage_path);

      const result = await new CaseAnonymizationService(() => db, () => dataDir).anonymizeCase('case-1', 'Zweck entfallen', 'FALL ANONYMISIEREN', 'marked_free_text');

      expect(result.ok).toBe(true);
      expect(db.prepare<{ protected_person_id: string | null; person_binding_state: string }>('SELECT protected_person_id, person_binding_state FROM cases WHERE id = ?').get('case-1')).toEqual({ protected_person_id: null, person_binding_state: 'anonymized' });
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM person_case_links WHERE case_file_id = ?').get('case-1')?.count).toBe(0);
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_contacts WHERE case_id = ?').get('case-1')?.count).toBe(0);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM bem_process_contacts WHERE process_id = 'bem-1'`).get()?.count).toBe(0);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM prevention_process_contacts WHERE process_id = 'prev-1'`).get()?.count).toBe(0);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM contact_text_references WHERE source_id = 'note-1'`).get()?.count).toBe(0);
      const review = db.prepare<{ protected_person_id: string | null; context_json: string; status: string }>(
        `SELECT protected_person_id, context_json, status FROM privacy_review_items WHERE id = 'review-1'`,
      ).get();
      expect(review).toEqual({ protected_person_id: null, context_json: '{}', status: 'anonymized' });
      expect(review?.context_json).not.toContain('Max Mustermann');

      const note = db.prepare<{ participants: string; content: string }>('SELECT participants, content FROM case_notes WHERE id = ?').get('note-1');
      expect(note?.participants).toBe(REMOVED_PARTICIPANTS_TEXT);
      expect(note?.content).toContain('Gespräch mit Max Mustermann.');
      expect(note?.content).toContain('[anonymisiert]');
      expect(note?.content).not.toContain('Personalnummer 4711');

      const documents = db.prepare<{ extracted_text: string; storage_path: string; document_key: string; iv: string; auth_tag: string; sha256: string }>(
        'SELECT extracted_text, storage_path, document_key, iv, auth_tag, sha256 FROM case_documents WHERE case_id = ?',
      ).all('case-1');
      expect(documents).toHaveLength(1);
      expect(documents[0]?.extracted_text).toBe('Es waren 2 Dokumente hochgeladen.');
      expect(fs.existsSync(documents[0]!.storage_path)).toBe(true);
      const evidencePlain = await new DocumentContainerService().readEncryptedContainer({
        storageRoot: dataDir,
        storagePath: documents[0]!.storage_path,
        documentKey: documents[0]!.document_key,
        iv: documents[0]!.iv,
        authTag: documents[0]!.auth_tag,
        expectedSha256: documents[0]!.sha256,
      });
      try {
        expect(evidencePlain.toString('utf8')).toBe('Es waren 2 Dokumente hochgeladen.');
      } finally {
        evidencePlain.fill(0);
      }
      for (const oldPath of originalPaths) expect(fs.existsSync(oldPath)).toBe(false);

      const chainAfter = db.prepare<Record<string, unknown>>('SELECT * FROM personal_data_audit_log ORDER BY sequence').all();
      expect(chainAfter.length).toBeGreaterThan(chainBefore.length);
      expect(chainAfter.slice(0, chainBefore.length)).toEqual(chainBefore);
      expect(chainAfter.at(-1)?.action).toBe('anonymize');
      expect(String(chainAfter.at(-1)?.metadata_json)).not.toContain('Zweck entfallen');
      expect(String(chainAfter.at(-1)?.metadata_json)).not.toContain('Max Mustermann');
      expect(audit.verifyChain().ok).toBe(true);
      expect(db.prepare<{ reason: string }>(`SELECT reason FROM retention_actions WHERE action_type = 'case_anonymized' AND entity_id = 'case-1'`).get()?.reason).toBe('Zweck entfallen');
    } finally {
      db.close();
    }
  });

  it('replaces every registered free text in full mode while preserving long-field length and using the complete notice for short fields', async () => {
    const db = await openTestDatabase();
    const dataDir = tempDir();
    try {
      const original = 'Max Mustermann und weitere personenbezogene Angaben werden hier ausführlich beschrieben, damit der Ersatztext dieselbe Länge behalten kann.';
      await seedCase(db, dataDir, original);
      await new CaseAnonymizationService(() => db, () => dataDir).anonymizeCase('case-1', 'Vollanonymisierung', 'FALL ANONYMISIEREN', 'replace_all_free_text');

      const note = db.prepare<{ title: string; participants: string; content: string }>('SELECT title, participants, content FROM case_notes WHERE id = ?').get('note-1');
      expect(note?.participants).toBe(REMOVED_PARTICIPANTS_TEXT);
      expect(note?.title).toBe(REMOVED_FREETEXT_PREFIX);
      expect(note?.content.startsWith(REMOVED_FREETEXT_PREFIX)).toBe(true);
      expect(note?.content).toHaveLength(original.length);
      expect(note?.content).not.toContain('Max Mustermann');
    } finally {
      db.close();
    }
  });

  it('applies the complete matrix across deadlines, history, journal, violations, external links and generated documents without rewriting either hash chain', async () => {
    const db = await openTestDatabase();
    const dataDir = tempDir();
    try {
      const audit = await seedCase(db, dataDir, 'Ausführliche Fallnotiz zu Max Mustermann Personalnummer 4711, die nach der Vollanonymisierung keinerlei Personenbezug mehr enthalten darf.');
      const { generatedPaths } = await seedExtendedCaseData(db, dataDir);
      db.prepare(`INSERT INTO audit_log (id, timestamp, action, entity_type, entity_id, case_id, details, previous_hash, hash) VALUES ('legacy-audit-1', '2026-08-15T12:00:00.000Z', 'update', 'case', 'case-1', 'case-1', 'Max Mustermann historisch', 'legacy-prev', 'legacy-hash')`).run();
      const personalChainBefore = db.prepare<Record<string, unknown>>('SELECT * FROM personal_data_audit_log ORDER BY sequence').all();
      const legacyChainBefore = db.prepare<Record<string, unknown>>('SELECT * FROM audit_log ORDER BY timestamp, id').all();

      const result = await new CaseAnonymizationService(() => db, () => dataDir).anonymizeCase(
        'case-1',
        'Vollständige Fallanonymisierung',
        'FALL ANONYMISIEREN',
        'replace_all_free_text',
      );

      expect(result.ok).toBe(true);
      for (const generatedPath of generatedPaths) expect(fs.existsSync(generatedPath)).toBe(false);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM generated_documents WHERE id = 'generated-1'`).get()?.count).toBe(0);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM sbv_participation_violation_documents WHERE document_id = 'generated-1'`).get()?.count).toBe(0);

      const caseRow = db.prepare<{ person_id: string | null; protected_person_id: string | null; handover_import_id: string | null; handover_package_id: string | null; handover_status: string }>(
        `SELECT person_id, protected_person_id, handover_import_id, handover_package_id, handover_status FROM cases WHERE id = 'case-1'`,
      ).get();
      expect(caseRow).toEqual({ person_id: null, protected_person_id: null, handover_import_id: null, handover_package_id: null, handover_status: 'none' });

      const deadline = db.prepare<{ title: string; confidential_title: string; description: string; source_event: string; person_id: string | null; due_at: string; legal_basis: string }>(
        `SELECT title, confidential_title, description, source_event, person_id, due_at, legal_basis FROM deadlines WHERE id = 'deadline-1'`,
      ).get();
      expect(deadline?.title.startsWith(REMOVED_FREETEXT_PREFIX)).toBe(true);
      expect(deadline?.confidential_title).not.toContain('Max Mustermann');
      expect(deadline?.description).not.toContain('Max Mustermann');
      expect(deadline?.source_event).not.toContain('Max Mustermann');
      expect(deadline?.person_id).toBeNull();
      expect(deadline?.due_at).toBe('2026-09-01T10:00:00.000Z');
      expect(deadline?.legal_basis).toBe('§ 178 Abs. 2 SGB IX');

      const deadlineAudit = db.prepare<{ old_value: string; new_value: string; reason: string }>(
        `SELECT old_value, new_value, reason FROM deadline_audit WHERE id = 'deadline-audit-1'`,
      ).get();
      expect(deadlineAudit?.old_value).not.toContain('Max Mustermann');
      expect(deadlineAudit?.new_value).not.toContain('Max Mustermann');
      expect(deadlineAudit?.reason).not.toContain('Max Mustermann');

      const journal = db.prepare<{ title: string; description: string; result_note: string }>(
        `SELECT title, description, result_note FROM activity_journal_entries WHERE id = 'journal-1'`,
      ).get();
      expect(JSON.stringify(journal)).not.toContain('Max Mustermann');
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM activity_journal_links WHERE entry_id = 'journal-1' AND target_type = 'person'`).get()?.count).toBe(0);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM activity_journal_links WHERE entry_id = 'journal-1' AND target_type = 'document'`).get()?.count).toBe(0);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM activity_journal_links WHERE entry_id = 'journal-1' AND target_type = 'case' AND target_id = 'case-1'`).get()?.count).toBe(1);

      const violation = db.prepare<{ subject: string; measure_description: string; wrong_behavior: string; required_behavior: string; consequence_warning: string; legal_basis: string }>(
        `SELECT subject, measure_description, wrong_behavior, required_behavior, consequence_warning, legal_basis FROM sbv_participation_violations WHERE id = 'violation-1'`,
      ).get();
      expect(JSON.stringify(violation)).not.toContain('Max Mustermann');
      expect(violation?.legal_basis).toBe('§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX');
      expect(db.prepare<{ note: string }>(`SELECT note FROM sbv_participation_violation_events WHERE id = 'violation-event-1'`).get()?.note).not.toContain('Max Mustermann');

      expect(db.prepare<{ note: string }>(`SELECT note FROM case_legal_references WHERE id = 'legal-ref-1'`).get()?.note).not.toContain('Max Mustermann');
      expect(JSON.stringify(db.prepare<{ subject: string; body: string }>(`SELECT subject, body FROM template_renders WHERE id = 'render-1'`).get())).not.toContain('Max Mustermann');
      const noteLink = db.prepare<{ label: string; accessible_label: string }>(`SELECT label, accessible_label FROM case_note_links WHERE id = 'note-link-1'`).get();
      expect(noteLink).toEqual({
        label: '[Verknüpfung im Rahmen der Fallanonymisierung neutralisiert]',
        accessible_label: '[Anonymisierte Verknüpfung öffnen]',
      });

      for (const table of ['bem_processes', 'bem_process_events', 'prevention_processes', 'prevention_process_events', 'equalization_processes', 'termination_hearings', 'sbv_participations', 'sbv_participation_events', 'case_measures', 'case_measure_participation', 'case_measure_events', 'case_measure_workplace_accommodation', 'case_measure_notes']) {
        const rows = db.prepare<Record<string, unknown>>(`SELECT * FROM ${table}`).all();
        expect(JSON.stringify(rows), table).not.toContain('Max Mustermann');
        expect(JSON.stringify(rows), table).not.toContain('Personalnummer 4711');
      }

      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM case_external_references WHERE case_id = 'case-1'`).get()?.count).toBe(0);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM case_handover_import_items WHERE local_entity_id IN ('case-1','measure-1')`).get()?.count).toBe(0);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM case_handover_imports WHERE id = 'handover-1'`).get()?.count).toBe(0);

      const evidence = db.prepare<{ extracted_text: string }>(`SELECT extracted_text FROM case_documents WHERE case_id = 'case-1'`).all();
      expect(evidence).toHaveLength(1);
      expect(evidence[0]?.extracted_text).toBe('Es waren 2 Dokumente hochgeladen.');

      const personalChainAfter = db.prepare<Record<string, unknown>>('SELECT * FROM personal_data_audit_log ORDER BY sequence').all();
      expect(personalChainAfter.slice(0, personalChainBefore.length)).toEqual(personalChainBefore);
      expect(personalChainAfter.length).toBeGreaterThan(personalChainBefore.length);
      expect(personalChainAfter.at(-1)?.action).toBe('anonymize');
      expect(audit.verifyChain().ok).toBe(true);
      expect(db.prepare<Record<string, unknown>>('SELECT * FROM audit_log ORDER BY timestamp, id').all()).toEqual(legacyChainBefore);
    } finally {
      db.close();
    }
  });


  it('keeps unmarked narrative text in marked-only mode while still removing structural identity links and generated files', async () => {
    const db = await openTestDatabase();
    const dataDir = tempDir();
    try {
      await seedCase(db, dataDir, 'Nicht markierter Freitext zu Max Mustermann.');
      const { generatedPaths } = await seedExtendedCaseData(db, dataDir);

      const result = await new CaseAnonymizationService(() => db, () => dataDir).anonymizeCase(
        'case-1',
        'Gezielte Marker-Anonymisierung',
        'FALL ANONYMISIEREN',
        'marked_free_text',
      );

      expect(result.ok).toBe(true);
      expect(db.prepare<{ title: string }>(`SELECT title FROM deadlines WHERE id = 'deadline-1'`).get()?.title).toContain('Max Mustermann');
      expect(db.prepare<{ title: string }>(`SELECT title FROM activity_journal_entries WHERE id = 'journal-1'`).get()?.title).toContain('Max Mustermann');
      expect(db.prepare<{ subject: string }>(`SELECT subject FROM sbv_participation_violations WHERE id = 'violation-1'`).get()?.subject).toContain('Max Mustermann');
      expect(db.prepare<{ person_id: string | null; protected_person_id: string | null }>(`SELECT person_id, protected_person_id FROM cases WHERE id = 'case-1'`).get()).toEqual({ person_id: null, protected_person_id: null });
      expect(db.prepare<{ person_id: string | null }>(`SELECT person_id FROM deadlines WHERE id = 'deadline-1'`).get()?.person_id).toBeNull();
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM activity_journal_links WHERE entry_id = 'journal-1' AND target_type = 'person'`).get()?.count).toBe(0);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM generated_documents WHERE id = 'generated-1'`).get()?.count).toBe(0);
      for (const generatedPath of generatedPaths) expect(fs.existsSync(generatedPath)).toBe(false);
      expect(db.prepare<{ label: string }>(`SELECT label FROM case_note_links WHERE id = 'note-link-1'`).get()?.label).toBe('[Verknüpfung im Rahmen der Fallanonymisierung neutralisiert]');
    } finally {
      db.close();
    }
  });

  it('rolls back database changes and restores staged files when the database commit fails', async () => {
    const db = await openTestDatabase();
    const dataDir = tempDir();
    try {
      await seedCase(db, dataDir, 'Rollback-Test Max Mustermann');
      const { generatedPaths } = await seedExtendedCaseData(db, dataDir);
      const uploadedPaths = db.prepare<{ storage_path: string }>(`SELECT storage_path FROM case_documents WHERE case_id = 'case-1' ORDER BY id`).all().map((row) => row.storage_path);
      const caseBefore = db.prepare<Record<string, unknown>>(`SELECT * FROM cases WHERE id = 'case-1'`).get();
      const chainBefore = db.prepare<Record<string, unknown>>('SELECT * FROM personal_data_audit_log ORDER BY sequence').all();

      db.exec(`CREATE TABLE IF NOT EXISTS retention_actions (
        id TEXT PRIMARY KEY, action_type TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, reference TEXT,
        reason TEXT, affected_rows INTEGER NOT NULL DEFAULT 0, affected_files INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      )`);
      db.exec(`CREATE TRIGGER fail_case_anonymization_retention BEFORE INSERT ON retention_actions
        WHEN NEW.action_type = 'case_anonymized'
        BEGIN SELECT RAISE(ABORT, 'fault injection retention'); END;`);

      const result = await new CaseAnonymizationService(() => db, () => dataDir).anonymizeCase(
        'case-1',
        'Rollback erzwingen',
        'FALL ANONYMISIEREN',
        'replace_all_free_text',
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('fault injection retention');
      expect(db.prepare<Record<string, unknown>>(`SELECT * FROM cases WHERE id = 'case-1'`).get()).toEqual(caseBefore);
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM person_case_links WHERE case_file_id = 'case-1'`).get()?.count).toBe(1);
      expect(db.prepare<Record<string, unknown>>('SELECT * FROM personal_data_audit_log ORDER BY sequence').all()).toEqual(chainBefore);
      for (const filePath of [...uploadedPaths, ...generatedPaths]) expect(fs.existsSync(filePath), filePath).toBe(true);
      expect(fs.existsSync(path.join(dataDir, '.anonymization-quarantine')) && fs.readdirSync(path.join(dataDir, '.anonymization-quarantine')).length > 0).toBe(false);
    } finally {
      db.close();
    }
  });

  it('aborts through the post-check and restores everything when a structural identity link survives', async () => {
    const db = await openTestDatabase();
    const dataDir = tempDir();
    try {
      await seedCase(db, dataDir, 'Post-Check Max Mustermann');
      const uploadedPaths = db.prepare<{ storage_path: string }>(`SELECT storage_path FROM case_documents WHERE case_id = 'case-1' ORDER BY id`).all().map((row) => row.storage_path);
      db.exec(`CREATE TRIGGER resurrect_person_case_link AFTER DELETE ON person_case_links
        WHEN OLD.case_file_id = 'case-1'
        BEGIN
          INSERT INTO person_case_links (id, protected_person_id, case_file_id, link_state, created_at)
          VALUES ('resurrected-link', OLD.protected_person_id, OLD.case_file_id, 'active', CURRENT_TIMESTAMP);
        END;`);

      const result = await new CaseAnonymizationService(() => db, () => dataDir).anonymizeCase(
        'case-1',
        'Post-Check erzwingen',
        'FALL ANONYMISIEREN',
        'replace_all_free_text',
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Post-Check: Personen-Fall-Verknüpfung');
      expect(db.prepare<{ protected_person_id: string | null }>(`SELECT protected_person_id FROM cases WHERE id = 'case-1'`).get()?.protected_person_id).toBe('person-1');
      expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM person_case_links WHERE case_file_id = 'case-1'`).get()?.count).toBe(1);
      for (const filePath of uploadedPaths) expect(fs.existsSync(filePath), filePath).toBe(true);
    } finally {
      db.close();
    }
  });

});
