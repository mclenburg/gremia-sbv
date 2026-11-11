import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import type { TransferCapabilities } from '../src/domain/models/transfer-capability.model.js';
import { assertTransferCapabilities } from './transferCapabilityDocument.js';
import { hashVacationV5Manifest, type VacationV5Manifest } from './vacationV5SectionManifest.js';
import { createVacationV5PackageManifest, assertVacationV5PackageSections,
  type VacationV5PackageSection } from './vacationV5PackageSections.js';
import { createCaseHandoverV5OriginProof, verifyCaseHandoverV5OriginProof,
  type CaseHandoverV5OriginProof } from './caseHandoverV5OriginProof.js';
import { encryptTargetBoundTransferPayload, decryptTargetBoundTransferPayload, assertTransferRecipientBinding,
  type TargetBoundTransferEnvelope } from './targetBoundTransferCrypto.js';
import { formatTransferRecipientToken } from './transferInstanceIdentityPolicy.js';

type PublicIdentity = Pick<TransferInstancePrivateIdentity, 'instanceId' | 'keyFingerprint' | 'publicKeyPem'>;

export interface VacationV5Payload {
  format: 'gremia-sbv-case-handover';
  version: 5;
  packageType: 'vacation_handover';
  packageId: string;
  createdAt: string;
  expiresAt: string;
  origin: { instanceId: string; keyFingerprint: string };
  target: { instanceId: string; keyFingerprint: string };
  capabilities: TransferCapabilities;
  sections: VacationV5PackageSection[];
  references: Array<{ ref: string; type: string }>;
  manifest: VacationV5Manifest;
}

export type VacationV5Envelope = TargetBoundTransferEnvelope & { senderProof: CaseHandoverV5OriginProof };

const exactKeys = (value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) =>
  required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function references(sections: VacationV5PackageSection[]): Array<{ ref: string; type: string }> {
  return sections.flatMap((section) => section.items.map((item) => ({ ref: item.ref, type: section.type })));
}

function assertEnvelope(input: unknown): VacationV5Envelope {
  if (!isRecord(input) || !exactKeys(input, ['format', 'version', 'packageId', 'createdAt', 'recipientBinding', 'crypto', 'integrity', 'payload', 'senderProof'], ['expiresAt'])
    || input.format !== 'gremia-sbv-case-handover' || input.version !== 5 || !isRecord(input.recipientBinding)
    || !exactKeys(input.recipientBinding, ['scheme', 'targetInstanceId', 'targetKeyFingerprint', 'ephemeralPublicKeyPem'])
    || !isRecord(input.crypto) || !exactKeys(input.crypto, ['algorithm', 'kdf', 'salt', 'iv', 'tag'], ['kdfParams'])
    || (input.crypto.kdf === 'scrypt' && (!isRecord(input.crypto.kdfParams)
      || !exactKeys(input.crypto.kdfParams, ['N', 'r', 'p'], ['maxmem'])))
    || (input.crypto.kdf === 'hkdf-sha256' && Object.hasOwn(input.crypto, 'kdfParams'))
    || !isRecord(input.integrity) || !exactKeys(input.integrity, ['aadSha256', 'ciphertextSha256'])
    || typeof input.payload !== 'string' || input.payload.length > 48 * 1024 * 1024) throw new Error('Format-5-Envelope ist ungültig.');
  assertTransferRecipientBinding(input.recipientBinding);
  return input as unknown as VacationV5Envelope;
}

export function sealVacationV5Transport(input: {
  packageId: string; expiresAt: string; sections: unknown; capabilities: TransferCapabilities;
  passphrase: string; sender: TransferInstancePrivateIdentity; target: PublicIdentity;
}): VacationV5Envelope {
  if (!/^handover_[A-Za-z0-9_-]{4,120}$/.test(input.packageId) || !Number.isFinite(Date.parse(input.expiresAt))
    || Date.parse(input.expiresAt) <= Date.now()) throw new Error('Ungültiges oder abgelaufenes Vertretungspaket.');
  const manifest = createVacationV5PackageManifest(input.sections);
  const sections = assertVacationV5PackageSections(input.sections, manifest);
  if (!sections.length) throw new Error('Format-5-Paket enthält keinen ausgewählten Vertretungsumfang.');
  const createdAt = new Date().toISOString();
  const payload: VacationV5Payload = {
    format: 'gremia-sbv-case-handover', version: 5, packageType: 'vacation_handover',
    packageId: input.packageId, createdAt, expiresAt: input.expiresAt,
    origin: { instanceId: input.sender.instanceId, keyFingerprint: input.sender.keyFingerprint },
    target: { instanceId: input.target.instanceId, keyFingerprint: input.target.keyFingerprint },
    capabilities: assertTransferCapabilities(input.capabilities), sections, references: references(sections), manifest,
  };
  const target = { ...input.target, recipientToken: formatTransferRecipientToken(input.target) };
  const payloadText = JSON.stringify(payload);
  if (Buffer.byteLength(payloadText, 'utf8') > 36 * 1024 * 1024) {
    throw new Error('Das Format-5-Paket überschreitet die zulässige Nutzdatengröße.');
  }
  const encrypted = encryptTargetBoundTransferPayload({
    format: payload.format, version: 5, packageId: payload.packageId, createdAt,
    expiresAt: payload.expiresAt, payloadText, passphrase: input.passphrase, recipient: target,
  });
  return { ...encrypted, senderProof: createCaseHandoverV5OriginProof(encrypted,
    { packageType: payload.packageType, manifestSha256: hashVacationV5Manifest(manifest) }, input.sender, input.target) };
}

export function openVacationV5Transport(input: unknown, passphrase: string, recipient: TransferInstancePrivateIdentity,
  knownSender: PublicIdentity): VacationV5Payload {
  const envelope = assertEnvelope(input);
  const proof = envelope.senderProof;
  verifyCaseHandoverV5OriginProof(envelope, { packageType: proof.packageType, manifestSha256: proof.manifestSha256 }, proof, recipient, knownSender);
  const decrypted = decryptTargetBoundTransferPayload(envelope, passphrase, recipient, { format: 'gremia-sbv-case-handover', version: 5 });
  let parsed: unknown;
  try { parsed = JSON.parse(decrypted.payloadText); } catch { throw new Error('Format-5-Nutzdaten sind ungültig.'); }
  if (!isRecord(parsed) || !exactKeys(parsed, ['format', 'version', 'packageType', 'packageId', 'createdAt', 'expiresAt', 'origin', 'target', 'capabilities', 'sections', 'references', 'manifest'])
    || parsed.format !== envelope.format || parsed.version !== 5 || parsed.packageType !== 'vacation_handover'
    || parsed.packageId !== envelope.packageId || parsed.createdAt !== envelope.createdAt || parsed.expiresAt !== envelope.expiresAt
    || !isRecord(parsed.origin) || !exactKeys(parsed.origin, ['instanceId', 'keyFingerprint'])
    || parsed.origin.instanceId !== knownSender.instanceId || parsed.origin.keyFingerprint !== knownSender.keyFingerprint
    || !isRecord(parsed.target) || !exactKeys(parsed.target, ['instanceId', 'keyFingerprint'])
    || parsed.target.instanceId !== recipient.instanceId || parsed.target.keyFingerprint !== recipient.keyFingerprint
    || !isRecord(parsed.manifest)) throw new Error('Format-5-Nutzdaten enthalten widersprüchliche Metadaten.');
  const sections = assertVacationV5PackageSections(parsed.sections, parsed.manifest);
  if (!sections.length || hashVacationV5Manifest(parsed.manifest as unknown as VacationV5Manifest) !== proof.manifestSha256) {
    throw new Error('Format-5-Manifest stimmt nicht mit dem Herkunftsnachweis überein.');
  }
  const expectedReferences = references(sections);
  if (!Array.isArray(parsed.references) || JSON.stringify(parsed.references) !== JSON.stringify(expectedReferences)) {
    throw new Error('Format-5-Paket enthält widersprüchliche Referenzen.');
  }
  const capabilities = assertTransferCapabilities(parsed.capabilities);
  return { ...parsed, capabilities, sections, manifest: parsed.manifest as unknown as VacationV5Manifest } as VacationV5Payload;
}
