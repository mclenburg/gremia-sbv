import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { readNormalizedSourceText } from './helpers/sourceText';

const forbiddenTmpLiteral = '/t' + 'mp/';
const forbiddenWindowsRoot = 'C:' + '\\';

function read(path: string): string {
  return readNormalizedSourceText(path);
}

describe('0.9.1 Step G Test-, Doku- und Release-Sync', () => {
  it('keeps README, roadmap and build docs aligned to the package version', () => {
    for (const file of ['README.md', 'docs/ROADMAP.md', 'docs/BUILD.md']) {
      expect(read(file), file).toContain(`Stand: **${pkg.version}**`);
    }
  });

  it('keeps pre-release notes out of the active documentation set', () => {
    const docsReadme = read('docs/README.md');
    const roadmap = read('docs/ROADMAP.md');
    const cleanupManifest = read('maintenance/source-cleanup/obsolete-docs-0.9.1-pre-release.json');
    expect(docsReadme).toContain('Release Notes, Change Logs');
    expect(roadmap).not.toContain('### 0.9.0-rc.1-p – RC-Coverage-Scope');
    expect(cleanupManifest).toContain('docs/RELEASE_NOTES_0.9.1.md');
    expect(cleanupManifest).toContain('docs/CHANGELOG.md');
  });

  it('documents platform-independent test rules and release artifact boundaries', () => {
    const buildDoc = read('docs/BUILD.md');
    const windowsDoc = read('docs/WINDOWS_BUILD.md');
    expect(buildDoc).toMatch(/plattformunabhängig/i);
    expect(buildDoc).toMatch(/Source[- ]code-Archive/i);
    expect(buildDoc).toContain('AppImage, EXE und DMG');
    expect(windowsDoc).toMatch(/portable.*\.exe/i);
    expect(windowsDoc).toMatch(/kein Installer/i);
  });

  it('keeps Step-G regression tests free from POSIX-only paths and raw CRLF assumptions', () => {
    const sources = [
      'tests/rc091StepGReleaseSync.test.ts',
      'tests/rcFinalTestSync090rc1p.test.ts',
      'tests/rcReleaseArtifacts090rc1f.test.ts'
    ].map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(sources).not.toContain(forbiddenTmpLiteral);
    expect(sources).not.toContain(forbiddenWindowsRoot);
    const forbiddenRawCrlfAssertion = '\\r' + '\\n';
    expect(sources).not.toContain(forbiddenRawCrlfAssertion);
  });
});
