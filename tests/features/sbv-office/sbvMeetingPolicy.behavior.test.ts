import { describe, expect, it } from 'vitest';
import { calculateSbvMeetingSuspensionDueAt } from '../../../services/sbvMeetingPolicy.js';

describe('SBV meeting policy', () => {
  it('setzt die Aussetzungsfrist exakt eine Woche nach der Beschlussfassung', () => {
    expect(calculateSbvMeetingSuspensionDueAt('2026-08-16T10:30:00.000Z')).toBe('2026-08-23T10:30:00.000Z');
  });
});
