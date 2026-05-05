import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('0.8.8 build readiness and native dependency guard', () => {
  it('keeps electron-builder install-app-deps as postinstall hook', () => {
    const pkg = JSON.parse(read('package.json'));

    expect(pkg.version).toBe('0.8.8');
    expect(pkg.scripts.postinstall).toBe('electron-builder install-app-deps');
    expect(pkg.scripts['native:install-app-deps']).toBe('electron-builder install-app-deps');
  });

  it('runs version generation, source cleanup and build readiness before build', () => {
    const pkg = JSON.parse(read('package.json'));

    expect(pkg.scripts.prebuild).toBe('npm run version:generate && npm run source:cleanup && npm run build:readiness');
    expect(pkg.scripts['build:readiness']).toBe('node scripts/check-build-readiness.cjs');
    expect(pkg.scripts['build:readiness:strict']).toBe('node scripts/check-build-readiness.cjs --strict');
  });

  it('adds a dependency-free build readiness script with stable checks', () => {
    const script = read('scripts/check-build-readiness.cjs');

    expect(script).toContain('validatePostinstall');
    expect(script).toContain('validateVersions');
    expect(script).toContain('validateSchemaVersion');
    expect(script).toContain('validateCleanupManifests');
    expect(script).toContain('electron-builder install-app-deps');
    expect(script).toContain('APP_SCHEMA_VERSION');
  });

  it('keeps generated app versions aligned with package.json', () => {
    expect(read('src/app/generated/appVersion.ts')).toContain('APP_VERSION = "0.8.8"');
    expect(read('services/generated/appMetadata.ts')).toContain('APP_VERSION = "0.8.8"');
  });

  it('provides a cleanup manifest for this patch without deleting files implicitly', () => {
    expect(existsSync('maintenance/source-cleanup/obsolete-files-0.8.8.json')).toBe(true);
    const manifest = JSON.parse(read('maintenance/source-cleanup/obsolete-files-0.8.8.json'));

    expect(manifest.version).toBe('0.8.8');
    expect(manifest.files).toEqual([]);
    expect(manifest.directories).toEqual([]);
  });
});
