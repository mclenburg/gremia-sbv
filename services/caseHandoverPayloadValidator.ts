import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_VERSION } from './caseHandoverPolicy.js';
import { isRecord, type PackagePayload } from './caseHandoverSupport.js';
import { ElectionTransferCryptoAdapter } from './electionTransferCryptoAdapter.js';

const FORBIDDEN_DOCUMENT_FIELDS = ['storage_path', 'document_key', 'iv', 'auth_tag'] as const;
const MAX_SINGLE_DOCUMENT_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_DOCUMENT_BYTES = 180 * 1024 * 1024;

function assertUniqueRefs(label: string, refs: unknown[]): void {
  if (refs.some((ref) => typeof ref !== 'string' || !ref)) throw new Error(`${label} im Fallübergabepaket enthalten ungültige Referenzen.`);
  if (new Set(refs).size !== refs.length) throw new Error(`${label} im Fallübergabepaket enthalten doppelte Referenzen.`);
}

function assertTransferItems(items: unknown[], label: string): void {
  if (items.some((item) => !isRecord(item) || typeof item.ref !== 'string' || !isRecord(item.data))) {
    throw new Error(`${label} im Fallübergabepaket enthalten ungültige Einträge.`);
  }
  assertUniqueRefs(label, items.map((item) => (item as Record<string, unknown>).ref));
}

function decodedBase64Size(value: unknown): number {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error('Fallübergabepaket enthält ungültige Dokumentdaten.');
  }
  const decoded = Buffer.from(value, 'base64');
  try {
    const canonical = decoded.toString('base64');
    if (canonical !== value) throw new Error('Fallübergabepaket enthält ungültige Dokumentdaten.');
    if (decoded.length > MAX_SINGLE_DOCUMENT_BYTES) throw new Error('Ein Dokument im Fallübergabepaket überschreitet die zulässige Größe.');
    return decoded.length;
  } finally {
    decoded.fill(0);
  }
}

function assertDocumentMetadata(data: Record<string, unknown>, formatVersion: number): void {
  const populatedForbidden = FORBIDDEN_DOCUMENT_FIELDS.some((field) => data[field] !== undefined && data[field] !== null && data[field] !== '');
  const forbiddenKeyPresent = formatVersion >= CASE_HANDOVER_VERSION && FORBIDDEN_DOCUMENT_FIELDS.some((field) => Object.hasOwn(data, field));
  if (populatedForbidden || forbiddenKeyPresent) throw new Error('Fallübergabepaket enthält lokale Dokument-Schlüsseldaten.');
}

function assertOfficePayload(payload: PackagePayload, formatVersion: number): number {
  const office = payload.officeData;
  if (!office || !isRecord(office) || office.activityJournalIncluded !== false) throw new Error('Amtsübergabepaket enthält keinen gültigen Amtsbestand.');
  const collections: Array<[string, unknown]> = [
    ['Amtsvorlagen', office.documentTemplates],
    ['Fristvorlagen', office.deadlineTemplates],
    ['Datenschutzstatus', office.privacyReviews],
    ['Wahlakten', office.elections],
    ['Wahldokumente', office.electionDocuments],
  ];
  for (const [label, value] of collections) {
    if (!Array.isArray(value)) throw new Error('Amtsübergabepaket enthält unvollständige Amtsdaten.');
    assertTransferItems(value, label);
  }
  if (!isRecord(office.retentionSettings) || !isRecord(office.retentionSettings.moduleRules)) {
    throw new Error('Amtsübergabepaket enthält keine gültigen Aufbewahrungsregeln.');
  }
  const caseRefs = new Set(payload.cases.map((item) => item.ref));
  for (const review of office.privacyReviews) {
    if (!caseRefs.has(review.caseRef) || typeof review.data.reason !== 'string' || typeof review.data.due_at !== 'string') {
      throw new Error('Amtsübergabepaket enthält ungültige Datenschutzreferenzen.');
    }
  }
  const electionRefs = new Set(office.elections.map((item) => item.ref));
  const electionCrypto = new ElectionTransferCryptoAdapter();
  for (const election of office.elections) electionCrypto.validatePayload(election.data);
  let totalBytes = 0;
  for (const document of office.electionDocuments) {
    if (!electionRefs.has(document.electionRef)) throw new Error('Amtsübergabepaket enthält ungültige Wahldokumente.');
    assertDocumentMetadata(document.data, formatVersion);
    totalBytes += decodedBase64Size(document.contentBase64);
  }
  return totalBytes;
}

export function assertCaseHandoverPayload(value: unknown, formatVersion: number): PackagePayload {
  if (!isRecord(value)) throw new Error('Fallübergabepaket enthält keine gültige Nutzdatenstruktur.');
  if (value.format !== CASE_HANDOVER_FORMAT || value.version !== formatVersion) throw new Error('Fallübergabepaket enthält eine widersprüchliche Formatversion.');
  if (typeof value.packageId !== 'string' || !value.packageId) throw new Error('Fallübergabepaket enthält keine gültige Paketkennung.');
  if (typeof value.createdAt !== 'string' || !value.createdAt) throw new Error('Fallübergabepaket enthält kein gültiges Erstellungsdatum.');
  if (value.expiresAt !== undefined && typeof value.expiresAt !== 'string') throw new Error('Fallübergabepaket enthält kein gültiges Ablaufdatum.');
  if (value.packageType !== undefined && !['vacation_handover', 'return_delta', 'office_handover'].includes(String(value.packageType))) throw new Error('Fallübergabepaket enthält einen ungültigen Übergabetyp.');
  if (value.packageType === 'return_delta' && typeof value.sourcePackageId !== 'string') throw new Error('Rückgabepaket enthält keine Ausgangspaket-Zuordnung.');
  if (value.packageType === 'office_handover' && (formatVersion < CASE_HANDOVER_VERSION || value.expiresAt !== undefined)) throw new Error('Amtsübergabepaket verwendet ein unzulässiges Format oder Ablaufdatum.');

  const payload = value as unknown as PackagePayload;
  const collections: Array<[string, unknown]> = [
    ['Fallakten', payload.cases], ['Personen', payload.protectedPersons], ['Notizen', payload.notes],
    ['Maßnahmen', payload.measures], ['Maßnahmennotizen', payload.measureNotes], ['Fristen', payload.deadlines], ['Dokumente', payload.documents],
  ];
  for (const [label, collection] of collections) {
    if (!Array.isArray(collection)) throw new Error('Fallübergabepaket enthält keine gültige Nutzdatenstruktur.');
    assertTransferItems(collection, label);
  }
  if (!payload.cases.length) throw new Error('Fallübergabepaket enthält keine Fallakte.');
  const caseRefs = new Set(payload.cases.map((item) => item.ref));
  const measureRefs = new Set(payload.measures.map((item) => item.ref));
  for (const item of [...payload.notes, ...payload.measures]) if (!caseRefs.has(item.caseRef)) throw new Error('Fallübergabepaket enthält ungültige Fallreferenzen.');
  for (const item of payload.measureNotes) if (!caseRefs.has(item.caseRef) || !measureRefs.has(item.measureRef)) throw new Error('Fallübergabepaket enthält ungültige Maßnahmenreferenzen.');
  for (const item of payload.deadlines) {
    if (item.caseRef && !caseRefs.has(item.caseRef)) throw new Error('Fallübergabepaket enthält ungültige Fristreferenzen.');
    if (item.measureRef && !measureRefs.has(item.measureRef)) throw new Error('Fallübergabepaket enthält ungültige Fristreferenzen.');
  }
  let totalDocumentBytes = 0;
  for (const item of payload.documents) {
    if (!caseRefs.has(item.caseRef) || (item.measureRef && !measureRefs.has(item.measureRef))) throw new Error('Fallübergabepaket enthält ungültige Dokumentreferenzen.');
    assertDocumentMetadata(item.data, formatVersion);
    totalDocumentBytes += decodedBase64Size(item.contentBase64);
  }
  if (payload.packageType === 'office_handover') totalDocumentBytes += assertOfficePayload(payload, formatVersion);
  else if (payload.officeData !== undefined) throw new Error('Fallübergabepaket enthält unerwartete Amtsdaten.');
  if (totalDocumentBytes > MAX_TOTAL_DOCUMENT_BYTES) throw new Error('Die Dokumentdaten im Fallübergabepaket überschreiten die zulässige Gesamtgröße.');
  return payload;
}
