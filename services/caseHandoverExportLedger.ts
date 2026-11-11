import { randomUUID } from 'node:crypto';
import type { CaseHandoverPackageType } from '../src/domain/models/case-handover.model.js';
import type { MobileCompanionSnapshotPayload } from '../src/domain/models/mobile-companion.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import type { PackagePayload } from './caseHandoverSupport.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import type { VacationV5PackageSourceByRef } from './vacationV5PackageSource.js';

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
      metadata_json TEXT NOT NULL DEFAULT '{}',
      target_key_fingerprint TEXT,
      format_version INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_case_handover_exports_package ON case_handover_exports(package_id);
    CREATE TABLE IF NOT EXISTS case_handover_export_items (
      id TEXT PRIMARY KEY,
      handover_export_id TEXT NOT NULL REFERENCES case_handover_exports(id) ON DELETE CASCADE,
      package_ref TEXT NOT NULL,
      local_entity_type TEXT NOT NULL,
      local_entity_id TEXT NOT NULL,
      exported_at TEXT NOT NULL,
      baseline_sha256 TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_case_handover_export_items_package_ref ON case_handover_export_items(handover_export_id, package_ref);
    CREATE INDEX IF NOT EXISTS idx_case_handover_export_items_local ON case_handover_export_items(local_entity_type, local_entity_id);
  `);
  const columns = db.prepare<{ name: string }>('PRAGMA table_info(case_handover_export_items)').all();
  if (!columns.some((column) => column.name === 'baseline_sha256')) {
    db.exec('ALTER TABLE case_handover_export_items ADD COLUMN baseline_sha256 TEXT');
  }
  const exportColumns = db.prepare<{ name: string }>('PRAGMA table_info(case_handover_exports)').all();
  if (!exportColumns.some((column) => column.name === 'target_key_fingerprint')) {
    db.exec('ALTER TABLE case_handover_exports ADD COLUMN target_key_fingerprint TEXT');
  }
  if (!exportColumns.some((column) => column.name === 'format_version')) {
    db.exec('ALTER TABLE case_handover_exports ADD COLUMN format_version INTEGER');
  }
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    exportId,
    payload.packageId,
    payload.createdAt,
    payload.expiresAt ?? null,
    packageType,
    packageType === 'office_handover' ? 'completed' : 'open',
    targetInstanceId ?? null,
    payload.cases.length,
    JSON.stringify({ measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length }),
  );
  for (const item of exportItems(payload)) {
    db.prepare(`
      INSERT INTO case_handover_export_items (
        id, handover_export_id, package_ref, local_entity_type, local_entity_id, exported_at, baseline_sha256
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), exportId, item.ref, item.type, item.localId, payload.createdAt, caseHandoverBaselineHash(item.data, item.contentBase64));
  }
}

export function recordVacationV5Export(db: DatabaseAdapter, input: {
  packageId: string;
  createdAt: string;
  expiresAt: string;
  targetInstanceId: string;
  targetKeyFingerprint: string;
  sourceByRef: VacationV5PackageSourceByRef;
}): void {
  if (!/^handover_[A-Za-z0-9_-]{4,120}$/.test(input.packageId)
    || !/^[0-9a-f]{64}$/.test(input.targetKeyFingerprint)
    || !input.targetInstanceId || !Number.isFinite(Date.parse(input.createdAt)) || !Number.isFinite(Date.parse(input.expiresAt))) {
    throw new Error('Format-5-Exportledger enthält ungültige Paket- oder Zielbindung.');
  }
  ensureCaseHandoverExportLedgerSchema(db);
  const exportId = randomUUID();
  const sourceEntries = Object.entries(input.sourceByRef);
  const counts = sourceEntries.reduce<Record<string, number>>((result, [, entry]) => {
    result[entry.kind] = (result[entry.kind] ?? 0) + 1;
    return result;
  }, {});
  db.prepare(`INSERT INTO case_handover_exports
    (id, package_id, exported_at, valid_until, package_type, status, target_instance_id,
      target_key_fingerprint, format_version, case_count, metadata_json)
    VALUES (?, ?, ?, ?, 'vacation_handover', 'open', ?, ?, 5, ?, ?)`)
    .run(exportId, input.packageId, input.createdAt, input.expiresAt,
      input.targetInstanceId, input.targetKeyFingerprint, counts.case ?? 0, JSON.stringify({ sectionCounts: counts }));
  for (const [ref, source] of sourceEntries) {
    if (!/^[a-z_]+_[1-9][0-9]*$/.test(ref) || !source.localId || !/^[0-9a-f]{64}$/.test(source.baselineSha256)) {
      throw new Error('Format-5-Exportledger enthält ungültige Quellreferenzen.');
    }
    db.prepare(`INSERT INTO case_handover_export_items
      (id, handover_export_id, package_ref, local_entity_type, local_entity_id, exported_at, baseline_sha256)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), exportId, ref, source.kind, source.localId, input.createdAt, source.baselineSha256);
  }
}

export function recordMobileCompanionSnapshotExport(
  db: DatabaseAdapter,
  payload: MobileCompanionSnapshotPayload,
  frameCount: number,
  targetKeyFingerprint: string,
): void {
  ensureCaseHandoverExportLedgerSchema(db);
  const exportId = randomUUID();
  db.prepare(`
    INSERT OR REPLACE INTO case_handover_exports (
      id, package_id, exported_at, valid_until, package_type, status, target_instance_id, case_count, metadata_json
    ) VALUES (?, ?, ?, NULL, 'mobile_snapshot', 'open', ?, ?, ?)
  `).run(
    exportId,
    payload.packageId,
    payload.createdAt,
    payload.targetInstanceId,
    payload.cases.length,
    JSON.stringify({
      deadlineCount: payload.deadlines.length,
      frameCount,
      schemaVersion: payload.schemaVersion,
      source: 'mobile_companion',
      targetKeyFingerprint,
    }),
  );
  for (const item of [
    ...payload.cases.map((record) => ({ ref: record.id, type: 'case', localId: record.id })),
    ...payload.deadlines.map((record) => ({ ref: record.id, type: 'deadline', localId: record.id })),
  ]) {
    db.prepare(`
      INSERT INTO case_handover_export_items (
        id, handover_export_id, package_ref, local_entity_type, local_entity_id, exported_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), exportId, item.ref, item.type, item.localId, payload.createdAt);
  }
}

function exportItems(payload: PackagePayload): Array<{ ref: string; type: string; localId: string; data: Record<string, unknown>; contentBase64?: string }> {
  return [
    ...payload.cases.map((item) => ({ ref: item.ref, type: 'case', localId: item.data.id, data: item.data })),
    ...payload.protectedPersons.map((item) => ({ ref: item.ref, type: 'protected_person', localId: item.data.id, data: item.data })),
    ...payload.notes.map((item) => ({ ref: item.ref, type: 'case_note', localId: item.data.id, data: item.data })),
    ...payload.measures.map((item) => ({ ref: item.ref, type: 'case_measure', localId: item.data.id, data: item.data })),
    ...payload.measureNotes.map((item) => ({ ref: item.ref, type: 'case_measure_note', localId: item.data.id, data: item.data })),
    ...payload.deadlines.map((item) => ({ ref: item.ref, type: 'deadline', localId: item.data.id, data: item.data })),
    ...payload.documents.map((item) => ({ ref: item.ref, type: 'case_document', localId: item.data.id, data: item.data, contentBase64: item.contentBase64 })),
  ].filter((item) => item.localId);
}
