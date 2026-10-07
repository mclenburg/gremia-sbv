import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml') as { load(source: string): unknown };
type UpdatePolicy = {
  'package-ecosystem': string;
  directory: string;
  'open-pull-requests-limit': number;
  cooldown: { 'default-days': number; 'semver-major-days': number };
  ignore: { 'dependency-name': string; 'update-types'?: string[] }[];
};
const dependabot = yaml.load(readFileSync('.github/dependabot.yml', 'utf8')) as { updates: UpdatePolicy[] };
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

describe('Dependabot-Leitplanken ohne zusätzliche GitHub-Actions-Kosten', () => {
  it('begrenzt npm-Updates und sperrt riskante Major-Updates für Electron und native Datenbankpakete', () => {
    const npmPolicy = dependabot.updates.find((update) => update['package-ecosystem'] === 'npm' && update.directory === '/');
    expect(npmPolicy).toBeDefined();
    expect(npmPolicy?.['open-pull-requests-limit']).toBe(2);
    expect(npmPolicy?.cooldown['default-days']).toBeGreaterThanOrEqual(7);
    expect(npmPolicy?.cooldown['semver-major-days']).toBeGreaterThanOrEqual(21);

    for (const dependency of ['electron', 'electron-builder', 'better-sqlite3-multiple-ciphers', '@electron/rebuild']) {
      const rule = npmPolicy?.ignore.find((entry) => entry['dependency-name'] === dependency);
      expect(rule, dependency).toBeDefined();
      // An omitted update-types list blocks every update; otherwise major updates must be explicitly blocked.
      expect(rule?.['update-types'] === undefined || rule['update-types'].includes('version-update:semver-major'), dependency).toBe(true);
    }
  });

  it('fügt keinen kostenpflichtig laufenden Dependabot-PR-Workflow hinzu', () => {
    expect(existsSync('.github/workflows/dependabot-guard.yml')).toBe(false);
    const workflow = yaml.load(readFileSync('.github/workflows/build-release.yml', 'utf8')) as {
      on: { push?: { tags?: string[]; branches?: string[] }; pull_request?: unknown; pull_request_target?: unknown };
    };
    expect(workflow.on.push?.tags).toEqual(['v*']);
    expect(workflow.on.push?.branches).toBeUndefined();
    expect(workflow.on.pull_request).toBeUndefined();
    expect(workflow.on.pull_request_target).toBeUndefined();
  });

  it('stellt einen lokalen Hygiene-Check für Dependabot-PRs bereit', () => {
    const command = packageJson.scripts['dependency:hygiene'].split(/\s+/);
    expect(command.slice(0, 2)).toEqual(['vitest', 'run']);
    expect(command.slice(2)).toEqual(expect.arrayContaining([
      'tests/architecture/dependencyHygiene.test.ts',
      'tests/architecture/dependencies/dependabotPolicy.test.ts',
    ]));
  });
});
