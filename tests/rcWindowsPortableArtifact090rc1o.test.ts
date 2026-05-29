import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from './helpers/sourceText';

const buildPlatform = readNormalizedSourceText('scripts/build-platform.cjs');
const workflow = readNormalizedSourceText('.github/workflows/build-release.yml');
const windowsBuildDoc = readNormalizedSourceText('docs/WINDOWS_BUILD.md');
const buildDoc = readNormalizedSourceText('docs/BUILD.md');
const pkg = JSON.parse(readNormalizedSourceText('package.json')) as {
  version: string;
  scripts: Record<string, string>;
  build: { win: { target: Array<{ target: string }> }; nsis?: unknown };
};
const lock = JSON.parse(readNormalizedSourceText('package-lock.json')) as {
  version: string;
  packages: Record<string, { version?: string }>;
};

describe('Windows portable artifact', () => {
  it('keeps package metadata synchronized without pinning a historical package version', () => {
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
  });

  it('builds a portable Windows executable instead of an installer', () => {
    expect(buildPlatform).toContain("label: 'Windows portable x64 EXE'");
    expect(buildPlatform).toContain("builderArgs: ['--win', 'portable', '--x64']");
    expect(buildPlatform).not.toContain("builderArgs: ['--win', 'nsis', '--x64']");
    expect(buildPlatform).not.toContain('NSIS-Installer');
    expect(pkg.build.win.target.map((entry) => entry.target)).toEqual(['portable']);
    expect(pkg.build.nsis).toBeUndefined();
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
    expect(windowsBuildDoc).toMatch(/kein(?:en)? verpflichtenden Installer|kein Installer/i);
    expect(buildDoc).toContain('portable Direktstart-EXE');
  });

  it('exposes the RC verification script', () => {
    expect(pkg.scripts['test:rc-windows-portable-artifact-090rc1o']).toBe(
      'vitest run tests/rcWindowsPortableArtifact090rc1o.test.ts'
    );
  });
});
