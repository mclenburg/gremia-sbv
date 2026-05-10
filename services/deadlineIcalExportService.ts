import type { DeadlineRecord } from '../src/app/core/models/deadline.model.js';
import { containsDirectIdentifier, deadlineProcessTypeLabel, sanitizeIcalText, type IcalPrivacyLevel } from './icalPrivacyPolicy.js';

export type DeadlineIcalPrivacyLevel = IcalPrivacyLevel;

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
  if (level === 'details') return sanitizeIcalText(deadline.confidentialTitle ?? deadline.title);
  const label = deadlineProcessTypeLabel(deadline);
  if (level === 'case_reference' && deadline.caseId) return `Gremia.SBV: ${label} – Fall ${deadline.caseId.slice(0, 8)}`;
  if (level === 'privacy_first') return 'Gremia.SBV Wiedervorlage';
  return `Gremia.SBV: ${label}`;
}

function safeDescription(deadline: DeadlineRecord, level: DeadlineIcalPrivacyLevel): string {
  if (level === 'details') return containsDirectIdentifier(deadline.description) ? 'Bitte Vorgang in Gremia.SBV prüfen.' : (deadline.description ?? 'Bitte Vorgang in Gremia.SBV prüfen.');
  const typeLabel = level === 'privacy_first' ? 'SBV-Frist' : deadlineProcessTypeLabel(deadline);
  const suffix = level === 'case_reference' ? ' Fallreferenz ohne Personennamen ist im Titel enthalten.' : '';
  return `Fristart: ${typeLabel}. Bitte Vorgang in Gremia.SBV prüfen. Export ohne personenbezogene Detaildaten, interne Inhalte oder Beschäftigtenkennzeichen.${suffix}`;
}

export function exportDeadlinesToIcal(deadlines: DeadlineRecord[], options: DeadlineIcalExportOptions = {}): string {
  const privacyLevel = options.privacyLevel ?? 'process_type';
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
