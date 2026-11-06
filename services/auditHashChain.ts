import { createHash } from 'node:crypto';
import { allowedAuditMetadataFields } from './auditMetadataPolicy.js';
import { isAllowedAuditPurpose } from './auditPurposePolicy.js';

export const PERSONAL_DATA_AUDIT_HASH_ALGORITHM = 'sha256' as const;
export const PERSONAL_DATA_AUDIT_CHAIN_VERSION = 1 as const;
export const PERSONAL_DATA_AUDIT_GENESIS_HASH = '0'.repeat(64);

export interface AuditChainPayloadInput {
  sequence: number;
  occurredAt: string;
  actor: string;
  action: string;
  subjectType: string;
  subjectId?: string | null;
  caseId?: string | null;
  purpose: string;
  metadataJson: string;
  previousHash: string;
}

export interface AuditChainRowInput extends AuditChainPayloadInput {
  entryHash: string;
  id?: string;
  entryMac?: string | null;
}

export type AuditChainIssueKind =
  | 'sequence_gap'
  | 'previous_hash_mismatch'
  | 'entry_hash_mismatch'
  | 'invalid_sequence'
  | 'invalid_hash'
  | 'entry_mac_mismatch'
  | 'legacy_hash_outside_boundary'
  | 'anchor_mismatch';

export interface AuditChainIssue {
  kind: AuditChainIssueKind;
  sequence: number;
  expected?: string;
  actual?: string;
  message: string;
}

export interface AuditChainVerificationResult {
  ok: boolean;
  checked: number;
  firstSequence?: number;
  lastSequence?: number;
  firstBrokenSequence?: number;
  latestHash: string;
  algorithm: typeof PERSONAL_DATA_AUDIT_HASH_ALGORITHM;
  chainVersion: typeof PERSONAL_DATA_AUDIT_CHAIN_VERSION;
  issues: AuditChainIssue[];
}

function normalizeScalar(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(normalizeScalar(value));
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}


const DIRECT_IDENTIFIER_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b(?:P|PNR|Pers(?:onal)?(?:nummer)?)[-\s]*\d{2,}\b/i,
  /\b\d{5,}\b/,
  /\b[A-ZÄÖÜ][a-zäöüß]+(?:[-\s]+[A-ZÄÖÜ][a-zäöüß]+){1,3}\b/u
];

export function sanitizeAuditPurpose(purpose: string): string {
  const normalized = purpose.trim() || 'SBV-Datenschutzereignis';
  return isAllowedAuditPurpose(normalized) ? normalized : 'SBV-Datenschutzereignis';
}

export function sanitizeAuditActor(actor: string): string {
  const normalized = actor.trim() || 'local-sbv-user';
  if (DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(normalized))) return 'local-sbv-user';
  return normalized.slice(0, 120);
}

const AUDIT_SAFE_METADATA_TEXT_PATTERN = /^[\p{Letter}\p{Number}:_.\/ -]{1,180}$/u;
const AUDIT_CORRELATION_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeAllowedAuditMetadataValue(value: unknown, key: string): string | number | boolean | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const text = value.trim();
    // UUID segments can contain long digit sequences without identifying a person.
    // Keep this exception restricted to the allowlisted technical correlation field.
    if (key === 'correlationId' && AUDIT_CORRELATION_UUID_PATTERN.test(text)) return text;
    if (DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(text))) return null;
    return AUDIT_SAFE_METADATA_TEXT_PATTERN.test(text) ? text : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
}

export function normalizeAuditMetadata(metadata?: Record<string, unknown>, subjectType?: string): string {
  const normalized: Record<string, string | number | boolean> = {};
  const allowedMetadataFields = allowedAuditMetadataFields(subjectType);
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (!allowedMetadataFields.has(key)) continue;
    const safeValue = normalizeAllowedAuditMetadataValue(value, key);
    if (safeValue !== null) normalized[key] = safeValue;
  }
  return stableStringify(normalized);
}

export function buildAuditChainPayload(input: AuditChainPayloadInput): string {
  return stableStringify({
    chainVersion: PERSONAL_DATA_AUDIT_CHAIN_VERSION,
    sequence: input.sequence,
    occurredAt: input.occurredAt,
    actor: input.actor,
    action: input.action,
    subjectType: input.subjectType,
    subjectId: input.subjectId ?? null,
    caseId: input.caseId ?? null,
    purpose: input.purpose,
    metadataJson: input.metadataJson,
    previousHash: input.previousHash
  });
}

export function computeAuditEntryHash(input: AuditChainPayloadInput): string {
  return createHash(PERSONAL_DATA_AUDIT_HASH_ALGORITHM)
    .update(buildAuditChainPayload(input), 'utf8')
    .digest('hex');
}

export function computeLegacyAuditEntryHash(input: AuditChainPayloadInput): string {
  // Kompatibilität für Audit-Einträge aus 0.8.4/0.8.4a-c: gleiche Daten, aber noch ohne chainVersion
  // und mit der damaligen JSON.stringify-Einfügereihenfolge.
  const legacyPayload = JSON.stringify({
    sequence: input.sequence,
    occurredAt: input.occurredAt,
    actor: input.actor,
    action: input.action,
    subjectType: input.subjectType,
    subjectId: input.subjectId ?? null,
    caseId: input.caseId ?? null,
    purpose: input.purpose,
    metadataJson: input.metadataJson,
    previousHash: input.previousHash
  });
  return createHash(PERSONAL_DATA_AUDIT_HASH_ALGORITHM).update(legacyPayload, 'utf8').digest('hex');
}

function isHexSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

export class AuditHashChainVerifier {
  private previousHash: string;
  private expectedSequence: number;
  private latestHash: string;
  private checked = 0;
  private firstSequence?: number;
  private lastSequence?: number;
  private readonly issues: AuditChainIssue[] = [];

  constructor(
    private readonly legacyMaxSequence = Number.POSITIVE_INFINITY,
    startSequence = 1,
    previousHash = PERSONAL_DATA_AUDIT_GENESIS_HASH,
  ) {
    this.expectedSequence = startSequence;
    this.previousHash = previousHash;
    this.latestHash = previousHash;
  }

  add(row: AuditChainRowInput): void {
    const sequence = Number(row.sequence);
    if (this.checked === 0) this.firstSequence = sequence;
    this.lastSequence = sequence;
    this.checked += 1;
    if (!Number.isInteger(sequence) || sequence < 1) {
      this.issues.push({ kind: 'invalid_sequence', sequence, message: `Ungültige Audit-Sequenz: ${row.sequence}.` });
    }
    if (sequence !== this.expectedSequence) {
      this.issues.push({
        kind: 'sequence_gap',
        sequence,
        expected: String(this.expectedSequence),
        actual: String(sequence),
        message: `Audit-Log-Sequenz ist nicht lückenlos: erwartet ${this.expectedSequence}, gefunden ${sequence}.`
      });
      this.expectedSequence = sequence;
    }
    if (!isHexSha256(row.previousHash)) {
      this.issues.push({ kind: 'invalid_hash', sequence, actual: row.previousHash, message: 'Previous-Hash ist kein gültiger SHA-256-Hexwert.' });
    }
    if (!isHexSha256(row.entryHash)) {
      this.issues.push({ kind: 'invalid_hash', sequence, actual: row.entryHash, message: 'Entry-Hash ist kein gültiger SHA-256-Hexwert.' });
    }
    if (row.previousHash !== this.previousHash) {
      this.issues.push({
        kind: 'previous_hash_mismatch',
        sequence,
        expected: this.previousHash,
        actual: row.previousHash,
        message: `Hash-Chain-Unterbrechung bei Sequenz ${sequence}: Previous-Hash passt nicht zum Vorgängereintrag.`
      });
    }
    const hashInput = {
      sequence,
      occurredAt: row.occurredAt,
      actor: row.actor,
      action: row.action,
      subjectType: row.subjectType,
      subjectId: row.subjectId ?? null,
      caseId: row.caseId ?? null,
      purpose: row.purpose,
      metadataJson: row.metadataJson,
      previousHash: row.previousHash
    };
    const expectedHash = computeAuditEntryHash(hashInput);
    if (row.entryHash !== expectedHash) {
      const legacyExpectedHash = computeLegacyAuditEntryHash(hashInput);
      if (row.entryHash === legacyExpectedHash && sequence > this.legacyMaxSequence) {
        this.issues.push({ kind: 'legacy_hash_outside_boundary', sequence, message: `Veralteter Audit-Hash nach der Migrationsgrenze bei Sequenz ${sequence}.` });
      } else if (row.entryHash !== legacyExpectedHash) {
        this.issues.push({
          kind: 'entry_hash_mismatch',
          sequence,
          expected: expectedHash,
          actual: row.entryHash,
          message: `Audit-Eintrag ${sequence} wurde rechnerisch verändert oder ist beschädigt.`
        });
      }
    }
    this.previousHash = row.entryHash;
    this.latestHash = row.entryHash;
    this.expectedSequence += 1;
  }

  result(): AuditChainVerificationResult {
    return {
      ok: this.issues.length === 0,
      checked: this.checked,
      firstSequence: this.firstSequence,
      lastSequence: this.lastSequence,
      firstBrokenSequence: this.issues[0]?.sequence,
      latestHash: this.latestHash,
      algorithm: PERSONAL_DATA_AUDIT_HASH_ALGORITHM,
      chainVersion: PERSONAL_DATA_AUDIT_CHAIN_VERSION,
      issues: this.issues,
    };
  }
}

export function verifyAuditHashChain(rows: Iterable<AuditChainRowInput>, legacyMaxSequence = Number.POSITIVE_INFINITY): AuditChainVerificationResult {
  const verifier = new AuditHashChainVerifier(legacyMaxSequence);
  for (const row of rows) verifier.add(row);
  return verifier.result();
}
