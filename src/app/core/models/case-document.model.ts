export interface CaseDocumentRecord {
  id: string;
  caseId: string;
  caseNumber?: string;
  measureId?: string;
  measureTitle?: string;
  measureType?: string;
  displayTitle: string;
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
  sha256: string;
  extractedText?: string;
  containsHealthData: boolean;
  createdAt: string;
}
