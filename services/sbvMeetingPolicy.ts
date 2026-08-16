const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function calculateSbvMeetingSuspensionDueAt(resolutionAt: string): string {
  const resolution = new Date(resolutionAt);
  if (Number.isNaN(resolution.getTime())) throw new Error('Beschlusszeitpunkt ist ungültig.');
  return new Date(resolution.getTime() + WEEK_MS).toISOString();
}

export function canOfferSbvMeetingSuspension(input: { significantImpairment: boolean; nonParticipation: boolean; resolutionAt?: string }): boolean {
  return Boolean(input.resolutionAt && (input.significantImpairment || input.nonParticipation));
}
