import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dependabot = readFileSync('.github/dependabot.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

describe('Dependabot-Leitplanken ohne zusätzliche GitHub-Actions-Kosten', () => {
  it('begrenzt npm-Updates und sperrt riskante Major-Updates für Electron und native Datenbankpakete', () => {
    expect(dependabot).toContain('package-ecosystem: "npm"');
    expect(dependabot).toContain('open-pull-requests-limit: 2');
    expect(dependabot).toContain('cooldown:');
    expect(dependabot).toContain('dependency-name: "electron"');
    expect(dependabot).toContain('dependency-name: "electron-builder"');
    expect(dependabot).toContain('dependency-name: "better-sqlite3-multiple-ciphers"');
    expect(dependabot).toContain('dependency-name: "@electron/rebuild"');
  });

  it('fügt keinen kostenpflichtig laufenden Dependabot-PR-Workflow hinzu', () => {
    expect(existsSync('.github/workflows/dependabot-guard.yml')).toBe(false);
    expect(readFileSync('.github/workflows/build-release.yml', 'utf8')).toContain('tags:');
  });

  it('stellt einen lokalen Hygiene-Check für Dependabot-PRs bereit', () => {
    expect(packageJson.scripts['dependency:hygiene']).toContain('tests/dependencyHygiene092j.test.ts');
    expect(packageJson.scripts['dependency:hygiene']).toContain('tests/dependabotPolicy092k.test.ts');
  });
});
