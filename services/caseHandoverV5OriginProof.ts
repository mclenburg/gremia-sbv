import { createHmac, createPrivateKey, createPublicKey, diffieHellman, hkdfSync, timingSafeEqual } from 'node:crypto';
import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import { createTransferKeyFingerprint } from './transferInstanceIdentityPolicy.js';

type PublicIdentity = Pick<TransferInstancePrivateIdentity, 'instanceId' | 'keyFingerprint' | 'publicKeyPem'>;

export interface CaseHandoverV5OriginEnvelope {
  format: string;
  version: number;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
  recipientBinding: { targetInstanceId: string; targetKeyFingerprint: string };
  integrity: { aadSha256: string; ciphertextSha256: string };
  crypto: { tag: string };
}

export interface CaseHandoverV5OriginContext {
  packageType: 'vacation_handover' | 'return_delta';
  manifestSha256: string;
}

export interface CaseHandoverV5OriginProof extends CaseHandoverV5OriginContext {
  scheme: 'x25519-hkdf-hmac-sha256-handover-v5';
  originInstanceId: string;
  originKeyFingerprint: string;
  mac: string;
}

const ERROR = 'Der Herkunftsnachweis des Format-5-Pakets ist ungültig oder die Gegeninstanz ist nicht bekannt.';

function assertBound(envelope: CaseHandoverV5OriginEnvelope, context: CaseHandoverV5OriginContext,
  sender: PublicIdentity, target: PublicIdentity): void {
  if (envelope.format !== 'gremia-sbv-case-handover' || envelope.version !== 5 || !/^handover_[A-Za-z0-9_-]{4,120}$/.test(envelope.packageId)
    || !Number.isFinite(Date.parse(envelope.createdAt)) || (envelope.expiresAt !== undefined && !Number.isFinite(Date.parse(envelope.expiresAt)))
    || envelope.recipientBinding.targetInstanceId !== target.instanceId || envelope.recipientBinding.targetKeyFingerprint !== target.keyFingerprint
    || !/^[0-9a-f]{64}$/.test(sender.keyFingerprint) || sender.keyFingerprint !== createTransferKeyFingerprint(sender.publicKeyPem)
    || !/^[0-9a-f]{64}$/.test(target.keyFingerprint) || target.keyFingerprint !== createTransferKeyFingerprint(target.publicKeyPem)
    || !['vacation_handover', 'return_delta'].includes(context.packageType) || !/^[0-9a-f]{64}$/.test(context.manifestSha256)
    || !/^[0-9a-f]{64}$/.test(envelope.integrity.aadSha256) || !/^[0-9a-f]{64}$/.test(envelope.integrity.ciphertextSha256)
    || !/^[A-Za-z0-9+/]{22}==$/.test(envelope.crypto.tag)) throw new Error(ERROR);
  if (createPublicKey(sender.publicKeyPem).asymmetricKeyType !== 'x25519' || createPublicKey(target.publicKeyPem).asymmetricKeyType !== 'x25519') throw new Error(ERROR);
}

function signedBytes(envelope: CaseHandoverV5OriginEnvelope, context: CaseHandoverV5OriginContext,
  sender: PublicIdentity, target: PublicIdentity): string {
  return JSON.stringify([
    envelope.format, envelope.version, envelope.packageId, envelope.createdAt, envelope.expiresAt ?? null,
    context.packageType, context.manifestSha256, sender.instanceId, sender.keyFingerprint,
    target.instanceId, target.keyFingerprint, envelope.integrity.aadSha256,
    envelope.integrity.ciphertextSha256, envelope.crypto.tag,
  ]);
}

function computeMac(envelope: CaseHandoverV5OriginEnvelope, context: CaseHandoverV5OriginContext,
  localPrivateKeyPem: string, peerPublicKeyPem: string, sender: PublicIdentity, target: PublicIdentity): Buffer {
  const secret = diffieHellman({ privateKey: createPrivateKey(localPrivateKeyPem), publicKey: createPublicKey(peerPublicKeyPem) });
  let key: Buffer | undefined;
  try {
    key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), `gremia-sbv-case-handover-origin-v5:${envelope.packageId}`, 32));
    return createHmac('sha256', key).update(signedBytes(envelope, context, sender, target), 'utf8').digest();
  } finally { secret.fill(0); key?.fill(0); }
}

export function createCaseHandoverV5OriginProof(envelope: CaseHandoverV5OriginEnvelope, context: CaseHandoverV5OriginContext,
  sender: TransferInstancePrivateIdentity, target: PublicIdentity): CaseHandoverV5OriginProof {
  assertBound(envelope, context, sender, target);
  return { scheme: 'x25519-hkdf-hmac-sha256-handover-v5', ...context,
    originInstanceId: sender.instanceId, originKeyFingerprint: sender.keyFingerprint,
    mac: computeMac(envelope, context, sender.privateKeyPem, target.publicKeyPem, sender, target).toString('base64') };
}

export function verifyCaseHandoverV5OriginProof(envelope: CaseHandoverV5OriginEnvelope, context: CaseHandoverV5OriginContext,
  input: unknown, recipient: TransferInstancePrivateIdentity, knownSender: PublicIdentity): void {
  try {
    assertBound(envelope, context, knownSender, recipient);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(ERROR);
    const proof = input as Record<string, unknown>;
    if (Object.keys(proof).sort().join('|') !== ['scheme', 'packageType', 'manifestSha256', 'originInstanceId', 'originKeyFingerprint', 'mac'].sort().join('|')
      || proof.scheme !== 'x25519-hkdf-hmac-sha256-handover-v5' || proof.packageType !== context.packageType
      || proof.manifestSha256 !== context.manifestSha256 || proof.originInstanceId !== knownSender.instanceId
      || proof.originKeyFingerprint !== knownSender.keyFingerprint || typeof proof.mac !== 'string'
      || !/^[A-Za-z0-9+/]{43}=$/.test(proof.mac)) throw new Error(ERROR);
    const expected = computeMac(envelope, context, recipient.privateKeyPem, knownSender.publicKeyPem, knownSender, recipient);
    const supplied = Buffer.from(proof.mac, 'base64');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error(ERROR);
  } catch { throw new Error(ERROR); }
}
