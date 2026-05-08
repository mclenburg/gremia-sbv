import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const buildPlatform = readFileSync('scripts/build-platform.cjs', 'utf8');
const workflow = readFileSync('.github/workflows/build-release.yml', 'utf8');
const windowsBuildDoc = readFileSync('docs/WINDOWS_BUILD.md', 'utf8');
const buildDoc = readFileSync('docs/BUILD.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version: string;
  scripts: Record<string, string>;
};
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  version: string;
  packages: Record<string, { version?: string }>;
};

describe('0.9.0-rc.1-o Windows portable artifact', () => {
  it('keeps package metadata internally aligned without hard-coding a concrete patch version', () => {
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
    expect(readFileSync('src/app/generated/appVersion.ts', 'utf8')).toContain(pkg.version);
    expect(readFileSync('services/generated/appMetadata.ts', 'utf8')).toContain(pkg.version);
  });

  it('builds a portable Windows executable instead of an installer', () => {
    expect(buildPlatform).toContain("label: 'Windows portable x64 EXE'");
    expect(buildPlatform).toContain("builderArgs: ['--win', 'portable', '--x64']");
    expect(buildPlatform).not.toContain("builderArgs: ['--win', 'nsis', '--x64']");
    expect(buildPlatform).not.toContain('NSIS-Installer');
  });

  it('still uploads only the three end-user artifacts', () => {
    expect(workflow).toContain('release/*.AppImage');
    expect(workflow).toContain('release/*.exe');
    expect(workflow).toContain('release/*.dmg');
    expect(workflow).not.toContain('release/*.blockmap');
    expect(workflow).not.toContain('release/latest.yml');
    expect(workflow).not.toContain('release/*.zip');
  });

  it('documents the portable Windows release decision', () => {
    expect(windowsBuildDoc).toContain('portable');
    expect(windowsBuildDoc).toContain('kein Installer');
    expect(buildDoc).toContain('portable Direktstart-EXE');
  });

  it('exposes the RC verification script', () => {
    expect(pkg.scripts['test:rc-windows-portable-artifact-090rc1o']).toBe(
      'vitest run tests/rcWindowsPortableArtifact090rc1o.test.ts'
    );
  });
});
