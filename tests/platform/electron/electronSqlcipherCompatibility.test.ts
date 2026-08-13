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
  it('kombiniert Electron 43+ nur mit der Node-API-basierten SQLCipher-Treiberlinie 13+', () => {
    const electronRange = packageJson.devDependencies?.electron;
    const lockedElectron = packageLock.packages['node_modules/electron'];

    const sqlcipherRange = packageJson.dependencies?.['better-sqlite3-multiple-ciphers'];
    const lockedSqlcipher = packageLock.packages['node_modules/better-sqlite3-multiple-ciphers'];

    expect(majorOf(electronRange)).toBeGreaterThanOrEqual(43);
    expect(majorOf(sqlcipherRange)).toBeGreaterThanOrEqual(13);
    expect(majorOf(lockedElectron?.version)).toBeGreaterThanOrEqual(43);
    expect(majorOf(lockedSqlcipher?.version)).toBeGreaterThanOrEqual(13);
    expect(lockedSqlcipher?.dependencies?.['node-addon-api']).toBeDefined();
  });

  it('richtet die TypeScript-Node-Typen an der Node-24-Laufzeit von Electron und Build aus', () => {
    expect(majorOf(packageJson.devDependencies?.['@types/node'])).toBe(24);
    expect(majorOf(packageLock.packages['node_modules/@types/node']?.version)).toBe(24);
  });

  it('nutzt den npm-11-sicheren Wrapper explizit im Build und nicht mehr als postinstall-Seiteneffekt', () => {
    expect(packageJson.devDependencies?.['@electron/rebuild']).toBeUndefined();
    expect(packageJson.scripts?.postinstall).toBeUndefined();
    expect(packageJson.scripts?.['native:install-app-deps']).toBe('node scripts/install-electron-app-deps.cjs');
    expect(packageJson.scripts?.['native:rebuild:electron']).toBe('node scripts/install-electron-app-deps.cjs');
  });
});
