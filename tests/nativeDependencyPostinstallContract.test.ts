import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function readPackageJson(): { scripts?: Record<string, string>; devDependencies?: Record<string, string> } {
  return JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string>; devDependencies?: Record<string, string> };
}

describe('native dependency postinstall contract', () => {
  it('rebuilds Electron native dependencies without npx indirection', () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts?.postinstall).toBe('electron-builder install-app-deps');
    expect(packageJson.scripts?.postinstall).not.toContain('npx');
    expect(packageJson.devDependencies?.['electron-builder']).toBeTruthy();
  });
});
