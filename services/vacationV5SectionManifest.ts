import { createHash, timingSafeEqual } from 'node:crypto';
import { assertVacationV5Row, VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';

export interface VacationV5SectionItem {
  ref: string;
  parentRef?: string;
  data: Record<string, string | number | boolean | null>;
}

export interface VacationV5Section {
  type: string;
  schemaVersion: 1;
  count: number;
  items: VacationV5SectionItem[];
}

export interface VacationV5Manifest {
  sections: Array<{ type: string; count: number; sha256: string }>;
}

const CHILD_PARENT: Readonly<Record<string, string>> = {
  meeting_agenda: 'meeting', recruiting_interview: 'recruiting',
  inclusion_topic: 'inclusion_agreement', violation_event: 'violation',
};
const DEADLINE_PARENT: Readonly<Record<string, string>> = {
  sbv_meeting: 'meeting', recruiting_participation: 'recruiting',
  employer_obligation_review: 'employer_obligation', inclusion_agreement: 'inclusion_agreement',
  sbv_participation_violation: 'violation', sbv_assembly: 'assembly',
};
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) =>
  required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function hashVacationV5Section(section: unknown): string {
  return createHash('sha256').update(canonical(section), 'utf8').digest('hex');
}

function validateSections(input: unknown): VacationV5Section[] {
  if (!Array.isArray(input) || input.length > Object.keys(VACATION_V5_ROW_FIELDS).length) throw new Error('Ungültige Abschnitte im Vertretungspaket.');
  const sections: VacationV5Section[] = [];
  const types = new Set<string>();
  const references = new Map<string, string>();
  let totalBytes = 0;
  for (const candidate of input) {
    if (!isRecord(candidate) || !exactKeys(candidate, ['type', 'schemaVersion', 'count', 'items'])) throw new Error('Abschnitt enthält unerwartete Felder.');
    if (typeof candidate.type !== 'string' || !Object.hasOwn(VACATION_V5_ROW_FIELDS, candidate.type)) throw new Error('Unbekannter Abschnitt im Vertretungspaket.');
    if (types.has(candidate.type)) throw new Error('Vertretungspaket enthält doppelte Abschnitte.');
    types.add(candidate.type);
    if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.items) || candidate.items.length < 1 || candidate.items.length > 1000
      || candidate.count !== candidate.items.length) throw new Error('Abschnittszahl oder Schemaversion ist ungültig.');
    const items: VacationV5SectionItem[] = [];
    for (const source of candidate.items) {
      if (!isRecord(source) || !exactKeys(source, ['ref', 'data'], ['parentRef'])
        || typeof source.ref !== 'string' || !/^[a-z_]+_[1-9][0-9]*$/.test(source.ref) || source.ref.length > 120
        || references.has(source.ref) || (source.parentRef !== undefined && typeof source.parentRef !== 'string')) {
        throw new Error('Abschnitt enthält ungültige oder doppelte Referenzen.');
      }
      references.set(source.ref, candidate.type);
      items.push({ ref: source.ref, ...(source.parentRef === undefined ? {} : { parentRef: source.parentRef }),
        data: assertVacationV5Row(candidate.type, source.data) });
    }
    const section: VacationV5Section = { type: candidate.type, schemaVersion: 1, count: items.length, items };
    totalBytes += Buffer.byteLength(canonical(section), 'utf8');
    if (totalBytes > 32 * 1024 * 1024) throw new Error('Abschnitte im Vertretungspaket sind zu groß.');
    sections.push(section);
  }
  for (const section of sections) {
    for (const item of section.items) {
      const parent = CHILD_PARENT[section.type] ?? (section.type === 'deadline' ? DEADLINE_PARENT[String(item.data.process_type)] : undefined);
      if (parent && (!item.parentRef || references.get(item.parentRef) !== parent)) throw new Error('Abschnitt enthält eine fehlende Elternreferenz.');
      if (!parent && item.parentRef !== undefined) throw new Error('Abschnitt enthält eine unerwartete Elternreferenz.');
    }
  }
  return sections;
}

export function createVacationV5Manifest(input: unknown): VacationV5Manifest {
  const sections = validateSections(input);
  return { sections: sections.map((section) => ({ type: section.type, count: section.count, sha256: hashVacationV5Section(section) })) };
}

export function hashVacationV5Manifest(manifest: VacationV5Manifest): string {
  return createHash('sha256').update(canonical(manifest), 'utf8').digest('hex');
}

export function assertVacationV5Sections(input: unknown, manifestInput: unknown): VacationV5Section[] {
  const sections = validateSections(input);
  if (!isRecord(manifestInput) || !exactKeys(manifestInput, ['sections']) || !Array.isArray(manifestInput.sections)
    || manifestInput.sections.length !== sections.length) throw new Error('Abschnittsmanifest ist ungültig.');
  for (const [index, section] of sections.entries()) {
    const entry = manifestInput.sections[index];
    if (!isRecord(entry) || !exactKeys(entry, ['type', 'count', 'sha256']) || entry.type !== section.type || entry.count !== section.count
      || typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256)) throw new Error('Abschnittsmanifest stimmt nicht überein.');
    const expected = Buffer.from(hashVacationV5Section(section), 'hex');
    const supplied = Buffer.from(entry.sha256, 'hex');
    if (!timingSafeEqual(expected, supplied)) throw new Error('Abschnittsmanifest stimmt nicht überein.');
  }
  return sections;
}
