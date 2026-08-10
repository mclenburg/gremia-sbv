import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('einheitlicher Tätigkeitsbericht', () => {
  it('entfernt die parallele alte Berichtsimplementierung über den Source-Cleanup', () => {
    const manifest = JSON.parse(readFileSync('maintenance/source-cleanup/obsolete-activity-report-service-0.9.5.json', 'utf8')) as { files: string[] };
    expect(manifest.files).toEqual(expect.arrayContaining([
      'services/activityReportService.ts',
      'tests/activityReportServiceBehavior0813m.test.ts',
    ]));
  });

  it('führt den produktiven Bericht ausschließlich über die HashChain-Projektion', () => {
    const source = readFileSync('services/reports/activityReportBuilders.ts', 'utf8');
    expect(source).toContain('new ActivityReportProjectionService(db).build');
    expect(source).not.toContain('renderActivityReport(');
  });
});
