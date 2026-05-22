import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function versionFromPackage(): string {
  return (JSON.parse(read('package.json')) as { version: string }).version;
}

describe('0.9.2 Step G Test-, Doku- und Release-Sync', () => {
  it('hält generierte App-Metadaten an package.json gekoppelt', () => {
    const version = versionFromPackage();

    expect(read('src/app/generated/appVersion.ts').includes(version)).toBe(true);
    expect(read('services/generated/appMetadata.ts').includes(version)).toBe(true);
  });

  it('prüft README auf dauerhafte Produktbotschaft statt auf Release-Zwischenstände', () => {
    const readme = read('README.md').toLowerCase();
    const signals = {
      sbv: readme.includes('schwerbehindertenvertretung'),
      offline: readme.includes('offline-first'),
      vault: readme.includes('vault') || readme.includes('sqlcipher'),
      noBackgroundSync: readme.includes('keine hintergrundverbindungen') || readme.includes('keine hintergrundsynchronisation'),
      noManualStand: !/stand:\s*\*\*\d+\.\d+\.\d+/.test(read('README.md')),
    };

    expect(signals).toEqual({
      sbv: true,
      offline: true,
      vault: true,
      noBackgroundSync: true,
      noManualStand: true,
    });
  });

  it('lässt Release-Notizen und Zwischenstände nicht als Pflichtdokumentation wirken', () => {
    const readme = read('README.md').toLowerCase();

    expect(readme.includes('release notes')).toBe(false);
    expect(readme.includes('zwischenstand')).toBe(false);
  });

  it('bleibt auf die zentrale Version 0.9.2 ausgerichtet', () => {
    expect(versionFromPackage()).toBe('0.9.2');
  });
});
