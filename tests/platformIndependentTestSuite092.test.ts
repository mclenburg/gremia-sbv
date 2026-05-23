import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function portablePath(filePath: string): string {
  return filePath.replaceAll('\\\\', '/');
}

function collectTestFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) return collectTestFiles(absolute);
    return entry.isFile() && /\.(test|spec)\.ts$/.test(entry.name) ? [portablePath(absolute)] : [];
  });
}

function allRunnableTestFiles(): string[] {
  return [...collectTestFiles('tests'), ...collectTestFiles('e2e')].sort();
}

describe('plattformunabhängige Test-Suite 0.9.2', () => {
  it('verwendet keine harten absoluten Betriebssystempfade in Unit- oder E2E-Tests', () => {
    const forbiddenFragments = [
      ['/', 'tmp', '/'].join(''),
      ['/', 'home', '/'].join(''),
      ['/', 'mnt', '/'].join(''),
      ['C', ':', '\\'].join(''),
      ['C', ':', '/'].join(''),
    ];

    const violations = allRunnableTestFiles().flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return forbiddenFragments
        .filter((fragment) => source.includes(fragment))
        .map((fragment) => `${file}: harter absoluter Pfad ${JSON.stringify(fragment)}`);
    });

    expect(violations).toEqual([]);
  });

  it('macht keine Dateisystem-Aussagen abhängig von POSIX- oder Windows-Trennzeichen', () => {
    const unsafePatterns = [
      { label: "split('/') für Dateisystempfade", pattern: /\.split\(\s*['\"]\/['\"]\s*\)/g },
      { label: 'roher CRLF-Vergleich in Assertion', pattern: /\.(?:toBe|toEqual|toContain|toMatch)\(\s*['\"`][^'\"`]*\\r\\n/g },
    ];

    const violations = allRunnableTestFiles().flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return unsafePatterns
        .filter(({ pattern }) => {
          pattern.lastIndex = 0;
          return pattern.test(source);
        })
        .map(({ label }) => `${file}: ${label}`);
    });

    expect(violations).toEqual([]);
  });

  it('enthält keine plattformabhängigen Test-Skips', () => {
    const skipPattern = /\.(?:skip|fixme)\([^\n]*(?:process\.platform|win32|darwin|linux)/g;
    const violations = allRunnableTestFiles().filter((file) => {
      const source = readFileSync(file, 'utf8');
      skipPattern.lastIndex = 0;
      return skipPattern.test(source);
    });

    expect(violations).toEqual([]);
  });
});
