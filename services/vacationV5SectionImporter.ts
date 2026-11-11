import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { assertVacationV5Sections, type VacationV5Manifest, type VacationV5Section, type VacationV5SectionItem } from './vacationV5SectionManifest.js';
import { VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditCaseHandoverImported } from './auditEventBuilders.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';

type RowKind = keyof typeof VACATION_V5_ROW_FIELDS;

const IMPORT_ORDER: readonly RowKind[] = [
  'meeting', 'recruiting', 'employer_obligation', 'inclusion_agreement', 'violation', 'assembly', 'inclusion_officer',
  'meeting_agenda', 'recruiting_interview', 'inclusion_topic', 'violation_event', 'deadline',
];

const PARENT_COLUMN: Partial<Record<RowKind, string>> = {
  meeting_agenda: 'meeting_id', recruiting_interview: 'recruiting_participation_id',
  inclusion_topic: 'agreement_id', violation_event: 'violation_id', deadline: 'process_id',
};

function insertRow(database: DatabaseAdapter, kind: RowKind, item: VacationV5SectionItem,
  localByRef: Map<string, string>, timestamp: string): string {
  const localId = randomUUID();
  const data = item.data;
  const fields: Record<string, string | number | boolean | null> = { ...data, id: localId, created_at: timestamp };
  if (kind !== 'violation_event') fields.updated_at = timestamp;
  if (kind === 'violation') fields.source_context_id = localId;
  const parentColumn = PARENT_COLUMN[kind];
  if (parentColumn && item.parentRef) {
    const parentId = localByRef.get(item.parentRef);
    if (!parentId) throw new Error('Vertretungspaket enthält eine nicht importierte Elternreferenz.');
    fields[parentColumn] = parentId;
  }
  const columns = Object.keys(fields);
  const placeholders = columns.map(() => '?').join(', ');
  const table = VACATION_V5_ROW_FIELDS[kind].table;
  database.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).run(...columns.map((column) => fields[column]));
  return localId;
}

export function importVacationV5Sections(database: DatabaseAdapter, packageId: string, expiresAt: string,
  sectionInput: unknown, manifest: VacationV5Manifest,
  binding: { originKeyFingerprint: string; targetKeyFingerprint: string }): { importId: string; importedCount: number; localByRef: Record<string, string> } {
  if (!/^handover_[A-Za-z0-9_-]{4,120}$/.test(packageId)) throw new Error('Ungültige Paketkennung für die Urlaubsvertretung.');
  if (!/^[0-9a-f]{64}$/.test(binding.originKeyFingerprint) || !/^[0-9a-f]{64}$/.test(binding.targetKeyFingerprint)) {
    throw new Error('Format-5-Import enthält keine verifizierte Schlüsselbindung.');
  }
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) throw new Error('Das Vertretungspaket ist abgelaufen.');
  const sections = assertVacationV5Sections(sectionInput, manifest);
  if (!sections.length) throw new Error('Das Vertretungspaket enthält keine übergreifende Arbeit.');
  const byType = new Map(sections.map((section) => [section.type, section]));
  const timestamp = new Date().toISOString();
  const importId = randomUUID();
  return new DatabaseUnitOfWork(database).run(() => {
    const duplicate = database.prepare<{ id: string }>('SELECT id FROM case_handover_imports WHERE package_id = ?').get(packageId);
    if (duplicate) throw new Error('Dieses Vertretungspaket wurde bereits importiert.');
    database.prepare(`INSERT INTO case_handover_imports (id, package_id, imported_at, valid_until, status, mode, metadata_json,
      origin_key_fingerprint, target_key_fingerprint, format_version)
      VALUES (?, ?, ?, ?, 'active', 'create_new', ?, ?, ?, 5)`).run(importId, packageId, timestamp, expiresAt,
      JSON.stringify({ formatVersion: 5, sectionCounts: sections.map((section) => ({ type: section.type, count: section.count })) }),
      binding.originKeyFingerprint, binding.targetKeyFingerprint);
    const localByRef = new Map<string, string>();
    for (const kind of IMPORT_ORDER) {
      const section: VacationV5Section | undefined = byType.get(kind);
      if (!section) continue;
      for (const item of section.items) {
        const localId = insertRow(database, kind, item, localByRef, timestamp);
        localByRef.set(item.ref, localId);
        const stored = database.prepare<Record<string, unknown>>(`SELECT * FROM ${VACATION_V5_ROW_FIELDS[kind].table} WHERE id = ?`).get(localId);
        if (!stored) throw new Error('Importierter Vorgang konnte nicht bestätigt werden.');
        database.prepare(`INSERT INTO case_handover_import_items
          (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at, baseline_sha256)
          VALUES (?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), importId, kind, localId, item.ref, timestamp, caseHandoverBaselineHash(stored));
      }
    }
    new PersonalDataAuditLogService(database).append(auditCaseHandoverImported({
      packageId, caseCount: 0, deadlineCount: byType.get('deadline')?.count ?? 0,
      mode: 'vacation_v5', validUntilPresent: true, result: 'success',
    }));
    return { importId, importedCount: localByRef.size, localByRef: Object.fromEntries(localByRef) };
  });
}
