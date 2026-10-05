import type { ReportDescriptor, ReportType } from '../../../domain/models/report.model';
import { legalToday } from '../../../domain/time/legalTime';
import { buildPdfExportFeedback, type PdfOpenResult } from '../../shared/documents/pdfExportFeedback';

export const REPORT_TYPE_ORDER: ReportType[] = [
  'activity',
  'privacy_audit',
  'retention_cleanup',
  'bem_prevention',
  'sbv_participation',
  'case_deadline_controlling',
  'termination_hearings',
  'equalization_gdb',
  'audit_log',
  'system_integrity',
  'compliance_document'
];

export const REPORT_GROUP_LABELS: Record<string, string> = {
  sbv: 'SBV-Berichte nach Arbeitsnotwendigkeit',
  datenschutz: 'Datenschutz- und Löschprüfungen',
  system: 'Technische Nachweise',
};

const REPORT_GROUP_ORDER = ['sbv', 'datenschutz', 'system'];

function reportPriority(type: ReportType): number {
  const index = REPORT_TYPE_ORDER.indexOf(type);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function sortReportDescriptorsByPriority(descriptors: ReportDescriptor[]): ReportDescriptor[] {
  return [...descriptors].sort((left, right) => {
    const priority = reportPriority(left.type) - reportPriority(right.type);
    return priority || left.shortTitle.localeCompare(right.shortTitle, 'de');
  });
}

function groupPriority(group: string): number {
  const index = REPORT_GROUP_ORDER.indexOf(group);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function groupReportDescriptorsByPriority(
  descriptors: ReportDescriptor[],
): Array<readonly [string, ReportDescriptor[]]> {
  const groups = new Map<string, ReportDescriptor[]>();
  for (const descriptor of descriptors) {
    const group = descriptor.group ?? 'sbv';
    groups.set(group, [...(groups.get(group) ?? []), descriptor]);
  }
  return Array.from(groups.entries())
    .sort(([left], [right]) => groupPriority(left) - groupPriority(right))
    .map(([group, items]) => [group, sortReportDescriptorsByPriority(items)] as const);
}

export function defaultReportDateRange(): { periodStart: string; periodEnd: string } {
  const today = legalToday();
  return {
    periodStart: `${today.slice(0, 4)}-01-01`,
    periodEnd: today,
  };
}

export function reportConfidentialityDisplayLabel(value: ReportDescriptor['confidentiality']): string {
  if (value === 'anonymized') return 'Anonymisiert';
  if (value === 'technical') return 'Technisch vertraulich';
  return 'Intern vertraulich';
}

export function formatReportDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function buildReportPdfExportFeedback(input: {
  title: string;
  fileName?: string;
  openRequested: boolean;
  openResult?: PdfOpenResult;
}) {
  return buildPdfExportFeedback(input);
}

export function isReportGenerationActionDisabled(input: {
  isGenerating: boolean;
  hasSelectedDescriptor: boolean;
}): boolean {
  return input.isGenerating || !input.hasSelectedDescriptor;
}

export function isReportOpenActionDisabled(input: {
  openingFileName?: string | null;
  fileName: string;
}): boolean {
  return input.openingFileName === input.fileName;
}
