import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const githubBuild = require('../../scripts/run-github-build-current-os.cjs') as {
  buildSequence(): Array<[string, string[]]>;
  currentPlatformBuildScript(platform?: NodeJS.Platform): string;
  currentPlatformReleaseScript(platform?: NodeJS.Platform): string | null;
  githubBuildEnvironment(baseEnv?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
  githubCoverageDirectory(pid?: number): string;
};

describe('0.9.5-e local GitHub build command', () => {
  it('uses the shared quality gate before compilation and packaging', () => {
    const sequence = githubBuild.buildSequence().map(([command, args]) => [command, ...args].join(' '));

    expect(sequence.slice(0, 3)).toEqual([
      'npm ci',
      'npm run build:quality',
      'npm run build:compile',
    ]);
    expect(sequence.some((command) => /^npm run build:package:(linux|windows-portable|mac)$/u.test(command))).toBe(true);
    expect(sequence).not.toContain('npm run licenses:generate');
  });

  it('verwendet im Windows-PR-Build nur den portablen Windows-Vertrag ohne MSI/WiX-Download', () => {
    expect(githubBuild.currentPlatformBuildScript('win32')).toBe('build:package:windows-portable');
    expect(githubBuild.currentPlatformReleaseScript('win32')).toBe('release:platform:windows-portable');
  });

  it('isoliert Vitest-Coverage pro GitHub-Build-Prozess gegen parallele lokale Läufe', () => {
    const coverageDirectory = githubBuild.githubCoverageDirectory(12345);
    const environment = githubBuild.githubBuildEnvironment({ PATH: '/usr/bin' });

    expect(coverageDirectory).toContain('/coverage/github-build-12345');
    expect(environment.PATH).toBe('/usr/bin');
    expect(environment.GREMIA_SBV_COVERAGE_DIR).toContain('/coverage/github-build-');
  });
});
