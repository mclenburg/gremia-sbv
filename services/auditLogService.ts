import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type {
  CreatePersonalDataAuditInput,
  PersonalDataAuditChainStatus,
  PersonalDataAuditRecord
} from '../src/app/core/models/audit.model.js';
import {
  computeAuditEntryHash,
  normalizeAuditMetadata,
  sanitizeAuditActor,
  sanitizeAuditPurpose,
  PERSONAL_DATA_AUDIT_GENESIS_HASH,
  verifyAuditHashChain,
  type AuditChainRowInput
} from './auditHashChain.js';

function nowIso(): string {
  return new Date().toISOString();
}

export function ensurePersonalDataAuditSchema(db: DatabaseAdapter): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS personal_data_audit_log (
      id TEXT PRIMARY KEY,
      sequence INTEGER NOT NULL UNIQUE,
      occurred_at TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      subject_type TEXT NOT NULL,
      subject_id TEXT,
      case_id TEXT,
      purpose TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      previous_hash TEXT NOT NULL,
      entry_hash TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_personal_data_audit_sequence ON personal_data_audit_log(sequence);
    CREATE INDEX IF NOT EXISTS idx_personal_data_audit_case ON personal_data_audit_log(case_id, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_personal_data_audit_subject ON personal_data_audit_log(subject_type, subject_id, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_personal_data_audit_action ON personal_data_audit_log(action, occurred_at);
  `);
}

function mapAudit(row: any): PersonalDataAuditRecord {
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

function mapChainRow(row: any): AuditChainRowInput {
  return {
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
    entryHash: row.entry_hash
  };
}

export class PersonalDataAuditLogService {
  constructor(private readonly db: DatabaseAdapter, private readonly actor = 'local-sbv-user') {
    ensurePersonalDataAuditSchema(db);
  }

  append(input: CreatePersonalDataAuditInput): PersonalDataAuditRecord {
    const previous = this.db.prepare<any>('SELECT sequence, entry_hash FROM personal_data_audit_log ORDER BY sequence DESC LIMIT 1').get();
    const sequence = Number(previous?.sequence ?? 0) + 1;
    const previousHash = previous?.entry_hash ?? PERSONAL_DATA_AUDIT_GENESIS_HASH;
    const occurredAt = nowIso();
    const metadataJson = normalizeAuditMetadata(input.metadata);
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

    this.db.prepare(`
      INSERT INTO personal_data_audit_log (
        id, sequence, occurred_at, actor, action, subject_type, subject_id, case_id, purpose, metadata_json, previous_hash, entry_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    );

    const created = this.db.prepare<any>('SELECT * FROM personal_data_audit_log WHERE id = ?').get(id);
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
    return this.db.prepare<any>('SELECT * FROM personal_data_audit_log ORDER BY sequence DESC LIMIT ?').all(safeLimit).map(mapAudit);
  }

  listForSubject(subjectType: string, subjectId?: string, limit = 500): PersonalDataAuditRecord[] {
    const safeLimit = Math.min(Math.max(limit, 1), 5000);
    if (subjectId) {
      return this.db.prepare<any>(`
        SELECT * FROM personal_data_audit_log
        WHERE subject_type = ? AND subject_id = ?
        ORDER BY sequence DESC
        LIMIT ?
      `).all(subjectType, subjectId, safeLimit).map(mapAudit);
    }
    return this.db.prepare<any>(`
      SELECT * FROM personal_data_audit_log
      WHERE subject_type = ?
      ORDER BY sequence DESC
      LIMIT ?
    `).all(subjectType, safeLimit).map(mapAudit);
  }

  listForCase(caseId: string, limit = 500): PersonalDataAuditRecord[] {
    const safeLimit = Math.min(Math.max(limit, 1), 5000);
    return this.db.prepare<any>(`
      SELECT * FROM personal_data_audit_log
      WHERE case_id = ?
      ORDER BY sequence DESC
      LIMIT ?
    `).all(caseId, safeLimit).map(mapAudit);
  }

  verifyChain(): PersonalDataAuditChainStatus {
    const auditRows = this.db.prepare<any>('SELECT * FROM personal_data_audit_log ORDER BY sequence ASC').all().map(mapChainRow);
    return verifyAuditHashChain(auditRows);
  }

  integritySummary(): PersonalDataAuditChainStatus & { readEvents: number; changeEvents: number; exportEvents: number } {
    const status = this.verifyChain();
    const readEvents = Number(this.db.prepare<any>(`SELECT COUNT(*) AS value FROM personal_data_audit_log WHERE action IN ('read', 'search', 'open')`).get()?.value ?? 0);
    const changeEvents = Number(this.db.prepare<any>(`SELECT COUNT(*) AS value FROM personal_data_audit_log WHERE action IN ('create', 'update', 'delete', 'anonymize', 'restore', 'import')`).get()?.value ?? 0);
    const exportEvents = Number(this.db.prepare<any>(`SELECT COUNT(*) AS value FROM personal_data_audit_log WHERE action IN ('export', 'backup')`).get()?.value ?? 0);
    return { ...status, readEvents, changeEvents, exportEvents };
  }
}
