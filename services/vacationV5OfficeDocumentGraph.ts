import { createHash } from 'node:crypto';
import { VACATION_V5_MAX_DOCUMENT_BYTES, VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES } from './vacationV5DocumentCodec.js';

export type VacationV5OfficeDocumentSectionType = 'generated_document' | 'workflow_document_link' | 'violation_document_link';
export interface VacationV5OfficeDocumentItem {
  ref: string;
  data: Record<string, string | number | boolean | null>;
  contentBase64?: string;
  documentRef?: string;
  ownerRef?: string;
}
export interface VacationV5OfficeDocumentSection {
  type: VacationV5OfficeDocumentSectionType;
  schemaVersion: 1;
  count: number;
  items: VacationV5OfficeDocumentItem[];
}

const FIELDS: Record<VacationV5OfficeDocumentSectionType, { allowed: readonly string[]; required: readonly string[] }> = {
  generated_document: { allowed: ['title', 'filename', 'mime_type', 'document_kind', 'template_version', 'sha256', 'size_bytes', 'created_at'],
    required: ['title', 'filename', 'mime_type', 'document_kind', 'sha256', 'size_bytes'] },
  workflow_document_link: { allowed: ['purpose', 'document_class', 'template_version', 'legal_rule_version', 'created_at'],
    required: ['purpose', 'document_class'] },
  violation_document_link: { allowed: ['stage', 'template_key', 'template_version', 'immutable_snapshot', 'created_at'],
    required: ['stage', 'template_key', 'template_version', 'immutable_snapshot'] },
};
const WORKFLOW_OWNERS = new Set(['meeting', 'assembly', 'employer_obligation', 'inclusion_agreement']);
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, fields: readonly string[]) =>
  Object.keys(value).length === fields.length && fields.every((field) => Object.hasOwn(value, field));
const validRef = (ref: unknown): ref is string => typeof ref === 'string'
  && /^[a-z_]+_[1-9][0-9]*$/.test(ref) && ref.length <= 120;

export function isVacationV5OfficeDocumentSectionType(value: string): value is VacationV5OfficeDocumentSectionType {
  return Object.hasOwn(FIELDS, value);
}

function validateData(type: VacationV5OfficeDocumentSectionType, input: unknown): VacationV5OfficeDocumentItem['data'] {
  if (!record(input) || Object.keys(input).some((key) => !FIELDS[type].allowed.includes(key))
    || FIELDS[type].required.some((key) => input[key] === null || input[key] === undefined || input[key] === '')
    || Object.values(input).some((value) => value !== null && !['string', 'number', 'boolean'].includes(typeof value)
      || typeof value === 'number' && !Number.isFinite(value))
    || Buffer.byteLength(JSON.stringify(input), 'utf8') > 64 * 1024) {
    throw new Error('Amtsdokument enthält ungültige oder lokale Metadaten.');
  }
  return input as VacationV5OfficeDocumentItem['data'];
}

export function projectVacationV5OfficeDocumentData(type: VacationV5OfficeDocumentSectionType,
  source: Record<string, unknown>): VacationV5OfficeDocumentItem['data'] {
  const data: Record<string, unknown> = {};
  for (const field of FIELDS[type].allowed) if (Object.hasOwn(source, field)) data[field] = source[field];
  return validateData(type, data);
}

export function assertVacationV5OfficeDocumentGraph(input: unknown,
  roots: readonly { ref: string; type: string }[]): VacationV5OfficeDocumentSection[] {
  if (!Array.isArray(input) || input.length > 3) throw new Error('Amtsdokumentabschnitte sind ungültig.');
  const rootByRef = new Map(roots.map((root) => [root.ref, root.type]));
  const refs = new Set(rootByRef.keys());
  const sections: VacationV5OfficeDocumentSection[] = [];
  const types = new Set<string>();
  const documents = new Set<string>();
  const documentKindByRef = new Map<string, unknown>();
  const linked = new Set<string>();
  const linkedPairs = new Set<string>();
  let totalBytes = 0;
  for (const section of input) {
    if (!record(section) || !exact(section, ['type', 'schemaVersion', 'count', 'items'])
      || typeof section.type !== 'string' || !isVacationV5OfficeDocumentSectionType(section.type)
      || types.has(section.type) || section.schemaVersion !== 1 || !Array.isArray(section.items)
      || section.items.length < 1 || section.items.length > 1000 || section.count !== section.items.length) {
      throw new Error('Amtsdokumentabschnitt ist ungültig.');
    }
    const type = section.type;
    types.add(type);
    const items: VacationV5OfficeDocumentItem[] = [];
    for (const source of section.items) {
      const fields = type === 'generated_document'
        ? ['ref', 'data', 'contentBase64'] : ['ref', 'data', 'documentRef', 'ownerRef'];
      if (!record(source) || !exact(source, fields) || !validRef(source.ref) || refs.has(source.ref)) {
        throw new Error('Amtsdokument enthält ungültige oder doppelte Referenzen.');
      }
      refs.add(source.ref);
      const data = validateData(type, source.data);
      if (type === 'generated_document') {
        if (!['generic', 'sbv_participation_violation'].includes(String(data.document_kind))) {
          throw new Error('Amtsdokumentart ist ungültig.');
        }
        if (typeof source.contentBase64 !== 'string'
          || source.contentBase64.length > 4 * Math.ceil(VACATION_V5_MAX_DOCUMENT_BYTES / 3)
          || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(source.contentBase64)
          || typeof data.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(data.sha256)
          || !Number.isSafeInteger(data.size_bytes) || Number(data.size_bytes) < 0
          || Number(data.size_bytes) > VACATION_V5_MAX_DOCUMENT_BYTES) throw new Error('Amtsdokumentbytes sind ungültig.');
        const plain = Buffer.from(source.contentBase64, 'base64');
        try {
          if (plain.toString('base64') !== source.contentBase64 || plain.length !== data.size_bytes
            || createHash('sha256').update(plain).digest('hex') !== data.sha256) {
            throw new Error('Amtsdokumentbytes stimmen nicht mit Hash oder Größe überein.');
          }
          totalBytes += plain.length;
          if (totalBytes > VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES) throw new Error('Amtsdokumente überschreiten das Gesamtlimit.');
        } finally { plain.fill(0); }
        documents.add(source.ref);
        documentKindByRef.set(source.ref, data.document_kind);
        items.push({ ref: source.ref, data, contentBase64: source.contentBase64 });
      } else {
        if (!validRef(source.documentRef) || !validRef(source.ownerRef)) {
          throw new Error('Amtsdokumentverknüpfung enthält ungültige Referenzen.');
        }
        if (type === 'workflow_document_link'
          && !['generated_document', 'scanned_copy', 'external_document', 'original_physical_reference']
            .includes(String(data.document_class))) throw new Error('Amtsdokumentklasse ist ungültig.');
        if (type === 'violation_document_link'
          && (!['request', 'formal_objection', 'abmahnung', 'suspension_request', 'owi_preparation'].includes(String(data.stage))
            || (data.immutable_snapshot !== 0 && data.immutable_snapshot !== 1))) {
          throw new Error('Verstoßdokumentverknüpfung ist ungültig.');
        }
        items.push({ ref: source.ref, data, documentRef: source.documentRef, ownerRef: source.ownerRef });
      }
    }
    sections.push({ type, schemaVersion: 1, count: items.length, items });
  }
  for (const section of sections) {
    if (section.type === 'generated_document') continue;
    for (const item of section.items) {
      if (!item.documentRef || !documents.has(item.documentRef) || !item.ownerRef
        || (section.type === 'violation_document_link' ? rootByRef.get(item.ownerRef) !== 'violation'
          : !WORKFLOW_OWNERS.has(rootByRef.get(item.ownerRef) ?? ''))) {
        throw new Error('Amtsdokumentverknüpfung hat keinen ausgewählten Eigentümer oder kein Dokument.');
      }
      if (section.type === 'violation_document_link'
        && documentKindByRef.get(item.documentRef) !== 'sbv_participation_violation') {
        throw new Error('Verstoßdokument hat eine widersprüchliche Dokumentart.');
      }
      if (section.type === 'workflow_document_link' && documentKindByRef.get(item.documentRef) !== 'generic') {
        throw new Error('Amtsdokument hat eine widersprüchliche Dokumentart.');
      }
      const pair = `${section.type}:${item.documentRef}:${item.ownerRef}`;
      if (linkedPairs.has(pair)) throw new Error('Amtsdokument enthält eine doppelte Eigentümerbeziehung.');
      linkedPairs.add(pair);
      linked.add(item.documentRef);
    }
  }
  if ([...documents].some((ref) => !linked.has(ref))) throw new Error('Amtsdokument ohne ausgewählte Verknüpfung.');
  return sections;
}
