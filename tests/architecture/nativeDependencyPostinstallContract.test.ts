import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function readPackageJson(): { scripts?: Record<string, string>; devDependencies?: Record<string, string> } {
  return JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string>; devDependencies?: Record<string, string> };
}

describe('native dependency rebuild contract', () => {
  it('keeps npm install side-effect-free and exposes the npm-11-safe local wrapper explicitly', () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts?.postinstall).toBeUndefined();
    expect(packageJson.scripts?.['native:install-app-deps']).toBe('node scripts/install-electron-app-deps.cjs');
    expect(packageJson.scripts?.['native:rebuild:electron']).toBe('node scripts/install-electron-app-deps.cjs');
    expect(packageJson.devDependencies?.['electron-builder']).toBeTruthy();
  });
});
