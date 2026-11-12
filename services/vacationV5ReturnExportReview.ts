import { createHash } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { listVacationV5ImportedItemChanges } from './vacationV5ImportedItemChanges.js';
import { collectVacationV5ReturnChanges } from './vacationV5ReturnCollector.js';
import { vacationV5SourceTable, type VacationV5PackageSourceKind } from './vacationV5PackageSource.js';
import { listVacationV5ScopeCandidates } from './vacationV5ScopeCandidates.js';
import type { VacationV5ReturnAdditionCandidate, VacationV5ReturnExportPreview,
  VacationV5ReturnInventory, VacationV5ReturnPackageOption } from '../src/domain/transfer/vacationV5File.js';

type Row = Record<string, unknown> & { id: string };
const ROOT_KIND: Record<string, VacationV5PackageSourceKind> = {
  caseIds: 'case', standaloneDeadlineIds: 'deadline', meetingIds: 'meeting', recruitingIds: 'recruiting',
  employerObligationIds: 'employer_obligation', inclusionAgreementIds: 'inclusion_agreement',
  violationIds: 'violation', assemblyIds: 'assembly', inclusionOfficerSnapshotId: 'inclusion_officer',
};
const CHILDREN: Array<{ kind: VacationV5PackageSourceKind; parent: VacationV5PackageSourceKind; column: string }> = [
  { kind: 'case_note', parent: 'case', column: 'case_id' },
  { kind: 'case_measure', parent: 'case', column: 'case_id' },
  { kind: 'case_measure_note', parent: 'case_measure', column: 'measure_id' },
  { kind: 'case_deadline', parent: 'case', column: 'case_id' },
  { kind: 'case_document', parent: 'case', column: 'case_id' },
  { kind: 'meeting_agenda', parent: 'meeting', column: 'meeting_id' },
  { kind: 'recruiting_interview', parent: 'recruiting', column: 'recruiting_participation_id' },
  { kind: 'inclusion_topic', parent: 'inclusion_agreement', column: 'agreement_id' },
  { kind: 'violation_event', parent: 'violation', column: 'violation_id' },
];

function label(kind: string, row: Record<string, unknown> | undefined): string {
  if (!row) return `${kind} · entfernt`;
  return String(row.case_number ?? row.title ?? row.subject ?? row.vacancy_title ?? row.filename
    ?? row.obligation_key ?? row.applicant_ref ?? row.topic_key ?? row.name ?? row.id);
}

function childAdditions(database: DatabaseAdapter, imported: Map<string, Set<string>>,
  seen: Set<string>): VacationV5ReturnAdditionCandidate[] {
  const additions: VacationV5ReturnAdditionCandidate[] = [];
  for (const relation of CHILDREN) {
    const parentIds = [...(imported.get(relation.parent) ?? [])];
    if (!parentIds.length) continue;
    const table = vacationV5SourceTable(relation.kind);
    const placeholders = parentIds.map(() => '?').join(', ');
    const rows = database.prepare<Row>(`SELECT * FROM ${table} WHERE ${relation.column} IN (${placeholders})
      ORDER BY id LIMIT 1001`).all(...parentIds);
    if (rows.length > 1000) throw new Error('Zu viele neue Rückgabevorgänge für eine sichere Auswahl.');
    for (const row of rows) {
      const key = `${relation.kind}:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      additions.push({ key, label: `${label(relation.kind, row)} · ${relation.kind}`,
        items: [{ kind: relation.kind, localId: row.id }] });
    }
  }
  return additions;
}

function officeDocumentAdditions(database: DatabaseAdapter, imported: Map<string, Set<string>>,
  seen: Set<string>): VacationV5ReturnAdditionCandidate[] {
  const links: Array<{ kind: 'workflow_document_link' | 'violation_document_link'; table: string;
    ownerKind: VacationV5PackageSourceKind; ownerType?: string; ownerColumn: string }> = [
    { kind: 'workflow_document_link', table: 'sbv_workflow_document_links', ownerKind: 'meeting', ownerType: 'meeting', ownerColumn: 'owner_id' },
    { kind: 'workflow_document_link', table: 'sbv_workflow_document_links', ownerKind: 'assembly', ownerType: 'assembly', ownerColumn: 'owner_id' },
    { kind: 'workflow_document_link', table: 'sbv_workflow_document_links', ownerKind: 'employer_obligation', ownerType: 'employer_obligation_review', ownerColumn: 'owner_id' },
    { kind: 'workflow_document_link', table: 'sbv_workflow_document_links', ownerKind: 'inclusion_agreement', ownerType: 'inclusion_agreement', ownerColumn: 'owner_id' },
    { kind: 'violation_document_link', table: 'sbv_participation_violation_documents', ownerKind: 'violation', ownerColumn: 'violation_id' },
  ];
  const byDocument = new Map<string, VacationV5ReturnAdditionCandidate>();
  for (const link of links) {
    const parentIds = [...(imported.get(link.ownerKind) ?? [])];
    if (!parentIds.length) continue;
    const placeholders = parentIds.map(() => '?').join(', ');
    const rows = database.prepare<{ id: string; document_id: string }>(`SELECT id, document_id FROM ${link.table}
      WHERE ${link.ownerColumn} IN (${placeholders}) ${link.ownerType ? 'AND owner_type = ?' : ''}
      ORDER BY id LIMIT 1001`).all(...parentIds, ...(link.ownerType ? [link.ownerType] : []));
    if (rows.length > 1000) throw new Error('Zu viele neue Rückgabedokumente für eine sichere Auswahl.');
    for (const row of rows) {
      const docKey = `generated_document:${row.document_id}`;
      const linkKey = `${link.kind}:${row.id}`;
      if (seen.has(docKey) && seen.has(linkKey)) continue;
      const document = database.prepare<Row>('SELECT * FROM generated_documents WHERE id = ?').get(row.document_id);
      if (!document) continue;
      const option = byDocument.get(row.document_id) ?? { key: docKey,
        label: `${label('generated_document', document)} · Amtsdokument`, items: [] };
      if (!seen.has(docKey) && !option.items.some((item) => item.kind === 'generated_document')) {
        option.items.push({ kind: 'generated_document', localId: row.document_id });
      }
      if (!seen.has(linkKey)) option.items.push({ kind: link.kind, localId: row.id });
      byDocument.set(row.document_id, option);
    }
  }
  return [...byDocument.values()];
}

export function listVacationV5ReturnPackages(database: DatabaseAdapter): VacationV5ReturnPackageOption[] {
  return database.prepare<{ package_id: string; valid_until: string | null; imported_at: string; item_count: number }>(`
    SELECT i.package_id, i.valid_until, i.imported_at, COUNT(x.id) AS item_count
    FROM case_handover_imports i LEFT JOIN case_handover_import_items x ON x.handover_import_id = i.id
    WHERE i.format_version = 5 AND i.status = 'active'
    GROUP BY i.id ORDER BY i.imported_at DESC LIMIT 1001`).all().map((row) => ({
      sourcePackageId: row.package_id, validUntil: row.valid_until, importedAt: row.imported_at,
      itemCount: row.item_count }));
}

export function reviewVacationV5ReturnInventory(database: DatabaseAdapter, dataDirectory: string,
  sourcePackageId: string): VacationV5ReturnInventory {
  const source = database.prepare<{ origin_key_fingerprint: string | null; status: string }>(`
    SELECT origin_key_fingerprint, status FROM case_handover_imports WHERE package_id = ? AND format_version = 5`
  ).get(sourcePackageId);
  if (!source || source.status !== 'active') throw new Error('Dieses Format-5-Paket ist nicht mehr für eine Rückgabe aktiv.');
  const profile = source.origin_key_fingerprint ? database.prepare<{ id: string; label: string }>(`
    SELECT id, label FROM transfer_recipient_profiles WHERE key_fingerprint = ? AND active = 1`
  ).get(source.origin_key_fingerprint) : undefined;
  const inventory = listVacationV5ImportedItemChanges(database, sourcePackageId, dataDirectory);
  const imported = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const items = inventory.items.map((item) => {
    const key = `${item.kind}:${item.localId}`;
    seen.add(key);
    const ids = imported.get(item.kind) ?? new Set<string>(); ids.add(item.localId); imported.set(item.kind, ids);
    const row = item.status === 'missing' ? undefined
      : database.prepare<Row>(`SELECT * FROM ${vacationV5SourceTable(item.kind)} WHERE id = ?`).get(item.localId);
    return { ref: item.ref, kind: item.kind, localId: item.localId,
      label: label(item.kind, row), status: item.status };
  });
  const rootAdditions = listVacationV5ScopeCandidates(database, '9999-01-01T00:00:00.000Z')
    .filter((item) => !seen.has(`${ROOT_KIND[item.scopeKey]}:${item.id}`))
    .map((item) => ({ key: `${ROOT_KIND[item.scopeKey]}:${item.id}`, label: item.label,
      items: [{ kind: ROOT_KIND[item.scopeKey], localId: item.id }] }));
  const additions = [...rootAdditions, ...childAdditions(database, imported, seen),
    ...officeDocumentAdditions(database, imported, seen)];
  return { sourcePackageId, profileId: profile?.id ?? null, profileLabel: profile?.label ?? null,
    items, additions };
}

export function previewVacationV5ReturnExport(database: DatabaseAdapter, dataDirectory: string,
  input: { sourcePackageId: string; cancellationRequests?: readonly { ref: string; reason: string }[];
    additionalItems?: readonly { kind: VacationV5PackageSourceKind; localId: string }[] }): VacationV5ReturnExportPreview {
  const collected = collectVacationV5ReturnChanges(database, input.sourcePackageId, dataDirectory,
    input.cancellationRequests, input.additionalItems);
  const digest = createHash('sha256').update(JSON.stringify(collected.changes)).digest('hex');
  return { digest, changes: collected.changes.map((item) => ({ ref: item.ref, kind: item.kind,
    operation: item.operation, label: label(item.kind, item.data) })),
    documentBytes: collected.changes.reduce((sum, item) => sum + (item.contentBase64
      ? Buffer.from(item.contentBase64, 'base64').length : 0), 0) };
}
