export type KnowledgeSource = 'SGB IX' | 'BetrVG' | 'AGG' | 'KSchG' | 'ArbSchG' | 'DSGVO' | 'BDSG' | 'Sonstiges';
export type KnowledgeChecklistStatus = 'offen' | 'erledigt' | 'nicht_relevant';

export interface LegalNormRecord {
  id: string;
  source: KnowledgeSource | string;
  paragraph: string;
  title: string;
  shortText: string;
  fullText?: string;
  sbvMeaning?: string;
  practiceNote?: string;
  typicalCases?: string;
  deadlineRelevance?: string;
  templateRelevance?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LegalNormSearchInput {
  query?: string;
  source?: string;
  limit?: number;
}

export interface CreateLegalNormInput {
  source: KnowledgeSource | string;
  paragraph: string;
  title: string;
  shortText: string;
  fullText?: string;
  sbvMeaning?: string;
  practiceNote?: string;
  typicalCases?: string;
  deadlineRelevance?: string;
  templateRelevance?: string;
  tags?: string[];
}

export interface UpdateLegalNormInput extends Partial<CreateLegalNormInput> {}

export interface CaseLegalReferenceRecord {
  id: string;
  caseId: string;
  caseNumber?: string;
  legalNormId: string;
  paragraph: string;
  source: string;
  title: string;
  note?: string;
  createdAt: string;
}

export interface LinkLegalNormToCaseInput {
  caseId: string;
  legalNormId: string;
  note?: string;
}

export interface NormCommentRecord {
  id: string;
  legalNormId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNormCommentInput {
  legalNormId: string;
  title: string;
  content: string;
}

export interface CaseLawRecord {
  id: string;
  legalNormId: string;
  court: string;
  decisionDate?: string;
  fileNumber: string;
  shortHolding: string;
  relevance?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseLawInput {
  legalNormId: string;
  court: string;
  decisionDate?: string;
  fileNumber: string;
  shortHolding: string;
  relevance?: string;
  sourceUrl?: string;
}

export interface NormChecklistItemRecord {
  id: string;
  legalNormId: string;
  text: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNormChecklistItemInput {
  legalNormId: string;
  text: string;
  sortOrder?: number;
}

export interface KnowledgeExportPreview {
  title: string;
  normCount: number;
  includesCaseReferences: false;
  warning: string;
}
