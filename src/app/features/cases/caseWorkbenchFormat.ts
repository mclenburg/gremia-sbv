import type { CaseRecord } from '../../core/models/case.model';
import type { CaseProcessType } from './caseWorkbenchTypes';

export function toDateTimeLocalValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

export function formatCaseLabel(record: CaseRecord): string {
  return `${record.caseNumber} · ${record.displayName}`;
}

export function defaultDeadlineTitleForCase(record?: CaseRecord, noteTitle?: string): string {
  if (noteTitle?.trim()) return `Wiedervorlage: ${noteTitle.trim()}`;
  if (record?.caseNumber) return `Wiedervorlage ${record.caseNumber}`;
  return 'Wiedervorlage aus Protokoll';
}

export function formatNoteDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return 'unbekannt';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function processTypeLabel(processType: CaseProcessType): string {
  const labels: Record<CaseProcessType, string> = {
    prevention: 'Präventionsverfahren',
    bem: 'BEM',
    termination_hearing: 'Kündigungsanhörung',
    equalization: 'Gleichstellung',
    participation: 'SBV-Beteiligung',
    workplace_accommodation: 'Arbeitsplatzgestaltung'
  };
  return labels[processType];
}

export function formatProcessNodeSubtitle(processType: CaseProcessType, status?: string): string {
  return `${processTypeLabel(processType)}${status ? ` · ${status}` : ''}`;
}
