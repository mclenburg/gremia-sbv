import { describe, expect, it } from 'vitest';
import vitestConfig from '../../vitest.config';

describe('Coverage für kritische Services', () => {
  it('wendet v8-Coverage mit den RC-Grenzwerten auf die kritischen Services an', () => {
    const coverage = vitestConfig.test?.coverage;

    expect(coverage).toMatchObject({
      provider: 'v8',
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
      include: expect.arrayContaining([
        'services/securityService.ts',
        'services/security/**/*.ts',
        'services/backupService.ts',
        'src/domain/termination/terminationWorkflowPolicy.ts',
        'services/preventionWorkflowPolicy.ts',
        'services/retentionPolicy.ts',
        'src/domain/templates/templateContextPolicy.ts',
        'src/domain/termination/terminationPrivacyPolicy.ts',
        'src/domain/textCommands/textCommandPolicy.ts',
      ]),
    });
    expect(coverage?.include).not.toContain('services/**/*.ts');
    expect(coverage?.include).not.toContain('services/caseService.ts');
    expect(coverage?.include).not.toContain('services/templateContextPolicy.ts');
  });
});
