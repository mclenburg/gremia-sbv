import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages: Record<string, { resolved?: string; version?: string }>;
};

function versionStartsWith(value: string | undefined, prefix: string): boolean {
  return typeof value === 'string' && value.startsWith(prefix);
}

describe('Dependency-Hygiene nach Dependabot-Updates', () => {
  it('zieht @electron/rebuild nicht mehr direkt und vermeidet damit die alte electron/node-gyp-Git-Abhängigkeit', () => {
    expect(packageJson.devDependencies?.['@electron/rebuild']).toBeUndefined();
    expect(packageJson.scripts.postinstall).toBeUndefined();
    expect(packageJson.scripts['native:rebuild:electron']).toBe('node scripts/install-electron-app-deps.cjs');
    expect(packageJson.scripts['native:install-app-deps']).toBe('node scripts/install-electron-app-deps.cjs');

    const resolvedValues = Object.values(packageLock.packages).map((entry) => entry.resolved ?? '');
    expect(resolvedValues.some((resolved) => resolved.includes('github.com/electron/node-gyp'))).toBe(false);
    expect(resolvedValues.some((resolved) => resolved.startsWith('ssh://git@github.com/'))).toBe(false);
  });

  it('hält electron-builder auf der neuen Rebuild-Kette mit node-gyp 12 und tar 7', () => {
    const rebuild = packageLock.packages['node_modules/@electron/rebuild'];
    const nodeGyp = packageLock.packages['node_modules/@electron/rebuild/node_modules/node-gyp'] ?? packageLock.packages['node_modules/node-gyp'];
    const tar = packageLock.packages['node_modules/tar'];

    expect(versionStartsWith(rebuild?.version, '4.')).toBe(true);
    expect(versionStartsWith(nodeGyp?.version, '12.')).toBe(true);
    expect(versionStartsWith(tar?.version, '7.')).toBe(true);
  });

  it('verweist im Lockfile ausschließlich auf öffentliche Paketquellen und keine internen Registry-Caches', () => {
    const resolvedValues = Object.values(packageLock.packages).map((entry) => entry.resolved ?? '').filter(Boolean);

    expect(resolvedValues.some((resolved) => resolved.includes('packages.applied-caas-gateway'))).toBe(false);
    expect(resolvedValues.some((resolved) => resolved.includes('artifactory/api/npm/npm-public'))).toBe(false);
    expect(resolvedValues.every((resolved) => resolved.startsWith('https://registry.npmjs.org/') || resolved.startsWith('https://github.com/'))).toBe(true);
  });

  it('neutralisiert npm-Workspace-Defaults projektlokal für das Nicht-Workspace-Projekt', () => {
    const npmrc = readFileSync('.npmrc', 'utf8');

    expect(npmrc.includes('registry=https://registry.npmjs.org/')).toBe(true);
    expect(npmrc.includes('workspaces=false')).toBe(true);
    expect(npmrc.includes('include-workspace-root=false')).toBe(true);
  });


  it('hält Build- und E2E-Werkzeuge aus den Runtime-Abhängigkeiten heraus', () => {
    const runtimeDependencies = packageJson.dependencies ?? {};
    const devDependencies = packageJson.devDependencies ?? {};

    for (const dependencyName of [
      '@playwright/test',
      '@axe-core/playwright',
      '@vitejs/plugin-react',
      'electron',
      'electron-builder',
      'esbuild',
      'vite',
      'vitest',
      'tsx',
      'typescript',
      'tailwindcss',
      '@tailwindcss/postcss',
    ]) {
      expect(runtimeDependencies[dependencyName]).toBeUndefined();
    }

    expect(devDependencies['@vitejs/plugin-react']).toBeDefined();
    expect(packageJson.scripts['test:e2e:setup']).toBe('node scripts/install-e2e-tools.cjs && npm run test:e2e:install');
    expect(packageJson.scripts['test:e2e:setup']).not.toContain('npm install --no-save');
  });


  it('hält optionale Rolldown-Plattformbindungen vollständig im Lockfile, damit npm ci auf GitHub reproduzierbar bleibt', () => {
    const rolldown = packageLock.packages['node_modules/rolldown'] as {
      optionalDependencies?: Record<string, string>;
    } | undefined;

    expect(rolldown?.optionalDependencies).toBeDefined();

    for (const [dependencyName, dependencyVersion] of Object.entries(rolldown?.optionalDependencies ?? {})) {
      const lockPath = `node_modules/${dependencyName}`;
      expect(packageLock.packages[lockPath]?.version).toBe(dependencyVersion);
    }
  });

});
