import { describe, expect, it } from 'vitest';
import {
  PERSONAL_DATA_AUDIT_GENESIS_HASH,
  buildAuditChainPayload,
  computeAuditEntryHash,
  computeLegacyAuditEntryHash,
  normalizeAuditMetadata,
  sanitizeAuditActor,
  sanitizeAuditPurpose,
  stableStringify,
  verifyAuditHashChain,
  type AuditChainPayloadInput,
  type AuditChainRowInput,
} from '../services/auditHashChain';

function payload(sequence: number, previousHash: string, patch: Partial<AuditChainPayloadInput> = {}): AuditChainPayloadInput {
  return {
    sequence,
    occurredAt: '2026-06-01T10:00:00.000Z',
    actor: 'local-sbv-user',
    action: 'create',
    subjectType: 'case_note',
    subjectId: 'note-1',
    caseId: 'case-1',
    purpose: 'SBV-Datenschutzereignis',
    metadataJson: normalizeAuditMetadata({ action: 'create', status: 'ok' }),
    previousHash,
    ...patch,
  };
}

function row(input: AuditChainPayloadInput, legacy = false): AuditChainRowInput {
  return {
    ...input,
    entryHash: legacy ? computeLegacyAuditEntryHash(input) : computeAuditEntryHash(input),
  };
}

describe('audit hash chain branch coverage 0.9.2', () => {
  it('serialisiert stabil und normalisiert sichere Audit-Metadaten datensparsam', () => {
    expect(stableStringify({ b: 2, a: [new Date('2026-01-01T00:00:00.000Z'), undefined, null] })).toBe('{"a":[{},null,null],"b":2}');
    expect(sanitizeAuditPurpose(' Max Mustermann ')).toBe('SBV-Datenschutzereignis');
    expect(sanitizeAuditPurpose('')).toBe('SBV-Datenschutzereignis');
    expect(sanitizeAuditPurpose('Technische Prüfung')).toBe('SBV-Datenschutzereignis');
    expect(sanitizeAuditPurpose('system_check')).toBe('system_check');
    expect(sanitizeAuditActor('pers-12345')).toBe('local-sbv-user');
    expect(sanitizeAuditActor('sbv-local')).toBe('sbv-local');

    const metadata = normalizeAuditMetadata({
      status: 'ok',
      timestamp: new Date('2026-06-01T12:00:00.000Z'),
      caseCount: 2,
      authorityNotificationChecked: true,
      ignored: 'wird nicht gespeichert',
      purpose: 'Ada Lovelace',
      endpoint: 'GET /sitzungen/kommende',
      reasonCode: 'transfer-import',
    });
    expect(metadata).toContain('caseCount');
    expect(metadata).toContain('true');
    expect(metadata).toContain('GET /sitzungen/kommende');
    expect(metadata).not.toContain('Ada Lovelace');
    expect(metadata).not.toContain('ignored');
  });

  it('bestaetigt leere, aktuelle und Legacy-kompatible Hash-Ketten', () => {
    const empty = verifyAuditHashChain([]);
    expect(empty.ok).toBe(true);
    expect(empty.checked).toBe(0);
    expect(empty.latestHash).toBe(PERSONAL_DATA_AUDIT_GENESIS_HASH);

    const first = row(payload(1, PERSONAL_DATA_AUDIT_GENESIS_HASH));
    const secondInput = payload(2, first.entryHash, { subjectId: null, caseId: null });
    const second = row(secondInput, true);
    const result = verifyAuditHashChain([first, second]);

    expect(result.ok).toBe(true);
    expect(result.checked).toBe(2);
    expect(result.firstSequence).toBe(1);
    expect(result.lastSequence).toBe(2);
    expect(result.latestHash).toBe(second.entryHash);
    expect(buildAuditChainPayload(secondInput)).toContain('chainVersion');
  });

  it('meldet Sequenz-, Hash- und Verkettungsfehler in einem Lauf', () => {
    const first = row(payload(1, PERSONAL_DATA_AUDIT_GENESIS_HASH));
    const broken: AuditChainRowInput = {
      ...payload(3, 'kein-sha256'),
      entryHash: 'auch-kein-sha256',
    };
    const tampered = row(payload(4, first.entryHash, { action: 'update' }));
    const changedAfterHash = { ...tampered, action: 'delete' };

    const result = verifyAuditHashChain([first, broken, changedAfterHash]);
    const kinds = result.issues.map((issue) => issue.kind);

    expect(result.ok).toBe(false);
    expect(result.firstBrokenSequence).toBe(3);
    expect(kinds).toContain('sequence_gap');
    expect(kinds).toContain('invalid_hash');
    expect(kinds).toContain('previous_hash_mismatch');
    expect(kinds).toContain('entry_hash_mismatch');
  });

  it('meldet ungueltige Sequenzen separat', () => {
    const invalidSequence = row(payload(0, PERSONAL_DATA_AUDIT_GENESIS_HASH));
    const result = verifyAuditHashChain([invalidSequence]);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.kind === 'invalid_sequence')).toBe(true);
  });
});
