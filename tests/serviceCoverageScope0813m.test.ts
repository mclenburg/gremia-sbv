import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = readFileSync('vitest.config.ts', 'utf8');

describe('RC service coverage scope', () => {
  it('keeps the v8 coverage gate enabled for RC-critical service contracts', () => {
    expect(config).toContain("provider: 'v8'");
    expect(config).toContain('const rcCriticalServiceCoverage');
    expect(config).toContain("'services/securityService.ts'");
    expect(config).toContain("'services/backupService.ts'");
    expect(config).toContain("'services/terminationWorkflowPolicy.ts'");
    expect(config).toContain("'services/preventionWorkflowPolicy.ts'");
    expect(config).toContain("'services/retentionPolicy.ts'");
    expect(config).not.toContain('enabled: false');
  });

  it('does not measure broad database-bound adapter services as unit-test coverage blockers', () => {
    expect(config).not.toMatch(/include:\s*\[\s*['"]services\/\*\*\/\*\.ts['"]\s*\]/);
    expect(config).not.toContain("'services/caseService.ts'");
    expect(config).not.toContain("'services/reportService.ts'");
    expect(config).not.toContain("'services/templateService.ts'");
    expect(config).not.toContain("'services/participationService.ts'");
    expect(config).not.toContain("'services/workplaceAccommodationService.ts'");
  });

  it('keeps the 70 percent thresholds requested for the RC gate', () => {
    expect(config).toContain('branches: 70');
    expect(config).toContain('functions: 70');
    expect(config).toContain('lines: 70');
    expect(config).toContain('statements: 70');
  });
});
