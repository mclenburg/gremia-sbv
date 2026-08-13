import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from '../../helpers/sourceText';

const buildPlatform = readNormalizedSourceText('scripts/build-platform.cjs');
const workflow = readNormalizedSourceText('.github/workflows/build-release.yml');
const windowsBuildDoc = readNormalizedSourceText('docs/WINDOWS_BUILD.md');
const buildDoc = readNormalizedSourceText('docs/BUILD.md');
const pkg = JSON.parse(readNormalizedSourceText('package.json')) as {
  version: string;
  scripts: Record<string, string>;
  build: {
    win: { target: Array<{ target: string }> };
    portable?: { artifactName?: string };
    nsis?: { artifactName?: string };
  };
};
const lock = JSON.parse(readNormalizedSourceText('package-lock.json')) as {
  version: string;
  packages: Record<string, { version?: string }>;
};

describe('Windows release artifacts', () => {
  it('keeps package metadata synchronized without pinning a historical package version', () => {
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
  });

  it('builds both portable Windows executable and NSIS installer', () => {
    expect(buildPlatform).toContain("label: 'Windows portable + setup x64 EXE'");
    expect(buildPlatform).toContain("builderArgs: ['--win', '--x64']");
    expect(pkg.build.win.target.map((entry) => entry.target)).toEqual(['portable', 'nsis']);
    expect(pkg.build.portable?.artifactName).toContain('-portable.');
    expect(pkg.build.nsis?.artifactName).toContain('-setup.');
  });

  it('uploads only the free-account release artifacts from the tagged workflow', () => {
    expect(workflow).toContain('release/*.AppImage');
    expect(workflow).toContain('release/*.exe');
    expect(workflow).not.toContain('release/*.dmg');
    expect(workflow).not.toContain('macos-latest');
    expect(workflow).not.toContain('release/*.blockmap');
    expect(workflow).not.toContain('release/latest.yml');
    expect(workflow).not.toContain('release/*.zip');
  });



  it('paketiert ausschließlich einen unveränderten, zuvor kompilierten Artefaktstand', () => {
    expect(buildPlatform).toContain("runNodeScript('scripts/build-artifact-state.cjs', ['check'])");
    expect(buildPlatform).not.toContain("runNpmScript('build:app')");
    expect(buildPlatform).not.toContain("run(command('npm'), ['run', 'build'])");
    expect(buildPlatform).toContain('runNodeScript');
    expect(buildPlatform).toContain('process.execPath');
    expect(buildPlatform).not.toContain("run(command('node')");
  });

  it('documents the dual Windows release decision', () => {
    expect(windowsBuildDoc).toContain('portable');
    expect(windowsBuildDoc).toContain('NSIS-Installer');
    expect(windowsBuildDoc).toContain('Self-Extract');
    expect(buildDoc).toContain('portable `.exe` + NSIS-Setup `.exe`');
  });

  it('exposes the RC verification script', () => {
    expect(pkg.scripts['test:rc-windows-portable-artifact-090rc1o']).toBe(
      'vitest run tests/platform/electron/rcWindowsPortableArtifact.test.ts'
    );
  });
});
