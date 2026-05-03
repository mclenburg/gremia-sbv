import type { GenerateReportInput, ReportDescriptor, ReportExportHistoryItem, ReportGenerationResult, ReportType } from '../../core/models/report.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';

export const REPORT_TYPE_ORDER: ReportType[] = [
  'activity',
  'privacy_audit',
  'case_deadline_controlling',
  'bem_prevention',
  'termination_hearings',
  'system_integrity'
];

export function defaultReportPeriod(): { periodStart: string; periodEnd: string } {
  const year = new Date().getFullYear();
  return {
    periodStart: `${year}-01-01T00:00`,
    periodEnd: `${year}-12-31T23:59`
  };
}

export function reportConfidentialityLabel(value: ReportDescriptor['confidentiality']): string {
  if (value === 'anonymized') return 'anonymisiert';
  if (value === 'technical') return 'technisch vertraulich';
  return 'intern vertraulich';
}

export async function loadReportMetadata(): Promise<{ descriptors: ReportDescriptor[]; history: ReportExportHistoryItem[] }> {
  const bridge = await waitForBridge();
  if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
  const [descriptorRows, historyRows] = await Promise.all([
    bridge.reports.descriptors(),
    bridge.reports.history(15)
  ]);
  return {
    descriptors: [...descriptorRows].sort((a, b) => REPORT_TYPE_ORDER.indexOf(a.type) - REPORT_TYPE_ORDER.indexOf(b.type)),
    history: historyRows
  };
}

export async function generateReportDocument(input: GenerateReportInput): Promise<ReportGenerationResult> {
  const bridge = await waitForBridge();
  if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
  return bridge.reports.generate(input);
}
