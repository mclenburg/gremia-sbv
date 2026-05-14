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
  extractionQuality?: 'structured' | 'native_text' | 'ocr' | 'manual' | 'unknown';
  textExtractionStatus?: 'extracted' | 'empty' | 'unsupported' | 'failed' | 'unknown';
  textExtractedAt?: string;
  textExtractorId?: string;
  textExtractionError?: string;
  ocrStatus?: 'not_required' | 'queued' | 'processing' | 'completed' | 'unsupported' | 'failed';
  ocrText?: string;
  ocrEngine?: string;
  ocrStartedAt?: string;
  ocrCompletedAt?: string;
  ocrError?: string;
  containsHealthData: boolean;
  createdAt: string;
}
