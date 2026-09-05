import { createHash } from 'node:crypto';
import type { TransferRecipientIdentity } from '../src/domain/models/transfer-identity.model.js';

export const TRANSFER_INSTANCE_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TRANSFER_INSTANCE_ID_LENGTH = 5;
export const TRANSFER_INSTANCE_ID_PATTERN = /^[A-HJ-NP-Z2-9]{5}$/;
export const TRANSFER_RECIPIENT_TOKEN_PREFIX = 'GSBV1';

export function createTransferKeyFingerprint(publicKeyPem: string): string {
  return createHash('sha256').update(publicKeyPem, 'utf8').digest('hex');
}

export function formatTransferRecipientToken(identity: Pick<TransferRecipientIdentity, 'instanceId' | 'keyFingerprint' | 'publicKeyPem'>): string {
  assertTransferInstanceId(identity.instanceId);
  const expectedFingerprint = createTransferKeyFingerprint(identity.publicKeyPem);
  if (identity.keyFingerprint !== expectedFingerprint) throw new Error('Empfängerkennung enthält keinen passenden Schlüssel-Fingerprint.');
  return [
    TRANSFER_RECIPIENT_TOKEN_PREFIX,
    identity.instanceId,
    identity.keyFingerprint,
    Buffer.from(identity.publicKeyPem, 'utf8').toString('base64url'),
  ].join('.');
}

export function parseTransferRecipientToken(token: string): TransferRecipientIdentity {
  const parts = token.trim().split('.');
  if (parts.length !== 4 || parts[0] !== TRANSFER_RECIPIENT_TOKEN_PREFIX) throw new Error('Empfängerkennung ist ungültig.');
  const [, instanceId, keyFingerprint, encodedPublicKey] = parts;
  assertTransferInstanceId(instanceId);
  if (!/^[0-9a-f]{64}$/i.test(keyFingerprint)) throw new Error('Empfängerkennung enthält keinen gültigen Schlüssel-Fingerprint.');
  let publicKeyPem = '';
  try {
    publicKeyPem = Buffer.from(encodedPublicKey, 'base64url').toString('utf8');
  } catch {
    throw new Error('Empfängerkennung enthält keinen gültigen öffentlichen Schlüssel.');
  }
  if (!publicKeyPem.includes('PUBLIC KEY') || createTransferKeyFingerprint(publicKeyPem) !== keyFingerprint) {
    throw new Error('Empfängerkennung enthält keinen passenden öffentlichen Schlüssel.');
  }
  return {
    instanceId,
    keyFingerprint: keyFingerprint.toLowerCase(),
    publicKeyPem,
    recipientToken: formatTransferRecipientToken({ instanceId, keyFingerprint: keyFingerprint.toLowerCase(), publicKeyPem }),
  };
}

export function assertTransferInstanceId(value: string): void {
  if (!TRANSFER_INSTANCE_ID_PATTERN.test(value)) throw new Error('Empfängerkennung enthält keine gültige 5-stellige Instanz-ID.');
}
