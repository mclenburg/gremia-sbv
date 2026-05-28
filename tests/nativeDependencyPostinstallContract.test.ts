import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function readPackageJson(): { scripts?: Record<string, string>; devDependencies?: Record<string, string> } {
  return JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string>; devDependencies?: Record<string, string> };
}

describe('native dependency postinstall contract', () => {
  it('rebuilds Electron native dependencies through the npm-11-safe local wrapper', () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts?.postinstall).toBe('node scripts/install-electron-app-deps.cjs');
    expect(packageJson.scripts?.postinstall).not.toContain('npx');
    expect(packageJson.scripts?.['native:install-app-deps']).toBe('node scripts/install-electron-app-deps.cjs');
    expect(packageJson.devDependencies?.['electron-builder']).toBeTruthy();
  });
});
