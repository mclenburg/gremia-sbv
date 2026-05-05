import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts as Record<string, string>;

describe('0.8.8-h cross platform build scripts', () => {
  it('uses node based platform build scripts instead of bash for release builds', () => {
    expect(scripts['build:linux']).toBe('node scripts/build-platform.cjs linux');
    expect(scripts['build:win']).toBe('node scripts/build-platform.cjs win');
    expect(scripts['build:windows']).toBe('npm run build:win');
    expect(scripts['build:mac']).toBe('node scripts/build-platform.cjs mac');
    expect(scripts['build:current']).toBe('node scripts/build-current-platform.cjs');
    expect(scripts['build:win']).not.toMatch(/bash|\.sh/);
    expect(scripts['build:mac']).not.toMatch(/bash|\.sh/);
  });

  it('keeps native cleanup platform neutral', () => {
    expect(scripts['native:clean']).toBe('node scripts/clean-native-build.cjs');
    expect(existsSync('scripts/clean-native-build.cjs')).toBe(true);
  });

  it('documents Linux, Windows and macOS build commands', () => {
    const doc = readFileSync('docs/BUILD.md', 'utf8');
    expect(doc).toContain('npm run build:linux');
    expect(doc).toContain('npm run build:win');
    expect(doc).toContain('npm run build:mac');
    expect(doc).toContain('Windows 10');
  });
});
