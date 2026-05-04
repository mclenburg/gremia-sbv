export type ReportType =
  | 'activity'
  | 'privacy_audit'
  | 'case_deadline_controlling'
  | 'bem_prevention'
  | 'termination_hearings'
  | 'system_integrity'
  | 'compliance_document';

export interface ReportDescriptor {
  type: ReportType;
  title: string;
  shortTitle: string;
  description: string;
  confidentiality: 'anonymized' | 'internal' | 'technical';
}

export interface GenerateReportInput {
  type: ReportType;
  periodStart?: string;
  periodEnd?: string;
  complianceTitle?: string;
  complianceSubtitle?: string;
  complianceClassification?: string;
  complianceBody?: string;
}


export interface ReportGenerationResult {
  ok: boolean;
  reportType: ReportType;
  title: string;
  fileName: string;
  filePath: string;
  generatedAt: string;
  warnings: string[];
  metrics: Record<string, number | string>;
  error?: string;
}

export interface ReportExportHistoryItem {
  id: string;
  reportType: ReportType;
  title: string;
  fileName: string;
  filePath: string;
  generatedAt: string;
  periodStart?: string;
  periodEnd?: string;
  warningCount: number;
}
