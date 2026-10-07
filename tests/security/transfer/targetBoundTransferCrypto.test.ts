import { describe, expect, it } from 'vitest';
import { openTestDatabase } from '../../helpers/openTestDatabase';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import {
  assertKdfParams,
  decryptTargetBoundTransferPayload,
  encryptTargetBoundTransferPayload,
} from '../../../services/targetBoundTransferCrypto';

async function transferIdentity() {
  const db = await openTestDatabase();
  db.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);');
  const service = new TransferInstanceIdentityService(db);
  return {
    db,
    publicIdentity: service.getPublicIdentity(),
    privateIdentity: service.getPrivateIdentity(),
  };
}

describe('target-bound transfer crypto', () => {
  it('weist arbeits- und speicherintensive KDF-Parameter vor der Ableitung zurück', () => {
    for (const params of [
      { N: 1_073_741_824, r: 8, p: 1, maxmem: 2_147_483_648 },
      { N: 131_072, r: 1024, p: 1, maxmem: 512 * 1024 * 1024 },
      { N: 131_072, r: 8, p: 1000, maxmem: 256 * 1024 * 1024 },
      { N: 131_072, r: 8, p: 1, maxmem: 2_147_483_648 },
      { N: 131_073, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
    ]) expect(() => assertKdfParams(params)).toThrow(/KDF-Parameter/);
    expect(assertKdfParams({ N: 131_072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 })).toMatchObject({ N: 131_072, r: 8, p: 1 });
  });
  it.each(['recipient_key_only', 'passphrase_and_recipient_key'] as const)(
    'akzeptiert andere JSON-Feldreihenfolge ohne Integritätsverlust (%s)', async (protectionMode) => {
      const target = await transferIdentity();
      try {
        const envelope = encryptTargetBoundTransferPayload({
          format: 'gremia-sbv-test-transfer', version: 1, packageId: 'reordered',
          createdAt: '2026-09-22T08:00:00.000Z', payloadText: 'Änderung bleibt unverändert.',
          passphrase: 'Test-Passphrase für Feldreihenfolge', recipient: target.publicIdentity, protectionMode,
        });
        const reordered = JSON.parse(JSON.stringify(envelope));
        reordered.recipientBinding = Object.fromEntries(Object.entries(envelope.recipientBinding).reverse());
        const expected = { format: envelope.format, version: envelope.version };
        expect(decryptTargetBoundTransferPayload(
          reordered, 'Test-Passphrase für Feldreihenfolge', target.privateIdentity, expected,
        ).payloadText).toBe('Änderung bleibt unverändert.');
        reordered.recipientBinding.ephemeralPublicKeyPem = target.publicIdentity.publicKeyPem;
        expect(() => decryptTargetBoundTransferPayload(
          reordered, 'Test-Passphrase für Feldreihenfolge', target.privateIdentity, expected,
        )).toThrow();
      } finally {
        target.db.close();
      }
    },
  );

  it('entschlüsselt nur auf der adressierten Zielinstanz mit passender Passphrase', async () => {
    const sourceTarget = await transferIdentity();
    const wrongTarget = await transferIdentity();
    try {
      const envelope = encryptTargetBoundTransferPayload({
        format: 'gremia-sbv-test-transfer',
        version: 1,
        packageId: 'package-1',
        createdAt: '2026-09-05T08:00:00.000Z',
        payloadText: JSON.stringify({ sensitive: 'Fallzusammenfassung' }),
        passphrase: 'eine ausreichend lange Transfer-Passphrase',
        recipient: sourceTarget.publicIdentity,
      });

      expect(envelope.recipientBinding.targetInstanceId).toBe(sourceTarget.publicIdentity.instanceId);
      expect(decryptTargetBoundTransferPayload(envelope, 'eine ausreichend lange Transfer-Passphrase', sourceTarget.privateIdentity, {
        format: 'gremia-sbv-test-transfer',
        version: 1,
      }).payloadText).toContain('Fallzusammenfassung');
      expect(() => decryptTargetBoundTransferPayload(envelope, 'eine ausreichend lange Transfer-Passphrase', wrongTarget.privateIdentity, {
        format: 'gremia-sbv-test-transfer',
        version: 1,
      })).toThrow(/andere Gremia\.SBV-Instanz/);
      expect(() => decryptTargetBoundTransferPayload(envelope, 'falsche ausreichend lange Transfer-Passphrase', sourceTarget.privateIdentity, {
        format: 'gremia-sbv-test-transfer',
        version: 1,
      })).toThrow();
    } finally {
      sourceTarget.db.close();
      wrongTarget.db.close();
    }
  });

  it('unterstützt zielgebundene Übergaben ohne gemeinsame Passphrase und bindet Scheme/KDF zusammen', async () => {
    const sourceTarget = await transferIdentity();
    const wrongTarget = await transferIdentity();
    try {
      const envelope = encryptTargetBoundTransferPayload({
        format: 'gremia-sbv-test-transfer',
        version: 2,
        packageId: 'package-key-only',
        createdAt: '2026-09-06T08:00:00.000Z',
        payloadText: JSON.stringify({ sensitive: 'Fallzusammenfassung' }),
        passphrase: '',
        recipient: sourceTarget.publicIdentity,
        protectionMode: 'recipient_key_only',
      });

      expect(envelope.crypto.kdf).toBe('hkdf-sha256');
      expect(envelope.recipientBinding.scheme).toBe('x25519-hkdf-sha256');
      expect(decryptTargetBoundTransferPayload(envelope, '', sourceTarget.privateIdentity, {
        format: 'gremia-sbv-test-transfer',
        version: 2,
      })).toMatchObject({
        payloadText: expect.stringContaining('Fallzusammenfassung'),
        protectionMode: 'recipient_key_only',
      });
      expect(() => decryptTargetBoundTransferPayload(envelope, '', wrongTarget.privateIdentity, {
        format: 'gremia-sbv-test-transfer',
        version: 2,
      })).toThrow(/andere Gremia\.SBV-Instanz/);
      expect(() => decryptTargetBoundTransferPayload({
        ...envelope,
        crypto: { ...envelope.crypto, kdf: 'scrypt', kdfParams: { N: 131_072, r: 8, p: 1, maxmem: 268_435_456 } },
      }, '', sourceTarget.privateIdentity, {
        format: 'gremia-sbv-test-transfer',
        version: 2,
      })).toThrow(/kryptografie/i);
    } finally {
      sourceTarget.db.close();
      wrongTarget.db.close();
    }
  });
});
