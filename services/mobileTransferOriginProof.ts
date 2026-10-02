import { createHmac, createPrivateKey, createPublicKey, diffieHellman, hkdfSync, timingSafeEqual } from 'node:crypto';
import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import type { TargetBoundTransferEnvelope } from './targetBoundTransferCrypto.js';
import type { TransferRecipientIdentity } from '../src/domain/models/transfer-identity.model.js';
import { ApplicationError } from '../src/domain/models/application-error.model.js';

type MobileTransferPurpose = 'snapshot' | 'return';
type MobileOriginProof = { scheme: 'x25519-hkdf-hmac-sha256-v1'; keyFingerprint: string; mac: string };
const ORIGIN_ERROR = 'Der Herkunftsnachweis fehlt oder ist ungültig. Bitte die Rückgabedatei mit der aktuellen Begleit-App erneut erzeugen.';

export function requireMobileOriginProof(envelope: TargetBoundTransferEnvelope & { senderProof?: unknown }): MobileOriginProof {
  const proof = envelope.senderProof;
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) throw new ApplicationError('VALIDATION_FAILED', ORIGIN_ERROR);
  const record = proof as Record<string, unknown>;
  if (record.scheme !== 'x25519-hkdf-hmac-sha256-v1' || typeof record.keyFingerprint !== 'string'
    || !/^[0-9a-f]{64}$/.test(record.keyFingerprint) || typeof record.mac !== 'string'
    || !/^[A-Za-z0-9+/]{43}=$/.test(record.mac)) throw new ApplicationError('VALIDATION_FAILED', ORIGIN_ERROR);
  return { scheme: record.scheme, keyFingerprint: record.keyFingerprint, mac: record.mac };
}

/** Authenticates the ciphertext with the two explicitly paired static identities. */
export function authenticateMobileTransfer(envelope: TargetBoundTransferEnvelope, sender: TransferInstancePrivateIdentity,
  recipientPublicKeyPem: string, purpose: MobileTransferPurpose) {
  const mac = computeOriginMac(envelope, sender.privateKeyPem, recipientPublicKeyPem, purpose).toString('base64');
  return { ...envelope, senderProof: { scheme: 'x25519-hkdf-hmac-sha256-v1' as const, keyFingerprint: sender.keyFingerprint, mac } };
}

export function verifyMobileTransferOrigin(envelope: TargetBoundTransferEnvelope & { senderProof?: unknown }, recipient: TransferInstancePrivateIdentity,
  sender: TransferRecipientIdentity, purpose: MobileTransferPurpose): void {
  const proof = requireMobileOriginProof(envelope);
  if (proof.keyFingerprint !== sender.keyFingerprint) throw new ApplicationError('VALIDATION_FAILED', ORIGIN_ERROR);
  const expected = computeOriginMac(envelope, recipient.privateKeyPem, sender.publicKeyPem, purpose);
  const supplied = Buffer.from(proof.mac, 'base64');
  if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) throw new ApplicationError('VALIDATION_FAILED', ORIGIN_ERROR);
}

function computeOriginMac(envelope: TargetBoundTransferEnvelope, privateKeyPem: string,
  publicKeyPem: string, purpose: MobileTransferPurpose): Buffer {
  const secret = diffieHellman({ privateKey: createPrivateKey(privateKeyPem), publicKey: createPublicKey(publicKeyPem) });
  let key: Buffer | undefined;
  try {
    key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0),
      `gremia-sbv-mobile-${purpose}-origin-v1:${envelope.packageId}:${envelope.recipientBinding.targetInstanceId}`, 32));
    return createHmac('sha256', key).update([
      envelope.integrity.aadSha256, envelope.integrity.ciphertextSha256, envelope.crypto.tag,
    ].join('|'), 'utf8').digest();
  } finally { secret.fill(0); key?.fill(0); }
}
