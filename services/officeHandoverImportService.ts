import { randomUUID } from 'node:crypto';
import type { OfficeHandoverImportSummary } from '../src/domain/models/case-handover.model.js';
import type { RetentionSettings } from '../src/domain/models/retention.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import { ElectionTransferCryptoAdapter } from './electionTransferCryptoAdapter.js';
import { ElectionTransferService } from './electionTransferService.js';
import type { OfficeHandoverPayload, PackagePayload, Row } from './caseHandoverSupport.js';
import { storeImportedElectionDocument } from './officeHandoverDocumentStore.js';
import { PrivacyReviewService } from './privacyReviewService.js';
import type { PrivacyReviewReason } from './privacyReviewPolicy.js';
import { RetentionService } from './retentionService.js';

const PRIVACY_REASONS: PrivacyReviewReason[] = [
  'status_expired', 'employment_ended', 'linked_person_anonymized', 'linked_person_deleted',
  'legacy_unlinked', 'multiple_person_links', 'no_person_link', 'handover_imported', 'retention_due',
];

export class OfficeHandoverImportService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly dataDirectoryProvider: () => string,
  ) {}

  import(
    payload: PackagePayload,
    caseRefToLocal: ReadonlyMap<string, string>,
    personRefToLocal: ReadonlyMap<string, string>,
    applyOfficeConfiguration: boolean,
  ): OfficeHandoverImportSummary {
    if (!payload.officeData) throw new Error('Amtsübergabepaket enthält keinen Amtsbestand.');
    const office = payload.officeData;
    const templateCount = this.importDocumentTemplates(office);
    const deadlineTemplateCount = applyOfficeConfiguration ? this.importDeadlineTemplates(office) : 0;
    if (applyOfficeConfiguration) {
      new RetentionService(this.database, this.dataDirectoryProvider).updateSettings(office.retentionSettings as unknown as RetentionSettings);
    }
    const electionResult = this.importElections(office, payload.createdAt);
    const privacyReviewCount = this.importPrivacyReviews(payload, office, caseRefToLocal, personRefToLocal);
    return {
      templateCount,
      deadlineTemplateCount,
      electionCount: electionResult.electionCount,
      electionDocumentCount: electionResult.documentCount,
      privacyReviewCount,
      officeConfigurationApplied: applyOfficeConfiguration,
    };
  }

  private importDocumentTemplates(office: OfficeHandoverPayload): number {
    let imported = 0;
    for (const item of office.documentTemplates) {
      const source = item.data;
      const key = String(source.template_key);
      const existing = this.database.prepare<Row>('SELECT * FROM document_templates WHERE template_key = ?').get(key);
      if (existing && existing.subject === source.subject && existing.body === source.body) continue;
      const targetKey = existing ? this.uniqueTemplateKey(`${key}.amtsuebergabe`) : key;
      this.database.prepare(`
        INSERT INTO document_templates (
          id, template_key, title, category, description, subject, body,
          legal_basis_json, tags_json, is_system, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        randomUUID(), targetKey, source.title, source.category, source.description ?? null,
        source.subject, source.body, source.legal_basis_json ?? '[]', source.tags_json ?? '[]',
        source.created_at ?? new Date().toISOString(), source.updated_at ?? new Date().toISOString(),
      );
      imported += 1;
    }
    return imported;
  }

  private uniqueTemplateKey(base: string): string {
    let candidate = base;
    let sequence = 2;
    while (this.database.prepare<{ id: string }>('SELECT id FROM document_templates WHERE template_key = ?').get(candidate)) {
      candidate = `${base}.${sequence++}`;
    }
    return candidate;
  }

  private importDeadlineTemplates(office: OfficeHandoverPayload): number {
    for (const item of office.deadlineTemplates) {
      const source = item.data;
      const key = String(source.template_key);
      const existing = this.database.prepare<{ id: string }>('SELECT id FROM deadline_templates WHERE template_key = ?').get(key);
      if (existing) {
        this.database.prepare(`
          UPDATE deadline_templates SET title = ?, confidential_title = ?, description = ?, process_type = ?,
            deadline_type = ?, offset_days = ?, offset_hours = ?, reminder_days_before = ?, legal_basis = ?,
            severity = ?, is_legal_deadline = ?, warning_threshold_hours = ?, critical_threshold_hours = ?,
            enabled = ?, updated_at = ? WHERE id = ?
        `).run(
          source.title, source.confidential_title ?? null, source.description ?? null, source.process_type,
          source.deadline_type, source.offset_days ?? 0, source.offset_hours ?? 0, source.reminder_days_before ?? null,
          source.legal_basis ?? null, source.severity ?? 'normal', source.is_legal_deadline ?? 0,
          source.warning_threshold_hours ?? 48, source.critical_threshold_hours ?? 24, source.enabled ?? 1,
          source.updated_at ?? new Date().toISOString(), existing.id,
        );
      } else {
        this.database.prepare(`
          INSERT INTO deadline_templates (
            id, template_key, title, confidential_title, description, process_type, deadline_type,
            offset_days, offset_hours, reminder_days_before, legal_basis, severity, is_legal_deadline,
            warning_threshold_hours, critical_threshold_hours, enabled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(), key, source.title, source.confidential_title ?? null, source.description ?? null,
          source.process_type, source.deadline_type, source.offset_days ?? 0, source.offset_hours ?? 0,
          source.reminder_days_before ?? null, source.legal_basis ?? null, source.severity ?? 'normal',
          source.is_legal_deadline ?? 0, source.warning_threshold_hours ?? 48, source.critical_threshold_hours ?? 24,
          source.enabled ?? 1, source.created_at ?? new Date().toISOString(), source.updated_at ?? new Date().toISOString(),
        );
      }
    }
    return office.deadlineTemplates.length;
  }

  private importElections(office: OfficeHandoverPayload, importedAt: string): { electionCount: number; documentCount: number } {
    const electionRefToLocal = new Map<string, string>();
    const electionTransfer = new ElectionTransferService(this.database);
    const crypto = new ElectionTransferCryptoAdapter();
    for (const item of office.elections) {
      crypto.validatePayload(item.data);
      const imported = electionTransfer.importPayloadForEmbedding(item.data);
      electionRefToLocal.set(item.ref, imported.importedElectionId);
      const importId = randomUUID();
      this.database.prepare(`
        INSERT INTO sbv_election_transfer_imports (
          id, source_package_id, imported_at, format_version, source_vault_id_hash,
          source_manifest_hash, status, imported_election_id, metadata_json_minimal
        ) VALUES (?, ?, ?, ?, ?, ?, 'imported', ?, ?)
      `).run(
        importId, item.data.manifest.packageId, importedAt, item.data.manifest.formatVersion,
        item.data.manifest.sourceVaultIdHash, crypto.manifestHash(item.data), imported.importedElectionId,
        JSON.stringify({ itemCount: imported.importedItems.length, source: 'office_handover' }),
      );
      for (const mapped of imported.importedItems) {
        this.database.prepare(`
          INSERT INTO sbv_election_transfer_import_items (
            id, import_id, package_ref, local_entity_type, local_entity_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), importId, mapped.packageRef, mapped.localEntityType, mapped.localEntityId, importedAt);
      }
    }
    for (const document of office.electionDocuments) {
      const electionId = electionRefToLocal.get(document.electionRef);
      if (!electionId) throw new Error('Wahldokument im Amtsübergabepaket kann keiner Wahlakte zugeordnet werden.');
      storeImportedElectionDocument(this.database, this.dataDirectoryProvider(), electionId, document.data, document.contentBase64, importedAt);
    }
    return { electionCount: office.elections.length, documentCount: office.electionDocuments.length };
  }

  private importPrivacyReviews(
    payload: PackagePayload,
    office: OfficeHandoverPayload,
    caseRefToLocal: ReadonlyMap<string, string>,
    personRefToLocal: ReadonlyMap<string, string>,
  ): number {
    const reviews = new PrivacyReviewService(this.database);
    for (const item of office.privacyReviews) {
      const caseId = caseRefToLocal.get(item.caseRef);
      if (!caseId) throw new Error('Datenschutzstatus im Amtsübergabepaket kann keiner Fallakte zugeordnet werden.');
      const sourcePersonId = String(item.data.protected_person_id ?? '');
      const personRef = payload.protectedPersons.find((person) => String(person.data.id) === sourcePersonId)?.ref;
      const reason = String(item.data.reason) as PrivacyReviewReason;
      if (!PRIVACY_REASONS.includes(reason)) throw new Error('Amtsübergabepaket enthält einen unbekannten Datenschutz-Prüfgrund.');
      reviews.createForCase(
        caseId,
        personRef ? personRefToLocal.get(personRef) ?? null : null,
        reason,
        { freeTextReviewRequired: item.data.free_text_review_required !== 0 },
        String(item.data.due_at),
        String(item.data.priority) as 'critical' | 'high' | 'normal' | 'low',
      );
    }
    return office.privacyReviews.length;
  }
}
