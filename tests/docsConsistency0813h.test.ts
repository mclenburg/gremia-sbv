import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

const versionedDocs = [
  'README.md',
  'docs/BUILD.md',
  'docs/E2E_TESTS.md',
  'docs/KNOWN_ISSUES.md',
  'docs/RELEASE_CHECKLIST.md',
  'docs/ROADMAP.md',
];

describe('RC documentation consistency', () => {
  it('keeps public RC documentation aligned with package version', () => {
    for (const file of versionedDocs) {
      const source = readFileSync(file, 'utf8');
      expect(source, `${file} must mention current version`).toContain(pkg.version);
    }
  });

  it('documents the complete RC link coverage without obsolete MVP contradiction', () => {
    const roadmap = readFileSync('docs/ROADMAP.md', 'utf8');
    expect(roadmap).toContain('/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr');
    expect(roadmap).not.toContain('erst nach stabiler MVP-Erfahrung');
    expect(roadmap).not.toContain('MVP in 0.8.12 für `/bem`, `/bet` und `/fr`');
  });

  it('documents GitHub release artifacts and unsigned macOS explicitly', () => {
    const build = readFileSync('docs/BUILD.md', 'utf8');
    const knownIssues = readFileSync('docs/KNOWN_ISSUES.md', 'utf8');
    expect(build).toContain('.github/workflows/build-release.yml');
    expect(build).toMatch(/macOS[- ]Artefakt|macOS als unsigniertes/);
    expect(build).toContain('unsigniert');
    expect(knownIssues).toContain('unsigniert und nicht notarisiert');
  });
});
