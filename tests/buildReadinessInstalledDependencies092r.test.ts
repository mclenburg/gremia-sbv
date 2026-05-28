import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const buildReadiness = readFileSync('scripts/check-build-readiness.cjs', 'utf8');

describe('Build-Readiness prüft installierte Build-Dependencies', () => {
  it('bricht vor der langen Testsuite ab, wenn der Tailwind-4-PostCSS-Adapter nur im Lockfile, aber nicht in node_modules liegt', () => {
    expect(buildReadiness.includes('function validateInstalledBuildDependencies')).toBe(true);
    expect(buildReadiness.includes("'@tailwindcss/postcss'")).toBe(true);
    expect(buildReadiness.includes('require.resolve(dependencyName, { paths: [root] })')).toBe(true);
    expect(buildReadiness.includes('rm -rf node_modules && npm install')).toBe(true);
  });

  it('führt die Dependency-Installationsprüfung vor Versions-, Schema- und Cleanup-Prüfungen aus', () => {
    expect(buildReadiness.indexOf('validatePostinstall(pkg);')).toBeLessThan(
      buildReadiness.indexOf('validateInstalledBuildDependencies(pkg);'),
    );
    expect(buildReadiness.indexOf('validateInstalledBuildDependencies(pkg);')).toBeLessThan(
      buildReadiness.indexOf('validateVersions(pkg);'),
    );
  });
});
