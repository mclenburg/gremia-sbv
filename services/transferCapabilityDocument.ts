import { createHmac, createPrivateKey, createPublicKey, diffieHellman, hkdfSync, timingSafeEqual } from 'node:crypto';
import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import { createTransferKeyFingerprint } from './transferInstanceIdentityPolicy.js';
import type { TransferCapabilities, TransferCapabilityDocument } from '../src/domain/models/transfer-capability.model.js';
export type { TransferCapabilities, TransferCapabilityDocument } from '../src/domain/models/transfer-capability.model.js';

type PublicIdentity = Pick<TransferInstancePrivateIdentity, 'instanceId' | 'keyFingerprint' | 'publicKeyPem'>;

const ERROR = 'Die Fähigkeitsdatei ist ungültig oder stammt nicht von der bekannten Gegeninstanz für dieses Ziel.';
const FEATURES = new Set(['manual_capability_exchange', 'vacation_scope_v5', 'return_scope_v5']);
const own = (value: object, keys: string[]) => Object.keys(value).sort().join('|') === keys.sort().join('|');

function requireIdentity(identity: PublicIdentity): void {
  if (!/^[A-HJ-NP-Z2-9]{5}$/.test(identity.instanceId) || !/^[0-9a-f]{64}$/.test(identity.keyFingerprint)
    || identity.keyFingerprint !== createTransferKeyFingerprint(identity.publicKeyPem)) throw new Error(ERROR);
  if (createPublicKey(identity.publicKeyPem).asymmetricKeyType !== 'x25519') throw new Error(ERROR);
}

export function assertTransferCapabilities(input: unknown): TransferCapabilities {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(ERROR);
  const value = input as Record<string, unknown>;
  if (!own(value, ['protocolVersion', 'readFormats', 'writeFormats', 'features', 'buildVersion', 'revision', 'issuedAt'])
    || value.protocolVersion !== 1 || !Number.isSafeInteger(value.revision) || Number(value.revision) < 1
    || typeof value.issuedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.issuedAt)
    || Number.isNaN(Date.parse(value.issuedAt)) || typeof value.buildVersion !== 'string' || value.buildVersion.length > 80
    || !Array.isArray(value.readFormats) || !Array.isArray(value.writeFormats) || !Array.isArray(value.features)
    || value.readFormats.length > 5 || value.writeFormats.length > 5 || value.features.length > 10
    || !value.readFormats.every((format) => Number.isInteger(format) && format >= 1 && format <= 5)
    || !value.writeFormats.every((format) => Number.isInteger(format) && format >= 1 && format <= 5)
    || !value.features.every((feature) => typeof feature === 'string' && FEATURES.has(feature))
    || new Set(value.readFormats).size !== value.readFormats.length || new Set(value.writeFormats).size !== value.writeFormats.length
    || new Set(value.features).size !== value.features.length) throw new Error(ERROR);
  return value as unknown as TransferCapabilities;
}

function signedBytes(document: Omit<TransferCapabilityDocument, 'proof'>): string {
  return JSON.stringify([
    document.kind, document.version, document.origin.instanceId, document.origin.keyFingerprint,
    document.target.instanceId, document.target.keyFingerprint, document.capabilities.protocolVersion,
    document.capabilities.readFormats, document.capabilities.writeFormats, document.capabilities.features,
    document.capabilities.buildVersion, document.capabilities.revision, document.capabilities.issuedAt,
  ]);
}

function mac(document: Omit<TransferCapabilityDocument, 'proof'>, privateKeyPem: string, peerPublicKeyPem: string): Buffer {
  const secret = diffieHellman({ privateKey: createPrivateKey(privateKeyPem), publicKey: createPublicKey(peerPublicKeyPem) });
  let key: Buffer | undefined;
  try {
    key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'gremia-sbv-capability-document-v1', 32));
    return createHmac('sha256', key).update(signedBytes(document), 'utf8').digest();
  } finally { secret.fill(0); key?.fill(0); }
}

export function createTransferCapabilityDocument(sender: TransferInstancePrivateIdentity, target: PublicIdentity,
  capabilities: TransferCapabilities): TransferCapabilityDocument {
  requireIdentity(sender);
  requireIdentity(target);
  const validated = assertTransferCapabilities(capabilities);
  const unsigned = {
    kind: 'gremia-sbv-capability' as const, version: 1 as const,
    origin: { instanceId: sender.instanceId, keyFingerprint: sender.keyFingerprint },
    target: { instanceId: target.instanceId, keyFingerprint: target.keyFingerprint },
    capabilities: validated,
  };
  return { ...unsigned, proof: { scheme: 'x25519-hkdf-hmac-sha256-v1', mac: mac(unsigned, sender.privateKeyPem, target.publicKeyPem).toString('base64') } };
}

export function verifyTransferCapabilityDocument(input: unknown, recipient: TransferInstancePrivateIdentity,
  knownSender: PublicIdentity): TransferCapabilities {
  try {
    requireIdentity(recipient);
    requireIdentity(knownSender);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(ERROR);
    const document = input as TransferCapabilityDocument;
    if (!own(document, ['kind', 'version', 'origin', 'target', 'capabilities', 'proof'])
      || document.kind !== 'gremia-sbv-capability' || document.version !== 1
      || !document.origin || !own(document.origin, ['instanceId', 'keyFingerprint'])
      || !document.target || !own(document.target, ['instanceId', 'keyFingerprint'])
      || document.origin.instanceId !== knownSender.instanceId || document.origin.keyFingerprint !== knownSender.keyFingerprint
      || document.target.instanceId !== recipient.instanceId || document.target.keyFingerprint !== recipient.keyFingerprint
      || !document.proof || !own(document.proof, ['scheme', 'mac'])
      || document.proof.scheme !== 'x25519-hkdf-hmac-sha256-v1' || !/^[A-Za-z0-9+/]{43}=$/.test(document.proof.mac)) throw new Error(ERROR);
    const capabilities = assertTransferCapabilities(document.capabilities);
    const unsigned = { kind: document.kind, version: document.version, origin: document.origin, target: document.target, capabilities };
    const expected = mac(unsigned, recipient.privateKeyPem, knownSender.publicKeyPem);
    const supplied = Buffer.from(document.proof.mac, 'base64');
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) throw new Error(ERROR);
    return capabilities;
  } catch { throw new Error(ERROR); }
}
