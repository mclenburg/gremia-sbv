import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('final RC quality gate', () => {
  it('does not disable the v8 service coverage gate', () => {
    const config = readFileSync('vitest.config.ts', 'utf8');

    expect(config).toContain("provider: 'v8'");
    expect(config).toContain('const rcCriticalServiceCoverage');
    expect(config).toContain("'services/securityService.ts'");
    expect(config).toContain("'services/backupService.ts'");
    expect(config).toContain('branches: 70');
    expect(config).not.toContain('enabled: false');
  });

  it('keeps process template modal status handling type-safe', () => {
    const source = readFileSync('src/app/features/cases/ProcessTemplateDocumentsModal.tsx', 'utf8');

    expect(source).toContain('export type ProcessTemplateModalState =');
    expect(source).toContain("processType: 'bem'");
    expect(source).toContain("processType: 'prevention'");
    expect(source).toContain("processType: 'equalization'");
    expect(source).toContain("processType: 'termination_hearing'");
    expect(source).not.toContain('as any');
  });
});
