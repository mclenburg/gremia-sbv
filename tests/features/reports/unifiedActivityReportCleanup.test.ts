import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('einheitlicher Tätigkeitsbericht', () => {
  it('hält die parallele alte Berichtsimplementierung vollständig entfernt', () => {
    expect(existsSync('services/activityReportService.ts')).toBe(false);
    expect(existsSync('tests/activityReportServiceBehavior0813m.test.ts')).toBe(false);
  });
});
