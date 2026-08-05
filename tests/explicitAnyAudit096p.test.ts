import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  auditExplicitAny,
  compareWithBaseline,
  validateBaseline,
  type ExplicitAnyBaseline,
} from '../scripts/lib/explicit-any-audit.cjs';

const temporaryDirectories: string[] = [];

function fixtureDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'gremia-explicit-any-'));
  temporaryDirectories.push(directory);
  return directory;
}

function baselineFrom(directory: string): ExplicitAnyBaseline {
  const audit = auditExplicitAny(directory);
  return {
    schemaVersion: 1,
    findings: audit.findings.map(({ id, file, category, symbol, context, ordinal }) => ({
      id,
      file,
      category,
      symbol,
      context,
      ordinal,
    })),
  };
}

afterEach(() => {
  while (temporaryDirectories.length) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('Explicit-any-Audit', () => {
  it('erkennt sämtliche AnyKeyword-Formen über den TypeScript-AST statt über Wortsuche', () => {
    const directory = fixtureDirectory();
    writeFileSync(join(directory, 'fixture.ts'), `
      type Generic = Promise<any>;
      type RecordValue = Record<string, any>;
      type ArrayValue = any[];
      const asserted = value as any;
      function parameter(value: any): any { return value; }
      interface Shape { property: any; [key: string]: any; }
      const tuple: [string, any] = ['x', asserted];
      // any in Kommentaren und "any" in Strings sind keine Typknoten.
    `);

    const audit = auditExplicitAny(directory);

    expect(audit.summary.total).toBe(9);
    expect(audit.findings.map((finding) => finding.category)).toEqual(expect.arrayContaining([
      'generic_argument',
      'array_element',
      'assertion',
      'parameter',
      'return_type',
      'property',
      'index_signature',
      'tuple_element',
    ]));
  });

  it('behält Fundstellen bei reinen Zeilenverschiebungen stabil', () => {
    const directory = fixtureDirectory();
    const file = join(directory, 'stable.ts');
    writeFileSync(file, 'const query = database.prepare<any>("SELECT 1");\n');
    const first = auditExplicitAny(directory);

    writeFileSync(file, '\n\nconst query = database.prepare<any>("SELECT 1");\n');
    const second = auditExplicitAny(directory);

    expect(second.findings[0]?.id).toBe(first.findings[0]?.id);
    expect(second.findings[0]?.line).not.toBe(first.findings[0]?.line);
  });

  it('weist beschädigte oder doppelte Baselines zurück', () => {
    expect(() => validateBaseline({ schemaVersion: 1, findings: [
      { id: 'same', file: 'a.ts', category: 'parameter' },
      { id: 'same', file: 'b.ts', category: 'parameter' },
    ] })).toThrow(/doppelt/);
    expect(() => validateBaseline({ schemaVersion: 2, findings: [] })).toThrow(/schemaVersion 1/);
  });

  it('erkennt eine neue Fundstelle auch bei gleichzeitig entfernten Altbeständen', () => {
    const directory = fixtureDirectory();
    const existing = join(directory, 'existing.ts');
    const added = join(directory, 'added.ts');
    writeFileSync(existing, 'function oldValue(value: any) { return value; }\n');
    const baseline = baselineFrom(directory);

    writeFileSync(existing, 'function oldValue(value: unknown) { return value; }\n');
    writeFileSync(added, 'type NewDebt = Promise<any>;\n');
    const comparison = compareWithBaseline(auditExplicitAny(directory), baseline);

    expect(comparison.additions).toHaveLength(1);
    expect(comparison.removals).toHaveLength(1);
    expect(comparison.additions[0]?.file).toBe('added.ts');
  });
});
