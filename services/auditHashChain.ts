import { createHash } from 'node:crypto';

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
}

export type AuditChainIssueKind =
  | 'sequence_gap'
  | 'previous_hash_mismatch'
  | 'entry_hash_mismatch'
  | 'invalid_sequence'
  | 'invalid_hash';

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

export function normalizeAuditMetadata(metadata?: Record<string, unknown>): string {
  return stableStringify(metadata ?? {});
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

export function verifyAuditHashChain(rows: AuditChainRowInput[]): AuditChainVerificationResult {
  let previousHash = PERSONAL_DATA_AUDIT_GENESIS_HASH;
  let expectedSequence = 1;
  let latestHash = PERSONAL_DATA_AUDIT_GENESIS_HASH;
  const issues: AuditChainIssue[] = [];

  for (const row of rows) {
    const sequence = Number(row.sequence);
    if (!Number.isInteger(sequence) || sequence < 1) {
      issues.push({ kind: 'invalid_sequence', sequence, message: `Ungültige Audit-Sequenz: ${row.sequence}.` });
    }
    if (sequence !== expectedSequence) {
      issues.push({
        kind: 'sequence_gap',
        sequence,
        expected: String(expectedSequence),
        actual: String(sequence),
        message: `Audit-Log-Sequenz ist nicht lückenlos: erwartet ${expectedSequence}, gefunden ${sequence}.`
      });
      expectedSequence = sequence;
    }
    if (!isHexSha256(row.previousHash)) {
      issues.push({ kind: 'invalid_hash', sequence, actual: row.previousHash, message: 'Previous-Hash ist kein gültiger SHA-256-Hexwert.' });
    }
    if (!isHexSha256(row.entryHash)) {
      issues.push({ kind: 'invalid_hash', sequence, actual: row.entryHash, message: 'Entry-Hash ist kein gültiger SHA-256-Hexwert.' });
    }
    if (row.previousHash !== previousHash) {
      issues.push({
        kind: 'previous_hash_mismatch',
        sequence,
        expected: previousHash,
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
    const legacyExpectedHash = computeLegacyAuditEntryHash(hashInput);
    if (row.entryHash !== expectedHash && row.entryHash !== legacyExpectedHash) {
      issues.push({
        kind: 'entry_hash_mismatch',
        sequence,
        expected: expectedHash,
        actual: row.entryHash,
        message: `Audit-Eintrag ${sequence} wurde rechnerisch verändert oder ist beschädigt.`
      });
    }
    previousHash = row.entryHash;
    latestHash = row.entryHash;
    expectedSequence += 1;
  }

  return {
    ok: issues.length === 0,
    checked: rows.length,
    firstSequence: rows.length ? Number(rows[0].sequence) : undefined,
    lastSequence: rows.length ? Number(rows[rows.length - 1].sequence) : undefined,
    firstBrokenSequence: issues[0]?.sequence,
    latestHash,
    algorithm: PERSONAL_DATA_AUDIT_HASH_ALGORITHM,
    chainVersion: PERSONAL_DATA_AUDIT_CHAIN_VERSION,
    issues
  };
}
