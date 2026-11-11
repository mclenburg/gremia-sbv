import type { DatabaseAdapter } from './databaseService.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { encodeSelectedVacationV5Document } from './vacationV5DocumentCodec.js';
import { assertVacationV5OfficeDocumentGraph, projectVacationV5OfficeDocumentData,
  type VacationV5OfficeDocumentItem, type VacationV5OfficeDocumentSection } from './vacationV5OfficeDocumentGraph.js';
import type { VacationV5PackageSourceByRef } from './vacationV5PackageSource.js';

type Row = Record<string, unknown> & { id: string };
const WORKFLOW_OWNER_KIND: Readonly<Record<string, string>> = {
  meeting: 'meeting', assembly: 'assembly', employer_obligation_review: 'employer_obligation',
  inclusion_agreement: 'inclusion_agreement',
};

export function collectVacationV5OfficeDocuments(database: DatabaseAdapter, documentIds: readonly string[],
  selectedSources: VacationV5PackageSourceByRef, dataDirectory: string): {
    sections: VacationV5OfficeDocumentSection[]; sourceByRef: VacationV5PackageSourceByRef;
  } {
  if (documentIds.length > 1000 || documentIds.some((id) => !id || typeof id !== 'string')
    || new Set(documentIds).size !== documentIds.length) throw new Error('Ausgewählte Amtsdokumente sind ungültig.');
  const ownerRefs = new Map<string, string>();
  for (const [ref, source] of Object.entries(selectedSources)) {
    const ownerType = Object.entries(WORKFLOW_OWNER_KIND).find(([, kind]) => kind === source.kind)?.[0]
      ?? (source.kind === 'violation' ? 'violation' : undefined);
    if (ownerType) ownerRefs.set(`${ownerType}:${source.localId}`, ref);
  }
  const sourceByRef: VacationV5PackageSourceByRef = {};
  const documents: VacationV5OfficeDocumentItem[] = [];
  const workflowLinks: VacationV5OfficeDocumentItem[] = [];
  const violationLinks: VacationV5OfficeDocumentItem[] = [];
  let documentBytes = 0;
  for (const id of documentIds) {
    const document = database.prepare<Row>('SELECT * FROM generated_documents WHERE id = ?').get(id);
    if (!document || document.case_id) throw new Error('Ausgewähltes Amtsdokument fehlt oder gehört zu einer Fallakte.');
    const workflow = database.prepare<Row>(
      'SELECT * FROM sbv_workflow_document_links WHERE document_id = ? ORDER BY id').all(id)
      .filter((link) => ownerRefs.has(`${link.owner_type}:${link.owner_id}`));
    const violations = database.prepare<Row>(
      'SELECT * FROM sbv_participation_violation_documents WHERE document_id = ? ORDER BY id').all(id)
      .filter((link) => ownerRefs.has(`violation:${link.violation_id}`));
    if (!workflow.length && !violations.length) throw new Error('Amtsdokument hat keinen ausgewählten Vorgang als Eigentümer.');
    const encoded = encodeSelectedVacationV5Document(document, dataDirectory, documentBytes);
    documentBytes = encoded.totalBytes;
    const documentRef = `generated_document_${documents.length + 1}`;
    sourceByRef[documentRef] = { kind: 'generated_document', localId: id,
      baselineSha256: caseHandoverBaselineHash(document, encoded.contentBase64) };
    documents.push({ ref: documentRef, data: projectVacationV5OfficeDocumentData('generated_document', document),
      contentBase64: encoded.contentBase64 });
    for (const link of workflow) {
      const ref = `workflow_document_link_${workflowLinks.length + 1}`;
      const ownerRef = ownerRefs.get(`${link.owner_type}:${link.owner_id}`)!;
      sourceByRef[ref] = { kind: 'workflow_document_link', localId: link.id,
        baselineSha256: caseHandoverBaselineHash(link) };
      workflowLinks.push({ ref, documentRef, ownerRef,
        data: projectVacationV5OfficeDocumentData('workflow_document_link', link) });
    }
    for (const link of violations) {
      const ref = `violation_document_link_${violationLinks.length + 1}`;
      const ownerRef = ownerRefs.get(`violation:${link.violation_id}`)!;
      sourceByRef[ref] = { kind: 'violation_document_link', localId: link.id,
        baselineSha256: caseHandoverBaselineHash(link) };
      violationLinks.push({ ref, documentRef, ownerRef,
        data: projectVacationV5OfficeDocumentData('violation_document_link', link) });
    }
  }
  const sections: VacationV5OfficeDocumentSection[] = [
    { type: 'generated_document', schemaVersion: 1, count: documents.length, items: documents },
    { type: 'workflow_document_link', schemaVersion: 1, count: workflowLinks.length, items: workflowLinks },
    { type: 'violation_document_link', schemaVersion: 1, count: violationLinks.length, items: violationLinks },
  ].filter((section) => section.count > 0) as VacationV5OfficeDocumentSection[];
  assertVacationV5OfficeDocumentGraph(sections, Object.entries(selectedSources).map(([ref, source]) => ({ ref, type: source.kind })));
  return { sections, sourceByRef };
}
