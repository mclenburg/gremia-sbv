import type { CaseDocumentRecord } from '../../core/models/case-document.model';

export type CaseDocumentActions = {
  importDocuments(): Promise<void>;
  openDocument(document: CaseDocumentRecord): Promise<void>;
  exportDocument(document: CaseDocumentRecord): Promise<void>;
  deleteDocument(document: CaseDocumentRecord): Promise<void>;
};

export function createCaseDocumentActions(actions: CaseDocumentActions): CaseDocumentActions {
  return actions;
}
