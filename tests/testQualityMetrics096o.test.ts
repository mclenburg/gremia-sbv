import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const metrics = require('../scripts/lib/test-quality-metrics.cjs') as {
  collectTestQuality(root?: string): Array<{ file: string; category: string }>;
  summarizeTestQuality(files?: Array<{ file: string; category: string; readsProjectSource: boolean; importsProductionCode: boolean; assertionCount: number; sourceAssertionCount: number }>): {
    totalFiles: number;
    behaviorFiles: number;
    hybridFiles: number;
    sourceInspectionFiles: number;
  };
};

describe('reproduzierbare Testqualitätsmetriken', () => {
  it('trennt Verhalten, reine Source-Inspection und hybride Tests deterministisch', () => {
    const root = mkdtempSync(join(tmpdir(), 'gremia-test-quality-'));
    try {
      mkdirSync(join(root, 'tests'), { recursive: true });
      mkdirSync(join(root, 'e2e'), { recursive: true });
      writeFileSync(join(root, 'tests/behavior.test.ts'), "import { service } from '../services/example';\nexpect(service()).toBe(true);\n");
      writeFileSync(join(root, 'tests/source.test.ts'), "const source = readFileSync('x', 'utf8');\nexpect(source).toContain('token');\n");
      writeFileSync(join(root, 'tests/hybrid.test.ts'), "import { service } from '../services/example';\nconst source = readFileSync('x', 'utf8');\nexpect(source).toMatch(/token/);\nexpect(service()).toBe(true);\n");
      writeFileSync(join(root, 'e2e/flow.spec.ts'), "const source = readFileSync('x', 'utf8');\nexpect(source).toContain('token');\n");

      expect(metrics.collectTestQuality(root).map(({ file, category }) => ({ file, category }))).toEqual([
        { file: 'e2e/flow.spec.ts', category: 'behavior' },
        { file: 'tests/behavior.test.ts', category: 'behavior' },
        { file: 'tests/hybrid.test.ts', category: 'hybrid' },
        { file: 'tests/source.test.ts', category: 'source_inspection' },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('liefert einen maschinenlesbaren Bericht und hält das versionierte Ratchet ein', () => {
    const json = execFileSync(process.execPath, ['scripts/report-test-quality.cjs', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const report = JSON.parse(json) as {
      definition: string;
      totalFiles: number;
      behaviorFiles: number;
      hybridFiles: number;
      sourceInspectionFiles: number;
      assertions: number;
      sourceAssertions: number;
    };

    expect(report.definition).toContain('AST-basierte Assertion-Klassifikation');
    expect(report.totalFiles).toBeGreaterThan(0);
    expect(report.behaviorFiles + report.hybridFiles + report.sourceInspectionFiles).toBe(report.totalFiles);
    expect(report.assertions).toBeGreaterThanOrEqual(report.sourceAssertions);

    expect(() => execFileSync(process.execPath, ['scripts/report-test-quality.cjs', '--check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    })).not.toThrow();
  });

  it('ersetzt die nicht belegte Prozent-Selbstauskunft und bindet das Ratchet in den Releaseweg ein', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    const cleanupManifest = readFileSync('maintenance/source-cleanup/obsolete-string-tests-0.9.1-final.json', 'utf8');

    expect(packageJson.scripts['test:quality-report']).toBe('node scripts/report-test-quality.cjs');
    expect(packageJson.scripts['test:quality-check']).toBe('node scripts/report-test-quality.cjs --check');
    expect(packageJson.scripts['release:check']).toContain('npm run test:quality-check');
    expect(cleanupManifest).not.toContain('68 Prozent Verhaltenstests');
  });
});
