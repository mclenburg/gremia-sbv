import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { noteProcessTypeToCaseMeasureType } from '../src/app/core/models/case-measure.model.js';
import type {
  CaseMeasureCreatedFrom,
  CaseMeasureNoteProcessType,
  CaseMeasureNoteRecord,
  CaseMeasureRecord,
  CaseMeasureRiskLevel,
  CaseMeasureStatus,
  CaseMeasureType,
  CreateCaseMeasureInput,
  CreateCaseMeasureNoteInput,
  UpdateCaseMeasureInput,
  UpdateCaseMeasureNoteInput
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

const MEASURE_SOURCE_TABLES: Record<CaseMeasureNoteProcessType, { table: string; idColumn: string; caseColumn: string; typeColumn?: string; typeValue?: string }> = {
  prevention: { table: 'prevention_processes', idColumn: 'id', caseColumn: 'case_id' },
  bem: { table: 'bem_processes', idColumn: 'id', caseColumn: 'case_id' },
  termination_hearing: { table: 'termination_hearings', idColumn: 'id', caseColumn: 'case_id' },
  equalization: { table: 'equalization_processes', idColumn: 'id', caseColumn: 'case_id' },
  participation: { table: 'case_measures', idColumn: 'id', caseColumn: 'case_id', typeColumn: 'type', typeValue: noteProcessTypeToCaseMeasureType('participation') },
  workplace_accommodation: { table: 'case_measures', idColumn: 'id', caseColumn: 'case_id', typeColumn: 'type', typeValue: noteProcessTypeToCaseMeasureType('workplace_accommodation') }
};

function assertMeasureNoteType(value: CaseMeasureNoteProcessType): void {
  if (!MEASURE_SOURCE_TABLES[value]) throw new Error(`Unbekannter Maßnahmentyp: ${value}`);
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

function mapMeasureNote(row: any): CaseMeasureNoteRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    measureType: row.measure_type,
    measureId: row.measure_id,
    title: row.title,
    noteAt: row.note_at,
    participants: row.participants ?? undefined,
    content: row.content,
    nextSteps: row.next_steps ?? undefined,
    containsHealthData: Boolean(row.contains_health_data),
    confidentialLevel: row.confidential_level ?? 'sensibel',
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

      CREATE TABLE IF NOT EXISTS case_measure_notes (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        measure_type TEXT NOT NULL CHECK (measure_type IN ('prevention','bem','termination_hearing','equalization','participation','workplace_accommodation')),
        measure_id TEXT NOT NULL,
        title TEXT NOT NULL,
        note_at TEXT NOT NULL,
        participants TEXT,
        content TEXT NOT NULL,
        next_steps TEXT,
        contains_health_data INTEGER NOT NULL DEFAULT 1,
        confidential_level TEXT NOT NULL DEFAULT 'sensibel' CHECK (confidential_level IN ('normal','sensibel','hoch_sensibel')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_case_measure_notes_measure ON case_measure_notes(measure_type, measure_id, note_at DESC);
      CREATE INDEX IF NOT EXISTS idx_case_measure_notes_case ON case_measure_notes(case_id, note_at DESC);
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

  private assertMeasureBelongsToCase(type: CaseMeasureNoteProcessType, measureId: string, caseId: string): void {
    assertMeasureNoteType(type);
    const source = MEASURE_SOURCE_TABLES[type];
    const typeClause = source.typeColumn ? ` AND ${source.typeColumn} = ?` : '';
    const params = source.typeColumn ? [measureId, caseId, source.typeValue] : [measureId, caseId];
    const row = this.db.prepare<any>(`SELECT ${source.idColumn} AS id FROM ${source.table} WHERE ${source.idColumn} = ? AND ${source.caseColumn} = ?${typeClause}`).get(...params);
    if (!row) throw new Error('Die Maßnahme gehört nicht zur angegebenen Fallakte oder existiert nicht.');
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

  listNotes(caseId: string, measureType?: CaseMeasureNoteProcessType, measureId?: string): CaseMeasureNoteRecord[] {
    if (!caseId?.trim()) throw new Error('Für Maßnahmennotizen ist eine Fallakte erforderlich.');
    this.audit('read', undefined, caseId, measureId ? 'Maßnahmennotizen anzeigen' : 'Maßnahmennotizen der Fallakte anzeigen');
    const rows = measureType && measureId
      ? this.db.prepare<any>('SELECT * FROM case_measure_notes WHERE case_id = ? AND measure_type = ? AND measure_id = ? ORDER BY note_at DESC, created_at DESC').all(caseId, measureType, measureId)
      : this.db.prepare<any>('SELECT * FROM case_measure_notes WHERE case_id = ? ORDER BY note_at DESC, created_at DESC').all(caseId);
    return rows.map(mapMeasureNote);
  }

  createNote(input: CreateCaseMeasureNoteInput): CaseMeasureNoteRecord {
    if (!input.caseId?.trim()) throw new Error('Für Maßnahmennotizen ist eine Fallakte erforderlich.');
    if (!input.measureId?.trim()) throw new Error('Für Maßnahmennotizen ist eine Maßnahme erforderlich.');
    if (!input.title?.trim()) throw new Error('Bitte einen Titel für die Maßnahmennotiz erfassen.');
    if (!input.content?.trim()) throw new Error('Bitte Inhalt für die Maßnahmennotiz erfassen.');
    this.assertMeasureBelongsToCase(input.measureType, input.measureId, input.caseId);
    const id = randomUUID();
    const timestamp = nowIso();
    const noteAt = input.noteAt ? new Date(input.noteAt).toISOString() : timestamp;
    this.db.prepare(`
      INSERT INTO case_measure_notes (
        id, case_id, measure_type, measure_id, title, note_at, participants, content, next_steps,
        contains_health_data, confidential_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.caseId,
      input.measureType,
      input.measureId,
      input.title.trim(),
      noteAt,
      input.participants?.trim() || null,
      input.content.trim(),
      input.nextSteps?.trim() || null,
      boolToInt(input.containsHealthData, true),
      input.confidentialLevel ?? 'sensibel',
      timestamp,
      timestamp
    );
    this.audit('create', id, input.caseId, `Maßnahmennotiz angelegt (${input.measureType})`);
    return mapMeasureNote(this.db.prepare<any>('SELECT * FROM case_measure_notes WHERE id = ?').get(id));
  }

  updateNote(id: string, input: UpdateCaseMeasureNoteInput): CaseMeasureNoteRecord {
    const existing = this.db.prepare<any>('SELECT * FROM case_measure_notes WHERE id = ?').get(id);
    if (!existing) throw new Error(`Maßnahmennotiz nicht gefunden: ${id}`);
    const nextTitle = input.title !== undefined ? input.title.trim() : existing.title;
    const nextContent = input.content !== undefined ? input.content.trim() : existing.content;
    if (!nextTitle) throw new Error('Bitte einen Titel für die Maßnahmennotiz erfassen.');
    if (!nextContent) throw new Error('Bitte Inhalt für die Maßnahmennotiz erfassen.');
    this.db.prepare(`
      UPDATE case_measure_notes SET
        title = ?, note_at = ?, participants = ?, content = ?, next_steps = ?, contains_health_data = ?, confidential_level = ?, updated_at = ?
      WHERE id = ?
    `).run(
      nextTitle,
      input.noteAt ? new Date(input.noteAt).toISOString() : existing.note_at,
      input.participants !== undefined ? input.participants.trim() || null : existing.participants,
      nextContent,
      input.nextSteps !== undefined ? input.nextSteps.trim() || null : existing.next_steps,
      input.containsHealthData === undefined ? existing.contains_health_data : boolToInt(input.containsHealthData),
      input.confidentialLevel ?? existing.confidential_level,
      nowIso(),
      id
    );
    this.audit('update', id, existing.case_id, 'Maßnahmennotiz geändert');
    return mapMeasureNote(this.db.prepare<any>('SELECT * FROM case_measure_notes WHERE id = ?').get(id));
  }

  deleteNote(id: string): { deleted: boolean } {
    const existing = this.db.prepare<any>('SELECT * FROM case_measure_notes WHERE id = ?').get(id);
    const result = this.db.prepare<any>('DELETE FROM case_measure_notes WHERE id = ?').run(id) as { changes?: number } | undefined;
    this.audit('delete', id, existing?.case_id, 'Maßnahmennotiz gelöscht');
    return { deleted: Boolean(result?.changes) };
  }
}
