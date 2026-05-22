import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

type ReadmeSignals = {
  addressesSbvAudience: boolean;
  addressesDevelopers: boolean;
  explainsOfflineFirst: boolean;
  explainsVault: boolean;
  explainsGremiaBrReadBridge: boolean;
  explainsPersonalDirectoryDataMinimization: boolean;
  hasManualVersionStandLine: boolean;
};

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

function packageVersion(): string {
  const raw = readText('package.json');
  const parsed = JSON.parse(raw) as { version: string };
  return parsed.version;
}

function evaluateReadme(readme: string): ReadmeSignals {
  const normalized = readme.toLowerCase();
  return {
    addressesSbvAudience: normalized.includes('schwerbehindertenvertretung') && normalized.includes('sbven'),
    addressesDevelopers: normalized.includes('entwicklerinnen und entwickler') || normalized.includes('mitentwickler'),
    explainsOfflineFirst: normalized.includes('offline-first') && normalized.includes('keine hintergrundverbindungen'),
    explainsVault: normalized.includes('sqlcipher') || normalized.includes('vault'),
    explainsGremiaBrReadBridge: normalized.includes('gremia.br') && normalized.includes('lesebrücke'),
    explainsPersonalDirectoryDataMinimization:
      normalized.includes('personenverzeichnis') &&
      normalized.includes('personalnummer ist optional') &&
      normalized.includes('nachname, vorname'),
    hasManualVersionStandLine: /stand:\s*\*\*\d+\.\d+\.\d+/.test(readme),
  };
}

function evaluatePrivacyDoc(text: string) {
  const normalized = text.toLowerCase();
  return {
    namesSqlCipher: normalized.includes('sqlcipher'),
    rejectsAdditionalFieldEncryption: normalized.includes('keine zusätzliche feldverschlüsselung'),
    documentsGremiaBrReadOnly: normalized.includes('gremia.br') && normalized.includes('read-only'),
    rejectsBackgroundSync: normalized.includes('keine hintergrundsynchronisation'),
  };
}

describe('0.9.2 Dokumentation und Architektur-Synchronität', () => {
  it('verwendet package.json als zentrale Produktversion für generierte Metadaten', () => {
    const version = packageVersion();
    const appVersion = readText('src/app/generated/appVersion.ts');
    const metadata = readText('services/generated/appMetadata.ts');

    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(appVersion.includes(version)).toBe(true);
    expect(metadata.includes(version)).toBe(true);
  });

  it('führt die öffentliche README ohne manuell gepflegte Versionszeile', () => {
    const signals = evaluateReadme(readText('README.md'));

    expect(signals).toMatchObject({
      addressesSbvAudience: true,
      addressesDevelopers: true,
      explainsOfflineFirst: true,
      explainsVault: true,
      explainsGremiaBrReadBridge: true,
      explainsPersonalDirectoryDataMinimization: true,
      hasManualVersionStandLine: false,
    });
  });

  it('hält dauerhafte Kerndokumentation auffindbar', () => {
    const requiredDocs = [
      'README.md',
      'CONTRIBUTING.md',
      'docs/ARCHITECTURE.md',
      'docs/PRIVACY_AND_SECURITY.md',
      'docs/gremia-br/README.md',
      'docs/gremia-br/DSFA_TOM_VVT.md',
    ];

    expect(requiredDocs.every((file) => existsSync(file))).toBe(true);
  });

  it('dokumentiert Datenschutzentscheidungen semantisch statt über Versionsmarker', () => {
    const privacy = evaluatePrivacyDoc(readText('docs/PRIVACY_AND_SECURITY.md'));

    expect(privacy).toMatchObject({
      namesSqlCipher: true,
      rejectsAdditionalFieldEncryption: true,
      documentsGremiaBrReadOnly: true,
      rejectsBackgroundSync: true,
    });
  });

  it('hält die README auf Zielgruppe und Nutzen fokussiert', () => {
    const signals = evaluateReadme(readText('README.md'));
    const score = [
      signals.addressesSbvAudience,
      signals.addressesDevelopers,
      signals.explainsOfflineFirst,
      signals.explainsVault,
      signals.explainsGremiaBrReadBridge,
      signals.explainsPersonalDirectoryDataMinimization,
    ].filter(Boolean).length;

    expect(score).toBeGreaterThanOrEqual(6);
  });
});
