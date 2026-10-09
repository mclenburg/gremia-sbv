import { describe, expect, it } from 'vitest';
import path from 'node:path';
import {
  CURRENT_SCRYPT_PARAMS,
  LEGACY_SCRYPT_PARAMS,
  formatVaultOpenError,
  needsKdfUpgrade,
  safeDestroyBuffer,
} from '../../../services/security/securitySupport';

describe('security hardening behavior', () => {
  it('zeigt keine internen Dateipfade aus Datenbankfehlern an', () => {
    const privatePath = path.join(path.parse(process.cwd()).root, 'private', 'Max-Mustermann.vault.sqlite');
    const message = formatVaultOpenError(new Error(`SQLCipher failed at ${privatePath}`));
    expect(message).toContain('Datenbank');
    expect(message).not.toContain('Max-Mustermann');
    expect(message).not.toContain('Technische Ursache');
  });
  it('overwrites sensitive Buffer contents in place', () => {
    const sensitiveMaterial = Buffer.from('sensitive database key');
    const sharedView = sensitiveMaterial.subarray(0);

    safeDestroyBuffer(sensitiveMaterial);

    expect(sensitiveMaterial).toEqual(Buffer.alloc(sensitiveMaterial.length));
    expect(sharedView).toEqual(Buffer.alloc(sharedView.length));
  });

  it('uses stronger scrypt work factors for current stores and identifies legacy parameters', () => {
    expect(CURRENT_SCRYPT_PARAMS.N).toBeGreaterThan(LEGACY_SCRYPT_PARAMS.N);
    expect(CURRENT_SCRYPT_PARAMS).toMatchObject({ N: 131072, r: 8, p: 1 });
    expect(needsKdfUpgrade(undefined)).toBe(true);
    expect(needsKdfUpgrade(LEGACY_SCRYPT_PARAMS)).toBe(true);
    expect(needsKdfUpgrade(CURRENT_SCRYPT_PARAMS)).toBe(false);
  });

  it.each([
    { N: 65536, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
    { N: 131072, r: 4, p: 1, maxmem: 256 * 1024 * 1024 },
    { N: 131072, r: 8, p: 2, maxmem: 256 * 1024 * 1024 },
  ])('marks a nonstandard persisted KDF configuration for upgrade: %j', (params) => {
    expect(needsKdfUpgrade(params)).toBe(true);
  });
});
