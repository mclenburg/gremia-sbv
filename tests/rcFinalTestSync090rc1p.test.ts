import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string; scripts: Record<string, string> };

function durableReleaseDocs(): string {
  return [
    readFileSync('README.md', 'utf8'),
    readFileSync('docs/BUILD.md', 'utf8'),
    readFileSync('docs/ROADMAP.md', 'utf8'),
    readFileSync('docs/RELEASE_CHECKLIST.md', 'utf8'),
    readFileSync('docs/README.md', 'utf8'),
  ].join('\n');
}

describe('0.9.1 final test and release synchronization', () => {
  it('keeps package metadata, generated metadata and durable docs aligned', () => {
    expect(existsSync(`docs/RELEASE_NOTES_${pkg.version}.md`)).toBe(false);
    expect(readFileSync('src/app/generated/appVersion.ts', 'utf8')).toContain(pkg.version);
    expect(readFileSync('services/generated/appMetadata.ts', 'utf8')).toContain(pkg.version);
    expect(readFileSync('README.md', 'utf8')).toContain(`Stand: **${pkg.version}**`);
    expect(readFileSync('docs/ROADMAP.md', 'utf8')).toContain(`Stand: **${pkg.version}**`);
  });

  it('documents regression-test policy without depending on obsolete RC release notes', () => {
    const docs = durableReleaseDocs();
    expect(docs).toMatch(/Test-, Doku- und Release-Synchronisierung|Step G|Release-Dokumentation/);
    expect(docs).toMatch(/Verhalten|Behavior-Tests|plattformunabhängig/i);
    expect(docs).toMatch(/Behavior-Tests|Regression|E2E|Test/i);
    expect(docs).toMatch(/portable.*EXE|Direktstart-EXE/i);
  });

  it('exposes this regression test as an npm script', () => {
    expect(pkg.scripts['test:rc-final-test-sync-090rc1p']).toBe('vitest run tests/rcFinalTestSync090rc1p.test.ts');
  });
});
