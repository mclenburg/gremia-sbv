import { createHash } from 'node:crypto';
import { assertVacationV5CaseRow } from './vacationV5CaseRowPolicy.js';
import { assertVacationV5Row } from './vacationV5RowPolicy.js';
import { VACATION_V5_MAX_DOCUMENT_BYTES, VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES } from './vacationV5DocumentCodec.js';

export type VacationV5CaseSectionType = 'protected_person' | 'case' | 'case_note' | 'case_measure'
  | 'case_measure_note' | 'case_deadline' | 'case_document';

export interface VacationV5CaseItem {
  ref: string;
  data: Record<string, string | number | boolean | null>;
  links: Record<string, string>;
  contentBase64?: string;
}

export interface VacationV5CaseSection {
  type: VacationV5CaseSectionType;
  schemaVersion: 1;
  count: number;
  items: VacationV5CaseItem[];
}

const LINK_TYPES: Record<VacationV5CaseSectionType, Record<string, VacationV5CaseSectionType>> = {
  protected_person: {}, case: { protectedPersonRef: 'protected_person' },
  case_note: { caseRef: 'case' }, case_measure: { caseRef: 'case' },
  case_measure_note: { caseRef: 'case', measureRef: 'case_measure' },
  case_deadline: { caseRef: 'case', measureRef: 'case_measure' },
  case_document: { caseRef: 'case', measureRef: 'case_measure' },
};

const REQUIRED_LINKS: Record<VacationV5CaseSectionType, readonly string[]> = {
  protected_person: [], case: [], case_note: ['caseRef'], case_measure: ['caseRef'],
  case_measure_note: ['caseRef', 'measureRef'], case_deadline: ['caseRef'], case_document: ['caseRef'],
};

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export function isVacationV5CaseSectionType(value: string): value is VacationV5CaseSectionType {
  return Object.hasOwn(LINK_TYPES, value);
}

export function assertVacationV5CaseGraph(input: unknown): VacationV5CaseSection[] {
  if (!Array.isArray(input) || input.length > Object.keys(LINK_TYPES).length) throw new Error('Ungültige Fallabschnitte.');
  const sections: VacationV5CaseSection[] = [];
  const byRef = new Map<string, { type: VacationV5CaseSectionType; links: Record<string, string> }>();
  const seenTypes = new Set<string>();
  let totalBytes = 0;
  let documentBytes = 0;
  for (const candidate of input) {
    if (!record(candidate) || !exact(candidate, ['type', 'schemaVersion', 'count', 'items'])
      || typeof candidate.type !== 'string' || !Object.hasOwn(LINK_TYPES, candidate.type)
      || seenTypes.has(candidate.type) || candidate.schemaVersion !== 1
      || !Array.isArray(candidate.items) || candidate.items.length < 1 || candidate.items.length > 1000
      || candidate.count !== candidate.items.length) throw new Error('Fallabschnitt ist unbekannt oder ungültig.');
    const type = candidate.type as VacationV5CaseSectionType;
    seenTypes.add(type);
    const items: VacationV5CaseItem[] = [];
    for (const source of candidate.items) {
      if (type === 'case_document' && record(source) && !Object.hasOwn(source, 'contentBase64')) {
        throw new Error('Dokumentinhalt fehlt im ausgewählten Fallabschnitt.');
      }
      if (!record(source) || !exact(source, type === 'case_document' ? ['ref', 'data', 'links', 'contentBase64'] : ['ref', 'data', 'links'])
        || typeof source.ref !== 'string' || !/^[a-z_]+_[1-9][0-9]*$/.test(source.ref)
        || source.ref.length > 120 || byRef.has(source.ref) || !record(source.links)) {
        throw new Error('Fallabschnitt enthält ungültige Paket-Referenzen.');
      }
      const allowedLinks = LINK_TYPES[type];
      const links = source.links as Record<string, string>;
      if (Object.entries(links).some(([key, value]) => !Object.hasOwn(allowedLinks, key)
        || typeof value !== 'string' || !/^[a-z_]+_[1-9][0-9]*$/.test(value))
        || REQUIRED_LINKS[type].some((key) => !Object.hasOwn(links, key))) {
        throw new Error('Fallabschnitt enthält unzulässige oder fehlende Beziehungen.');
      }
      const data = type === 'case_deadline' ? assertVacationV5Row('deadline', source.data) : assertVacationV5CaseRow(type, source.data);
      let contentBase64: string | undefined;
      if (type === 'case_document') {
        if (typeof source.contentBase64 !== 'string'
          || source.contentBase64.length > 4 * Math.ceil(VACATION_V5_MAX_DOCUMENT_BYTES / 3)
          || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(source.contentBase64)
          || typeof data.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(data.sha256)
          || !Number.isSafeInteger(data.size_bytes) || Number(data.size_bytes) < 0
          || Number(data.size_bytes) > VACATION_V5_MAX_DOCUMENT_BYTES) throw new Error('Dokumentinhalt oder Hash ist ungültig.');
        const plain = Buffer.from(source.contentBase64, 'base64');
        try {
          if (plain.toString('base64') !== source.contentBase64 || plain.length !== data.size_bytes
            || createHash('sha256').update(plain).digest('hex') !== data.sha256) {
            throw new Error('Dokumentinhalt stimmt nicht mit Hash oder Größe überein.');
          }
          documentBytes += plain.length;
          if (documentBytes > VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES) throw new Error('Dokumentgesamtgröße überschritten.');
        } finally { plain.fill(0); }
        contentBase64 = source.contentBase64;
      }
      const item: VacationV5CaseItem = { ref: source.ref, data, links, ...(contentBase64 === undefined ? {} : { contentBase64 }) };
      byRef.set(item.ref, { type, links });
      items.push(item);
    }
    const section: VacationV5CaseSection = { type, schemaVersion: 1, count: items.length, items };
    totalBytes += Buffer.byteLength(JSON.stringify(type === 'case_document'
      ? { ...section, items: section.items.map(({ contentBase64: _content, ...metadata }) => metadata) }
      : section), 'utf8');
    if (totalBytes > 32 * 1024 * 1024) throw new Error('Fallabschnitte sind zu groß.');
    sections.push(section);
  }
  for (const section of sections) {
    for (const item of section.items) {
      for (const [key, ref] of Object.entries(item.links)) {
        if (byRef.get(ref)?.type !== LINK_TYPES[section.type][key]) throw new Error('Fallabschnitt enthält eine ungelöste Beziehung.');
      }
      if (item.links.measureRef) {
        const measure = byRef.get(item.links.measureRef);
        if (measure?.links.caseRef !== item.links.caseRef) throw new Error('Maßnahme gehört zu einer anderen Fallakte.');
      }
    }
  }
  return sections;
}
