import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { assertVacationV5ReturnChanges } from './vacationV5ReturnChanges.js';
import { previewVacationV5ReturnPayload } from './vacationV5ReturnPreview.js';
import { listVacationV5OriginItemChanges } from './vacationV5ImportedItemChanges.js';
import { VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditCaseHandoverImported } from './auditEventBuilders.js';
import type { VacationV5ReturnPayload } from './vacationV5ReturnTransport.js';

export interface VacationV5ReturnChoice {
  ref: string;
  action: 'accept_update' | 'accept_addition' | 'keep_origin' | 'acknowledge_cancellation';
  expectedOriginSha256: string | null;
}

const LINK_COLUMN: Readonly<Record<string, Record<string, { kind: string; column: string }>>> = {
  meeting_agenda: { meetingRef: { kind: 'meeting', column: 'meeting_id' } },
  recruiting_interview: { recruitingRef: { kind: 'recruiting', column: 'recruiting_participation_id' } },
  inclusion_topic: { agreementRef: { kind: 'inclusion_agreement', column: 'agreement_id' } },
  violation_event: { violationRef: { kind: 'violation', column: 'violation_id' } },
};
const PROCESS_PARENT: Readonly<Record<string, string>> = {
  sbv_meeting: 'meeting', recruiting_participation: 'recruiting',
  employer_obligation_review: 'employer_obligation', inclusion_agreement: 'inclusion_agreement',
  sbv_participation_violation: 'violation', sbv_assembly: 'assembly',
};
const ADDITION_ORDER = ['meeting', 'recruiting', 'employer_obligation', 'inclusion_agreement',
  'violation', 'assembly', 'inclusion_officer', 'meeting_agenda', 'recruiting_interview',
  'inclusion_topic', 'violation_event', 'deadline'] as const;

function insertAddition(database: DatabaseAdapter, change: { ref: string; kind: string;
  data: Record<string, string | number | boolean | null>; links?: Record<string, string> },
  targets: Map<string, { kind: string; localId: string }>, timestamp: string): string {
  const config = VACATION_V5_ROW_FIELDS[change.kind as keyof typeof VACATION_V5_ROW_FIELDS];
  const localId = randomUUID();
  const values: Record<string, string | number | boolean | null> = {
    ...change.data, id: localId, created_at: timestamp,
  };
  if ((config.fields as readonly string[]).includes('updated_at')) values.updated_at = timestamp;
  if (change.kind === 'violation') values.source_context_id = localId;
  const rules = change.kind === 'deadline' && change.links?.processRef
    ? { processRef: { kind: PROCESS_PARENT[String(change.data.process_type)], column: 'process_id' } }
    : LINK_COLUMN[change.kind] ?? {};
  for (const [name, ref] of Object.entries(change.links ?? {})) {
    const rule = rules[name];
    const target = targets.get(ref);
    if (!rule?.kind || !target || target.kind !== rule.kind) {
      throw new Error('Neuer Rückgabevorgang enthält eine nicht übernommene Elternbeziehung.');
    }
    values[rule.column] = target.localId;
  }
  const fields = Object.keys(values);
  database.prepare(`INSERT INTO ${config.table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`)
    .run(...fields.map((field) => values[field]));
  return localId;
}

function assertOriginalLinks(kind: string, links: Record<string, string> | undefined,
  row: Record<string, unknown>, targets: Map<string, { kind: string; localId: string }>): void {
  const expected = kind === 'deadline' && links?.processRef
    ? { processRef: { kind: PROCESS_PARENT[String(row.process_type)], column: 'process_id' } }
    : LINK_COLUMN[kind] ?? {};
  for (const [name, ref] of Object.entries(links ?? {})) {
    const rule = expected[name];
    const target = targets.get(ref);
    if (!rule || !rule.kind || !target || target.kind !== rule.kind || row[rule.column] !== target.localId) {
      throw new Error('Rückgabe ändert eine bestehende Elternbeziehung; bitte einzeln klären.');
    }
  }
}

export function importConfirmedVacationV5Return(database: DatabaseAdapter, payload: VacationV5ReturnPayload,
  choices: readonly VacationV5ReturnChoice[], dataDirectory: string):
  { importId: string; acceptedCount: number; reviewedCount: number } {
  if (payload.packageType !== 'return_delta' || payload.version !== 5) throw new Error('Kein Format-5-Rückgabepaket.');
  const changes = assertVacationV5ReturnChanges(payload.changes);
  return new DatabaseUnitOfWork(database).run(() => {
    if (database.prepare<{ id: string }>('SELECT id FROM case_handover_imports WHERE package_id = ?').get(payload.packageId)) {
      throw new Error('Dieses Rückgabepaket wurde bereits übernommen.');
    }
    const preview = previewVacationV5ReturnPayload(database, payload, dataDirectory);
    const source = database.prepare<{ status: string }>('SELECT status FROM case_handover_exports WHERE id = ?').get(preview.exportId);
    if (source?.status !== 'open') throw new Error('Das Ausgangspaket wurde bereits zurückgenommen.');
    const currentByRef = new Map(listVacationV5OriginItemChanges(database, payload.sourcePackageId,
      dataDirectory).items.map((item) => [item.ref, item]));
    const choicesByRef = new Map<string, VacationV5ReturnChoice>();
    for (const choice of choices) {
      if (!choice || typeof choice.ref !== 'string' || choicesByRef.has(choice.ref)
        || !['accept_update', 'accept_addition', 'keep_origin', 'acknowledge_cancellation'].includes(choice.action)
        || (choice.expectedOriginSha256 !== null && !/^[0-9a-f]{64}$/.test(choice.expectedOriginSha256))) {
        throw new Error('Rückgabeentscheidung enthält ungültige oder doppelte Referenzen.');
      }
      choicesByRef.set(choice.ref, choice);
    }
    if (choicesByRef.size !== preview.items.length) throw new Error('Nicht alle Rückgabeänderungen wurden entschieden.');
    const exportItems = database.prepare<{ package_ref: string; local_entity_type: string; local_entity_id: string }>(`
      SELECT package_ref, local_entity_type, local_entity_id FROM case_handover_export_items
      WHERE handover_export_id = ?`).all(preview.exportId);
    const targets = new Map(exportItems.map((item) => [item.package_ref,
      { kind: item.local_entity_type, localId: item.local_entity_id }]));
    const changeByRef = new Map(changes.map((change) => [change.ref, change]));
    const timestamp = new Date().toISOString();
    const importId = randomUUID();
    const accepted: Array<{ ref: string; kind: string; localId: string; baselineSha256: string }> = [];
    let reviewedCount = 0;
    const plannedItems = [...preview.items].sort((a, b) => {
      if (a.decision !== 'review_addition' && b.decision === 'review_addition') return -1;
      if (a.decision === 'review_addition' && b.decision !== 'review_addition') return 1;
      return ADDITION_ORDER.indexOf(a.kind as typeof ADDITION_ORDER[number])
        - ADDITION_ORDER.indexOf(b.kind as typeof ADDITION_ORDER[number]);
    });
    for (const planned of plannedItems) {
      const choice = choicesByRef.get(planned.ref);
      const change = changeByRef.get(planned.ref);
      const current = currentByRef.get(planned.ref);
      if (!choice || !change || choice.expectedOriginSha256 !== (current?.currentSha256 ?? null)) {
        throw new Error('Rückgabebasis hat sich seit der Entscheidung geändert.');
      }
      if (planned.decision === 'review_removal') {
        if (choice.action !== 'acknowledge_cancellation') throw new Error('Stornowunsch benötigt eine ausdrückliche Prüfentscheidung.');
        reviewedCount += 1;
        continue;
      }
      if (choice.action === 'keep_origin') { reviewedCount += 1; continue; }
      if (planned.decision === 'review_addition' && choice.action === 'accept_addition'
        && change.operation === 'upsert' && change.deputyBaselineSha256 === null
        && change.data && Object.hasOwn(VACATION_V5_ROW_FIELDS, change.kind)) {
        const localId = insertAddition(database, change as typeof change & {
          data: Record<string, string | number | boolean | null> }, targets, timestamp);
        targets.set(change.ref, { kind: change.kind, localId });
        const config = VACATION_V5_ROW_FIELDS[change.kind as keyof typeof VACATION_V5_ROW_FIELDS];
        const stored = database.prepare<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE id = ?`).get(localId);
        if (!stored) throw new Error('Neuer Rückgabevorgang konnte nicht bestätigt werden.');
        accepted.push({ ref: change.ref, kind: change.kind, localId, baselineSha256: caseHandoverBaselineHash(stored) });
        continue;
      }
      if (planned.decision !== 'propose_update' || choice.action !== 'accept_update'
        || change.operation !== 'upsert' || !change.data
        || !Object.hasOwn(VACATION_V5_ROW_FIELDS, change.kind)) {
        throw new Error('Diese Rückgabe kann nur nach gesonderter fachlicher Prüfung übernommen werden.');
      }
      const target = targets.get(change.ref);
      if (!target || target.kind !== change.kind || !current || current.status !== 'unchanged') {
        throw new Error('Rückgabe kann keinem unveränderten Ausgangsvorgang zugeordnet werden.');
      }
      const config = VACATION_V5_ROW_FIELDS[change.kind as keyof typeof VACATION_V5_ROW_FIELDS];
      const row = database.prepare<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE id = ?`).get(target.localId);
      if (!row) throw new Error('Ausgangsvorgang wurde entfernt.');
      if (change.kind === 'deadline' && change.data.process_type !== row.process_type
        || change.kind === 'violation' && change.data.source_context_type !== row.source_context_type) {
        throw new Error('Rückgabe ändert die Zuordnung eines Ausgangsvorgangs; bitte einzeln klären.');
      }
      assertOriginalLinks(change.kind, change.links, row, targets);
      const fields = Object.keys(change.data).filter((field) => field !== 'created_at' && field !== 'updated_at');
      if ((config.fields as readonly string[]).includes('updated_at')) fields.push('updated_at');
      if (!fields.length) throw new Error('Rückgabe enthält keine übernehmbaren Felder.');
      const values = fields.map((field) => field === 'updated_at' ? timestamp : change.data![field]);
      database.prepare(`UPDATE ${config.table} SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`)
        .run(...values, target.localId);
      const stored = database.prepare<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE id = ?`).get(target.localId);
      if (!stored) throw new Error('Übernommener Rückgabevorgang konnte nicht bestätigt werden.');
      accepted.push({ ref: change.ref, kind: change.kind, localId: target.localId,
        baselineSha256: caseHandoverBaselineHash(stored) });
    }
    database.prepare(`INSERT INTO case_handover_imports
      (id, package_id, imported_at, valid_until, status, mode, updated_case_count, metadata_json,
        origin_key_fingerprint, target_key_fingerprint, format_version, source_package_id)
      VALUES (?, ?, ?, ?, 'taken_over', 'return_delta', 0, ?, ?, ?, 5, ?)`)
      .run(importId, payload.packageId, timestamp, payload.expiresAt,
        JSON.stringify({ acceptedCount: accepted.length, reviewedCount }),
        payload.origin.keyFingerprint, payload.target.keyFingerprint, payload.sourcePackageId);
    for (const item of accepted) {
      database.prepare(`INSERT INTO case_handover_import_items
        (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at, baseline_sha256)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(randomUUID(), importId, item.kind, item.localId, item.ref, timestamp, item.baselineSha256);
    }
    database.prepare("UPDATE case_handover_exports SET status = 'taken_over' WHERE id = ?").run(preview.exportId);
    new PersonalDataAuditLogService(database).append(auditCaseHandoverImported({
      packageId: payload.packageId, caseCount: 0, mode: 'return_delta', result: 'success',
    }));
    return { importId, acceptedCount: accepted.length, reviewedCount };
  });
}
