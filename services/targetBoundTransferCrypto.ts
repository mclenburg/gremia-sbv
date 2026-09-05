import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import type { TransferRecipientIdentity } from '../src/domain/models/transfer-identity.model.js';
import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';

export type TransferKdfParams = {
  N: number;
  r: number;
  p: number;
  maxmem?: number;
};

export type TransferCryptoHeader = {
  algorithm: 'aes-256-gcm';
  kdf: 'scrypt';
  kdfParams: TransferKdfParams;
  salt: string;
  iv: string;
};

export type TransferRecipientBinding = {
  scheme: 'x25519-scrypt-hkdf-sha256';
  targetInstanceId: string;
  targetKeyFingerprint: string;
  ephemeralPublicKeyPem: string;
};

export type TargetBoundTransferEnvelope = {
  format: string;
  version: number;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
  recipientBinding: TransferRecipientBinding;
  crypto: TransferCryptoHeader & { tag: string };
  integrity: { aadSha256: string; ciphertextSha256: string };
  payload: string;
};

export type TargetBoundDecryptResult = {
  payloadText: string;
  algorithm: 'aes-256-gcm';
};

export const CURRENT_TRANSFER_SCRYPT_PARAMS: TransferKdfParams = {
  N: 131_072,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
};

export function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeDestroyBuffer(buffer?: Buffer): void {
  try {
    buffer?.fill(0);
  } catch {
    // Best effort only.
  }
}

export function deriveTransferKey(passphrase: string, salt: Buffer, params: TransferKdfParams): Buffer {
  return scryptSync(passphrase, salt, 32, params.maxmem ? { N: params.N, r: params.r, p: params.p, maxmem: params.maxmem } : { N: params.N, r: params.r, p: params.p });
}

export function assertKdfParams(value: unknown): TransferKdfParams {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Übergabepaket enthält keine gültigen KDF-Parameter.');
  const record = value as Record<string, unknown>;
  const N = Number(record.N);
  const r = Number(record.r);
  const p = Number(record.p);
  const maxmem = record.maxmem === undefined || record.maxmem === null ? undefined : Number(record.maxmem);
  if (!Number.isInteger(N) || N < 65_536) throw new Error('Übergabepaket nutzt keine zulässigen KDF-Parameter.');
  if (!Number.isInteger(r) || r < 1 || !Number.isInteger(p) || p < 1) throw new Error('Übergabepaket nutzt keine zulässigen KDF-Parameter.');
  if (maxmem !== undefined && (!Number.isInteger(maxmem) || maxmem < 128 * 1024 * 1024)) throw new Error('Übergabepaket nutzt keine zulässigen KDF-Parameter.');
  return { N, r, p, maxmem };
}

export function assertBase64(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Übergabepaket ist unvollständig: ${field}.`);
  return value;
}

export function assertTransferRecipientBinding(value: unknown): TransferRecipientBinding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Übergabepaket enthält keine gültige Zielbindung.');
  const record = value as Record<string, unknown>;
  if (record.scheme !== 'x25519-scrypt-hkdf-sha256') throw new Error('Übergabepaket nutzt keine unterstützte Zielbindung.');
  if (typeof record.targetInstanceId !== 'string' || !record.targetInstanceId.trim()) throw new Error('Übergabepaket enthält keine Zielinstanz.');
  if (typeof record.targetKeyFingerprint !== 'string' || !/^[0-9a-f]{64}$/i.test(record.targetKeyFingerprint)) throw new Error('Übergabepaket enthält keinen gültigen Ziel-Fingerprint.');
  if (typeof record.ephemeralPublicKeyPem !== 'string' || !record.ephemeralPublicKeyPem.includes('PUBLIC KEY')) throw new Error('Übergabepaket enthält keinen gültigen Übergabeschlüssel.');
  return {
    scheme: 'x25519-scrypt-hkdf-sha256',
    targetInstanceId: record.targetInstanceId,
    targetKeyFingerprint: record.targetKeyFingerprint.toLowerCase(),
    ephemeralPublicKeyPem: record.ephemeralPublicKeyPem,
  };
}

export function buildTargetBoundAad(envelope: Omit<TargetBoundTransferEnvelope, 'crypto' | 'integrity' | 'payload'> & { crypto: TransferCryptoHeader }): Buffer {
  return Buffer.from(JSON.stringify({
    format: envelope.format,
    version: envelope.version,
    packageId: envelope.packageId,
    createdAt: envelope.createdAt,
    expiresAt: envelope.expiresAt ?? null,
    recipientBinding: envelope.recipientBinding,
    crypto: {
      algorithm: envelope.crypto.algorithm,
      kdf: envelope.crypto.kdf,
      kdfParams: {
        N: envelope.crypto.kdfParams.N,
        r: envelope.crypto.kdfParams.r,
        p: envelope.crypto.kdfParams.p,
        maxmem: envelope.crypto.kdfParams.maxmem ?? null,
      },
      salt: envelope.crypto.salt,
      iv: envelope.crypto.iv,
    },
  }), 'utf8');
}

function deriveTargetBoundKey(args: {
  passphrase: string;
  salt: Buffer;
  params: TransferKdfParams;
  sharedSecret: Buffer;
  packageId: string;
  targetInstanceId: string;
}): Buffer {
  const passphraseKey = deriveTransferKey(args.passphrase, args.salt, args.params);
  try {
    return Buffer.from(hkdfSync(
      'sha256',
      passphraseKey,
      args.sharedSecret,
      Buffer.from(`gremia-sbv-transfer:${args.targetInstanceId}:${args.packageId}`, 'utf8'),
      32,
    ));
  } finally {
    safeDestroyBuffer(passphraseKey);
  }
}

export function encryptTargetBoundTransferPayload(args: {
  format: string;
  version: number;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
  payloadText: string;
  passphrase: string;
  recipient: TransferRecipientIdentity;
}): TargetBoundTransferEnvelope {
  if (!args.format.trim() || !Number.isInteger(args.version) || args.version < 1 || !args.packageId.trim() || !args.createdAt.trim()) {
    throw new Error('Übergabe-Envelope enthält ungültige technische Metadaten.');
  }
  const ephemeral = generateKeyPairSync('x25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const sharedSecret = diffieHellman({
    privateKey: createPrivateKey(ephemeral.privateKey),
    publicKey: createPublicKey(args.recipient.publicKeyPem),
  });
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveTargetBoundKey({
    passphrase: args.passphrase,
    salt,
    params: CURRENT_TRANSFER_SCRYPT_PARAMS,
    sharedSecret,
    packageId: args.packageId,
    targetInstanceId: args.recipient.instanceId,
  });
  try {
    const header = {
      format: args.format,
      version: args.version,
      packageId: args.packageId,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
      recipientBinding: {
        scheme: 'x25519-scrypt-hkdf-sha256' as const,
        targetInstanceId: args.recipient.instanceId,
        targetKeyFingerprint: args.recipient.keyFingerprint,
        ephemeralPublicKeyPem: ephemeral.publicKey.toString(),
      },
      crypto: {
        algorithm: 'aes-256-gcm' as const,
        kdf: 'scrypt' as const,
        kdfParams: CURRENT_TRANSFER_SCRYPT_PARAMS,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
      },
    };
    const aad = buildTargetBoundAad(header);
    const plain = Buffer.from(args.payloadText, 'utf8');
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    try {
      return {
        ...header,
        crypto: { ...header.crypto, tag: cipher.getAuthTag().toString('base64') },
        integrity: { aadSha256: sha256(aad), ciphertextSha256: sha256(encrypted) },
        payload: encrypted.toString('base64'),
      };
    } finally {
      safeDestroyBuffer(plain);
      safeDestroyBuffer(encrypted);
    }
  } finally {
    safeDestroyBuffer(key);
    safeDestroyBuffer(salt);
    safeDestroyBuffer(iv);
    safeDestroyBuffer(sharedSecret);
  }
}

export function decryptTargetBoundTransferPayload(
  envelope: TargetBoundTransferEnvelope,
  passphrase: string,
  localIdentity: TransferInstancePrivateIdentity,
  expected: { format: string; version: number },
): TargetBoundDecryptResult {
  if (envelope.format !== expected.format || envelope.version !== expected.version) throw new Error('Nicht unterstütztes Übergabeformat.');
  if (envelope.crypto.algorithm !== 'aes-256-gcm' || envelope.crypto.kdf !== 'scrypt') throw new Error('Nicht unterstützte Übergabekryptografie.');
  if (envelope.recipientBinding.targetInstanceId !== localIdentity.instanceId || envelope.recipientBinding.targetKeyFingerprint !== localIdentity.keyFingerprint) {
    throw new Error('Dieses Übergabepaket ist für eine andere Gremia.SBV-Instanz verschlüsselt.');
  }
  const params = assertKdfParams(envelope.crypto.kdfParams);
  const salt = Buffer.from(assertBase64(envelope.crypto.salt, 'salt'), 'base64');
  const iv = Buffer.from(assertBase64(envelope.crypto.iv, 'iv'), 'base64');
  const encrypted = Buffer.from(assertBase64(envelope.payload, 'payload'), 'base64');
  const sharedSecret = diffieHellman({
    privateKey: createPrivateKey(localIdentity.privateKeyPem),
    publicKey: createPublicKey(envelope.recipientBinding.ephemeralPublicKeyPem),
  });
  const key = deriveTargetBoundKey({
    passphrase,
    salt,
    params,
    sharedSecret,
    packageId: envelope.packageId,
    targetInstanceId: envelope.recipientBinding.targetInstanceId,
  });
  try {
    const aad = buildTargetBoundAad(envelope);
    if (sha256(aad) !== envelope.integrity.aadSha256 || sha256(encrypted) !== envelope.integrity.ciphertextSha256) {
      throw new Error('Übergabepaket wurde manipuliert oder ist beschädigt.');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(assertBase64(envelope.crypto.tag, 'tag'), 'base64'));
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    try {
      return { payloadText: plain.toString('utf8'), algorithm: 'aes-256-gcm' };
    } finally {
      safeDestroyBuffer(plain);
    }
  } finally {
    safeDestroyBuffer(key);
    safeDestroyBuffer(salt);
    safeDestroyBuffer(iv);
    safeDestroyBuffer(encrypted);
    safeDestroyBuffer(sharedSecret);
  }
}
