import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { isVacationV5CaseSectionType, type VacationV5CaseSection } from './vacationV5CaseGraph.js';
import { assertVacationV5PackageSections } from './vacationV5PackageSections.js';
import type { VacationV5Section, VacationV5Manifest } from './vacationV5SectionManifest.js';
import { importVacationV5Sections } from './vacationV5SectionImporter.js';
import { importVacationV5CaseSections } from './vacationV5CaseImporter.js';
import type { VacationV5Payload } from './vacationV5Transport.js';

export function importVacationV5Package(database: DatabaseAdapter, payload: VacationV5Payload,
  binding: { originKeyFingerprint: string; targetKeyFingerprint: string }):
  { importId: string; importedCount: number; localByRef: Record<string, string> } {
  const sections = assertVacationV5PackageSections(payload.sections, payload.manifest);
  if (!sections.length) throw new Error('Das Vertretungspaket enthält keinen ausgewählten Umfang.');
  const caseSections = sections.filter((section): section is VacationV5CaseSection =>
    isVacationV5CaseSectionType(section.type));
  const otherSections = sections.filter((section): section is VacationV5Section =>
    !isVacationV5CaseSectionType(section.type));
  const otherTypes = new Set(otherSections.map((section) => section.type));
  const otherManifest: VacationV5Manifest = { sections: payload.manifest.sections.filter((entry) => otherTypes.has(entry.type)) };
  return new DatabaseUnitOfWork(database).run(() => {
    const others = importVacationV5Sections(database, payload.packageId, payload.expiresAt, otherSections, otherManifest,
      binding, { allowEmptyForCases: caseSections.length > 0,
        allSectionCounts: sections.map((section) => ({ type: section.type, count: section.count })) });
    const cases = caseSections.length
      ? importVacationV5CaseSections(database, others.importId, payload.packageId, payload.expiresAt, caseSections)
      : { importedCount: 0, localByRef: {} };
    return { importId: others.importId, importedCount: others.importedCount + cases.importedCount,
      localByRef: { ...others.localByRef, ...cases.localByRef } };
  });
}
