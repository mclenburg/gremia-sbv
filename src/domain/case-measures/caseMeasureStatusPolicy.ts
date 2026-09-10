export const CLOSED_CASE_MEASURE_STATUSES = [
  'completed',
  'cancelled',
  'done',
  'closed',
  'abgeschlossen',
  'erledigt',
  'beendet',
  'verworfen',
  'abgebrochen',
  'abgelehnt',
  'zurueckgezogen',
  'pflichtverstoss_dokumentiert',
] as const;

const CLOSED_STATUS_SET = new Set<string>(CLOSED_CASE_MEASURE_STATUSES);

export function isClosedCaseMeasureStatus(status: string | null | undefined): boolean {
  const normalized = status?.trim().toLocaleLowerCase('de-DE');
  return normalized ? CLOSED_STATUS_SET.has(normalized) : false;
}

export function isRunningCaseMeasureStatus(status: string | null | undefined): boolean {
  return !isClosedCaseMeasureStatus(status);
}
