import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const require = createRequire(import.meta.url);
const { validateRuntimeDependencyBoundaries } = require('../../scripts/check-build-readiness.cjs') as {
  validateRuntimeDependencyBoundaries: (pkg: typeof packageJson) => void;
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
    const fixtureDir = mkdtempSync(join(tmpdir(), 'gremia-npm-config-'));
    try {
      const userConfig = join(fixtureDir, 'user.npmrc');
      const globalConfig = join(fixtureDir, 'global.npmrc');
      writeFileSync(userConfig, 'registry=https://example.invalid/\nworkspaces=true\ninclude-workspace-root=true\n');
      writeFileSync(globalConfig, '');
      const npmPackage = require.resolve('npm/package.json', {
        paths: [dirname(process.execPath), resolve(dirname(process.execPath), '..', 'lib')],
      });
      const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_/i.test(key)));
      const result = spawnSync(process.execPath, [
        join(dirname(npmPackage), 'bin', 'npm-cli.js'),
        'config', 'list', '--json', '--userconfig', userConfig, '--globalconfig', globalConfig,
      ], { cwd: process.cwd(), env, encoding: 'utf8' });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      const effectiveConfig = JSON.parse(result.stdout) as Record<string, unknown>;
      expect(effectiveConfig.registry).toBe('https://registry.npmjs.org/');
      expect(effectiveConfig.workspaces).toBe(false);
      expect(effectiveConfig['include-workspace-root']).toBe(false);
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });


  it('hält Build- und E2E-Werkzeuge aus den Runtime-Abhängigkeiten heraus', () => {
    expect(() => validateRuntimeDependencyBoundaries(packageJson)).not.toThrow();
    const unsafeSetup = {
      ...packageJson,
      scripts: { ...packageJson.scripts, 'test:e2e:setup': 'npm install --no-save @playwright/test' },
    };
    expect(() => validateRuntimeDependencyBoundaries(unsafeSetup)).toThrow(/test:e2e:setup/);
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
