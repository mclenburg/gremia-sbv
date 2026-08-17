export const GERMAN_LEGAL_TIME_ZONE = 'Europe/Berlin';

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

const legalDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: GERMAN_LEGAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function legalCalendarDate(value: Date): string {
  const parts = legalDateFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  if (!year || !month || !day) throw new Error('Deutsches Kalenderdatum konnte nicht bestimmt werden.');
  return `${year}-${month}-${day}`;
}

export function legalToday(clock: Clock = systemClock): string {
  return legalCalendarDate(clock.now());
}

export function isoInstant(clock: Clock = systemClock): string {
  return clock.now().toISOString();
}
