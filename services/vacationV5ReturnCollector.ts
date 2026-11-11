import type { DatabaseAdapter } from './databaseService.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { listVacationV5ImportedItemChanges } from './vacationV5ImportedItemChanges.js';
import { isVacationV5PackageSourceKind, vacationV5SourceTable,
  type VacationV5PackageSourceKind } from './vacationV5PackageSource.js';
import { projectVacationV5CaseRow, VACATION_V5_CASE_ROW_FIELDS } from './vacationV5CaseRowPolicy.js';
import { projectVacationV5Row, VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';
import { projectVacationV5OfficeDocumentData } from './vacationV5OfficeDocumentGraph.js';
import { encodeSelectedVacationV5Document } from './vacationV5DocumentCodec.js';
import { assertVacationV5ReturnChanges } from './vacationV5ReturnChanges.js';

export interface VacationV5ReturnChange {
  ref: string;
  kind: VacationV5PackageSourceKind;
  operation: 'upsert' | 'cancel_request';
  deputyBaselineSha256: string | null;
  deputyCurrentSha256: string | null;
  data?: Record<string, string | number | boolean | null>;
  links?: Record<string, string>;
  contentBase64?: string;
  reason?: string;
}

const PROCESS_PARENT: Readonly<Record<string, VacationV5PackageSourceKind>> = {
  sbv_meeting: 'meeting', recruiting_participation: 'recruiting',
  employer_obligation_review: 'employer_obligation', inclusion_agreement: 'inclusion_agreement',
  sbv_participation_violation: 'violation', sbv_assembly: 'assembly',
};
const WORKFLOW_OWNER: Readonly<Record<string, VacationV5PackageSourceKind>> = {
  meeting: 'meeting', assembly: 'assembly', employer_obligation_review: 'employer_obligation',
  inclusion_agreement: 'inclusion_agreement',
};

function project(kind: VacationV5PackageSourceKind, row: Record<string, unknown>): VacationV5ReturnChange['data'] {
  if (kind === 'case_deadline') return projectVacationV5Row('deadline', row);
  if (Object.hasOwn(VACATION_V5_CASE_ROW_FIELDS, kind)) return projectVacationV5CaseRow(kind, row);
  if (Object.hasOwn(VACATION_V5_ROW_FIELDS, kind)) return projectVacationV5Row(kind, row);
  return projectVacationV5OfficeDocumentData(kind as 'generated_document' | 'workflow_document_link' | 'violation_document_link', row);
}

function relations(kind: VacationV5PackageSourceKind, row: Record<string, unknown>,
  refFor: (kind: VacationV5PackageSourceKind, id: unknown) => string): Record<string, string> {
  const links: Record<string, string> = {};
  const add = (name: string, targetKind: VacationV5PackageSourceKind, id: unknown, required = true) => {
    if (id === null || id === undefined || id === '') {
      if (required) throw new Error('Rückgabe enthält eine fehlende Elternbeziehung.');
      return;
    }
    links[name] = refFor(targetKind, id);
  };
  switch (kind) {
    case 'case': add('protectedPersonRef', 'protected_person', row.protected_person_id, false); break;
    case 'case_note': case 'case_measure': add('caseRef', 'case', row.case_id); break;
    case 'case_measure_note':
      add('caseRef', 'case', row.case_id); add('measureRef', 'case_measure', row.measure_id); break;
    case 'case_deadline': case 'case_document':
      add('caseRef', 'case', row.case_id); add('measureRef', 'case_measure', row.measure_id, false); break;
    case 'meeting_agenda': add('meetingRef', 'meeting', row.meeting_id); break;
    case 'recruiting_interview': add('recruitingRef', 'recruiting', row.recruiting_participation_id); break;
    case 'inclusion_topic': add('agreementRef', 'inclusion_agreement', row.agreement_id); break;
    case 'violation_event': add('violationRef', 'violation', row.violation_id); break;
    case 'deadline': {
      const parent = PROCESS_PARENT[String(row.process_type)];
      if (parent) add('processRef', parent, row.process_id);
      break;
    }
    case 'workflow_document_link': {
      const owner = WORKFLOW_OWNER[String(row.owner_type)];
      if (!owner) throw new Error('Rückgabe enthält einen unbekannten Dokumenteigentümer.');
      add('ownerRef', owner, row.owner_id);
      add('documentRef', 'generated_document', row.document_id);
      break;
    }
    case 'violation_document_link':
      add('ownerRef', 'violation', row.violation_id);
      add('documentRef', 'generated_document', row.document_id);
      break;
  }
  return links;
}

/** Collects existing imported rows only. New local descendants need an explicit later selection. */
export function collectVacationV5ReturnChanges(database: DatabaseAdapter, sourcePackageId: string,
  dataDirectory: string, cancellationRequests: readonly { ref: string; reason: string }[] = [],
  additionalItems: readonly { kind: VacationV5PackageSourceKind; localId: string }[] = []):
  { importId: string; changes: VacationV5ReturnChange[] } {
  const inventory = listVacationV5ImportedItemChanges(database, sourcePackageId, dataDirectory);
  const byRef = new Map(inventory.items.map((item) => [item.ref, item]));
  const refByLocal = new Map(inventory.items.map((item) => [`${item.kind}:${item.localId}`, item.ref]));
  if (additionalItems.length > 1000) throw new Error('Rückgabe enthält zu viele neue Vorgänge.');
  const additions: Array<{ kind: VacationV5PackageSourceKind; localId: string; ref: string }> = [];
  const additionCounts = new Map<string, number>();
  for (const item of additionalItems) {
    if (!isVacationV5PackageSourceKind(item.kind) || typeof item.localId !== 'string' || !item.localId.trim()
      || refByLocal.has(`${item.kind}:${item.localId}`)) {
      throw new Error('Neuer Rückgabevorgang ist unbekannt oder bereits im Ausgangspaket vorhanden.');
    }
    const count = (additionCounts.get(item.kind) ?? 0) + 1;
    additionCounts.set(item.kind, count);
    const ref = `return_${item.kind}_${count}`;
    refByLocal.set(`${item.kind}:${item.localId}`, ref);
    additions.push({ ...item, ref });
  }
  const cancellations = new Map<string, string>();
  for (const request of cancellationRequests) {
    if (!byRef.has(request.ref) || cancellations.has(request.ref)
      || typeof request.reason !== 'string' || !request.reason.trim()
      || request.reason.length > 2000) throw new Error('Rückgabe enthält einen ungültigen Stornowunsch.');
    cancellations.set(request.ref, request.reason.trim());
  }
  const refFor = (kind: VacationV5PackageSourceKind, id: unknown): string => {
    if (typeof id !== 'string') throw new Error('Rückgabe enthält eine ungültige lokale Beziehung.');
    const ref = refByLocal.get(`${kind}:${id}`);
    if (!ref) throw new Error('Rückgabe enthält eine Beziehung außerhalb des Ausgangspakets.');
    return ref;
  };
  const changes: VacationV5ReturnChange[] = [];
  for (const item of inventory.items) {
    const reason = cancellations.get(item.ref);
    if (reason) {
      changes.push({ ref: item.ref, kind: item.kind, operation: 'cancel_request',
        deputyBaselineSha256: item.baselineSha256, deputyCurrentSha256: item.currentSha256, reason });
      continue;
    }
    if (item.status === 'missing') throw new Error('Entfernte Vertretungskopie benötigt einen Stornowunsch.');
    if (item.status === 'unchanged') continue;
    const table = vacationV5SourceTable(item.kind);
    const row = database.prepare<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`).get(item.localId);
    if (!row) throw new Error('Rückgabevorgang wurde während der Sammlung entfernt.');
    const contentBase64 = item.kind === 'case_document' || item.kind === 'generated_document'
      ? encodeSelectedVacationV5Document(row, dataDirectory).contentBase64 : undefined;
    if (caseHandoverBaselineHash(row, contentBase64) !== item.currentSha256) {
      throw new Error('Rückgabevorgang wurde während der Sammlung geändert.');
    }
    const links = relations(item.kind, row, refFor);
    changes.push({ ref: item.ref, kind: item.kind, operation: 'upsert',
      deputyBaselineSha256: item.baselineSha256, deputyCurrentSha256: item.currentSha256!,
      data: project(item.kind, row), ...(Object.keys(links).length ? { links } : {}),
      ...(contentBase64 === undefined ? {} : { contentBase64 }),
    });
  }
  for (const item of additions) {
    const table = vacationV5SourceTable(item.kind);
    const row = database.prepare<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`).get(item.localId);
    if (!row) throw new Error('Ausgewählter neuer Rückgabevorgang wurde nicht gefunden.');
    const contentBase64 = item.kind === 'case_document' || item.kind === 'generated_document'
      ? encodeSelectedVacationV5Document(row, dataDirectory).contentBase64 : undefined;
    const links = relations(item.kind, row, refFor);
    changes.push({ ref: item.ref, kind: item.kind, operation: 'upsert', deputyBaselineSha256: null,
      deputyCurrentSha256: caseHandoverBaselineHash(row, contentBase64), data: project(item.kind, row),
      ...(Object.keys(links).length ? { links } : {}),
      ...(contentBase64 === undefined ? {} : { contentBase64 }) });
  }
  return { importId: inventory.importId, changes: assertVacationV5ReturnChanges(changes) };
}
