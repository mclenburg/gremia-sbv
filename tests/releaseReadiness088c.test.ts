import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function packageVersion(): string {
  return JSON.parse(read('package.json')).version;
}

describe('0.8.8-c release readiness contracts', () => {
  it('keeps generated app versions aligned with package.json instead of a historic patch literal', () => {
    const version = packageVersion();
    expect(read('src/app/generated/appVersion.ts')).toContain(`APP_VERSION = "${version}"`);
    expect(read('services/generated/appMetadata.ts')).toContain(`APP_VERSION = "${version}"`);
  });

  it('keeps source cleanup and build readiness wired into build and test runs', () => {
    const scripts = JSON.parse(read('package.json')).scripts;
    expect(scripts['source:cleanup']).toBe('node scripts/cleanup-obsolete-files.cjs');
    expect(scripts['source:cleanup:dry-run']).toBe('node scripts/cleanup-obsolete-files.cjs --dry-run');
    expect(scripts.pretest).toContain('npm run source:cleanup');
    expect(scripts.prebuild).toBe('npm run version:generate && npm run source:cleanup && npm run build:readiness');
    expect(scripts['build:readiness']).toBe('node scripts/check-build-readiness.cjs');
  });

  it('keeps obsolete-test cleanup explicit and manifest driven', () => {
    expect(existsSync('maintenance/source-cleanup/obsolete-files-0.8.8-c.json')).toBe(true);
    const manifest = JSON.parse(read('maintenance/source-cleanup/obsolete-files-0.8.8-c.json'));
    expect(manifest.version).toBe('0.8.8-c');
    expect(manifest.files).toContain('tests/buildReadiness088.test.ts');
    expect(manifest.files).toContain('tests/sourceCleanup087b.test.ts');
    expect(manifest.files).not.toContain('tests/processServices.test.ts');
  });
});
