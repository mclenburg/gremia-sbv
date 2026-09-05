import { randomUUID } from 'node:crypto';
import type { CaseHandoverPackageType } from '../src/domain/models/case-handover.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import type { PackagePayload } from './caseHandoverSupport.js';

export function ensureCaseHandoverExportLedgerSchema(db: DatabaseAdapter): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS case_handover_exports (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      exported_at TEXT NOT NULL,
      valid_until TEXT,
      package_type TEXT NOT NULL DEFAULT 'vacation_handover',
      status TEXT NOT NULL DEFAULT 'open',
      target_instance_id TEXT,
      case_count INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_case_handover_exports_package ON case_handover_exports(package_id);
    CREATE TABLE IF NOT EXISTS case_handover_export_items (
      id TEXT PRIMARY KEY,
      handover_export_id TEXT NOT NULL REFERENCES case_handover_exports(id) ON DELETE CASCADE,
      package_ref TEXT NOT NULL,
      local_entity_type TEXT NOT NULL,
      local_entity_id TEXT NOT NULL,
      exported_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_case_handover_export_items_package_ref ON case_handover_export_items(handover_export_id, package_ref);
    CREATE INDEX IF NOT EXISTS idx_case_handover_export_items_local ON case_handover_export_items(local_entity_type, local_entity_id);
  `);
}

export function recordCaseHandoverExport(
  db: DatabaseAdapter,
  payload: PackagePayload,
  targetInstanceId?: string,
): void {
  ensureCaseHandoverExportLedgerSchema(db);
  const exportId = randomUUID();
  const packageType: CaseHandoverPackageType = payload.packageType ?? 'vacation_handover';
  db.prepare(`
    INSERT OR REPLACE INTO case_handover_exports (
      id, package_id, exported_at, valid_until, package_type, status, target_instance_id, case_count, metadata_json
    ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `).run(
    exportId,
    payload.packageId,
    payload.createdAt,
    payload.expiresAt ?? null,
    packageType,
    targetInstanceId ?? null,
    payload.cases.length,
    JSON.stringify({ measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length }),
  );
  for (const item of exportItems(payload)) {
    db.prepare(`
      INSERT INTO case_handover_export_items (
        id, handover_export_id, package_ref, local_entity_type, local_entity_id, exported_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), exportId, item.ref, item.type, item.localId, payload.createdAt);
  }
}

function exportItems(payload: PackagePayload): Array<{ ref: string; type: string; localId: string }> {
  return [
    ...payload.cases.map((item) => ({ ref: item.ref, type: 'case', localId: item.data.id })),
    ...payload.protectedPersons.map((item) => ({ ref: item.ref, type: 'protected_person', localId: item.data.id })),
    ...payload.notes.map((item) => ({ ref: item.ref, type: 'case_note', localId: item.data.id })),
    ...payload.measures.map((item) => ({ ref: item.ref, type: 'case_measure', localId: item.data.id })),
    ...payload.measureNotes.map((item) => ({ ref: item.ref, type: 'case_measure_note', localId: item.data.id })),
    ...payload.deadlines.map((item) => ({ ref: item.ref, type: 'deadline', localId: item.data.id })),
    ...payload.documents.map((item) => ({ ref: item.ref, type: 'case_document', localId: item.data.id })),
  ].filter((item) => item.localId);
}
