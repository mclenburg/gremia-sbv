import type { DatabaseAdapter } from './databaseService.js';
import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_VERSION, createPackageId, packageRef } from './caseHandoverPolicy.js';
import { encodeDocumentForHandover, sanitizeHandoverDocumentMetadata } from './caseHandoverDocumentCodec.js';
import type { CaseHandoverExportInput } from '../src/domain/models/case-handover.model.js';
import { ensureArray, nowIso, type PackagePayload, type Row } from './caseHandoverSupport.js';
import { OfficeHandoverPayloadService } from './officeHandoverPayloadService.js';

function rows(db: DatabaseAdapter, sql: string, ...params: unknown[]): Row[] {
  try { return db.prepare<Row>(sql).all(...params); } catch { return []; }
}

function row(db: DatabaseAdapter, sql: string, ...params: unknown[]): Row | undefined {
  try { return db.prepare<Row>(sql).get(...params); } catch { return undefined; }
}

export function collectCaseHandoverPayload(
  db: DatabaseAdapter,
  input: CaseHandoverExportInput,
  dataDirProvider: () => string,
): PackagePayload {
  const caseIds = ensureArray(input.caseIds);
  if (!caseIds.length) throw new Error('Für eine Fallübergabe muss mindestens eine Fallakte ausgewählt sein.');
  if (!input.passphrase || input.passphrase.length < 10) throw new Error('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.');
  const measureFilter = new Set(ensureArray(input.measureIds));
  const packageId = createPackageId();
  const createdAt = nowIso();
  const packageType = input.packageType ?? 'vacation_handover';
  if (packageType === 'office_handover' && input.expiresAt) throw new Error('Eine Amtsübergabe darf kein Ablaufdatum enthalten.');
  const payload: PackagePayload = { format: CASE_HANDOVER_FORMAT, version: CASE_HANDOVER_VERSION, packageId, createdAt, expiresAt: input.expiresAt, purpose: input.purpose?.trim() || (packageType === 'office_handover' ? 'Amtsübergabe an die gewählte Nachfolge' : 'Urlaubsübergabe / SBV-Vertretung'), packageType, cases: [], protectedPersons: [], notes: [], measures: [], measureNotes: [], deadlines: [], documents: [] };
  const personIdToRef = new Map<string, string>();
  const caseIdToRef = new Map<string, string>();
  const measureIdToRef = new Map<string, string>();

  caseIds.forEach((caseId, index) => {
    const caseRow = row(db, 'SELECT * FROM cases WHERE id = ?', caseId);
    if (!caseRow) throw new Error(`Fallakte nicht gefunden: ${caseId}`);
    const ref = packageRef('case', index);
    caseIdToRef.set(caseId, ref);
    payload.cases.push({ ref, data: caseRow });
    if (caseRow.protected_person_id && !personIdToRef.has(caseRow.protected_person_id)) {
      const personRow = row(db, 'SELECT * FROM protected_persons WHERE id = ?', caseRow.protected_person_id);
      if (personRow) {
        const personRef = packageRef('person', personIdToRef.size);
        personIdToRef.set(caseRow.protected_person_id, personRef);
        payload.protectedPersons.push({ ref: personRef, data: personRow });
      }
    }
  });

  const placeholders = caseIds.map(() => '?').join(',');
  rows(db, `SELECT * FROM case_notes WHERE case_id IN (${placeholders}) ORDER BY created_at`, ...caseIds)
    .forEach((note, index) => payload.notes.push({ ref: packageRef('note', index), caseRef: caseIdToRef.get(note.case_id)!, data: note }));

  let measureRows = rows(db, `SELECT * FROM case_measures WHERE case_id IN (${placeholders}) ORDER BY created_at`, ...caseIds);
  if (measureFilter.size) measureRows = measureRows.filter((measure) => measureFilter.has(measure.id));
  measureRows.forEach((measure, index) => {
    const ref = packageRef('measure', index);
    measureIdToRef.set(measure.id, ref);
    payload.measures.push({ ref, caseRef: caseIdToRef.get(measure.case_id)!, data: measure });
  });

  if (measureRows.length) {
    const measureIds = measureRows.map((measure) => measure.id);
    const mp = measureIds.map(() => '?').join(',');
    rows(db, `SELECT * FROM case_measure_notes WHERE measure_id IN (${mp}) ORDER BY created_at`, ...measureIds)
      .forEach((note, index) => payload.measureNotes.push({ ref: packageRef('measure_note', index), caseRef: caseIdToRef.get(note.case_id)!, measureRef: measureIdToRef.get(note.measure_id)!, data: note }));
  }

  let deadlineRows = rows(db, `SELECT * FROM deadlines WHERE case_id IN (${placeholders}) ORDER BY created_at`, ...caseIds);
  if (measureFilter.size) deadlineRows = deadlineRows.filter((deadline) => !deadline.measure_id || measureFilter.has(deadline.measure_id));
  deadlineRows.forEach((deadline, index) => payload.deadlines.push({ ref: packageRef('deadline', index), caseRef: deadline.case_id ? caseIdToRef.get(deadline.case_id) : undefined, measureRef: deadline.measure_id ? measureIdToRef.get(deadline.measure_id) : undefined, data: deadline }));

  let documentRows = rows(db, `SELECT * FROM case_documents WHERE case_id IN (${placeholders}) ORDER BY created_at`, ...caseIds);
  if (measureFilter.size) documentRows = documentRows.filter((document) => !document.measure_id || measureFilter.has(document.measure_id));
  documentRows.forEach((document, index) => payload.documents.push({
    ref: packageRef('document', index),
    caseRef: caseIdToRef.get(document.case_id)!,
    measureRef: document.measure_id ? measureIdToRef.get(document.measure_id) : undefined,
    data: sanitizeHandoverDocumentMetadata(document),
    contentBase64: encodeDocumentForHandover(document, dataDirProvider()),
  }));
  if (packageType === 'office_handover') {
    payload.officeData = new OfficeHandoverPayloadService(db, dataDirProvider).collect(payload);
  }
  return payload;
}
