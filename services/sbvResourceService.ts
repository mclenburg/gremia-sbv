import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditResourceRecordChanged } from './auditEventBuilders.js';
import type {
  CreateSbvResourceRecordInput,
  SbvResourceDashboardSummary,
  SbvResourceRecord,
  SbvResourceRecordKind,
  SbvResourceRecordStatus,
  UpdateSbvResourceRecordInput,
} from '../src/app/core/models/sbv-resource.model.js';

const DEFAULT_LEGAL_BASIS: Record<SbvResourceRecordKind, string> = {
  training: '§ 179 Abs. 4 Satz 3 SGB IX',
  deputy_involvement: '§ 178 Abs. 1 Satz 4 SGB IX, § 179 Abs. 4 SGB IX',
  equipment: '§ 179 Abs. 8 SGB IX',
  other: '§ 179 SGB IX',
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeStatus(value: unknown): SbvResourceRecordStatus {
  const allowed: SbvResourceRecordStatus[] = ['planned', 'requested', 'approved', 'completed', 'rejected', 'documented'];
  return allowed.includes(value as SbvResourceRecordStatus) ? value as SbvResourceRecordStatus : 'documented';
}

function normalizeKind(value: unknown): SbvResourceRecordKind {
  const allowed: SbvResourceRecordKind[] = ['training', 'deputy_involvement', 'equipment', 'other'];
  return allowed.includes(value as SbvResourceRecordKind) ? value as SbvResourceRecordKind : 'other';
}

function mapRecord(row: any): SbvResourceRecord {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    legalBasis: row.legal_basis,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    provider: row.provider ?? undefined,
    participants: row.participants ?? undefined,
    taskContext: row.task_context ?? undefined,
    necessityReason: row.necessity_reason ?? undefined,
    employerReaction: row.employer_reaction ?? undefined,
    costNote: row.cost_note ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SbvResourceService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_resource_records (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        legal_basis TEXT NOT NULL,
        started_at TEXT,
        ended_at TEXT,
        provider TEXT,
        participants TEXT,
        task_context TEXT,
        necessity_reason TEXT,
        employer_reaction TEXT,
        cost_note TEXT,
        status TEXT NOT NULL DEFAULT 'documented',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_resource_records_kind ON sbv_resource_records(kind);
      CREATE INDEX IF NOT EXISTS idx_sbv_resource_records_status ON sbv_resource_records(status);
      CREATE INDEX IF NOT EXISTS idx_sbv_resource_records_started ON sbv_resource_records(started_at);
    `);
    new PersonalDataAuditLogService(this.db);
  }

  private audit(action: 'read' | 'create' | 'update' | 'delete', subjectId: string | undefined, recordType?: string, status?: string): void {
    try {
      new PersonalDataAuditLogService(this.db).append(auditResourceRecordChanged({
        action,
        recordId: subjectId,
        recordType,
        status,
      }));
    } catch (error) {
      console.warn('Gremia.SBV resource audit write failed', error);
    }
  }

  list(): SbvResourceRecord[] {
    this.audit('read', undefined);
    return this.db.prepare<any>(`
      SELECT * FROM sbv_resource_records
      ORDER BY COALESCE(started_at, created_at) DESC, updated_at DESC
    `).all().map(mapRecord);
  }

  dashboardSummary(): SbvResourceDashboardSummary {
    const rows = this.list();
    return {
      total: rows.length,
      trainings: rows.filter((row) => row.kind === 'training').length,
      deputyInvolvements: rows.filter((row) => row.kind === 'deputy_involvement').length,
      openRequests: rows.filter((row) => ['planned', 'requested'].includes(row.status)).length,
      rejected: rows.filter((row) => row.status === 'rejected').length,
      completed: rows.filter((row) => ['completed', 'documented'].includes(row.status)).length,
    };
  }

  create(input: CreateSbvResourceRecordInput): SbvResourceRecord {
    const kind = normalizeKind(input.kind);
    const title = normalizeOptional(input.title);
    if (!title) throw new Error('Ein Nachweis benötigt einen Titel.');
    const timestamp = nowIso();
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO sbv_resource_records (
        id, kind, title, legal_basis, started_at, ended_at, provider, participants,
        task_context, necessity_reason, employer_reaction, cost_note, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      kind,
      title,
      normalizeOptional(input.legalBasis) ?? DEFAULT_LEGAL_BASIS[kind],
      normalizeOptional(input.startedAt),
      normalizeOptional(input.endedAt),
      normalizeOptional(input.provider),
      normalizeOptional(input.participants),
      normalizeOptional(input.taskContext),
      normalizeOptional(input.necessityReason),
      normalizeOptional(input.employerReaction),
      normalizeOptional(input.costNote),
      normalizeStatus(input.status),
      normalizeOptional(input.notes),
      timestamp,
      timestamp,
    );
    this.audit('create', id, kind, normalizeStatus(input.status));
    return this.getById(id)!;
  }

  update(id: string, input: UpdateSbvResourceRecordInput): SbvResourceRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`SBV-Ressourcennachweis nicht gefunden: ${id}`);
    const kind = input.kind ? normalizeKind(input.kind) : existing.kind;
    const title = input.title !== undefined ? normalizeOptional(input.title) : existing.title;
    if (!title) throw new Error('Ein Nachweis benötigt einen Titel.');
    const timestamp = nowIso();
    this.db.prepare(`
      UPDATE sbv_resource_records
      SET kind = ?, title = ?, legal_basis = ?, started_at = ?, ended_at = ?, provider = ?, participants = ?,
          task_context = ?, necessity_reason = ?, employer_reaction = ?, cost_note = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      kind,
      title,
      input.legalBasis !== undefined ? normalizeOptional(input.legalBasis) ?? DEFAULT_LEGAL_BASIS[kind] : existing.legalBasis,
      input.startedAt !== undefined ? normalizeOptional(input.startedAt) : existing.startedAt ?? null,
      input.endedAt !== undefined ? normalizeOptional(input.endedAt) : existing.endedAt ?? null,
      input.provider !== undefined ? normalizeOptional(input.provider) : existing.provider ?? null,
      input.participants !== undefined ? normalizeOptional(input.participants) : existing.participants ?? null,
      input.taskContext !== undefined ? normalizeOptional(input.taskContext) : existing.taskContext ?? null,
      input.necessityReason !== undefined ? normalizeOptional(input.necessityReason) : existing.necessityReason ?? null,
      input.employerReaction !== undefined ? normalizeOptional(input.employerReaction) : existing.employerReaction ?? null,
      input.costNote !== undefined ? normalizeOptional(input.costNote) : existing.costNote ?? null,
      input.status !== undefined ? normalizeStatus(input.status) : existing.status,
      input.notes !== undefined ? normalizeOptional(input.notes) : existing.notes ?? null,
      timestamp,
      id,
    );
    this.audit('update', id, kind, input.status !== undefined ? normalizeStatus(input.status) : existing.status);
    return this.getById(id)!;
  }

  delete(id: string): { deleted: boolean } {
    const result = this.db.prepare('DELETE FROM sbv_resource_records WHERE id = ?').run(id) as { changes?: number };
    const deleted = Number(result.changes ?? 0) > 0;
    if (deleted) this.audit('delete', id);
    return { deleted };
  }

  getById(id: string): SbvResourceRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM sbv_resource_records WHERE id = ?').get(id);
    return row ? mapRecord(row) : undefined;
  }
}
