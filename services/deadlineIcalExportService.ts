import type { DeadlineRecord } from '../src/app/core/models/deadline.model.js';

export type DeadlineIcalPrivacyLevel = 'privacy_first' | 'case_reference' | 'details';

export interface DeadlineIcalExportOptions {
  privacyLevel?: DeadlineIcalPrivacyLevel;
  productVersion?: string;
  now?: Date;
}

function escapeIcal(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function foldLine(line: string): string[] {
  const result: string[] = [];
  let current = line;
  while (Buffer.byteLength(current, 'utf8') > 73) {
    let slice = current.slice(0, 73);
    while (Buffer.byteLength(slice, 'utf8') > 73) slice = slice.slice(0, -1);
    result.push(slice);
    current = ` ${current.slice(slice.length)}`;
  }
  result.push(current);
  return result;
}

function dateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10).replace(/-/g, '');
}

function timestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function safeSummary(deadline: DeadlineRecord, level: DeadlineIcalPrivacyLevel): string {
  if (level === 'details') return deadline.confidentialTitle ?? deadline.title;
  if (level === 'case_reference' && deadline.caseId) return `Gremia.SBV Wiedervorlage – Fall ${deadline.caseId.slice(0, 8)}`;
  return 'Gremia.SBV Wiedervorlage';
}

function safeDescription(deadline: DeadlineRecord, level: DeadlineIcalPrivacyLevel): string {
  if (level === 'details') return deadline.description ?? 'Bitte Vorgang in Gremia.SBV prüfen.';
  if (level === 'case_reference') return 'Bitte Vorgang in Gremia.SBV prüfen. Es werden keine Personennamen exportiert.';
  return 'Bitte Vorgang in Gremia.SBV prüfen. Datenschutzfreundlicher Export ohne personenbezogene Details.';
}

export function exportDeadlinesToIcal(deadlines: DeadlineRecord[], options: DeadlineIcalExportOptions = {}): string {
  const privacyLevel = options.privacyLevel ?? 'privacy_first';
  const now = options.now ?? new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Gremia.SBV//Gremia.SBV ${escapeIcal(options.productVersion ?? '0.9.1')}//DE`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  deadlines.forEach((deadline) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:gremia-sbv-deadline-${escapeIcal(deadline.id)}@example.invalid`,
      `DTSTAMP:${timestamp(now)}`,
      `DTSTART;VALUE=DATE:${dateOnly(deadline.dueAt)}`,
      `SUMMARY:${escapeIcal(safeSummary(deadline, privacyLevel))}`,
      `DESCRIPTION:${escapeIcal(safeDescription(deadline, privacyLevel))}`,
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.flatMap(foldLine).join('\r\n') + '\r\n';
}
