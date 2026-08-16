import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('verbindlicher Source-Cleanup im Build', () => {
  it('validiert sämtliche Cleanup-Manifeste über den produktiven Cleanup-Preflight', () => {
    const result = spawnSync(process.execPath, ['scripts/cleanup-obsolete-files.cjs', '--plan'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('Cleanup-Plan:');
    expect(result.stdout).toContain('0 Fehler.');
  });

  it('hält bereits entfernte Altimplementierungen tatsächlich aus dem Arbeitsbaum heraus', () => {
    expect(existsSync('services/terminationHearingService.ts')).toBe(false);
    expect(existsSync('services/activityReportService.ts')).toBe(false);
    expect(existsSync('tests/activityReportServiceBehavior0813m.test.ts')).toBe(false);
  });
});
