import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_LEGACY_VERSION, CASE_HANDOVER_TARGET_BOUND_LEGACY_VERSION, CASE_HANDOVER_VERSION } from './caseHandoverPolicy.js';
import type { TransferRecipientIdentity } from '../src/domain/models/transfer-identity.model.js';
import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import {
  assertTransferRecipientBinding,
  decryptTargetBoundTransferPayload,
  encryptTargetBoundTransferPayload,
  type TargetBoundTransferEnvelope,
  type TransferRecipientBinding,
} from './targetBoundTransferCrypto.js';

export type TransferKdfParams = {
  N: number;
  r: number;
  p: number;
  maxmem?: number;
};

type TransferCryptoHeader = {
  algorithm: 'aes-256-gcm';
  kdf: 'scrypt';
  kdfParams: TransferKdfParams;
  salt: string;
  iv: string;
};

export type CaseHandoverEnvelopeV1 = {
  format: string;
  version: number;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
  kdf: 'scrypt';
  algorithm: 'aes-256-gcm';
  salt: string;
  iv: string;
  tag: string;
  aadHash: string;
  payload: string;
};

export type CaseHandoverEnvelopeV2 = {
  format: string;
  version: number;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
  recipientBinding?: TransferRecipientBinding;
  crypto: TransferCryptoHeader & { tag: string };
  integrity: {
    aadSha256: string;
    ciphertextSha256: string;
  };
  payload: string;
};

export type CaseHandoverEnvelope = CaseHandoverEnvelopeV1 | CaseHandoverEnvelopeV2;

export type DecryptedTransferPayload = {
  payloadText: string;
  formatVersion: number;
  legacyFormat: boolean;
  algorithm: 'aes-256-gcm';
};

export const CURRENT_TRANSFER_SCRYPT_PARAMS: TransferKdfParams = {
  N: 131_072,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
};

export const LEGACY_TRANSFER_SCRYPT_PARAMS: TransferKdfParams = {
  N: 16_384,
  r: 8,
  p: 1,
};

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeDestroyBuffer(buffer: Buffer): void {
  buffer.fill(0);
}

function deriveTransferKey(passphrase: string, salt: Buffer, params: TransferKdfParams): Buffer {
  return scryptSync(passphrase, salt, 32, params.maxmem ? { N: params.N, r: params.r, p: params.p, maxmem: params.maxmem } : { N: params.N, r: params.r, p: params.p });
}

function buildAadV1(envelope: Pick<CaseHandoverEnvelopeV1, 'format' | 'version' | 'packageId' | 'createdAt' | 'expiresAt' | 'kdf' | 'algorithm'>): Buffer {
  return Buffer.from(JSON.stringify({
    format: envelope.format,
    version: envelope.version,
    packageId: envelope.packageId,
    createdAt: envelope.createdAt,
    expiresAt: envelope.expiresAt ?? null,
    kdf: envelope.kdf,
    algorithm: envelope.algorithm,
  }), 'utf8');
}

function buildAadV2(envelope: { format: string; version: number; packageId: string; createdAt: string; expiresAt?: string; crypto: TransferCryptoHeader }): Buffer {
  return Buffer.from(JSON.stringify({
    format: envelope.format,
    version: envelope.version,
    packageId: envelope.packageId,
    createdAt: envelope.createdAt,
    expiresAt: envelope.expiresAt ?? null,
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

function assertBase64(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Fallübergabepaket ist unvollständig: ${field}.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertKdfParams(value: unknown): TransferKdfParams {
  if (!isRecord(value)) throw new Error('Fallübergabepaket enthält keine gültigen KDF-Parameter.');
  const N = Number(value.N);
  const r = Number(value.r);
  const p = Number(value.p);
  const maxmem = value.maxmem === undefined || value.maxmem === null ? undefined : Number(value.maxmem);
  if (!Number.isInteger(N) || N < 65_536) throw new Error('Fallübergabepaket nutzt keine zulässigen KDF-Parameter.');
  if (!Number.isInteger(r) || r < 1 || !Number.isInteger(p) || p < 1) throw new Error('Fallübergabepaket nutzt keine zulässigen KDF-Parameter.');
  if (maxmem !== undefined && (!Number.isInteger(maxmem) || maxmem < 128 * 1024 * 1024)) throw new Error('Fallübergabepaket nutzt keine zulässigen KDF-Parameter.');
  return { N, r, p, maxmem };
}

export function assertCaseHandoverEnvelope(value: unknown): CaseHandoverEnvelope {
  if (!isRecord(value)) throw new Error('Fallübergabepaket ist kein gültiger Übergabe-Envelope.');
  if (value.format !== CASE_HANDOVER_FORMAT) throw new Error('Nicht unterstütztes Fallübergabeformat.');
  if (typeof value.packageId !== 'string' || !value.packageId.startsWith('handover_')) throw new Error('Fallübergabepaket enthält keine gültige Paketkennung.');
  if (typeof value.createdAt !== 'string' || !value.createdAt) throw new Error('Fallübergabepaket enthält kein gültiges Erstellungsdatum.');
  if (value.expiresAt !== undefined && typeof value.expiresAt !== 'string') throw new Error('Fallübergabepaket enthält kein gültiges Ablaufdatum.');
  if (typeof value.payload !== 'string' || !value.payload) throw new Error('Fallübergabepaket enthält keine Nutzdaten.');

  if (value.version === CASE_HANDOVER_VERSION || value.version === CASE_HANDOVER_TARGET_BOUND_LEGACY_VERSION) {
    if (!isRecord(value.crypto) || !isRecord(value.integrity)) throw new Error('Fallübergabepaket enthält keinen gültigen Kryptografie-Header.');
    if (value.crypto.algorithm !== 'aes-256-gcm' || value.crypto.kdf !== 'scrypt') throw new Error('Nicht unterstütztes Fallübergabeformat.');
    const envelope: CaseHandoverEnvelopeV2 = {
      format: value.format,
      version: value.version,
      packageId: value.packageId,
      createdAt: value.createdAt,
      expiresAt: value.expiresAt,
      recipientBinding: value.recipientBinding === undefined ? undefined : assertTransferRecipientBinding(value.recipientBinding),
      crypto: {
        algorithm: 'aes-256-gcm',
        kdf: 'scrypt',
        kdfParams: assertKdfParams(value.crypto.kdfParams),
        salt: assertBase64(value.crypto.salt, 'salt'),
        iv: assertBase64(value.crypto.iv, 'iv'),
        tag: assertBase64(value.crypto.tag, 'tag'),
      },
      integrity: {
        aadSha256: assertBase64(value.integrity.aadSha256, 'aadSha256'),
        ciphertextSha256: assertBase64(value.integrity.ciphertextSha256, 'ciphertextSha256'),
      },
      payload: value.payload,
    };
    return envelope;
  }

  if (value.version === CASE_HANDOVER_LEGACY_VERSION) {
    if (value.kdf !== 'scrypt' || value.algorithm !== 'aes-256-gcm') throw new Error('Nicht unterstütztes Fallübergabeformat.');
    return {
      format: value.format,
      version: value.version,
      packageId: value.packageId,
      createdAt: value.createdAt,
      expiresAt: value.expiresAt,
      kdf: 'scrypt',
      algorithm: 'aes-256-gcm',
      salt: assertBase64(value.salt, 'salt'),
      iv: assertBase64(value.iv, 'iv'),
      tag: assertBase64(value.tag, 'tag'),
      aadHash: assertBase64(value.aadHash, 'aadHash'),
      payload: value.payload,
    };
  }

  throw new Error('Nicht unterstütztes Fallübergabeformat.');
}

export function encryptCaseHandoverPayloadV2(args: {
  payloadText: string;
  passphrase: string;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
}): CaseHandoverEnvelopeV2 {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveTransferKey(args.passphrase, salt, CURRENT_TRANSFER_SCRYPT_PARAMS);
  try {
    const header = {
      format: CASE_HANDOVER_FORMAT,
      version: CASE_HANDOVER_VERSION,
      packageId: args.packageId,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
      crypto: {
        algorithm: 'aes-256-gcm' as const,
        kdf: 'scrypt' as const,
        kdfParams: CURRENT_TRANSFER_SCRYPT_PARAMS,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
      },
    };
    const aad = buildAadV2(header);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const plain = Buffer.from(args.payloadText, 'utf8');
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    try { safeDestroyBuffer(plain); } catch { /* best effort */ }
    return {
      ...header,
      crypto: { ...header.crypto, tag: cipher.getAuthTag().toString('base64') },
      integrity: {
        aadSha256: sha256(aad),
        ciphertextSha256: sha256(encrypted),
      },
      payload: encrypted.toString('base64'),
    };
  } finally {
    safeDestroyBuffer(key);
    safeDestroyBuffer(salt);
    safeDestroyBuffer(iv);
  }
}

export function decryptCaseHandoverEnvelope(envelope: CaseHandoverEnvelope, passphrase: string, localIdentity?: TransferInstancePrivateIdentity): DecryptedTransferPayload {
  if ('crypto' in envelope) {
    if (envelope.recipientBinding) {
      if (!localIdentity) throw new Error('Dieses Fallübergabepaket ist zielgebunden. Die lokale Transfer-Identität konnte nicht geprüft werden.');
      const decrypted = decryptTargetBoundTransferPayload(envelope as TargetBoundTransferEnvelope, passphrase, localIdentity, {
        format: CASE_HANDOVER_FORMAT,
        version: envelope.version,
      });
      return { payloadText: decrypted.payloadText, formatVersion: envelope.version, legacyFormat: envelope.version < CASE_HANDOVER_VERSION, algorithm: decrypted.algorithm };
    }
    const salt = Buffer.from(envelope.crypto.salt, 'base64');
    const iv = Buffer.from(envelope.crypto.iv, 'base64');
    const key = deriveTransferKey(passphrase, salt, envelope.crypto.kdfParams);
    try {
      const aad = buildAadV2(envelope);
      const encrypted = Buffer.from(envelope.payload, 'base64');
      if (sha256(aad) !== envelope.integrity.aadSha256 || sha256(encrypted) !== envelope.integrity.ciphertextSha256) {
        throw new Error('Fallübergabepaket wurde manipuliert oder ist beschädigt.');
      }
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAAD(aad);
      decipher.setAuthTag(Buffer.from(envelope.crypto.tag, 'base64'));
      const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      try {
        return { payloadText: plain.toString('utf8'), formatVersion: envelope.version, legacyFormat: envelope.version < CASE_HANDOVER_VERSION, algorithm: 'aes-256-gcm' };
      } finally {
        safeDestroyBuffer(plain);
        safeDestroyBuffer(encrypted);
      }
    } finally {
      safeDestroyBuffer(key);
      safeDestroyBuffer(salt);
      safeDestroyBuffer(iv);
    }
  }

  const salt = Buffer.from(envelope.salt, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  const key = deriveTransferKey(passphrase, salt, LEGACY_TRANSFER_SCRYPT_PARAMS);
  try {
    const aad = buildAadV1(envelope);
    if (sha256(aad) !== envelope.aadHash) throw new Error('Fallübergabepaket wurde manipuliert oder ist beschädigt.');
    const encrypted = Buffer.from(envelope.payload, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    try {
      return { payloadText: plain.toString('utf8'), formatVersion: CASE_HANDOVER_LEGACY_VERSION, legacyFormat: true, algorithm: 'aes-256-gcm' };
    } finally {
      safeDestroyBuffer(plain);
      safeDestroyBuffer(encrypted);
    }
  } finally {
    safeDestroyBuffer(key);
    safeDestroyBuffer(salt);
    safeDestroyBuffer(iv);
  }
}

export type AuthenticatedTransferEnvelopeV2 = {
  format: string;
  version: number;
  packageId: string;
  createdAt: string;
  recipientBinding?: TransferRecipientBinding;
  crypto: TransferCryptoHeader & { tag: string };
  integrity: { aadSha256: string; ciphertextSha256: string };
  payload: string;
};

/**
 * Shared hardened v2 transfer primitive. Election transfer deliberately reuses the
 * same scrypt/AES-GCM implementation as case handover instead of introducing a
 * second cryptographic construction.
 */
export function encryptAuthenticatedTransferPayload(args: {
  format: string;
  version: number;
  packageId: string;
  createdAt: string;
  payloadText: string;
  passphrase: string;
  recipient?: TransferRecipientIdentity;
}): AuthenticatedTransferEnvelopeV2 {
  if (!args.format.trim() || !Number.isInteger(args.version) || args.version < 1 || !args.packageId.trim() || !args.createdAt.trim()) {
    throw new Error('Übergabe-Envelope enthält ungültige technische Metadaten.');
  }
  if (args.recipient) {
    return encryptTargetBoundTransferPayload({
      format: args.format,
      version: args.version,
      packageId: args.packageId,
      createdAt: args.createdAt,
      payloadText: args.payloadText,
      passphrase: args.passphrase,
      recipient: args.recipient,
    });
  }
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveTransferKey(args.passphrase, salt, CURRENT_TRANSFER_SCRYPT_PARAMS);
  try {
    const header = {
      format: args.format,
      version: args.version,
      packageId: args.packageId,
      createdAt: args.createdAt,
      crypto: {
        algorithm: 'aes-256-gcm' as const,
        kdf: 'scrypt' as const,
        kdfParams: CURRENT_TRANSFER_SCRYPT_PARAMS,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
      },
    };
    const aad = buildAadV2(header);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const plain = Buffer.from(args.payloadText, 'utf8');
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
  }
}

export function decryptAuthenticatedTransferPayload(
  envelope: AuthenticatedTransferEnvelopeV2,
  passphrase: string,
  expected: { format: string; version: number },
  localIdentity?: TransferInstancePrivateIdentity,
): string {
  if (envelope.format !== expected.format || envelope.version !== expected.version) throw new Error('Nicht unterstütztes Übergabeformat.');
  if (envelope.crypto.algorithm !== 'aes-256-gcm' || envelope.crypto.kdf !== 'scrypt') throw new Error('Nicht unterstützte Übergabekryptografie.');
  if (envelope.recipientBinding) {
    if (!localIdentity) throw new Error('Dieses Übergabepaket ist zielgebunden. Die lokale Transfer-Identität konnte nicht geprüft werden.');
    return decryptTargetBoundTransferPayload(envelope as TargetBoundTransferEnvelope, passphrase, localIdentity, expected).payloadText;
  }
  const params = assertKdfParams(envelope.crypto.kdfParams);
  const salt = Buffer.from(assertBase64(envelope.crypto.salt, 'salt'), 'base64');
  const iv = Buffer.from(assertBase64(envelope.crypto.iv, 'iv'), 'base64');
  const encrypted = Buffer.from(assertBase64(envelope.payload, 'payload'), 'base64');
  const key = deriveTransferKey(passphrase, salt, params);
  try {
    const aad = buildAadV2(envelope);
    if (sha256(aad) !== envelope.integrity.aadSha256 || sha256(encrypted) !== envelope.integrity.ciphertextSha256) {
      throw new Error('Übergabepaket wurde manipuliert oder ist beschädigt.');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(assertBase64(envelope.crypto.tag, 'tag'), 'base64'));
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    try { return plain.toString('utf8'); }
    finally { safeDestroyBuffer(plain); }
  } finally {
    safeDestroyBuffer(key);
    safeDestroyBuffer(salt);
    safeDestroyBuffer(iv);
    safeDestroyBuffer(encrypted);
  }
}
