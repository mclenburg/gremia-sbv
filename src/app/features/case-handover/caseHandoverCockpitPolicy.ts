import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverCockpitItem } from '../../../domain/models/case-handover.model';

export function filterHandoverCases(cases: readonly CaseRecord[], query: string): CaseRecord[] {
  const normalized = query.trim().toLocaleLowerCase('de-DE');
  if (!normalized) return [...cases];
  return cases.filter((record) => [record.caseNumber, record.displayName, record.category]
    .some((value) => value.toLocaleLowerCase('de-DE').includes(normalized)));
}

export function toggleHandoverCase(selectedIds: readonly string[], caseId: string): string[] {
  return selectedIds.includes(caseId)
    ? selectedIds.filter((id) => id !== caseId)
    : [...selectedIds, caseId];
}

export function handoverStatusLabel(item: CaseHandoverCockpitItem): string {
  if (item.status === 'expired') return 'Abgelaufen – Rückgabe oder Abschluss prüfen';
  if (item.status === 'returned') return 'Rückgabe eingespielt';
  if (item.packageType === 'return_delta') return 'Rückgabe-Delta';
  return item.direction === 'incoming' ? 'Vertretung übernommen' : 'An Vertretung übergeben';
}

export function toHandoverExpiry(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(`${trimmed}T23:59:59`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
