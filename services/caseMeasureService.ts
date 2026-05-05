import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import type {
  CaseMeasureCreatedFrom,
  CaseMeasureRecord,
  CaseMeasureRiskLevel,
  CaseMeasureStatus,
  CaseMeasureType,
  CreateCaseMeasureInput,
  UpdateCaseMeasureInput
} from '../src/app/core/models/case-measure.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

function boolToInt(value: boolean | undefined, fallback = false): number {
  return value ?? fallback ? 1 : 0;
}

function mapMeasure(row: any): CaseMeasureRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    type: row.type,
    title: row.title,
    status: row.status,
    riskLevel: row.risk_level,
    createdFrom: row.created_from,
    summary: row.summary ?? undefined,
    nextStep: row.next_step ?? undefined,
    dueAt: row.due_at ?? undefined,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? undefined,
    requiresFollowUp: Boolean(row.requires_follow_up),
    sourceId: row.source_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class CaseMeasureService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_measures (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        risk_level TEXT NOT NULL DEFAULT 'normal',
        created_from TEXT NOT NULL DEFAULT 'manual',
        summary TEXT,
        next_step TEXT,
        due_at TEXT,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        requires_follow_up INTEGER NOT NULL DEFAULT 0,
        source_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_case_measures_case ON case_measures(case_id, type, status);
      CREATE INDEX IF NOT EXISTS idx_case_measures_type_status ON case_measures(type, status);
      CREATE INDEX IF NOT EXISTS idx_case_measures_due ON case_measures(due_at);
      CREATE INDEX IF NOT EXISTS idx_case_measures_source ON case_measures(source_id);
    `);
    new PersonalDataAuditLogService(this.db);
  }

  private audit(action: Parameters<PersonalDataAuditLogService['append']>[0]['action'], subjectId: string | undefined, caseId: string | undefined, purpose: string): void {
    try {
      new PersonalDataAuditLogService(this.db).append({ action, subjectType: 'case_measure', subjectId, caseId, purpose });
    } catch (error) {
      console.warn('Gremia.SBV case measure audit write failed', error);
    }
  }

  list(caseId?: string): CaseMeasureRecord[] {
    this.audit('read', undefined, caseId, caseId ? 'Fallmaßnahmen einer Fallakte anzeigen' : 'Fallmaßnahmen-Cockpit anzeigen');
    const rows = caseId
      ? this.db.prepare<any>('SELECT * FROM case_measures WHERE case_id = ? ORDER BY COALESCE(due_at, updated_at) DESC').all(caseId)
      : this.db.prepare<any>('SELECT * FROM case_measures ORDER BY COALESCE(due_at, updated_at) DESC').all();
    return rows.map(mapMeasure);
  }

  listByType(type: CaseMeasureType, caseId?: string): CaseMeasureRecord[] {
    const rows = caseId
      ? this.db.prepare<any>('SELECT * FROM case_measures WHERE type = ? AND case_id = ? ORDER BY COALESCE(due_at, updated_at) DESC').all(type, caseId)
      : this.db.prepare<any>('SELECT * FROM case_measures WHERE type = ? ORDER BY COALESCE(due_at, updated_at) DESC').all(type);
    return rows.map(mapMeasure);
  }

  getById(id: string): CaseMeasureRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM case_measures WHERE id = ?').get(id);
    return row ? mapMeasure(row) : undefined;
  }

  findBySource(sourceId: string): CaseMeasureRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM case_measures WHERE source_id = ?').get(sourceId);
    return row ? mapMeasure(row) : undefined;
  }

  create(input: CreateCaseMeasureInput): CaseMeasureRecord {
    if (!input.caseId) throw new Error('Eine Fallmaßnahme benötigt eine Fallakte.');
    if (!input.title?.trim()) throw new Error('Eine Fallmaßnahme benötigt einen Titel.');
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO case_measures (
        id, case_id, type, title, status, risk_level, created_from, summary, next_step, due_at,
        opened_at, closed_at, requires_follow_up, source_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.caseId,
      input.type,
      input.title.trim(),
      input.status ?? 'open',
      input.riskLevel ?? 'normal',
      input.createdFrom ?? 'manual',
      input.summary ?? null,
      input.nextStep ?? null,
      toIso(input.dueAt),
      toIso(input.openedAt) ?? timestamp,
      null,
      boolToInt(input.requiresFollowUp),
      input.sourceId ?? null,
      timestamp,
      timestamp
    );
    this.audit('create', id, input.caseId, `Fallmaßnahme angelegt (${input.type})`);
    return this.getById(id)!;
  }

  update(id: string, input: UpdateCaseMeasureInput): CaseMeasureRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Fallmaßnahme nicht gefunden: ${id}`);
    this.db.prepare(`
      UPDATE case_measures
      SET title = ?, status = ?, risk_level = ?, summary = ?, next_step = ?, due_at = ?, closed_at = ?, requires_follow_up = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.title !== undefined ? input.title.trim() : existing.title,
      input.status ?? existing.status,
      input.riskLevel ?? existing.riskLevel,
      input.summary !== undefined ? input.summary : existing.summary ?? null,
      input.nextStep !== undefined ? input.nextStep : existing.nextStep ?? null,
      input.dueAt !== undefined ? toIso(input.dueAt) : existing.dueAt ?? null,
      input.closedAt !== undefined ? toIso(input.closedAt) : existing.closedAt ?? null,
      input.requiresFollowUp !== undefined ? boolToInt(input.requiresFollowUp) : boolToInt(existing.requiresFollowUp),
      nowIso(),
      id
    );
    this.audit('update', id, existing.caseId, 'Fallmaßnahme geändert');
    return this.getById(id)!;
  }
}
