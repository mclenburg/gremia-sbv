import { timingSafeEqual } from 'node:crypto';
import { assertVacationV5CaseGraph, isVacationV5CaseSectionType, type VacationV5CaseSection } from './vacationV5CaseGraph.js';
import { assertVacationV5Sections, createVacationV5Manifest, hashVacationV5Section,
  type VacationV5Manifest, type VacationV5Section } from './vacationV5SectionManifest.js';
import { VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';

export type VacationV5PackageSection = VacationV5Section | VacationV5CaseSection;

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

function validated(input: unknown): VacationV5PackageSection[] {
  if (!Array.isArray(input) || input.length > 19) throw new Error('Format-5-Paketabschnitte sind ungültig.');
  const caseInput: unknown[] = [];
  const otherInput: unknown[] = [];
  for (const value of input) {
    if (!record(value) || typeof value.type !== 'string') throw new Error('Format-5-Paketabschnitt ist ungültig.');
    if (isVacationV5CaseSectionType(value.type)) {
      caseInput.push(value);
    } else if (Object.hasOwn(VACATION_V5_ROW_FIELDS, value.type)) otherInput.push(value);
    else throw new Error('Unbekannter Format-5-Paketabschnitt.');
  }
  const cases = assertVacationV5CaseGraph(caseInput);
  if (cases.length && !cases.some((section) => section.type === 'case')) {
    throw new Error('Fallabschnitte benötigen eine ausgewählte Fallakte.');
  }
  const otherManifest = createVacationV5Manifest(otherInput);
  const others = assertVacationV5Sections(otherInput, otherManifest);
  const byType = new Map([...cases, ...others].map((section) => [section.type, section]));
  const sections = input.map((value) => byType.get((value as { type: string }).type));
  if (sections.some((section) => !section)) throw new Error('Format-5-Paketabschnitt wurde nicht bestätigt.');
  const allRefs = sections.flatMap((section) => section!.items.map((item) => item.ref));
  if (new Set(allRefs).size !== allRefs.length) throw new Error('Format-5-Paket enthält doppelte Referenzen.');
  return sections as VacationV5PackageSection[];
}

export function createVacationV5PackageManifest(input: unknown): VacationV5Manifest {
  return { sections: validated(input).map((section) => ({
    type: section.type, count: section.count, sha256: hashVacationV5Section(section),
  })) };
}

export function assertVacationV5PackageSections(input: unknown, manifestInput: unknown): VacationV5PackageSection[] {
  const sections = validated(input);
  if (!record(manifestInput) || !exact(manifestInput, ['sections']) || !Array.isArray(manifestInput.sections)
    || manifestInput.sections.length !== sections.length) throw new Error('Format-5-Manifest ist ungültig.');
  for (const [index, section] of sections.entries()) {
    const entry = manifestInput.sections[index];
    if (!record(entry) || !exact(entry, ['type', 'count', 'sha256'])
      || entry.type !== section.type || entry.count !== section.count
      || typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
      throw new Error('Format-5-Manifest stimmt nicht überein.');
    }
    const expected = Buffer.from(hashVacationV5Section(section), 'hex');
    const actual = Buffer.from(entry.sha256, 'hex');
    if (!timingSafeEqual(expected, actual)) throw new Error('Format-5-Manifest stimmt nicht überein.');
  }
  return sections;
}
