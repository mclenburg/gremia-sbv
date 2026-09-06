import { describe, expect, it } from 'vitest';
import { openTestDatabase } from '../../helpers/openTestDatabase';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import {
  TRANSFER_INSTANCE_ID_PATTERN,
  formatTransferRecipientToken,
  parseTransferRecipientToken,
} from '../../../services/transferInstanceIdentityPolicy';

describe('TransferInstanceIdentityService', () => {
  it('erzeugt eine stabile, gut diktierbare 5-stellige Instanz-ID mit größerem Alphabet', async () => {
    const db = await openTestDatabase();
    db.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);');
    try {
      const service = new TransferInstanceIdentityService(db);
      const first = service.ensureIdentity();
      const second = service.ensureIdentity();

      expect(first.instanceId).toMatch(TRANSFER_INSTANCE_ID_PATTERN);
      expect(first.instanceId).toHaveLength(5);
      expect(first.instanceId).not.toMatch(/[01IOa-z]/);
      expect(second).toEqual(first);
    } finally {
      db.close();
    }
  });

  it('veröffentlicht nur die Empfängerkennung und keine private Schlüsselkomponente', async () => {
    const db = await openTestDatabase();
    db.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);');
    try {
      const service = new TransferInstanceIdentityService(db);
      const identity = service.getPublicIdentity();
      const parsed = parseTransferRecipientToken(identity.recipientToken);

      expect(parsed.instanceId).toBe(identity.instanceId);
      expect(parsed.keyFingerprint).toBe(identity.keyFingerprint);
      expect(parsed.publicKeyPem).toContain('PUBLIC KEY');
      expect(identity.recipientToken).not.toContain('PRIVATE KEY');
    } finally {
      db.close();
    }
  });

  it('weist manuell beschädigte Empfängerkennungen ab', async () => {
    const db = await openTestDatabase();
    db.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);');
    try {
      const identity = new TransferInstanceIdentityService(db).getPublicIdentity();
      const token = formatTransferRecipientToken(identity);
      expect(() => parseTransferRecipientToken(token.replace(identity.instanceId, 'IO001'))).toThrow(/Empfängerkennung/);
    } finally {
      db.close();
    }
  });
});
