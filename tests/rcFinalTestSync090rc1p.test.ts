import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string; scripts: Record<string, string> };

describe('0.9.0-rc.1-p final test synchronization', () => {
  it('keeps package metadata, generated metadata and release notes aligned', () => {
    const releaseNotesPath = `docs/RELEASE_NOTES_${pkg.version}.md`;
    expect(existsSync(releaseNotesPath)).toBe(true);
    expect(readFileSync('src/app/generated/appVersion.ts', 'utf8')).toContain(pkg.version);
    expect(readFileSync('services/generated/appMetadata.ts', 'utf8')).toContain(pkg.version);
    expect(readFileSync('README.md', 'utf8')).toContain(`Stand: **${pkg.version}**`);
    expect(readFileSync('docs/ROADMAP.md', 'utf8')).toContain(`Stand: **${pkg.version}**`);
  });

  it('documents why the measure persistence test was corrected instead of changing working code', () => {
    const releaseNotes = readFileSync(`docs/RELEASE_NOTES_${pkg.version}.md`, 'utf8');
    expect(releaseNotes).toContain('fehlschlagende Maßnahmen-Test war zu grob formuliert');
    expect(releaseNotes).toContain('findFirstTextCommand(event.target.value)');
    expect(releaseNotes).toContain('onBlur');
    expect(releaseNotes).toContain('portable Direktstart-EXE');
  });

  it('exposes this regression test as an npm script', () => {
    expect(pkg.scripts['test:rc-final-test-sync-090rc1p']).toBe('vitest run tests/rcFinalTestSync090rc1p.test.ts');
  });
});
