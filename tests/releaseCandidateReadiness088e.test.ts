import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string; scripts: Record<string, string> };
const read = (file: string) => readFileSync(file, 'utf8');

describe('release candidate readiness', () => {
  it('keeps the project README aligned with the RC workflow', () => {
    const readme = read('README.md');
    expect(readme).toContain('npm run rc:check');
    expect(readme).toContain('npm run build:linux');
    expect(readme).toContain('docs/RELEASE_CHECKLIST.md');
  });

  it('ships a dependency-free RC readiness script and package alias', () => {
    expect(existsSync('scripts/check-release-candidate-readiness.cjs')).toBe(true);
    expect(pkg.scripts['rc:check']).toContain('check-release-candidate-readiness.cjs');
    expect(pkg.scripts['release:check']).toBe('npm run rc:check && npm run test:coverage && npm run build');
  });

  it('does not keep npm test scripts that reference missing test files', () => {
    const missing: string[] = [];
    for (const [scriptName, command] of Object.entries(pkg.scripts)) {
      const refs = [...command.matchAll(/tests\/[A-Za-z0-9_.-]+\.test\.ts/g)].map((match) => match[0]);
      for (const ref of refs) {
        if (!existsSync(path.join(process.cwd(), ref))) missing.push(`${scriptName} -> ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps source cleanup quiet by default and verbose on demand', () => {
    const cleanup = read('scripts/cleanup-obsolete-files.cjs');
    expect(cleanup).toContain('Source-Cleanup: nichts zu entfernen.');
    expect(cleanup).toContain('Bereits bereinigt:');
    expect(pkg.scripts['source:cleanup:verbose']).toBe('node scripts/cleanup-obsolete-files.cjs --verbose');
  });

  it('keeps docs index and release checklist free of stale duplicate entries', () => {
    const docsReadme = read('docs/README.md');
    expect(docsReadme).toContain('PROCESS_MODULES.md` | Prozessmodule, Maßnahmenlogik und Fallaktenbezug');
    expect(docsReadme).not.toContain('| `PROCESS_MODULES.md` | fachliche Maßnahmenlogik |');
    const checklist = read('docs/RELEASE_CHECKLIST.md');
    expect(checklist).toContain('npm run rc:check');
    expect(checklist).toContain('npm run test:coverage');
    expect(checklist).toContain('npm run release:check');
    expect(checklist).not.toContain('npm run test:release-candidate-088e');
  });
});
