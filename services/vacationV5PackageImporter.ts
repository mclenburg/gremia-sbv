import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { CaseHandoverImportUnitOfWork } from './caseHandoverImportUnitOfWork.js';
import { isVacationV5CaseSectionType, type VacationV5CaseSection } from './vacationV5CaseGraph.js';
import { assertVacationV5PackageSections } from './vacationV5PackageSections.js';
import type { VacationV5Section, VacationV5Manifest } from './vacationV5SectionManifest.js';
import { importVacationV5Sections } from './vacationV5SectionImporter.js';
import { importVacationV5CaseSections } from './vacationV5CaseImporter.js';
import { isVacationV5OfficeDocumentSectionType, type VacationV5OfficeDocumentSection } from './vacationV5OfficeDocumentGraph.js';
import { importVacationV5OfficeDocuments } from './vacationV5OfficeDocumentImporter.js';
import type { VacationV5Payload } from './vacationV5Transport.js';
import { TransferRecipientProfileService } from './transferRecipientProfileService.js';

export function importVacationV5Package(database: DatabaseAdapter, payload: VacationV5Payload,
  binding: { originKeyFingerprint: string; targetKeyFingerprint: string },
  dataDirectoryProvider: () => string = () => path.join(process.cwd(), 'data')):
  { importId: string; importedCount: number; localByRef: Record<string, string> } {
  const sections = assertVacationV5PackageSections(payload.sections, payload.manifest);
  if (!sections.length) throw new Error('Das Vertretungspaket enthält keinen ausgewählten Umfang.');
  const caseSections = sections.filter((section): section is VacationV5CaseSection =>
    isVacationV5CaseSectionType(section.type));
  const officeSections = sections.filter((section): section is VacationV5OfficeDocumentSection =>
    isVacationV5OfficeDocumentSectionType(section.type));
  const otherSections = sections.filter((section): section is VacationV5Section =>
    !isVacationV5CaseSectionType(section.type) && !isVacationV5OfficeDocumentSectionType(section.type));
  const otherTypes = new Set(otherSections.map((section) => section.type));
  const otherManifest: VacationV5Manifest = { sections: payload.manifest.sections.filter((entry) => otherTypes.has(entry.type)) };
  return new CaseHandoverImportUnitOfWork(database, dataDirectoryProvider).run((trackFile) => {
    const others = importVacationV5Sections(database, payload.packageId, payload.expiresAt, otherSections, otherManifest,
      binding, { allowEmptyForCases: caseSections.length > 0,
        allSectionCounts: sections.map((section) => ({ type: section.type, count: section.count })) });
    const cases = caseSections.length
      ? importVacationV5CaseSections(database, others.importId, payload.packageId, payload.expiresAt, caseSections,
        { dataDirectory: dataDirectoryProvider(), trackFile })
      : { importedCount: 0, localByRef: {} };
    const rootSections = sections.filter((section) => !isVacationV5OfficeDocumentSectionType(section.type));
    const roots = rootSections.flatMap((section) => section.items.map((item) => ({ ref: item.ref, type: section.type })));
    const office = importVacationV5OfficeDocuments(database, others.importId, payload.packageId, officeSections, roots,
      { ...others.localByRef, ...cases.localByRef }, dataDirectoryProvider(), trackFile);
    if (payload.handoverNote) {
      const stored = database.prepare<{ metadata_json: string }>(
        'SELECT metadata_json FROM case_handover_imports WHERE id = ?').get(others.importId);
      const metadata = JSON.parse(stored?.metadata_json ?? '{}') as Record<string, unknown>;
      database.prepare('UPDATE case_handover_imports SET metadata_json = ? WHERE id = ?')
        .run(JSON.stringify({ ...metadata, handoverNote: payload.handoverNote }), others.importId);
    }
    new TransferRecipientProfileService(database).recordAuthenticatedPackageCapabilities(
      payload.origin, payload.capabilities);
    return { importId: others.importId, importedCount: others.importedCount + cases.importedCount + office.importedCount,
      localByRef: { ...others.localByRef, ...cases.localByRef, ...office.localByRef } };
  });
}
