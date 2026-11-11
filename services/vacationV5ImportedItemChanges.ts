import type { DatabaseAdapter } from './databaseService.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { encodeSelectedVacationV5Document } from './vacationV5DocumentCodec.js';
import { isVacationV5PackageSourceKind, vacationV5SourceTable,
  type VacationV5PackageSourceKind } from './vacationV5PackageSource.js';

export interface VacationV5ImportedItemChange {
  ref: string;
  kind: VacationV5PackageSourceKind;
  localId: string;
  status: 'unchanged' | 'changed' | 'missing';
  baselineSha256: string;
  currentSha256: string | null;
}

export function listVacationV5ImportedItemChanges(database: DatabaseAdapter, packageId: string,
  dataDirectory: string): { importId: string; items: VacationV5ImportedItemChange[] } {
  const imported = database.prepare<{ id: string; format_version: number }>(
    'SELECT id, format_version FROM case_handover_imports WHERE package_id = ?').get(packageId);
  if (!imported || imported.format_version !== 5) throw new Error('Kein bestätigter Format-5-Import für diese Rückgabe vorhanden.');
  return { importId: imported.id, items: listItemChanges(database, 'case_handover_import_items',
    'handover_import_id', imported.id, dataDirectory) };
}

export function listVacationV5OriginItemChanges(database: DatabaseAdapter, packageId: string,
  dataDirectory: string): { exportId: string; items: VacationV5ImportedItemChange[] } {
  const exported = database.prepare<{ id: string; format_version: number }>(
    'SELECT id, format_version FROM case_handover_exports WHERE package_id = ?').get(packageId);
  if (!exported || exported.format_version !== 5) throw new Error('Kein bestätigter Format-5-Export für diese Rückgabe vorhanden.');
  return { exportId: exported.id, items: listItemChanges(database, 'case_handover_export_items',
    'handover_export_id', exported.id, dataDirectory) };
}

function listItemChanges(database: DatabaseAdapter, table: 'case_handover_import_items' | 'case_handover_export_items',
  foreignKey: 'handover_import_id' | 'handover_export_id', ledgerId: string,
  dataDirectory: string): VacationV5ImportedItemChange[] {
  const rows = database.prepare<{ package_ref: string; local_entity_type: string; local_entity_id: string; baseline_sha256: string | null }>(
    `SELECT package_ref, local_entity_type, local_entity_id, baseline_sha256 FROM ${table} WHERE ${foreignKey} = ? ORDER BY package_ref`
  ).all(ledgerId);
  if (rows.length > 20_000) throw new Error('Format-5-Import enthält zu viele Ledgerzeilen.');
  const items = rows.map((entry): VacationV5ImportedItemChange => {
    const baselineSha256 = entry.baseline_sha256;
    if (!isVacationV5PackageSourceKind(entry.local_entity_type) || !baselineSha256
      || !/^[0-9a-f]{64}$/.test(baselineSha256)) {
      throw new Error('Format-5-Importledger enthält eine unbekannte Zeile oder fehlende Ausgangsbasis.');
    }
    const kind = entry.local_entity_type;
    const table = vacationV5SourceTable(kind);
    const current = database.prepare<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`).get(entry.local_entity_id);
    const contentBase64 = current && kind === 'case_document'
      ? encodeSelectedVacationV5Document(current, dataDirectory).contentBase64 : undefined;
    const currentSha256 = current ? caseHandoverBaselineHash(current, contentBase64) : null;
    return { ref: entry.package_ref, kind, localId: entry.local_entity_id,
      status: currentSha256 === null ? 'missing' : currentSha256 === baselineSha256 ? 'unchanged' : 'changed',
      baselineSha256, currentSha256 };
  });
  return items;
}
