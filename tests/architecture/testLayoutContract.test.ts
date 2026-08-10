import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { analyzeTestLayout } = require('../../scripts/check-test-layout.cjs') as {
  analyzeTestLayout(root?: string): { files: string[]; violations: string[] };
};

const roots: string[] = [];
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

function fixture(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'gremia-test-layout-'));
  roots.push(root);
  for (const file of files) {
    const target = join(root, file);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, 'export {};\n');
  }
  return root;
}

describe('Phase 5 Testlayout-Vertrag', () => {
  it('akzeptiert fachlich organisierte Tests', () => {
    const root = fixture([
      'tests/features/bem/bemWorkflowPolicy.test.ts',
      'tests/security/vault/securityServiceBehavior.test.ts',
      'tests/architecture/migrations/migrationHelpers.test.ts',
    ]);
    expect(analyzeTestLayout(root).violations).toEqual([]);
  });

  it('hält die vollständig migrierte reale Testlandschaft frei von Altpfaden', () => {
    const result = analyzeTestLayout(process.cwd());
    expect(result.violations).toEqual([]);
    expect(result.files.length).toBeGreaterThanOrEqual(238);
  });

  it('weist Root-Tests und historische Patch-/Versionssuffixe zurück', () => {
    const root = fixture([
      'tests/legacy091.test.ts',
      'tests/features/bem/bemMigration0812d.test.ts',
    ]);
    const result = analyzeTestLayout(root);
    expect(result.violations.some((item) => item.includes('direkt unter tests/'))).toBe(true);
    expect(result.violations.some((item) => item.includes('historischer Patch-/Versionssuffix'))).toBe(true);
  });
});
