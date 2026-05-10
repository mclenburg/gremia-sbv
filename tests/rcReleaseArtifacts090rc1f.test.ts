import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/build-release.yml', 'utf8');
const buildPlatform = readFileSync('scripts/build-platform.cjs', 'utf8');
const buildDoc = readFileSync('docs/BUILD.md', 'utf8');
const windowsBuildDoc = readFileSync('docs/WINDOWS_BUILD.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

describe('0.9.1 release artifact hygiene', () => {
  it('uploads only AppImage, EXE and DMG artifacts to workflow artifacts and draft releases', () => {
    expect(workflow).toContain('release/*.AppImage');
    expect(workflow).toContain('release/*.exe');
    expect(workflow).toContain('release/*.dmg');

    expect(workflow).not.toContain('release/*.blockmap');
    expect(workflow).not.toContain('release/*.zip');
    expect(workflow).not.toContain('release/*.deb');
    expect(workflow).not.toContain('release/*.tar.gz');
    expect(workflow).not.toContain('release/latest.yml');
    expect(workflow).not.toContain('release/latest-linux.yml');
    expect(workflow).not.toContain('release/latest-mac.yml');
  });

  it('builds only the release targets that are meant to be uploaded', () => {
    expect(buildPlatform).toContain("builderArgs: ['--linux', 'AppImage']");
    expect(buildPlatform).toContain("builderArgs: ['--win', 'portable', '--x64']");
    expect(buildPlatform).toContain("builderArgs: ['--mac', 'dmg']");
    expect(buildPlatform).not.toContain("builderArgs: ['--win', 'nsis', '--x64']");
    expect(buildPlatform).not.toContain("builderArgs: ['--win', 'nsis', 'portable', '--x64']");
    expect(buildPlatform).not.toContain("builderArgs: ['--mac', 'dmg', 'zip']");
  });

  it('documents that GitHub source-code archives are generated outside the workflow release assets', () => {
    expect(buildDoc).toContain('ausschließlich die drei Endanwender-Artefakte');
    expect(buildDoc).toContain('AppImage, EXE und DMG');
    expect(buildDoc).toMatch(/Source[- ]code-Archive/i);
    expect(buildDoc).toMatch(/GitHub.*nicht durch den Release-Workflow hochgeladen|GitHub.*keine.*Build-Artefakte/i);
    expect(windowsBuildDoc).toMatch(/nur diese EXE hochgeladen/i);
  });

  it('exposes this regression test as an npm script for RC verification', () => {
    expect(pkg.scripts['test:rc-release-artifacts-090rc1f']).toBe('vitest run tests/rcReleaseArtifacts090rc1f.test.ts');
  });
});
