import { generateKeyPairSync, randomInt } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { TransferInstanceIdentity } from '../src/domain/models/transfer-identity.model.js';
import {
  TRANSFER_INSTANCE_ID_ALPHABET,
  TRANSFER_INSTANCE_ID_LENGTH,
  createTransferKeyFingerprint,
  formatTransferRecipientToken,
} from './transferInstanceIdentityPolicy.js';

const TRANSFER_IDENTITY_SETTINGS_KEY = 'transfer.instance.identity.v1';

export interface TransferInstancePrivateIdentity {
  version: 1;
  instanceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
  keyFingerprint: string;
  createdAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createInstanceId(): string {
  let result = '';
  for (let index = 0; index < TRANSFER_INSTANCE_ID_LENGTH; index += 1) {
    result += TRANSFER_INSTANCE_ID_ALPHABET[randomInt(TRANSFER_INSTANCE_ID_ALPHABET.length)];
  }
  return result;
}

function createStoredIdentity(): TransferInstancePrivateIdentity {
  const keyPair = generateKeyPairSync('x25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const publicKeyPem = keyPair.publicKey.toString();
  return {
    version: 1,
    instanceId: createInstanceId(),
    publicKeyPem,
    privateKeyPem: keyPair.privateKey.toString(),
    keyFingerprint: createTransferKeyFingerprint(publicKeyPem),
    createdAt: nowIso(),
  };
}

function toPublicIdentity(stored: TransferInstancePrivateIdentity): TransferInstanceIdentity {
  const recipientToken = formatTransferRecipientToken(stored);
  return {
    instanceId: stored.instanceId,
    keyFingerprint: stored.keyFingerprint,
    publicKeyPem: stored.publicKeyPem,
    recipientToken,
    createdAt: stored.createdAt,
  };
}

export class TransferInstanceIdentityService {
  constructor(private readonly database: DatabaseAdapter) {}

  ensureIdentity(): TransferInstanceIdentity {
    return toPublicIdentity(this.readOrCreate());
  }

  getPublicIdentity(): TransferInstanceIdentity {
    return this.ensureIdentity();
  }

  getPrivateIdentity(): TransferInstancePrivateIdentity {
    return this.readOrCreate();
  }

  private readOrCreate(): TransferInstancePrivateIdentity {
    const existing = this.readStored();
    if (existing) return existing;
    const created = createStoredIdentity();
    this.writeStored(created);
    return created;
  }

  private readStored(): TransferInstancePrivateIdentity | null {
    const row = this.database.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?').get(TRANSFER_IDENTITY_SETTINGS_KEY);
    if (!row?.value) return null;
    try {
      const parsed = JSON.parse(row.value) as TransferInstancePrivateIdentity;
      if (
        parsed.version !== 1 ||
        !parsed.instanceId ||
        !parsed.publicKeyPem?.includes('PUBLIC KEY') ||
        !parsed.privateKeyPem?.includes('PRIVATE KEY') ||
        parsed.keyFingerprint !== createTransferKeyFingerprint(parsed.publicKeyPem)
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private writeStored(identity: TransferInstancePrivateIdentity): void {
    this.database.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(TRANSFER_IDENTITY_SETTINGS_KEY, JSON.stringify(identity), nowIso());
  }
}
