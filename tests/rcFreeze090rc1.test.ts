import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function packageVersion(): string {
  return (JSON.parse(read('package.json')) as { version: string }).version;
}

describe('release candidate freeze documentation', () => {
  it('hält technische Versionsquellen zentral und generiert', () => {
    const version = packageVersion();

    expect(version).toMatch(/^0\.9\.\d+$/);
    expect(read('src/app/generated/appVersion.ts').includes(version)).toBe(true);
    expect(read('services/generated/appMetadata.ts').includes(version)).toBe(true);
  });

  it('verlangt von langlebiger öffentlicher Doku keine manuelle Versionspflege', () => {
    const durableDocs = ['README.md', 'CONTRIBUTING.md', 'docs/ARCHITECTURE.md', 'docs/PRIVACY_AND_SECURITY.md'];
    const docsWithManualStand = durableDocs.filter((file) => /stand:\s*\*\*\d+\.\d+\.\d+/.test(read(file)));

    expect(docsWithManualStand).toEqual([]);
  });
});
