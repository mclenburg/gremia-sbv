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
      build?: {
        win?: Record<string, unknown>;
      };
    }>('package.json');

    const windowsConfig = pkg.build?.win ?? {};
    const hasUnsupportedPublisherName = Object.prototype.hasOwnProperty.call(windowsConfig, 'publisherName');

    expect(hasUnsupportedPublisherName).toBe(false);
    expect(windowsConfig.signAndEditExecutable).toBe(false);
  });

  it('checks the unsupported option before electron-builder starts packaging', () => {
    const readinessScript = readFileSync(path.join(root, 'scripts', 'check-build-readiness.cjs'), 'utf8');

    const hasBuilderSchemaGuard = readinessScript.includes('validateElectronBuilderConfiguration(pkg)');
    const rejectsRemovedPublisherOption = readinessScript.includes('build.win.publisherName wird von electron-builder 26 nicht mehr akzeptiert');

    expect(hasBuilderSchemaGuard).toBe(true);
    expect(rejectsRemovedPublisherOption).toBe(true);
  });
});
