import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/build-release.yml', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

describe('RC release infrastructure', () => {
  it('builds Linux, Windows and unsigned macOS artifacts from version tags', () => {
    expect(workflow).toContain('tags:');
    expect(workflow).toContain('v*');
    expect(workflow).toContain('ubuntu-latest');
    expect(workflow).toContain('windows-latest');
    expect(workflow).toContain('macos-latest');
    expect(workflow).toContain('build:linux');
    expect(workflow).toContain('build:win');
    expect(workflow).toContain('build:mac');
    expect(workflow).toContain('CSC_IDENTITY_AUTO_DISCOVERY: "false"');
  });

  it('checks tag/package consistency and publishes only a draft release', () => {
    expect(workflow).toContain('GITHUB_REF_NAME#v');
    expect(workflow).toMatch(/package\.json|require\('\.\/package\.json'\)\.version/);
    expect(workflow).toContain('softprops/action-gh-release@v2');
    expect(workflow).toContain('draft: true');
    expect(workflow).toContain('contents: write');
  });

  it('keeps release checks coverage-aware without breaking prebuild', () => {
    expect(pkg.scripts.prebuild).toBe('npm run version:generate && npm run source:cleanup && npm run build:readiness');
    expect(pkg.scripts['release:check']).toBe('npm run rc:check && npm run test:coverage && npm run build');
    expect(pkg.scripts.postinstall).toBe('electron-builder install-app-deps');
  });
});
