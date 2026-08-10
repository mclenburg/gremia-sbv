import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('0.9.6-k verbindlicher Source-Cleanup im Build', () => {
  it('führt Löschmanifeste vor Coverage und App-Build strikt aus', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts['source:cleanup:strict']).toBe(
      'node scripts/cleanup-obsolete-files.cjs --strict-delete --verbose',
    );
    expect(pkg.scripts['test:coverage']).toBe('vitest run --coverage');
    const verify = pkg.scripts['build:verify'];
    const compile = pkg.scripts['build:compile'];
    const expectedVerifySteps = [
      'npm run source:cleanup:strict',
      'npm run type-safety:any-check',
      'npm run lint',
      'npm run test:coverage',
    ];
    const expectedCompileSteps = [
      'npm run version:generate',
      'tsc -p tsconfig.json',
      'vite build',
      'tsc -p tsconfig.electron.json',
      'node scripts/write-electron-cjs-package.cjs',
    ];

    let previousIndex = -1;
    for (const step of expectedVerifySteps) {
      const stepIndex = verify.indexOf(step);
      expect(stepIndex).toBeGreaterThan(previousIndex);
      previousIndex = stepIndex;
    }
    previousIndex = -1;
    for (const step of expectedCompileSteps) {
      const stepIndex = compile.indexOf(step);
      expect(stepIndex).toBeGreaterThan(previousIndex);
      previousIndex = stepIndex;
    }
  });


  it('hält sämtliche Cleanup-Manifeste im vom Readiness-Guard verlangten Schema', () => {
    const manifestDirectory = 'maintenance/source-cleanup';
    const manifestFiles = readdirSync(manifestDirectory)
      .filter((entry) => entry.endsWith('.json'))
      .sort();

    expect(manifestFiles.length).toBeGreaterThan(0);

    for (const manifestFile of manifestFiles) {
      const manifest = JSON.parse(
        readFileSync(`${manifestDirectory}/${manifestFile}`, 'utf8'),
      ) as {
        version?: unknown;
        files?: unknown;
        directories?: unknown;
        entries?: unknown;
      };

      expect(manifest.version, `${manifestFile}: version`).toEqual(expect.any(String));
      expect((manifest.version as string).trim().length, `${manifestFile}: version`).toBeGreaterThan(0);
      const hasEntries = Array.isArray(manifest.entries);
      const hasLegacyLists = Array.isArray(manifest.files) && Array.isArray(manifest.directories);
      expect(hasEntries || hasLegacyLists, `${manifestFile}: cleanup entries`).toBe(true);
    }
  });

  it('führt entfernte Services nicht mehr als Coverage-Ziele', () => {
    const config = readFileSync('vitest.config.ts', 'utf8');

    expect(config).not.toContain("'services/terminationHearingService.ts'");
    expect(config).not.toContain("'services/activityReportService.ts'");
  });
});
