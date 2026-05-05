import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('0.8.7-b source cleanup build integration', () => {
  it('adds a conservative cleanup helper and patch manifest location', () => {
    const script = read('scripts/cleanup-obsolete-files.cjs');

    expect(script).toContain('maintenance');
    expect(script).toContain('source-cleanup');
    expect(script).toContain('Wildcards sind aus Sicherheitsgründen nicht erlaubt');
    expect(script).toContain('Absolute Pfade sind nicht erlaubt');
    expect(script).toContain('Pfade außerhalb des Projekt-Roots sind nicht erlaubt');
    expect(script).toContain('allowedTopLevel');
    expect(script).toContain('protectedTopLevel');
    expect(script).toContain('--dry-run');
    expect(existsSync('maintenance/source-cleanup/obsolete-files-0.8.7-b.json')).toBe(true);
  });

  it('runs cleanup before the TypeScript/Vite build through npm prebuild', () => {
    const pkg = JSON.parse(read('package.json'));

    expect(pkg.version).toBe('0.8.7-b');
    expect(pkg.scripts['source:cleanup']).toBe('node scripts/cleanup-obsolete-files.cjs');
    expect(pkg.scripts['source:cleanup:dry-run']).toBe('node scripts/cleanup-obsolete-files.cjs --dry-run');
    expect(pkg.scripts.prebuild).toBe('npm run version:generate && npm run source:cleanup');
  });

  it('uses explicit patch manifests rather than implicit glob deletion', () => {
    const manifest = JSON.parse(read('maintenance/source-cleanup/obsolete-files-0.8.7-b.json'));

    expect(manifest.version).toBe('0.8.7-b');
    expect(Array.isArray(manifest.files)).toBe(true);
    expect(Array.isArray(manifest.directories)).toBe(true);
  });
});
