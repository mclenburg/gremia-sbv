import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function pkg() {
  return JSON.parse(read('package.json')) as { name: string; version: string };
}

function publicReadmeSignals() {
  const readme = read('README.md').toLowerCase();
  return {
    namesProduct: readme.includes('gremia.sbv'),
    namesSbvAudience: readme.includes('schwerbehindertenvertretung') && readme.includes('sbven'),
    explainsPrivacy: readme.includes('datenschutz') && readme.includes('verschlüsselt'),
    linksArchitecture: readme.includes('architecture.md'),
    linksContributing: readme.includes('contributing.md'),
    avoidsManualVersionLine: !/stand:\s*\*\*\d+\.\d+\.\d+/.test(read('README.md')),
  };
}

describe('0.9.2 final test and release synchronization', () => {
  it('hält package metadata und generierte Metadaten synchron', () => {
    const packageJson = pkg();

    expect(packageJson.name).toBe('gremia-sbv');
    expect(packageJson.version).toBe('0.9.2');
    expect(read('src/app/generated/appVersion.ts').includes(packageJson.version)).toBe(true);
    expect(read('services/generated/appMetadata.ts').includes(packageJson.version)).toBe(true);
  });

  it('prüft öffentliche Doku auf Produktreife statt auf RC-Marker', () => {
    expect(publicReadmeSignals()).toEqual({
      namesProduct: true,
      namesSbvAudience: true,
      explainsPrivacy: true,
      linksArchitecture: true,
      linksContributing: true,
      avoidsManualVersionLine: true,
    });
  });

  it('behält package.json als einzige manuell gepflegte Versionsquelle', () => {
    const packageVersion = pkg().version;
    const durableDocs = ['README.md', 'CONTRIBUTING.md', 'docs/ARCHITECTURE.md', 'docs/PRIVACY_AND_SECURITY.md'];
    const docsWithManualStand = durableDocs.filter((file) => /stand:\s*\*\*\d+\.\d+\.\d+/.test(read(file)));

    expect(packageVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(docsWithManualStand).toEqual([]);
  });
});
