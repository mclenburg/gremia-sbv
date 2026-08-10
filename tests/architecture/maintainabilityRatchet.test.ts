import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

interface Metrics {
  physicalLines: number;
  codeLines: number;
  functionCount: number;
  maxFunctionLines: number;
  imports: number;
}

interface Analysis {
  filesScanned: number;
  limits: Record<string, number>;
  metricsByFile: Record<string, Metrics>;
  debt: Record<string, Metrics>;
}

interface Comparison {
  violations: string[];
  improvements: string[];
}

const require = createRequire(import.meta.url);
const audit = require('../../scripts/report-maintainability.cjs') as {
  analyzeProject(projectRoot: string, options?: {
    roots?: string[];
    limits?: Record<string, number>;
  }): Analysis;
  compareWithBaseline(analysis: Analysis, baseline: {
    limits: Record<string, number>;
    debt: Record<string, Metrics>;
  }): Comparison;
};

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function projectWithSource(source: string): string {
  const projectRoot = mkdtempSync(join(tmpdir(), 'gremia-maintainability-'));
  temporaryDirectories.push(projectRoot);
  mkdirSync(join(projectRoot, 'src'), { recursive: true });
  writeFileSync(join(projectRoot, 'src', 'sample.ts'), source);
  return projectRoot;
}

const limits = {
  physicalLines: 8,
  codeLines: 6,
  maxFunctionLines: 4,
  imports: 2,
};

describe('0.9.6 Maintainability-Ratchet', () => {
  it('misst produktive Dateien per AST und ignoriert Kommentare als Codezeilen', () => {
    const projectRoot = projectWithSource([
      '// Kommentar',
      "import { join } from 'node:path';",
      '',
      'export function value() {',
      "  return join('a', 'b');",
      '}',
      '',
    ].join('\n'));

    const analysis = audit.analyzeProject(projectRoot, { roots: ['src'], limits });

    expect(analysis.filesScanned).toBe(1);
    expect(analysis.metricsByFile['src/sample.ts']).toMatchObject({
      physicalLines: 7,
      codeLines: 4,
      functionCount: 1,
      maxFunctionLines: 3,
      imports: 1,
    });
    expect(analysis.debt).toEqual({});
  });

  it('blockiert neue Dateien oberhalb der Architekturgrenzen', () => {
    const projectRoot = projectWithSource([
      'export function oversized() {',
      '  const a = 1;',
      '  const b = 2;',
      '  const c = 3;',
      '  return a + b + c;',
      '}',
      '',
    ].join('\n'));
    const analysis = audit.analyzeProject(projectRoot, { roots: ['src'], limits });
    const comparison = audit.compareWithBaseline(analysis, { limits, debt: {} });

    expect(comparison.violations).toContain(
      'src/sample.ts: neue Architekturschuld maxFunctionLines=6 > 4',
    );
  });

  it('erlaubt bestehenden Schulden nur gleich zu bleiben oder zu sinken', () => {
    const projectRoot = projectWithSource([
      'export function existingDebt() {',
      '  const a = 1;',
      '  const b = 2;',
      '  const c = 3;',
      '  return a + b + c;',
      '}',
      '',
    ].join('\n'));
    const analysis = audit.analyzeProject(projectRoot, { roots: ['src'], limits });
    const current = analysis.metricsByFile['src/sample.ts'];

    const accepted = audit.compareWithBaseline(analysis, {
      limits,
      debt: { 'src/sample.ts': current },
    });
    const rejected = audit.compareWithBaseline(analysis, {
      limits,
      debt: {
        'src/sample.ts': { ...current, maxFunctionLines: current.maxFunctionLines - 1 },
      },
    });

    expect(accepted.violations).toEqual([]);
    expect(rejected.violations).toContain(
      `src/sample.ts: maxFunctionLines auf ${current.maxFunctionLines} gewachsen (Baseline ${current.maxFunctionLines - 1})`,
    );
  });

  it('fordert das Entfernen erledigter oder verwaister Baseline-Einträge', () => {
    const projectRoot = projectWithSource('export const value = 1;\n');
    const analysis = audit.analyzeProject(projectRoot, { roots: ['src'], limits });
    const comparison = audit.compareWithBaseline(analysis, {
      limits,
      debt: {
        'src/sample.ts': {
          physicalLines: 20,
          codeLines: 15,
          functionCount: 1,
          maxFunctionLines: 10,
          imports: 3,
        },
        'src/deleted.ts': {
          physicalLines: 20,
          codeLines: 15,
          functionCount: 1,
          maxFunctionLines: 10,
          imports: 3,
        },
      },
    });

    expect(comparison.violations).toContain(
      'src/sample.ts: liegt nicht mehr ueber den Grenzwerten; Baseline-Eintrag entfernen',
    );
    expect(comparison.violations).toContain(
      'src/deleted.ts: Datei fehlt; veralteten Baseline-Eintrag entfernen',
    );
  });
});
