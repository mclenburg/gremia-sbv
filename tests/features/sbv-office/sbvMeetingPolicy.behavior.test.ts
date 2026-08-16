import { describe, expect, it } from 'vitest';
import { calculateSbvMeetingSuspensionDueAt, canOfferSbvMeetingSuspension } from '../../../services/sbvMeetingPolicy.js';

describe('SBV meeting policy', () => {
  it('setzt die Aussetzungsfrist exakt eine Woche nach der Beschlussfassung', () => {
    expect(calculateSbvMeetingSuspensionDueAt('2026-08-16T10:30:00.000Z')).toBe('2026-08-23T10:30:00.000Z');
  });

  it('bietet die Aussetzung erst bei Beschluss und relevantem Aussetzungsgrund an', () => {
    expect(canOfferSbvMeetingSuspension({ significantImpairment: true, nonParticipation: false })).toBe(false);
    expect(canOfferSbvMeetingSuspension({ significantImpairment: false, nonParticipation: false, resolutionAt: '2026-08-16T10:30:00.000Z' })).toBe(false);
    expect(canOfferSbvMeetingSuspension({ significantImpairment: false, nonParticipation: true, resolutionAt: '2026-08-16T10:30:00.000Z' })).toBe(true);
  });
});
