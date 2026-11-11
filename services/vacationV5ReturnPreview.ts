import type { DatabaseAdapter } from './databaseService.js';
import { listVacationV5OriginItemChanges } from './vacationV5ImportedItemChanges.js';
import { planVacationV5Return, type VacationV5ReturnInventoryItem,
  type VacationV5ReturnAddition, type VacationV5PlannedReturnItem } from '../src/domain/transfer/vacationV5ReturnPlan.js';
import { assertVacationV5ReturnChanges } from './vacationV5ReturnChanges.js';

/** Read-only comparison of a verified deputy's return against the source export ledger. */
export function previewVacationV5Return(database: DatabaseAdapter, sourcePackageId: string,
  senderKeyFingerprint: string, deputyItems: readonly VacationV5ReturnInventoryItem[],
  dataDirectory: string, options: { cancellationRefs?: readonly string[];
    additions?: readonly VacationV5ReturnAddition[] } = {}):
  { exportId: string; items: VacationV5PlannedReturnItem[] } {
  const source = database.prepare<{ id: string; target_key_fingerprint: string | null }>(`
    SELECT id, target_key_fingerprint FROM case_handover_exports
    WHERE package_id = ? AND package_type = 'vacation_handover' AND format_version = 5
  `).get(sourcePackageId);
  if (!source || !/^[0-9a-f]{64}$/.test(senderKeyFingerprint)
    || source.target_key_fingerprint !== senderKeyFingerprint) {
    throw new Error('Rückgabe stammt nicht von der bestätigten Zielinstanz des Ausgangspakets.');
  }
  const origin = listVacationV5OriginItemChanges(database, sourcePackageId, dataDirectory);
  if (origin.exportId !== source.id) throw new Error('Rückgabe enthält eine widersprüchliche Exportzuordnung.');
  return { exportId: source.id, items: planVacationV5Return(deputyItems, origin.items, options) };
}

export function previewVacationV5ReturnPayload(database: DatabaseAdapter, payload: {
  sourcePackageId: string; origin: { keyFingerprint: string }; changes: unknown;
}, dataDirectory: string): { exportId: string; items: VacationV5PlannedReturnItem[] } {
  const changes = assertVacationV5ReturnChanges(payload.changes);
  const existing = changes.filter((change) => change.deputyBaselineSha256 !== null);
  const deputyItems: VacationV5ReturnInventoryItem[] = existing.map((change) => ({
    ref: change.ref, kind: change.kind, baselineSha256: change.deputyBaselineSha256!,
    currentSha256: change.deputyCurrentSha256,
    status: change.deputyCurrentSha256 === null ? 'missing'
      : change.deputyCurrentSha256 === change.deputyBaselineSha256 ? 'unchanged' : 'changed',
  }));
  return previewVacationV5Return(database, payload.sourcePackageId, payload.origin.keyFingerprint,
    deputyItems, dataDirectory, { cancellationRefs: changes.filter((change) => change.operation === 'cancel_request')
      .map((change) => change.ref), additions: changes.filter((change) => change.deputyBaselineSha256 === null)
        .map((change) => ({ ref: change.ref, kind: change.kind, currentSha256: change.deputyCurrentSha256! })) });
}
