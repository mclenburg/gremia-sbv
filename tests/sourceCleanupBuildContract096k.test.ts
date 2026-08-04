import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('0.9.6-k verbindlicher Source-Cleanup im Build', () => {
  it('führt Löschmanifeste vor Coverage und App-Build strikt aus', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts['source:cleanup:strict']).toBe(
      'node scripts/cleanup-obsolete-files.cjs --strict-delete --verbose',
    );
    expect(pkg.scripts['test:coverage']).toBe(
      'npm run source:cleanup:strict && vitest run --coverage',
    );
    expect(pkg.scripts['build:app']).toMatch(/^npm run source:cleanup:strict && /);
  });

  it('führt entfernte Services nicht mehr als Coverage-Ziele', () => {
    const config = readFileSync('vitest.config.ts', 'utf8');

    expect(config).not.toContain("'services/terminationHearingService.ts'");
    expect(config).not.toContain("'services/activityReportService.ts'");
  });
});
