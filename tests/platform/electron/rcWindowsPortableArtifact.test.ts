import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from '../../helpers/sourceText';

const buildPlatform = readNormalizedSourceText('scripts/build-platform.cjs');
const workflow = readNormalizedSourceText('.github/workflows/build-release.yml');
const windowsBuildDoc = readNormalizedSourceText('docs/WINDOWS_BUILD.md');
const buildDoc = readNormalizedSourceText('docs/BUILD.md');
const pkg = JSON.parse(readNormalizedSourceText('package.json')) as {
  version: string;
  scripts: Record<string, string>;
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

  it('builds portable Windows executable and native MSI for the release path', () => {
    expect(buildPlatform).toContain("label: 'Windows portable x64 EXE + MSI'");
    expect(buildPlatform).toContain("builderArgs: ['--win', 'portable', 'msi', '--x64']");
    expect(buildPlatform).toContain('-win-x64-portable.exe');
    expect(buildPlatform).toContain('-win-x64.msi');
    expect(buildPlatform).not.toContain('setup x64 EXE');
  });

  it('uploads only the intended free-account release artifacts from the tagged workflow', () => {
    expect(workflow).toContain('release/*.AppImage');
    expect(workflow).toContain('release/*-win-x64-portable.exe');
    expect(workflow).toContain('release/*-win-x64.msi');
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

  it('documents portable EXE plus MSI as the Windows release decision', () => {
    expect(windowsBuildDoc).toContain('portable');
    expect(windowsBuildDoc).toContain('MSI');
    expect(windowsBuildDoc).not.toContain('NSIS-Installer');
    expect(buildDoc).toContain('portable `.exe` + `.msi`');
    expect(buildDoc).toContain('-win-x64.msi');
  });

  it('exposes the RC verification script', () => {
    expect(pkg.scripts['test:rc-windows-portable-artifact-090rc1o']).toBe(
      'vitest run tests/platform/electron/rcWindowsPortableArtifact.test.ts'
    );
  });
});
