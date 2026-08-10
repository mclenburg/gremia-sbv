import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages: Record<string, { version?: string; dependencies?: Record<string, string> }>;
};

function majorOf(versionOrRange: string | undefined): number | null {
  const match = versionOrRange?.match(/^(?:[~^>=<\s]*)(\d+)\./);
  return match ? Number(match[1]) : null;
}

describe('Electron-/SQLCipher-Kompatibilitätsvertrag', () => {
  it('hält Electron auf der mit better-sqlite3-multiple-ciphers und npm-audit vereinbaren 39er Linie', () => {
    const electronRange = packageJson.devDependencies?.electron;
    const lockedElectron = packageLock.packages['node_modules/electron'];

    expect(packageJson.dependencies?.['better-sqlite3-multiple-ciphers']).toBeDefined();
    expect(majorOf(electronRange)).toBe(39);
    expect(majorOf(lockedElectron?.version)).toBe(39);
    expect(lockedElectron?.dependencies?.['@types/node']).toBe('^22.7.7');
  });

  it('richtet die TypeScript-Node-Typen an der Electron-Laufzeit statt an npm-Node-24 aus', () => {
    expect(majorOf(packageJson.devDependencies?.['@types/node'])).toBe(22);
    expect(majorOf(packageLock.packages['node_modules/@types/node']?.version)).toBe(22);
  });

  it('nutzt den npm-11-sicheren Wrapper explizit im Build und nicht mehr als postinstall-Seiteneffekt', () => {
    expect(packageJson.devDependencies?.['@electron/rebuild']).toBeUndefined();
    expect(packageJson.scripts?.postinstall).toBeUndefined();
    expect(packageJson.scripts?.['native:install-app-deps']).toBe('node scripts/install-electron-app-deps.cjs');
    expect(packageJson.scripts?.['native:rebuild:electron']).toBe('node scripts/install-electron-app-deps.cjs');
  });
});
