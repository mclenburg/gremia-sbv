import { describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const licenseGenerator = require('../../../scripts/generate-third-party-licenses.cjs') as {
  inferLicenseExpression(licenseText: string): string;
};
const fastLicenseGenerator = require('../../../scripts/generate-third-party-licenses-fast.cjs') as {
  cacheStatus(projectRoot: string): { current: boolean; reason: string };
};

function readText(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

describe('Third-Party-Lizenzprüfung 0.9.2y', () => {
  it('prüft im normalen Testlauf nur vorhandene Lizenzartefakte und startet keine Online-Generierung', () => {
    const packageJson = JSON.parse(readText('package.json')) as { scripts: Record<string, string> };

    expect(packageJson.scripts['licenses:generate']).toBe('node scripts/generate-third-party-licenses-fast.cjs');
    expect(packageJson.scripts['licenses:check']).toBe('node scripts/check-third-party-licenses.cjs');
    expect(packageJson.scripts.test).toBe('vitest run');
    expect(packageJson.scripts.pretest).not.toContain('licenses:generate');
    expect(packageJson.scripts.build).not.toContain('licenses:generate');
  });

  it('stellt sicher, dass die statische Lizenzprüfung vorhandene Release-Artefakte kurz validieren kann', () => {
    expect(existsSync(path.join(process.cwd(), 'THIRD_PARTY_LICENSES.txt'))).toBe(true);
    expect(existsSync(path.join(process.cwd(), 'scripts', 'check-third-party-licenses.cjs'))).toBe(true);

    const inventory = readText('THIRD_PARTY_LICENSES.txt');
    expect(inventory).toContain('THIRD-PARTY LICENSE INVENTORY');
    expect(inventory).not.toContain('UNKNOWN - bitte upstream package.json prüfen');
  });

  it('verwendet gemeinsame Lizenztextdateien statt dependency-spezifischer LICENSES-Unterordner', () => {
    const licensesPath = path.join(process.cwd(), 'LICENSES');
    if (!existsSync(licensesPath)) return;

    const mitLicense = path.join(licensesPath, 'MIT.txt');
    expect(existsSync(mitLicense)).toBe(true);
    expect(statSync(mitLicense).isFile()).toBe(true);
  });

  it('erkennt einen verteilten MIT-Lizenztext, wenn alte Pakete kein license-Metadatum liefern', () => {
    const text = [
      'MIT License',
      'Permission is hereby granted, free of charge, to any person obtaining a copy',
      'of this software and associated documentation files (the "Software"), to deal',
      'in the Software without restriction.',
      'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.',
    ].join('\n');

    expect(licenseGenerator.inferLicenseExpression(text)).toBe('MIT');
    expect(licenseGenerator.inferLicenseExpression('individuelle oder mehrdeutige Lizenz')).toBe('');
  });

  it('verweigert inkonsistente generierte Artefakte offline mit konkreter Ursache', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-license-check-'));
    try {
      mkdirSync(path.join(root, 'scripts'), { recursive: true });
      mkdirSync(path.join(root, 'maintenance', 'licenses'), { recursive: true });
      mkdirSync(path.join(root, 'LICENSES'), { recursive: true });

      const lock = `${JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { dependencies: { sample: '1.0.0' } },
          'node_modules/sample': { name: 'sample', version: '1.0.0' },
        },
      }, null, 2)}\n`;
      const inventory = [
        'THIRD-PARTY LICENSE INVENTORY',
        'Gremia.SBV',
        '',
        '- sample@1.0.0',
        '  License: MIT',
        '  License text: LICENSES/MIT.txt',
        '',
      ].join('\n');
      const notices = 'THIRD-PARTY NOTICES\nGremia.SBV\nCopyright notices: none detected.\n';
      const license = 'MIT License\n\nPermission is hereby granted for this fixture.\n';

      writeFileSync(path.join(root, 'package-lock.json'), lock);
      writeFileSync(path.join(root, 'THIRD_PARTY_LICENSES.txt'), inventory);
      writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.txt'), notices);
      writeFileSync(path.join(root, 'LICENSES', 'MIT.txt'), license);
      writeFileSync(path.join(root, 'maintenance', 'licenses', 'generation-state.json'), `${JSON.stringify({
        schemaVersion: 3,
        lockSha256: sha256(lock),
        packageCount: 1,
        inventorySha256: sha256(inventory),
        noticesSha256: sha256(notices),
        licenseFiles: [{ name: 'MIT.txt', sha256: sha256(`${license}changed`) }],
      }, null, 2)}\n`);

      const result = fastLicenseGenerator.cacheStatus(root);

      expect(result).toEqual({ current: false, reason: 'license fingerprint changed: MIT.txt' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
