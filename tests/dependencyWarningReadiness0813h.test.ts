import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
};

const directlyDeprecatedBuildPackages = [
  'inflight',
  'npmlog',
  'gauge',
  'are-we-there-yet',
  'boolean',
  '@npmcli/move-file',
];

describe('dependency warning readiness', () => {
  it('does not introduce direct runtime dependencies on known deprecated build helper packages', () => {
    const dependencies = Object.keys(pkg.dependencies ?? {});
    for (const dep of directlyDeprecatedBuildPackages) {
      expect(dependencies, `${dep} must not be a direct runtime dependency`).not.toContain(dep);
    }
  });

  it('keeps native dependency rebuild explicit despite generic electron-builder warnings', () => {
    expect(pkg.scripts.postinstall).toBe('electron-builder install-app-deps');
    const buildDoc = readFileSync('docs/BUILD.md', 'utf8');
    expect(buildDoc).toMatch(/`?electron-builder`? kann beim Packaging trotzdem den generischen Hinweis ausgeben/);
    expect(buildDoc).toContain('Runtime-Dependencies');
  });

  it('keeps npmrc-only warnings out of repository build contracts', () => {
    const rootNpmrc = (() => {
      try {
        return readFileSync('.npmrc', 'utf8');
      } catch {
        return '';
      }
    })();
    expect(rootNpmrc).not.toContain('always-auth');
    expect(rootNpmrc).not.toContain('email=');
  });
});
