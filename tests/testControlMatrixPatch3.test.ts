import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const { classifyTestFiles, listTestFiles } = require('../scripts/lib/test-suite-groups.cjs') as {
  classifyTestFiles(root?: string): { config: { precedence: string[] }; assignments: Record<string, string[]> };
  listTestFiles(root?: string): string[];
};

describe('Patch 3 test control contracts', () => {
  it('assigns every test file to exactly one non-empty suite', () => {
    const { config, assignments } = classifyTestFiles(process.cwd());
    const allFiles = listTestFiles(process.cwd());
    const assigned = config.precedence.flatMap((group: string) => assignments[group]);

    expect(new Set(assigned).size).toBe(allFiles.length);
    expect(assigned).toHaveLength(allFiles.length);
    for (const group of config.precedence) expect(assignments[group].length).toBeGreaterThan(0);
  });

  it('keeps security and backup behavior in the security suite', () => {
    const { assignments } = classifyTestFiles(process.cwd());
    expect(assignments.security).toContain('tests/securityServiceBehavior0813f.test.ts');
    expect(assignments.security).toContain('tests/backupServiceBehavior0813f.test.ts');
    expect(assignments.security).toContain('tests/demoModeBehavior096r.test.ts');
  });

  it('validates productive entry points and named tests through the matrix gate', () => {
    const result = spawnSync(process.execPath, ['scripts/check-functional-coverage-matrix.cjs'], {
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Funktionsabdeckungsmatrix gültig');
  });

  it('documents every omitted matrix category with a rationale', () => {
    const matrix = JSON.parse(readFileSync(join(process.cwd(), 'maintenance/test-quality/functional-coverage-matrix.json'), 'utf8')) as {
      categories: string[];
      functions: Array<{ id: string; tests: Record<string, unknown>; rationales: Record<string, string> }>;
    };
    for (const entry of matrix.functions) {
      for (const category of matrix.categories) {
        if (entry.tests[category] === null) expect(entry.rationales[category], `${entry.id}/${category}`).toBeTruthy();
      }
    }
  });
});
