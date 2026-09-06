import type { DatabaseAdapter } from './databaseService.js';
import { encodeDocumentForHandover, sanitizeHandoverDocumentMetadata } from './caseHandoverDocumentCodec.js';
import { packageRef } from './caseHandoverPolicy.js';
import type { OfficeHandoverPayload, PackagePayload, Row } from './caseHandoverSupport.js';
import { ElectionTransferService } from './electionTransferService.js';
import { RetentionService } from './retentionService.js';
import { TransferInstanceIdentityService } from './transferInstanceIdentityService.js';

function rows(database: DatabaseAdapter, sql: string, ...parameters: unknown[]): Row[] {
  return database.prepare<Row>(sql).all(...parameters);
}

/** Collects institutional SBV work product. Personal activity-journal entries are
 * deliberately not part of this boundary. */
export class OfficeHandoverPayloadService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly dataDirectoryProvider: () => string,
  ) {}

  collect(casePayload: PackagePayload): OfficeHandoverPayload {
    const caseRefs = new Map(casePayload.cases.map((item) => [String(item.data.id), item.ref]));
    const sourceInstanceId = new TransferInstanceIdentityService(this.database).getPublicIdentity().instanceId;
    const electionTransfer = new ElectionTransferService(this.database);
    const elections = rows(this.database, 'SELECT id FROM sbv_elections ORDER BY created_at, id')
      .map((election, index) => ({
        ref: packageRef('election', index),
        data: electionTransfer.createPayloadForEmbedding(String(election.id), sourceInstanceId),
      }));
    const electionRefs = new Map(elections.map((item) => [item.data.manifest.electionId, item.ref]));
    const electionDocumentRows = rows(this.database, `
      SELECT d.*, l.owner_id AS election_id, l.purpose, l.document_class,
        l.template_version AS link_template_version, l.legal_rule_version
      FROM sbv_workflow_document_links l
      JOIN generated_documents d ON d.id = l.document_id
      WHERE l.owner_type = 'election'
      ORDER BY l.created_at, d.id
    `);

    return {
      documentTemplates: rows(this.database, 'SELECT * FROM document_templates WHERE is_system = 0 ORDER BY template_key')
        .map((data, index) => ({ ref: packageRef('document_template', index), data })),
      deadlineTemplates: rows(this.database, 'SELECT * FROM deadline_templates ORDER BY template_key')
        .map((data, index) => ({ ref: packageRef('deadline_template', index), data })),
      retentionSettings: { ...new RetentionService(this.database, this.dataDirectoryProvider).getSettings() },
      privacyReviews: rows(this.database, `
        SELECT * FROM privacy_review_items
        WHERE status = 'open' AND case_id IN (${casePayload.cases.map(() => '?').join(',')})
        ORDER BY due_at, id
      `, ...casePayload.cases.map((item) => item.data.id)).map((data, index) => ({
        ref: packageRef('privacy_review', index),
        caseRef: caseRefs.get(String(data.case_id))!,
        data,
      })),
      elections,
      electionDocuments: electionDocumentRows.map((data, index) => ({
        ref: packageRef('election_document', index),
        electionRef: electionRefs.get(String(data.election_id))!,
        data: sanitizeHandoverDocumentMetadata(data),
        contentBase64: encodeDocumentForHandover(data, this.dataDirectoryProvider()),
      })),
      activityJournalIncluded: false,
    };
  }
}
