import { createHmac, hkdfSync, randomUUID, timingSafeEqual } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type {
  CreatePersonalDataAuditInput,
  PersonalDataAuditChainStatus,
  PersonalDataAuditRecord
} from '../src/domain/models/audit.model.js';
import {
  computeAuditEntryHash,
  normalizeAuditMetadata,
  sanitizeAuditActor,
  sanitizeAuditPurpose,
  PERSONAL_DATA_AUDIT_GENESIS_HASH,
  verifyAuditHashChain,
  type AuditChainRowInput
} from './auditHashChain.js';
import { ensurePersonalDataAuditRuntimeSchema } from './runtimeSchemaCompatibility.js';

/** SQLite row at the persistence boundary. Values remain scalar and must be
 * normalized by the service mapper before entering the domain model. */
type DatabaseScalar = string;
type DatabaseRow = Record<string, DatabaseScalar> & { action: PersonalDataAuditRecord['action']; };

interface AuditIntegrityContext { key: Buffer; legacyMaxSequence: number; anchorSequence?: number; anchorHash?: string }
const auditIntegrityKeys = new WeakMap<DatabaseAdapter, AuditIntegrityContext>();

export function registerAuditIntegrityKey(database: DatabaseAdapter, databaseKey: Buffer, legacyMaxSequence: number, anchor?: { sequence: number; entryHash: string }): void {
  if (databaseKey.length !== 32 || !Number.isSafeInteger(legacyMaxSequence) || legacyMaxSequence < 0) {
    throw new Error('Ungültige Audit-Integritätskonfiguration.');
  }
  releaseAuditIntegrityKey(database);
  const key = Buffer.from(hkdfSync('sha256', databaseKey, Buffer.alloc(0), 'gremia-sbv-audit-entry-mac-v1', 32));
  auditIntegrityKeys.set(database, { key, legacyMaxSequence, anchorSequence: anchor?.sequence, anchorHash: anchor?.entryHash });
}

export function setAuditIntegrityCheckpoint(database: DatabaseAdapter, sequence: number, entryHash: string): void {
  const context = auditIntegrityKeys.get(database);
  if (!context) throw new Error('Audit-Integritätsschlüssel fehlt.');
  context.anchorSequence = sequence;
  context.anchorHash = entryHash;
}

export function releaseAuditIntegrityKey(database: DatabaseAdapter): void {
  const context = auditIntegrityKeys.get(database);
  context?.key.fill(0);
  auditIntegrityKeys.delete(database);
}

function auditEntryMac(key: Buffer, id: string, sequence: number, entryHash: string): string {
  return createHmac('sha256', key).update(`${id}:${sequence}:${entryHash}`, 'utf8').digest('hex');
}

function nowIso(): string {
  return new Date().toISOString();
}

export function ensurePersonalDataAuditSchema(db: DatabaseAdapter): void {
  ensurePersonalDataAuditRuntimeSchema(db);
}

function mapAudit(row: DatabaseRow): PersonalDataAuditRecord {
  return {
    id: row.id,
    sequence: Number(row.sequence),
    occurredAt: row.occurred_at,
    actor: row.actor,
    action: row.action,
    subjectType: row.subject_type,
    subjectId: row.subject_id ?? undefined,
    caseId: row.case_id ?? undefined,
    purpose: row.purpose,
    metadataJson: row.metadata_json,
    previousHash: row.previous_hash,
    entryHash: row.entry_hash
  };
}

function mapChainRow(row: DatabaseRow): AuditChainRowInput {
  return {
    id: row.id,
    sequence: Number(row.sequence),
    occurredAt: row.occurred_at,
    actor: row.actor,
    action: row.action,
    subjectType: row.subject_type,
    subjectId: row.subject_id ?? null,
    caseId: row.case_id ?? null,
    purpose: row.purpose,
    metadataJson: row.metadata_json,
    previousHash: row.previous_hash,
    entryHash: row.entry_hash,
    entryMac: row.entry_mac ?? null
  };
}

export class PersonalDataAuditLogService {
  constructor(private readonly database: DatabaseAdapter, private readonly actor = 'local-sbv-user') {}

  append(input: CreatePersonalDataAuditInput): PersonalDataAuditRecord {
    const previous = this.database.prepare<DatabaseRow>('SELECT sequence, entry_hash FROM personal_data_audit_log ORDER BY sequence DESC LIMIT 1').get();
    const sequence = Number(previous?.sequence ?? 0) + 1;
    const previousHash = previous?.entry_hash ?? PERSONAL_DATA_AUDIT_GENESIS_HASH;
    const occurredAt = nowIso();
    const metadataJson = normalizeAuditMetadata(input.metadata, input.subjectType);
    const id = randomUUID();
    const actor = sanitizeAuditActor(input.actor ?? this.actor);
    const purpose = sanitizeAuditPurpose(input.purpose);
    const entryHash = computeAuditEntryHash({
      sequence,
      occurredAt,
      actor,
      action: input.action,
      subjectType: input.subjectType,
      subjectId: input.subjectId ?? null,
      caseId: input.caseId ?? null,
      purpose,
      metadataJson,
      previousHash
    });

    const context = auditIntegrityKeys.get(this.database);
    const entryMac = context ? auditEntryMac(context.key, id, sequence, entryHash) : null;

    const columns = 'id, sequence, occurred_at, actor, action, subject_type, subject_id, case_id, purpose, metadata_json, previous_hash, entry_hash';
    const values = [
      id,
      sequence,
      occurredAt,
      actor,
      input.action,
      input.subjectType,
      input.subjectId ?? null,
      input.caseId ?? null,
      purpose,
      metadataJson,
      previousHash,
      entryHash
    ];
    this.database.prepare(`INSERT INTO personal_data_audit_log (${columns}${context ? ', entry_mac' : ''}) VALUES (${values.map(() => '?').join(', ')}${context ? ', ?' : ''})`)
      .run(...values, ...(context ? [entryMac] : []));

    const created = this.database.prepare<DatabaseRow>('SELECT * FROM personal_data_audit_log WHERE id = ?').get(id);
    if (created) return mapAudit(created);

    // Einige schlanke Test-/Diagnose-Adapter bilden INSERTs nach, geben aber
    // keine anschließend selektierbare Zeile zurück. Für den produktiven
    // SQLCipher-/SQLite-Adapter bleibt der SELECT der maßgebliche Pfad; für
    // diese Adapter liefern wir denselben Datensatz aus den gerade berechneten
    // Werten zurück, statt beim Auditieren Fachservices mit einem TypeError zu
    // stören.
    return {
      id,
      sequence,
      occurredAt,
      actor,
      action: input.action,
      subjectType: input.subjectType,
      subjectId: input.subjectId ?? undefined,
      caseId: input.caseId ?? undefined,
      purpose,
      metadataJson,
      previousHash,
      entryHash
    };
  }

  list(limit = 500): PersonalDataAuditRecord[] {
    const safeLimit = Math.min(Math.max(limit, 1), 5000);
    return this.database.prepare<DatabaseRow>('SELECT * FROM personal_data_audit_log ORDER BY sequence DESC LIMIT ?').all(safeLimit).map(mapAudit);
  }

  listForSubject(subjectType: string, subjectId?: string, limit = 500): PersonalDataAuditRecord[] {
    const safeLimit = Math.min(Math.max(limit, 1), 5000);
    if (subjectId) {
      return this.database.prepare<DatabaseRow>(`
        SELECT * FROM personal_data_audit_log
        WHERE subject_type = ? AND subject_id = ?
        ORDER BY sequence DESC
        LIMIT ?
      `).all(subjectType, subjectId, safeLimit).map(mapAudit);
    }
    return this.database.prepare<DatabaseRow>(`
      SELECT * FROM personal_data_audit_log
      WHERE subject_type = ?
      ORDER BY sequence DESC
      LIMIT ?
    `).all(subjectType, safeLimit).map(mapAudit);
  }

  listForCase(caseId: string, limit = 500): PersonalDataAuditRecord[] {
    const safeLimit = Math.min(Math.max(limit, 1), 5000);
    return this.database.prepare<DatabaseRow>(`
      SELECT * FROM personal_data_audit_log
      WHERE case_id = ?
      ORDER BY sequence DESC
      LIMIT ?
    `).all(caseId, safeLimit).map(mapAudit);
  }

  verifyChain(rows?: AuditChainRowInput[]): PersonalDataAuditChainStatus {
    const auditRows = rows ?? this.database.prepare<DatabaseRow>('SELECT * FROM personal_data_audit_log ORDER BY sequence ASC').all().map(mapChainRow);
    const context = auditIntegrityKeys.get(this.database);
    const status = verifyAuditHashChain(auditRows, context?.legacyMaxSequence);
    if (context) {
      if (context.anchorSequence !== undefined) {
        const anchorRow = context.anchorSequence === 0 ? undefined : auditRows[context.anchorSequence - 1];
        const actualHash = anchorRow?.entryHash ?? (context.anchorSequence === 0 ? PERSONAL_DATA_AUDIT_GENESIS_HASH : undefined);
        if (actualHash !== context.anchorHash || (context.anchorSequence ?? 0) > auditRows.length) {
          status.issues.push({ kind: 'anchor_mismatch', sequence: context.anchorSequence, message: 'Audit-Kettenkopf stimmt nicht mit dem geschützten Vertrauensanker überein.' });
        }
      }
      for (const row of auditRows) {
        if (row.sequence <= context.legacyMaxSequence && !row.entryMac) continue;
        const expected = auditEntryMac(context.key, row.id ?? '', row.sequence, row.entryHash);
        const actual = row.entryMac ?? '';
        if (!/^[a-f0-9]{64}$/i.test(actual) || !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'))) {
          status.issues.push({ kind: 'entry_mac_mismatch', sequence: row.sequence, message: `Audit-Prüfwert bei Sequenz ${row.sequence} stimmt nicht.` });
        }
      }
      status.ok = status.issues.length === 0;
      status.firstBrokenSequence = status.issues[0]?.sequence;
    }
    return status;
  }

  integritySummary(): PersonalDataAuditChainStatus & { readEvents: number; changeEvents: number; exportEvents: number } {
    const status = this.verifyChain();
    const readEvents = Number(this.database.prepare<DatabaseRow>(`SELECT COUNT(*) AS value FROM personal_data_audit_log WHERE action IN ('read', 'search', 'open')`).get()?.value ?? 0);
    const changeEvents = Number(this.database.prepare<DatabaseRow>(`SELECT COUNT(*) AS value FROM personal_data_audit_log WHERE action IN ('create', 'update', 'delete', 'anonymize', 'restore', 'import')`).get()?.value ?? 0);
    const exportEvents = Number(this.database.prepare<DatabaseRow>(`SELECT COUNT(*) AS value FROM personal_data_audit_log WHERE action IN ('export', 'backup')`).get()?.value ?? 0);
    return { ...status, readEvents, changeEvents, exportEvents };
  }
}
