import { createHash } from 'node:crypto';
import { assertVacationV5CaseRow, VACATION_V5_CASE_ROW_FIELDS } from './vacationV5CaseRowPolicy.js';
import { assertVacationV5Row, VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';
import { assertVacationV5OfficeDocumentData } from './vacationV5OfficeDocumentGraph.js';
import { VACATION_V5_MAX_DOCUMENT_BYTES, VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES } from './vacationV5DocumentCodec.js';
import { isVacationV5PackageSourceKind, type VacationV5PackageSourceKind } from './vacationV5PackageSource.js';
import type { VacationV5ReturnChange } from './vacationV5ReturnCollector.js';

const LINK_RULES: Partial<Record<VacationV5PackageSourceKind, { required: readonly string[]; optional?: readonly string[] }>> = {
  case: { required: [], optional: ['protectedPersonRef'] },
  case_note: { required: ['caseRef'] }, case_measure: { required: ['caseRef'] },
  case_measure_note: { required: ['caseRef', 'measureRef'] },
  case_deadline: { required: ['caseRef'], optional: ['measureRef'] },
  case_document: { required: ['caseRef'], optional: ['measureRef'] },
  meeting_agenda: { required: ['meetingRef'] }, recruiting_interview: { required: ['recruitingRef'] },
  inclusion_topic: { required: ['agreementRef'] }, violation_event: { required: ['violationRef'] },
  deadline: { required: [], optional: ['processRef'] },
  workflow_document_link: { required: ['ownerRef', 'documentRef'] },
  violation_document_link: { required: ['ownerRef', 'documentRef'] },
};
const PROCESS_PARENT = new Set(['sbv_meeting', 'recruiting_participation', 'employer_obligation_review',
  'inclusion_agreement', 'sbv_participation_violation', 'sbv_assembly']);
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) =>
  required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
const hash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const ref = (value: unknown): value is string => typeof value === 'string'
  && /^[a-z_]+_[1-9][0-9]*$/.test(value) && value.length <= 120;

function assertData(kind: VacationV5PackageSourceKind, value: unknown): VacationV5ReturnChange['data'] {
  if (kind === 'case_deadline') return assertVacationV5Row('deadline', value);
  if (Object.hasOwn(VACATION_V5_CASE_ROW_FIELDS, kind)) return assertVacationV5CaseRow(kind, value);
  if (Object.hasOwn(VACATION_V5_ROW_FIELDS, kind)) return assertVacationV5Row(kind, value);
  return assertVacationV5OfficeDocumentData(kind as 'generated_document' | 'workflow_document_link' | 'violation_document_link', value);
}

function assertLinks(kind: VacationV5PackageSourceKind, value: unknown,
  data: VacationV5ReturnChange['data']): VacationV5ReturnChange['links'] {
  const rule = LINK_RULES[kind];
  if (!rule) {
    if (value !== undefined) throw new Error('Rückgabe enthält unerwartete Beziehungen.');
    return undefined;
  }
  if (value === undefined) {
    if (rule.required.length || kind === 'deadline' && PROCESS_PARENT.has(String(data?.process_type))) {
      throw new Error('Rückgabe enthält eine fehlende Paketbeziehung.');
    }
    return undefined;
  }
  if (!record(value) || !exact(value, rule.required, rule.optional)
    || Object.values(value).some((item) => !ref(item))) {
    throw new Error('Rückgabe enthält ungültige Paketbeziehungen.');
  }
  if (kind === 'deadline' && Boolean(Object.hasOwn(value, 'processRef')) !== PROCESS_PARENT.has(String(data?.process_type))) {
    throw new Error('Rückgabefrist enthält eine widersprüchliche Vorgangsbeziehung.');
  }
  return value as Record<string, string>;
}

export function assertVacationV5ReturnChanges(input: unknown): VacationV5ReturnChange[] {
  if (!Array.isArray(input) || input.length > 20_000) throw new Error('Format-5-Rückgabe enthält zu viele Änderungen.');
  const refs = new Set<string>();
  const changes: VacationV5ReturnChange[] = [];
  let documentBytes = 0;
  let metadataBytes = 0;
  for (const source of input) {
    if (!record(source) || !ref(source.ref) || refs.has(source.ref)
      || typeof source.kind !== 'string' || !isVacationV5PackageSourceKind(source.kind)
      || (source.deputyBaselineSha256 !== null && !hash(source.deputyBaselineSha256))
      || (source.deputyCurrentSha256 !== null && !hash(source.deputyCurrentSha256))) {
      throw new Error('Format-5-Rückgabe enthält ungültige oder doppelte Referenzen.');
    }
    refs.add(source.ref);
    const kind = source.kind;
    if (source.operation === 'cancel_request') {
      if (!exact(source, ['ref', 'kind', 'operation', 'deputyBaselineSha256', 'deputyCurrentSha256', 'reason'])
        || !hash(source.deputyBaselineSha256)
        || typeof source.reason !== 'string' || !source.reason.trim() || source.reason.length > 2000) {
        throw new Error('Format-5-Rückgabe enthält einen ungültigen Stornowunsch.');
      }
      changes.push({ ref: source.ref, kind, operation: 'cancel_request',
        deputyBaselineSha256: source.deputyBaselineSha256, deputyCurrentSha256: source.deputyCurrentSha256,
        reason: source.reason.trim() });
    } else if (source.operation === 'upsert') {
      if (!exact(source, ['ref', 'kind', 'operation', 'deputyBaselineSha256', 'deputyCurrentSha256', 'data'],
        ['links', 'contentBase64']) || !hash(source.deputyCurrentSha256)
        || (source.deputyBaselineSha256 === null
          && !new RegExp(`^return_${kind}_[1-9][0-9]*$`).test(source.ref))
        || source.deputyCurrentSha256 === source.deputyBaselineSha256) {
        throw new Error('Format-5-Rückgabe enthält keinen geänderten Stand.');
      }
      const data = assertData(kind, source.data);
      if (kind === 'generated_document'
        && !['generic', 'sbv_participation_violation'].includes(String(data?.document_kind))) {
        throw new Error('Rückgabedokumentart ist ungültig.');
      }
      if (kind === 'workflow_document_link'
        && !['generated_document', 'scanned_copy', 'external_document', 'original_physical_reference']
          .includes(String(data?.document_class))) throw new Error('Rückgabedokumentklasse ist ungültig.');
      if (kind === 'violation_document_link'
        && (!['request', 'formal_objection', 'abmahnung', 'suspension_request', 'owi_preparation'].includes(String(data?.stage))
          || (data?.immutable_snapshot !== 0 && data?.immutable_snapshot !== 1))) {
        throw new Error('Rückgabe-Verstoßdokument ist ungültig.');
      }
      const links = assertLinks(kind, source.links, data);
      const isDocument = kind === 'case_document' || kind === 'generated_document';
      let contentBase64: string | undefined;
      if (isDocument) {
        if (typeof source.contentBase64 !== 'string'
          || source.contentBase64.length > 4 * Math.ceil(VACATION_V5_MAX_DOCUMENT_BYTES / 3)
          || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(source.contentBase64)
          || !hash(data?.sha256) || !Number.isSafeInteger(data?.size_bytes)
          || Number(data.size_bytes) < 0 || Number(data.size_bytes) > VACATION_V5_MAX_DOCUMENT_BYTES) {
          throw new Error('Rückgabedokument enthält ungültige Bytes.');
        }
        const plain = Buffer.from(source.contentBase64, 'base64');
        try {
          if (plain.length !== data.size_bytes || plain.toString('base64') !== source.contentBase64
            || createHash('sha256').update(plain).digest('hex') !== data.sha256) {
            throw new Error('Rückgabedokument stimmt nicht mit Hash oder Größe überein.');
          }
          documentBytes += plain.length;
          if (documentBytes > VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES) throw new Error('Rückgabedokumente überschreiten das Gesamtlimit.');
        } finally { plain.fill(0); }
        contentBase64 = source.contentBase64;
      } else if (source.contentBase64 !== undefined) throw new Error('Rückgabe enthält unerwartete Dokumentbytes.');
      changes.push({ ref: source.ref, kind, operation: 'upsert',
        deputyBaselineSha256: source.deputyBaselineSha256, deputyCurrentSha256: source.deputyCurrentSha256,
        data, ...(links === undefined ? {} : { links }), ...(contentBase64 === undefined ? {} : { contentBase64 }) });
    } else throw new Error('Format-5-Rückgabe enthält eine unbekannte Operation.');
    metadataBytes += Buffer.byteLength(JSON.stringify({ ...source, contentBase64: undefined }), 'utf8');
    if (metadataBytes > 32 * 1024 * 1024) throw new Error('Format-5-Rückgabemetadaten sind zu groß.');
  }
  return changes;
}
