import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('service coverage configuration', () => {
  it('uses v8 coverage and gates RC-critical service contracts at 70 percent', () => {
    const config = readFileSync('vitest.config.ts', 'utf8');

    expect(config).toContain("provider: 'v8'");
    expect(config).toContain('const rcCriticalServiceCoverage');
    expect(config).toContain("'services/securityService.ts'");
    expect(config).toContain("'services/backupService.ts'");
    expect(config).toContain("'services/terminationWorkflowPolicy.ts'");
    expect(config).toContain('branches: 70');
    expect(config).toContain('functions: 70');
    expect(config).toContain('lines: 70');
    expect(config).toContain('statements: 70');
  });
});
