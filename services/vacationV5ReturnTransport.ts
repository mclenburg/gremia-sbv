import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import type { TransferCapabilities } from '../src/domain/models/transfer-capability.model.js';
import { assertTransferCapabilities } from './transferCapabilityDocument.js';
import { assertVacationV5ReturnChanges } from './vacationV5ReturnChanges.js';
import type { VacationV5ReturnChange } from './vacationV5ReturnCollector.js';
import { hashVacationV5Section, hashVacationV5Manifest, type VacationV5Manifest } from './vacationV5SectionManifest.js';
import { assertVacationV5Envelope, type VacationV5Envelope } from './vacationV5Transport.js';
import { createCaseHandoverV5OriginProof, verifyCaseHandoverV5OriginProof } from './caseHandoverV5OriginProof.js';
import { encryptTargetBoundTransferPayload, decryptTargetBoundTransferPayload } from './targetBoundTransferCrypto.js';
import { formatTransferRecipientToken } from './transferInstanceIdentityPolicy.js';

type PublicIdentity = Pick<TransferInstancePrivateIdentity, 'instanceId' | 'keyFingerprint' | 'publicKeyPem'>;
interface ReturnSection { type: string; schemaVersion: 1; count: number; items: VacationV5ReturnChange[] }

export interface VacationV5ReturnPayload {
  format: 'gremia-sbv-case-handover'; version: 5; packageType: 'return_delta';
  packageId: string; sourcePackageId: string; createdAt: string; expiresAt: string;
  origin: { instanceId: string; keyFingerprint: string };
  target: { instanceId: string; keyFingerprint: string };
  capabilities: TransferCapabilities;
  sections: ReturnSection[];
  references: Array<{ ref: string; type: string }>;
  manifest: VacationV5Manifest;
  changes: VacationV5ReturnChange[];
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, fields: readonly string[]) =>
  Object.keys(value).length === fields.length && fields.every((field) => Object.hasOwn(value, field));
const packageId = (value: unknown): value is string => typeof value === 'string' && /^handover_[A-Za-z0-9_-]{4,120}$/.test(value);

function sectionsFor(changes: VacationV5ReturnChange[]): ReturnSection[] {
  const byKind = new Map<string, VacationV5ReturnChange[]>();
  for (const item of changes) {
    const items = byKind.get(item.kind) ?? [];
    items.push(item);
    byKind.set(item.kind, items);
  }
  return [...byKind.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([type, items]) => ({ type, schemaVersion: 1, count: items.length, items }));
}

function manifestFor(sections: ReturnSection[]): VacationV5Manifest {
  return { sections: sections.map((section) => ({ type: section.type, count: section.count,
    sha256: hashVacationV5Section(section) })) };
}

function assertSections(input: unknown, manifestInput: unknown): { sections: ReturnSection[]; changes: VacationV5ReturnChange[];
  manifest: VacationV5Manifest } {
  if (!Array.isArray(input) || !input.length || input.length > 22) throw new Error('Rückgabepaket enthält keine gültigen Abschnitte.');
  const rawChanges: unknown[] = [];
  const seenTypes = new Set<string>();
  for (const section of input) {
    if (!record(section) || !exact(section, ['type', 'schemaVersion', 'count', 'items'])
      || typeof section.type !== 'string' || seenTypes.has(section.type) || section.schemaVersion !== 1
      || !Array.isArray(section.items) || !section.items.length || section.items.length > 1000
      || section.count !== section.items.length
      || section.items.some((item) => !record(item) || item.kind !== section.type)) {
      throw new Error('Rückgabeabschnitt ist ungültig.');
    }
    seenTypes.add(section.type);
    rawChanges.push(...section.items);
  }
  const changes = assertVacationV5ReturnChanges(rawChanges);
  const sections = sectionsFor(changes);
  if (JSON.stringify(sections.map((section) => section.type)) !== JSON.stringify(input.map((section) => section.type))) {
    throw new Error('Rückgabeabschnitte sind nicht kanonisch geordnet.');
  }
  const manifest = manifestFor(sections);
  if (!record(manifestInput) || !exact(manifestInput, ['sections'])
    || !Array.isArray(manifestInput.sections) || manifestInput.sections.length !== manifest.sections.length
    || manifestInput.sections.some((entry, index) => !record(entry) || !exact(entry, ['type', 'count', 'sha256'])
      || entry.type !== manifest.sections[index].type || entry.count !== manifest.sections[index].count
      || entry.sha256 !== manifest.sections[index].sha256)) {
    throw new Error('Rückgabemanifest stimmt nicht mit den Abschnitten überein.');
  }
  return { sections, changes, manifest };
}

export function sealVacationV5ReturnTransport(input: {
  packageId: string; sourcePackageId: string; expiresAt: string; changes: unknown;
  capabilities: TransferCapabilities; passphrase: string;
  sender: TransferInstancePrivateIdentity; target: PublicIdentity;
}): VacationV5Envelope {
  if (!packageId(input.packageId) || !packageId(input.sourcePackageId)
    || input.packageId === input.sourcePackageId || !Number.isFinite(Date.parse(input.expiresAt))
    || Date.parse(input.expiresAt) <= Date.now()) throw new Error('Rückgabe enthält ungültige Paket- oder Ablaufdaten.');
  const capabilities = assertTransferCapabilities(input.capabilities);
  if (!capabilities.writeFormats.includes(5) || !capabilities.features.includes('return_scope_v5')) {
    throw new Error('Abgebende Instanz bietet die Format-5-Rückgabe nicht an.');
  }
  const changes = assertVacationV5ReturnChanges(input.changes);
  if (!changes.length) throw new Error('Rückgabe enthält keine Änderungen.');
  const sections = sectionsFor(changes);
  const manifest = manifestFor(sections);
  const createdAt = new Date().toISOString();
  const payload = { format: 'gremia-sbv-case-handover' as const, version: 5 as const,
    packageType: 'return_delta' as const, packageId: input.packageId, sourcePackageId: input.sourcePackageId,
    createdAt, expiresAt: input.expiresAt,
    origin: { instanceId: input.sender.instanceId, keyFingerprint: input.sender.keyFingerprint },
    target: { instanceId: input.target.instanceId, keyFingerprint: input.target.keyFingerprint },
    capabilities, sections, references: sections.flatMap((section) => section.items.map((item) => ({ ref: item.ref, type: item.kind }))), manifest };
  const payloadText = JSON.stringify(payload);
  if (Buffer.byteLength(payloadText, 'utf8') > 36 * 1024 * 1024) throw new Error('Format-5-Rückgabe ist zu groß.');
  const encrypted = encryptTargetBoundTransferPayload({ format: payload.format, version: 5,
    packageId: payload.packageId, createdAt, expiresAt: payload.expiresAt, payloadText,
    passphrase: input.passphrase, recipient: { ...input.target,
      recipientToken: formatTransferRecipientToken(input.target) } });
  return { ...encrypted, senderProof: createCaseHandoverV5OriginProof(encrypted,
    { packageType: 'return_delta', manifestSha256: hashVacationV5Manifest(manifest) }, input.sender, input.target) };
}

export function openVacationV5ReturnTransport(input: unknown, passphrase: string,
  recipient: TransferInstancePrivateIdentity, knownSender: PublicIdentity): VacationV5ReturnPayload {
  const envelope = assertVacationV5Envelope(input);
  verifyCaseHandoverV5OriginProof(envelope, { packageType: 'return_delta',
    manifestSha256: envelope.senderProof.manifestSha256 }, envelope.senderProof, recipient, knownSender);
  const decrypted = decryptTargetBoundTransferPayload(envelope, passphrase, recipient,
    { format: 'gremia-sbv-case-handover', version: 5 });
  let parsed: unknown;
  try { parsed = JSON.parse(decrypted.payloadText); } catch { throw new Error('Format-5-Rückgabe ist ungültig.'); }
  if (!record(parsed) || !exact(parsed, ['format', 'version', 'packageType', 'packageId', 'sourcePackageId',
    'createdAt', 'expiresAt', 'origin', 'target', 'capabilities', 'sections', 'references', 'manifest'])
    || parsed.format !== envelope.format || parsed.version !== 5 || parsed.packageType !== 'return_delta'
    || parsed.packageId !== envelope.packageId || !packageId(parsed.sourcePackageId)
    || parsed.sourcePackageId === parsed.packageId || parsed.createdAt !== envelope.createdAt
    || parsed.expiresAt !== envelope.expiresAt || Date.parse(String(parsed.expiresAt)) <= Date.now()
    || !record(parsed.origin) || !exact(parsed.origin, ['instanceId', 'keyFingerprint'])
    || parsed.origin.instanceId !== knownSender.instanceId || parsed.origin.keyFingerprint !== knownSender.keyFingerprint
    || !record(parsed.target) || !exact(parsed.target, ['instanceId', 'keyFingerprint'])
    || parsed.target.instanceId !== recipient.instanceId || parsed.target.keyFingerprint !== recipient.keyFingerprint) {
    throw new Error('Format-5-Rückgabe enthält widersprüchliche Metadaten.');
  }
  const { sections, changes, manifest } = assertSections(parsed.sections, parsed.manifest);
  if (hashVacationV5Manifest(manifest) !== envelope.senderProof.manifestSha256
    || JSON.stringify(parsed.references) !== JSON.stringify(changes.map((item) => ({ ref: item.ref, type: item.kind })))) {
    throw new Error('Format-5-Rückgabe enthält widersprüchliche Referenzen oder ein falsches Manifest.');
  }
  const capabilities = assertTransferCapabilities(parsed.capabilities);
  if (!capabilities.writeFormats.includes(5) || !capabilities.features.includes('return_scope_v5')) {
    throw new Error('Rückgabeabsender bietet Format 5 nicht an.');
  }
  return { format: 'gremia-sbv-case-handover', version: 5, packageType: 'return_delta',
    packageId: parsed.packageId as string, sourcePackageId: parsed.sourcePackageId,
    createdAt: parsed.createdAt as string, expiresAt: parsed.expiresAt as string,
    origin: parsed.origin as VacationV5ReturnPayload['origin'], target: parsed.target as VacationV5ReturnPayload['target'],
    capabilities, sections, references: parsed.references as VacationV5ReturnPayload['references'], manifest, changes };
}
