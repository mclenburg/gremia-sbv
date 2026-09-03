import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { MeasureLifecycleAuditService } from './measureLifecycleAuditService.js';
import { noteProcessTypeToCaseMeasureType } from '../src/domain/models/case-measure.model.js';
import { SearchIndexService } from './search/searchIndexService.js';
import { deleteCaseProcess } from './caseProcessDeletion.js';
import { ensureCaseMeasureRuntimeSchema } from './runtimeSchemaCompatibility.js';
import type { MeasureLifecycleCreationSource } from '../src/domain/models/measure-lifecycle.model.js';
import type {
  CaseMeasureCreatedFrom,
  CaseMeasureNoteProcessType,
  CaseMeasureNoteRecord,
  CaseMeasureRecord,
  CaseMeasureRiskLevel,
  CaseMeasureStatus,
  CaseMeasureType,
  CreateCaseMeasureInput,
  DeleteCaseProcessInput,
  DeleteCaseProcessResult,
  CreateCaseMeasureNoteInput,
  UpdateCaseMeasureInput,
  UpdateCaseMeasureNoteInput
} from '../src/domain/models/case-measure.model.js';

/** SQLite row at the persistence boundary. Values remain scalar and must be
 * normalized by the service mapper before entering the domain model. */
type DatabaseScalar = string;
type DatabaseRow = Record<string, DatabaseScalar> & {
  handover_status: CaseMeasureRecord['handoverStatus'];
  type: CaseMeasureRecord['type'];
  status: CaseMeasureRecord['status'];
  risk_level: CaseMeasureRecord['riskLevel'];
  created_from: CaseMeasureRecord['createdFrom'];
  measure_type: CaseMeasureNoteRecord['measureType'];
  sensitivity: 'normal' | 'sensibel' | 'hoch_sensibel';
  confidential_level: CaseMeasureNoteRecord['confidentialLevel'];
};

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}


function lifecycleCreationSource(value: CaseMeasureCreatedFrom | undefined): MeasureLifecycleCreationSource {
  if (value === 'inline_command' || value === 'import' || value === 'manual') return value;
  if (value === 'migration') return 'migration_baseline';
  return 'manual';
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

function effectiveHandoverStatus(row: DatabaseRow): CaseMeasureRecord['handoverStatus'] {
  const status = row.handover_status ?? 'none';
  if (status === 'active' && row.handover_valid_until) {
    const validUntil = new Date(row.handover_valid_until);
    if (Number.isFinite(validUntil.getTime()) && validUntil.getTime() < Date.now()) return 'expired';
  }
  return status;
}

function mapMeasure(row: DatabaseRow): CaseMeasureRecord {
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
    updatedAt: row.updated_at,
    handoverImportId: row.handover_import_id ?? undefined,
    handoverPackageId: row.handover_package_id ?? undefined,
    handoverValidUntil: row.handover_valid_until ?? undefined,
    handoverStatus: effectiveHandoverStatus(row),
    handoverContinueConfirmedAt: row.handover_continue_confirmed_at ?? undefined,
    handoverContinueReason: row.handover_continue_reason ?? undefined
  };
}

function mapMeasureNote(row: DatabaseRow | undefined): CaseMeasureNoteRecord {
  if (!row) throw new Error('Maßnahmennotiz wurde nicht gefunden.');
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
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly auditLog: PersonalDataAuditLogService = new PersonalDataAuditLogService(database),
    private readonly lifecycleAudit: MeasureLifecycleAuditService = new MeasureLifecycleAuditService(database, auditLog),
    private readonly searchIndex: SearchIndexService = new SearchIndexService(database),
  ) {}

  ensureSchema(): void {
    ensureCaseMeasureRuntimeSchema(this.database);
  }

  private audit(action: Parameters<PersonalDataAuditLogService['append']>[0]['action'], subjectId: string | undefined, caseId: string | undefined, purpose: string, subjectType = 'case_measure'): void {
    try {
      this.auditLog.append({ action, subjectType, subjectId, caseId, purpose });
    } catch (error) {
      console.warn('Gremia.SBV case measure audit write failed', error instanceof Error ? error.name : 'UnknownError');
    }
  }

  private assertMeasureBelongsToCase(type: CaseMeasureNoteProcessType, measureId: string, caseId: string): void {
    assertMeasureNoteType(type);
    const source = MEASURE_SOURCE_TABLES[type];
    const typeClause = source.typeColumn ? ` AND ${source.typeColumn} = ?` : '';
    const params = source.typeColumn ? [measureId, caseId, source.typeValue] : [measureId, caseId];
    const row = this.database.prepare<DatabaseRow>(`SELECT ${source.idColumn} AS id FROM ${source.table} WHERE ${source.idColumn} = ? AND ${source.caseColumn} = ?${typeClause}`).get(...params);
    if (!row) throw new Error('Die Maßnahme gehört nicht zur angegebenen Fallakte oder existiert nicht.');
  }

  list(caseId?: string): CaseMeasureRecord[] {
    this.audit('read', undefined, caseId, caseId ? 'Fallmaßnahmen einer Fallakte anzeigen' : 'Fallmaßnahmen-Cockpit anzeigen');
    const rows = caseId
      ? this.database.prepare<DatabaseRow>('SELECT * FROM case_measures WHERE case_id = ? ORDER BY COALESCE(due_at, updated_at) DESC').all(caseId)
      : this.database.prepare<DatabaseRow>('SELECT * FROM case_measures ORDER BY COALESCE(due_at, updated_at) DESC').all();
    return rows.map(mapMeasure);
  }

  listByType(type: CaseMeasureType, caseId?: string): CaseMeasureRecord[] {
    const rows = caseId
      ? this.database.prepare<DatabaseRow>('SELECT * FROM case_measures WHERE type = ? AND case_id = ? ORDER BY COALESCE(due_at, updated_at) DESC').all(type, caseId)
      : this.database.prepare<DatabaseRow>('SELECT * FROM case_measures WHERE type = ? ORDER BY COALESCE(due_at, updated_at) DESC').all(type);
    return rows.map(mapMeasure);
  }

  getById(id: string): CaseMeasureRecord | undefined {
    const row = this.database.prepare<DatabaseRow>('SELECT * FROM case_measures WHERE id = ?').get(id);
    return row ? mapMeasure(row) : undefined;
  }

  findBySource(sourceId: string): CaseMeasureRecord | undefined {
    const row = this.database.prepare<DatabaseRow>('SELECT * FROM case_measures WHERE source_id = ?').get(sourceId);
    return row ? mapMeasure(row) : undefined;
  }

  create(input: CreateCaseMeasureInput): CaseMeasureRecord {
    if (!input.caseId) throw new Error('Eine Fallmaßnahme benötigt eine Fallakte.');
    if (!input.title?.trim()) throw new Error('Eine Fallmaßnahme benötigt einen Titel.');
    const id = randomUUID();
    const timestamp = nowIso();
    new DatabaseUnitOfWork(this.database).run(() => {
      this.database.prepare(`
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
      this.lifecycleAudit.created(input.type, id, input.caseId, input.status ?? 'open', lifecycleCreationSource(input.createdFrom));
      this.auditLog.append({ action: 'create', subjectType: 'case_measure', subjectId: id, caseId: input.caseId, purpose: `Fallmaßnahme angelegt (${input.type})` });
    });
    this.searchIndex.reindexSource('measure', id);
    return this.getById(id)!;
  }

  update(id: string, input: UpdateCaseMeasureInput): CaseMeasureRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Fallmaßnahme nicht gefunden: ${id}`);
    new DatabaseUnitOfWork(this.database).run(() => {
      this.database.prepare(`
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
      this.lifecycleAudit.statusChanged(existing.type, id, existing.caseId, existing.status, input.status ?? existing.status);
      this.auditLog.append({ action: 'update', subjectType: 'case_measure', subjectId: id, caseId: existing.caseId, purpose: 'Fallmaßnahme geändert' });
    });
    this.searchIndex.reindexSource('measure', id);
    return this.getById(id)!;
  }

  delete(id: string): void {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Fallmaßnahme nicht gefunden: ${id}`);
    new DatabaseUnitOfWork(this.database).run(() => {
      this.lifecycleAudit.deleted(existing.type, id, existing.caseId, existing.status, 'single_measure');
      this.database.prepare('DELETE FROM case_measures WHERE id = ?').run(id);
      this.auditLog.append({ action: 'delete', subjectType: 'case_measure', subjectId: id, caseId: existing.caseId, purpose: 'Fallmaßnahme gelöscht' });
    });
    this.searchIndex.deleteSource('measure', id);
  }

  deleteProcess(input: DeleteCaseProcessInput): DeleteCaseProcessResult {
    return deleteCaseProcess(this.database, this.auditLog, this.lifecycleAudit, this.searchIndex, input);
  }

  listNotes(caseId: string, measureType?: CaseMeasureNoteProcessType, measureId?: string): CaseMeasureNoteRecord[] {
    if (!caseId?.trim()) throw new Error('Für Maßnahmennotizen ist eine Fallakte erforderlich.');
    this.audit('read', undefined, caseId, measureId ? 'Maßnahmennotizen anzeigen' : 'Maßnahmennotizen der Fallakte anzeigen');
    const rows = measureType && measureId
      ? this.database.prepare<DatabaseRow>('SELECT * FROM case_measure_notes WHERE case_id = ? AND measure_type = ? AND measure_id = ? ORDER BY note_at DESC, created_at DESC').all(caseId, measureType, measureId)
      : this.database.prepare<DatabaseRow>('SELECT * FROM case_measure_notes WHERE case_id = ? ORDER BY note_at DESC, created_at DESC').all(caseId);
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
    this.database.prepare(`
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
    this.audit('create', id, input.caseId, `Maßnahmennotiz angelegt (${input.measureType})`, 'case_measure_note');
    this.searchIndex.reindexSource('measure_note', id);
    return mapMeasureNote(this.database.prepare<DatabaseRow>('SELECT * FROM case_measure_notes WHERE id = ?').get(id));
  }

  updateNote(id: string, input: UpdateCaseMeasureNoteInput): CaseMeasureNoteRecord {
    const existing = this.database.prepare<DatabaseRow>('SELECT * FROM case_measure_notes WHERE id = ?').get(id);
    if (!existing) throw new Error(`Maßnahmennotiz nicht gefunden: ${id}`);
    const nextTitle = input.title !== undefined ? input.title.trim() : existing.title;
    const nextContent = input.content !== undefined ? input.content.trim() : existing.content;
    if (!nextTitle) throw new Error('Bitte einen Titel für die Maßnahmennotiz erfassen.');
    if (!nextContent) throw new Error('Bitte Inhalt für die Maßnahmennotiz erfassen.');
    this.database.prepare(`
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
    this.audit('update', id, existing.case_id, 'Maßnahmennotiz geändert', 'case_measure_note');
    this.searchIndex.reindexSource('measure_note', id);
    return mapMeasureNote(this.database.prepare<DatabaseRow>('SELECT * FROM case_measure_notes WHERE id = ?').get(id));
  }

  deleteNote(id: string): { deleted: boolean } {
    const existing = this.database.prepare<DatabaseRow>('SELECT * FROM case_measure_notes WHERE id = ?').get(id);
    this.searchIndex.deleteSource('measure_note', id);
    const result = this.database.prepare<DatabaseRow>('DELETE FROM case_measure_notes WHERE id = ?').run(id) as { changes?: number } | undefined;
    this.audit('delete', id, existing?.case_id, 'Maßnahmennotiz gelöscht', 'case_measure_note');
    return { deleted: Boolean(result?.changes) };
  }
}
