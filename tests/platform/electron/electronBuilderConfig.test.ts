import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8')) as T;
}

describe('electron-builder 26 configuration contract', () => {
  it('keeps Windows packaging configuration schema-compatible', () => {
    const pkg = readJson<{
      author?: string;
      build?: {
        npmRebuild?: boolean;
        nodeGypRebuild?: boolean;
        win?: Record<string, unknown>;
      };
    }>('package.json');

    const windowsConfig = pkg.build?.win ?? {};
    const hasUnsupportedPublisherName = Object.prototype.hasOwnProperty.call(windowsConfig, 'publisherName');

    expect(hasUnsupportedPublisherName).toBe(false);
    expect(windowsConfig.signAndEditExecutable).toBe(false);
    expect(pkg.author).toBe('Gremia.SBV Contributors');
    expect(pkg.build?.npmRebuild).toBe(false);
    expect(pkg.build?.nodeGypRebuild).toBe(false);
  });

  it('checks the unsupported option before electron-builder starts packaging', () => {
    const readinessScript = readFileSync(path.join(root, 'scripts', 'check-build-readiness.cjs'), 'utf8');

    const hasBuilderSchemaGuard = readinessScript.includes('validateElectronBuilderConfiguration(pkg)');
    const rejectsRemovedPublisherOption = readinessScript.includes('build.win.publisherName wird von electron-builder 26 nicht mehr akzeptiert');
    const hasRuntimeBoundaryGuard = readinessScript.includes('validateRuntimeDependencyBoundaries(pkg)');

    expect(hasBuilderSchemaGuard).toBe(true);
    expect(rejectsRemovedPublisherOption).toBe(true);
    expect(hasRuntimeBoundaryGuard).toBe(true);
  });
});


it('routes packaging through the electron-builder wrapper that filters known upstream packaging noise', () => {
  const buildPlatformScript = readFileSync(path.join(root, 'scripts', 'build-platform.cjs'), 'utf8');
  const wrapperScript = readFileSync(path.join(root, 'scripts', 'run-electron-builder.cjs'), 'utf8');

  expect(buildPlatformScript).toContain('scripts/run-electron-builder.cjs');
  expect(wrapperScript).toContain('--no-deprecation');
  expect(wrapperScript).toContain('isKnownUpstreamPackagingNoise');
  expect(wrapperScript).toContain('duplicate dependency references');
  expect(wrapperScript).toContain('[DEP0190] DeprecationWarning');
});
