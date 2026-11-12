import type { VacationV5PackageSection } from './vacationV5PackageSections.js';

export function summarizeVacationV5Sections(sections: readonly VacationV5PackageSection[]) {
  const names = new Map(sections.flatMap((section) => section.items.map((item) => [item.ref,
    String(item.data.case_number ?? item.data.title ?? item.data.subject ?? item.data.vacancy_title ?? section.type)] as const)));
  const officeOwners = new Map(sections.flatMap((section) =>
    section.type === 'workflow_document_link' || section.type === 'violation_document_link'
      ? section.items.flatMap((item) => 'documentRef' in item && 'ownerRef' in item
        ? [[String(item.documentRef), String(item.ownerRef)] as const] : []) : []));
  const documents = sections.flatMap((section) =>
    section.type === 'case_document' || section.type === 'generated_document'
      ? section.items.map((item) => {
        const ownerRef = 'links' in item ? item.links.caseRef : officeOwners.get(item.ref);
        return { filename: String(item.data.filename ?? 'Dokument'), owner: names.get(ownerRef ?? '') ?? 'Vorgang',
          sizeBytes: Buffer.from('contentBase64' in item && typeof item.contentBase64 === 'string'
            ? item.contentBase64 : '', 'base64').length,
          containsHealthData: item.data.contains_health_data === true || item.data.contains_health_data === 1 };
      }) : []);
  const sensitiveTextFields = ['notes', 'content', 'summary', 'own_position', 'measure_description',
    'wrong_behavior', 'required_behavior', 'finding', 'next_action', 'current_state', 'sbv_target'];
  const sensitiveTextCount = sections.reduce((count, section) => count + section.items.filter((item) =>
    item.data.contains_health_data === true || item.data.contains_health_data === 1
    || sensitiveTextFields.some((field) => typeof item.data[field] === 'string'
      && String(item.data[field]).trim().length > 0)).length, 0);
  return { sectionCounts: sections.map((section) => ({ type: section.type, count: section.count })),
    documents, documentBytes: documents.reduce((sum, item) => sum + item.sizeBytes, 0), sensitiveTextCount };
}
