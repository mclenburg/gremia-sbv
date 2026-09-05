import { describe, expect, it } from 'vitest';
import { openTestDatabase } from '../../helpers/openTestDatabase';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import {
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
});
