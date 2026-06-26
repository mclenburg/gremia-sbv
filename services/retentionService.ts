import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  RetentionDashboard,
  RetentionOperationResult,
  RetentionSettings,
  UpdateRetentionSettingsInput
} from '../src/app/core/models/retention.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import {
  DEFAULT_RETENTION_SETTINGS,
  buildRetentionDashboard,
  normalizeRetentionSettings,
  type RetentionActivityJournalSnapshot,
  type RetentionCaseSnapshot,
  type RetentionContactSnapshot,
  type RetentionDeadlineSnapshot,
  type RetentionDocumentSnapshot,
  type RetentionParticipationViolationSnapshot
} from './retentionPolicy.js';
import { directCasePrivacyEntities, resolveAnonymizationValue } from './privacyEntityRegistry.js';
import { SearchIndexService } from './search/searchIndexService.js';

const CASE_ANONYMIZE_CONFIRMATION = 'FALL ANONYMISIEREN';
const CASE_DELETE_CONFIRMATION = 'FALL LÖSCHEN';

function nowIso(): string {
  return new Date().toISOString();
}

function bool(value: unknown): boolean {
  return Boolean(value);
}

function readNumberSetting(db: DatabaseAdapter, key: string, fallback: number): number {
  try {
    const row = db.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?').get(key);
    const parsed = Number(row?.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeSetting(db: DatabaseAdapter, key: string, value: number): void {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, String(value), nowIso());
}

function safeRun(db: DatabaseAdapter, sql: string, ...params: unknown[]): number {
  const result = db.prepare<any>(sql).run(...params) as { changes?: number } | undefined;
  return Number(result?.changes ?? 0);
}

function tableExists(db: DatabaseAdapter, table: string): boolean {
  return Boolean(db.prepare<any>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function getColumns(db: DatabaseAdapter, table: string): string[] {
  try {
    const rows = db.prepare<any>(`PRAGMA table_info(${table})`).all();
    return rows.map((row) => String(row.name));
  } catch {
    return [];
  }
}

function hasColumn(db: DatabaseAdapter, table: string, column: string): boolean {
  return getColumns(db, table).includes(column);
}

function latestActivityExpression(db: DatabaseAdapter): string {
  const casesUpdated = hasColumn(db, 'cases', 'updated_at') ? 'c.updated_at' : 'c.opened_at';
  const measureNotesActivity = tableExists(db, 'case_measure_notes')
    ? 'COALESCE((SELECT MAX(mn.updated_at) FROM case_measure_notes mn WHERE mn.case_id = c.id), c.opened_at), '
    : '';
  return `MAX(COALESCE(${casesUpdated}, c.opened_at), COALESCE((SELECT MAX(n.updated_at) FROM case_notes n WHERE n.case_id = c.id), c.opened_at), COALESCE((SELECT MAX(d.created_at) FROM case_documents d WHERE d.case_id = c.id), c.opened_at), ${measureNotesActivity}COALESCE((SELECT MAX(dl.updated_at) FROM deadlines dl WHERE dl.case_id = c.id), c.opened_at))`;
}




type IndirectAnonymizationTarget = {
  table: string;
  whereSql: string;
  assignments: ReadonlyArray<readonly [string, unknown]>;
};

function anonymizeIndirectCaseSearchSources(db: DatabaseAdapter, caseId: string, stamp: string, timestamp: string): number {
  const targets: IndirectAnonymizationTarget[] = [
    {
      table: 'bem_process_events',
      whereSql: 'process_id IN (SELECT id FROM bem_processes WHERE case_id = ?)',
      assignments: [['title', '[BEM-Ereignis anonymisiert]'], ['description', stamp]],
    },
    {
      table: 'prevention_process_events',
      whereSql: 'process_id IN (SELECT id FROM prevention_processes WHERE case_id = ?)',
      assignments: [['title', '[Präventionsereignis anonymisiert]'], ['description', stamp]],
    },
    {
      table: 'sbv_participation_events',
      whereSql: 'participation_id IN (SELECT id FROM sbv_participations WHERE case_id = ?)',
      assignments: [['title', '[SBV-Beteiligungsereignis anonymisiert]'], ['description', stamp]],
    },
    {
      table: 'case_measure_participation',
      whereSql: 'measure_id IN (SELECT id FROM case_measures WHERE case_id = ?)',
      assignments: [['violation_summary', stamp], ['sbv_position', stamp]],
    },
    {
      table: 'case_measure_events',
      whereSql: 'measure_id IN (SELECT id FROM case_measures WHERE case_id = ?)',
      assignments: [['title', '[Maßnahmenereignis anonymisiert]'], ['description', stamp]],
    },
    {
      table: 'case_measure_workplace_accommodation',
      whereSql: 'measure_id IN (SELECT id FROM case_measures WHERE case_id = ?)',
      assignments: [
        ['requested_adjustment', stamp],
        ['barrier_or_limitation', null],
        ['workplace_context', null],
        ['proposed_solution', null],
        ['outcome', stamp],
      ],
    },
  ];

  let affectedRows = 0;
  for (const target of targets) {
    if (!tableExists(db, target.table)) continue;
    const assignments = target.assignments.filter(([column]) => hasColumn(db, target.table, column));
    if (!assignments.length) continue;
    const updates = assignments.map(([column]) => `${column} = ?`);
    const params = assignments.map(([, value]) => value);
    if (hasColumn(db, target.table, 'updated_at')) {
      updates.push('updated_at = ?');
      params.push(timestamp);
    }
    params.push(caseId);
    affectedRows += safeRun(db, `UPDATE ${target.table} SET ${updates.join(', ')} WHERE ${target.whereSql}`, ...params);
  }
  return affectedRows;
}

function anonymizeRegisteredCasePrivacyEntities(db: DatabaseAdapter, caseId: string, stamp: string, timestamp: string): number {
  let affectedRows = 0;
  for (const entity of directCasePrivacyEntities()) {
    if (entity.table === 'cases' || !tableExists(db, entity.table)) continue;
    const assignments = Object.entries(entity.anonymizeFields)
      .filter(([column]) => hasColumn(db, entity.table, column));
    if (!assignments.length) continue;

    const updates = assignments.map(([column]) => `${column} = ?`);
    const params = assignments.map(([, value]) => resolveAnonymizationValue(value, stamp));
    if (hasColumn(db, entity.table, 'updated_at')) {
      updates.push('updated_at = ?');
      params.push(timestamp);
    }
    params.push(caseId);
    affectedRows += safeRun(db, `UPDATE ${entity.table} SET ${updates.join(', ')} WHERE ${entity.caseColumn} = ?`, ...params);
  }
  return affectedRows;
}


type CaseDocumentFileRow = {
  id?: string;
  storage_path?: string | null;
};

type CaseDocumentFileRemovalResult = {
  affectedFiles: number;
  errors: string[];
};

function isPathInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function listFilesRecursive(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const result: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile()) {
        result.push(absolute);
      }
    }
  };
  walk(root);
  return result;
}

function removeCaseDocumentFiles(dataDir: string, caseId: string, documents: CaseDocumentFileRow[]): CaseDocumentFileRemovalResult {
  const errors: string[] = [];
  let affectedFiles = 0;
  const caseDir = path.resolve(dataDir, 'documents', caseId);
  let caseDirFiles: string[] = [];
  try {
    caseDirFiles = listFilesRecursive(caseDir);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  const externalDocumentPaths = new Set<string>();

  for (const document of documents) {
    if (!document.storage_path) continue;
    const absolute = path.resolve(document.storage_path);
    if (isPathInside(caseDir, absolute)) continue;
    externalDocumentPaths.add(absolute);
  }

  for (const absolute of externalDocumentPaths) {
    if (!fs.existsSync(absolute)) continue;
    try {
      fs.rmSync(absolute, { force: true });
      affectedFiles += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (fs.existsSync(caseDir)) {
    try {
      fs.rmSync(caseDir, { recursive: true, force: true });
      affectedFiles += caseDirFiles.length;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { affectedFiles, errors };
}

function listCleartextFiles(dataDir: string): string[] {
  const suspicious: string[] = [];
  const roots = ['documents', 'exports'];
  const allowed = new Set(['.gsbvdoc', '.gsbvpdf']);

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const relative = path.relative(dataDir, absolute).split(path.sep).join('/');
      if (!allowed.has(path.extname(entry.name).toLowerCase())) {
        suspicious.push(relative);
      }
    }
  };

  for (const root of roots) walk(path.join(dataDir, root));
  return suspicious.sort((a, b) => a.localeCompare(b, 'de-DE'));
}

export class RetentionService {
  constructor(
    private readonly dbProvider: () => DatabaseAdapter,
    private readonly dataDirProvider: () => string
  ) {}

  private get db(): DatabaseAdapter {
    const db = this.dbProvider();
    this.ensureSchema(db);
    return db;
  }

  ensureSchema(db = this.dbProvider()): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS retention_actions (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        reference TEXT,
        reason TEXT,
        affected_rows INTEGER NOT NULL DEFAULT 0,
        affected_files INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_retention_actions_created ON retention_actions(created_at DESC);
    `);
  }

  getSettings(): RetentionSettings {
    const db = this.db;
    return normalizeRetentionSettings({
      closedCaseReviewMonths: readNumberSetting(db, 'retention.closedCaseReviewMonths', DEFAULT_RETENTION_SETTINGS.closedCaseReviewMonths),
      inactiveOpenCaseMonths: readNumberSetting(db, 'retention.inactiveOpenCaseMonths', DEFAULT_RETENTION_SETTINGS.inactiveOpenCaseMonths),
      orphanContactReviewDays: readNumberSetting(db, 'retention.orphanContactReviewDays', DEFAULT_RETENTION_SETTINGS.orphanContactReviewDays),
      completedDeadlineRetentionMonths: readNumberSetting(db, 'retention.completedDeadlineRetentionMonths', DEFAULT_RETENTION_SETTINGS.completedDeadlineRetentionMonths),
      activityJournalReviewMonths: readNumberSetting(db, 'retention.activityJournalReviewMonths', DEFAULT_RETENTION_SETTINGS.activityJournalReviewMonths),
      participationViolationReviewMonths: readNumberSetting(db, 'retention.participationViolationReviewMonths', DEFAULT_RETENTION_SETTINGS.participationViolationReviewMonths),
      minimumGroupSizeForReports: readNumberSetting(db, 'retention.minimumGroupSizeForReports', DEFAULT_RETENTION_SETTINGS.minimumGroupSizeForReports)
    });
  }

  updateSettings(input: UpdateRetentionSettingsInput): RetentionSettings {
    const next = normalizeRetentionSettings({ ...this.getSettings(), ...input });
    const db = this.db;
    writeSetting(db, 'retention.closedCaseReviewMonths', next.closedCaseReviewMonths);
    writeSetting(db, 'retention.inactiveOpenCaseMonths', next.inactiveOpenCaseMonths);
    writeSetting(db, 'retention.orphanContactReviewDays', next.orphanContactReviewDays);
    writeSetting(db, 'retention.completedDeadlineRetentionMonths', next.completedDeadlineRetentionMonths);
    writeSetting(db, 'retention.activityJournalReviewMonths', next.activityJournalReviewMonths);
    writeSetting(db, 'retention.participationViolationReviewMonths', next.participationViolationReviewMonths);
    writeSetting(db, 'retention.minimumGroupSizeForReports', next.minimumGroupSizeForReports);
    return next;
  }

  buildDashboard(): RetentionDashboard {
    const db = this.db;
    const cases = this.listCaseSnapshots(db);
    const contacts = this.listContactSnapshots(db);
    const documents = this.listDocumentSnapshots(db);
    const deadlines = this.listDeadlineSnapshots(db);
    const journalEntries = this.listActivityJournalSnapshots(db);
    const participationViolations = this.listParticipationViolationSnapshots(db);
    const cleartextFiles = listCleartextFiles(this.dataDirProvider());
    return buildRetentionDashboard({
      settings: this.getSettings(),
      cases,
      contacts,
      documents,
      deadlines,
      journalEntries,
      participationViolations,
      cleartextFiles
    });
  }

  private listCaseSnapshots(db: DatabaseAdapter): RetentionCaseSnapshot[] {
    if (!tableExists(db, 'cases')) return [];
    const activity = latestActivityExpression(db);
    const measureNoteCountExpression = tableExists(db, 'case_measure_notes')
      ? ' + (SELECT COUNT(*) FROM case_measure_notes mn WHERE mn.case_id = c.id)'
      : '';
    const rows = db.prepare<any>(`
      SELECT c.id, c.case_number, c.display_name, c.status, c.category, c.closed_at, c.opened_at,
        ${activity} AS last_activity_at,
        ((SELECT COUNT(*) FROM case_notes n WHERE n.case_id = c.id)${measureNoteCountExpression}) AS note_count,
        (SELECT COUNT(*) FROM case_documents d WHERE d.case_id = c.id) AS document_count,
        (SELECT COUNT(*) FROM deadlines dl WHERE dl.case_id = c.id AND dl.status IN ('open', 'offen')) AS open_deadline_count
      FROM cases c
      ORDER BY c.opened_at DESC
    `).all();
    return rows.map((row) => ({
      id: row.id,
      caseNumber: row.case_number,
      displayName: row.display_name,
      status: row.status,
      category: row.category,
      closedAt: row.closed_at,
      openedAt: row.opened_at,
      lastActivityAt: row.last_activity_at,
      noteCount: Number(row.note_count ?? 0),
      documentCount: Number(row.document_count ?? 0),
      openDeadlineCount: Number(row.open_deadline_count ?? 0)
    }));
  }

  private listContactSnapshots(db: DatabaseAdapter): RetentionContactSnapshot[] {
    if (!tableExists(db, 'contacts')) return [];
    const rows = db.prepare<any>(`
      SELECT c.id, c.first_name, c.last_name, c.organization, c.created_at,
        (SELECT COUNT(*) FROM contact_text_references r WHERE r.contact_id = c.id AND r.anonymized_at IS NULL) AS reference_count
      FROM contacts c
      ORDER BY c.last_name, c.first_name
    `).all();
    return rows.map((row) => ({
      id: row.id,
      displayName: `${row.last_name}, ${row.first_name}${row.organization ? ` (${row.organization})` : ''}`,
      createdAt: row.created_at,
      referenceCount: Number(row.reference_count ?? 0)
    }));
  }

  private listDocumentSnapshots(db: DatabaseAdapter): RetentionDocumentSnapshot[] {
    if (!tableExists(db, 'case_documents')) return [];
    const rows = db.prepare<any>(`
      SELECT d.*, c.case_number
      FROM case_documents d
      LEFT JOIN cases c ON c.id = d.case_id
      ORDER BY d.created_at DESC
    `).all();
    const caseDocuments = rows.map((row) => ({
      id: row.id,
      caseId: row.case_id,
      caseNumber: row.case_number,
      displayTitle: row.display_title ?? row.filename ?? row.id,
      storagePath: row.storage_path,
      hasMetadata: bool(row.storage_path) && bool(row.document_key) && bool(row.iv) && bool(row.auth_tag),
      fileExists: bool(row.storage_path) && fs.existsSync(row.storage_path),
      createdAt: row.created_at
    }));
    if (!tableExists(db, 'generated_documents')) return caseDocuments;
    const generatedRows = db.prepare<any>(`
      SELECT id, case_id, title, storage_path, document_key, iv, auth_tag, created_at
      FROM generated_documents
      WHERE document_kind = 'sbv_participation_violation'
      ORDER BY created_at DESC
    `).all();
    return [
      ...caseDocuments,
      ...generatedRows.map((row) => ({
        id: row.id,
        caseId: row.case_id,
        displayTitle: row.title ?? row.id,
        storagePath: row.storage_path,
        hasMetadata: bool(row.storage_path) && bool(row.document_key) && bool(row.iv) && bool(row.auth_tag),
        fileExists: bool(row.storage_path) && fs.existsSync(row.storage_path),
        createdAt: row.created_at
      }))
    ];
  }

  private listActivityJournalSnapshots(db: DatabaseAdapter): RetentionActivityJournalSnapshot[] {
    if (!tableExists(db, 'activity_journal_entries')) return [];
    const rows = db.prepare<any>(`
      SELECT e.id, e.title, e.entry_date, e.status, e.category, e.follow_up_due_at, e.exported_for_activity_report_at,
        EXISTS(SELECT 1 FROM activity_journal_links l WHERE l.entry_id = e.id AND l.target_type = 'case') AS case_linked,
        EXISTS(
          SELECT 1 FROM activity_journal_links l
          JOIN cases c ON c.id = l.target_id
          WHERE l.entry_id = e.id AND l.target_type = 'case' AND c.status <> 'abgeschlossen'
        ) AS linked_active_case
      FROM activity_journal_entries e
      ORDER BY e.entry_date DESC
    `).all();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      entryDate: row.entry_date,
      status: row.status,
      category: row.category,
      caseLinked: Boolean(row.case_linked),
      linkedActiveCase: Boolean(row.linked_active_case),
      openFollowUp: row.status === 'follow_up_open' || Boolean(row.follow_up_due_at),
      exportedForActivityReportAt: row.exported_for_activity_report_at
    }));
  }


  private listParticipationViolationSnapshots(db: DatabaseAdapter): RetentionParticipationViolationSnapshot[] {
    if (!tableExists(db, 'sbv_participation_violations')) return [];
    const rows = db.prepare<any>(`
      SELECT v.id, v.stage, v.status, v.subject, v.case_id, v.source_context_type, v.source_context_id, v.related_case_measure_id, v.related_deadline_id, v.created_at, v.updated_at, v.closed_at,
        (SELECT COUNT(*) FROM sbv_participation_violation_documents d WHERE d.violation_id = v.id) AS document_count
      FROM sbv_participation_violations v
      ORDER BY v.updated_at DESC
    `).all();
    return rows.map((row) => ({
      id: row.id,
      stage: row.stage,
      status: row.status,
      subject: row.subject,
      caseId: row.case_id,
      sourceContextType: row.source_context_type,
      sourceContextId: row.source_context_id,
      relatedCaseMeasureId: row.related_case_measure_id,
      relatedDeadlineId: row.related_deadline_id,
      documentCount: Number(row.document_count ?? 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
    }));
  }

  private listDeadlineSnapshots(db: DatabaseAdapter): RetentionDeadlineSnapshot[] {
    if (!tableExists(db, 'deadlines')) return [];
    const columns = getColumns(db, 'deadlines');
    const completedAt = columns.includes('completed_at') ? 'completed_at' : 'NULL AS completed_at';
    const isLegalDeadline = columns.includes('is_legal_deadline') ? 'is_legal_deadline' : '0 AS is_legal_deadline';
    const rows = db.prepare<any>(`
      SELECT id, title, status, case_id, due_at, ${completedAt}, ${isLegalDeadline}
      FROM deadlines
      ORDER BY due_at DESC
    `).all();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      caseId: row.case_id,
      dueAt: row.due_at,
      completedAt: row.completed_at,
      isLegalDeadline: Boolean(row.is_legal_deadline)
    }));
  }

  anonymizeCase(caseId: string, reason: string, confirmation: string): RetentionOperationResult {
    if (confirmation !== CASE_ANONYMIZE_CONFIRMATION) {
      return { ok: false, action: 'none', error: `Bitte exakt „${CASE_ANONYMIZE_CONFIRMATION}“ eingeben.` };
    }
    const db = this.db;
    const row = db.prepare<any>('SELECT id, case_number FROM cases WHERE id = ?').get(caseId);
    if (!row) return { ok: false, action: 'none', error: 'Fall nicht gefunden.' };

    const documents = db.prepare<CaseDocumentFileRow>('SELECT id, storage_path FROM case_documents WHERE case_id = ?').all(caseId);
    const fileRemoval = removeCaseDocumentFiles(this.dataDirProvider(), caseId, documents);
    if (fileRemoval.errors.length) {
      return {
        ok: false,
        action: 'none',
        error: `Fall ${row.case_number} konnte nicht anonymisiert werden, weil zugehörige Dokumentdateien nicht vollständig gelöscht werden konnten.`,
        affectedRows: 0,
        affectedFiles: fileRemoval.affectedFiles,
      };
    }

    let affectedRows = 0;
    const stamp = `Anonymisiert am ${new Date().toLocaleDateString('de-DE')}`;
    const timestamp = nowIso();
    affectedRows += safeRun(db, `UPDATE cases SET display_name = '[Fall anonymisiert]', summary = ?, is_pseudonymized = 1, updated_at = ? WHERE id = ?`, stamp, timestamp, caseId);
    affectedRows += anonymizeRegisteredCasePrivacyEntities(db, caseId, stamp, timestamp);
    affectedRows += anonymizeIndirectCaseSearchSources(db, caseId, stamp, timestamp);
    affectedRows += safeRun(db, `DELETE FROM case_notes_fts WHERE case_id = ?`, caseId);
    affectedRows += new SearchIndexService(db).deleteCase(caseId);
    affectedRows += safeRun(db, `DELETE FROM case_documents_fts WHERE case_id = ?`, caseId);
    if (tableExists(db, 'case_document_ocr_jobs')) {
      affectedRows += safeRun(db, `DELETE FROM case_document_ocr_jobs WHERE document_id IN (SELECT id FROM case_documents WHERE case_id = ?)`, caseId);
    }
    affectedRows += safeRun(db, `DELETE FROM case_documents WHERE case_id = ?`, caseId);
    affectedRows += new SearchIndexService(db).reindexCase(caseId);
    this.recordAction(db, 'case_anonymized', 'case', caseId, row.case_number, reason, affectedRows, fileRemoval.affectedFiles);
    return { ok: true, action: 'case_anonymized', message: `Fall ${row.case_number} wurde anonymisiert; zugehörige Dokumentdateien wurden gelöscht.`, affectedRows, affectedFiles: fileRemoval.affectedFiles };
  }

  async deleteCase(caseId: string, reason: string, confirmation: string): Promise<RetentionOperationResult> {
    if (confirmation !== CASE_DELETE_CONFIRMATION) {
      return { ok: false, action: 'none', error: `Bitte exakt „${CASE_DELETE_CONFIRMATION}“ eingeben.` };
    }
    const db = this.db;
    const row = db.prepare<any>('SELECT id, case_number FROM cases WHERE id = ?').get(caseId);
    if (!row) return { ok: false, action: 'none', error: 'Fall nicht gefunden.' };

    const documents = db.prepare<CaseDocumentFileRow>('SELECT id, storage_path FROM case_documents WHERE case_id = ?').all(caseId);
    const fileRemoval = removeCaseDocumentFiles(this.dataDirProvider(), caseId, documents);
    if (fileRemoval.errors.length) {
      return {
        ok: false,
        action: 'none',
        error: `Fall ${row.case_number} konnte nicht gelöscht werden, weil zugehörige Dokumentdateien nicht vollständig gelöscht werden konnten.`,
        affectedRows: 0,
        affectedFiles: fileRemoval.affectedFiles,
      };
    }
    let affectedRows = 0;
    const affectedFiles = fileRemoval.affectedFiles;

    affectedRows += new SearchIndexService(db).deleteCase(caseId);
    affectedRows += safeRun(db, `DELETE FROM case_documents_fts WHERE case_id = ?`, caseId);
    if (tableExists(db, 'case_document_ocr_jobs')) {
      affectedRows += safeRun(db, `DELETE FROM case_document_ocr_jobs WHERE document_id IN (SELECT id FROM case_documents WHERE case_id = ?)`, caseId);
    }
    affectedRows += safeRun(db, `DELETE FROM case_documents WHERE case_id = ?`, caseId);
    const noteIds = db.prepare<any>('SELECT id FROM case_notes WHERE case_id = ?').all(caseId).map((note) => note.id);
    for (const noteId of noteIds) {
      affectedRows += safeRun(db, `DELETE FROM contact_text_references WHERE source_type = 'case_note' AND source_id = ?`, noteId);
      affectedRows += safeRun(db, `DELETE FROM case_notes_fts WHERE id = ?`, noteId);
    }
    affectedRows += safeRun(db, `DELETE FROM case_note_cases WHERE case_id = ?`, caseId);
    affectedRows += safeRun(db, `DELETE FROM case_notes WHERE case_id = ?`, caseId);
    if (tableExists(db, 'case_measure_notes')) {
      affectedRows += safeRun(db, `DELETE FROM case_measure_notes WHERE case_id = ?`, caseId);
    }
    affectedRows += safeRun(db, `DELETE FROM deadlines WHERE case_id = ?`, caseId);
    affectedRows += safeRun(db, `DELETE FROM cases WHERE id = ?`, caseId);

    this.recordAction(db, 'case_deleted', 'case', caseId, row.case_number, reason, affectedRows, affectedFiles);
    return { ok: true, action: 'case_deleted', message: `Fall ${row.case_number} wurde gelöscht.`, affectedRows, affectedFiles };
  }

  private recordAction(db: DatabaseAdapter, actionType: string, entityType: string, entityId: string, reference: string, reason: string, affectedRows: number, affectedFiles: number): void {
    db.prepare(`
      INSERT INTO retention_actions (id, action_type, entity_type, entity_id, reference, reason, affected_rows, affected_files, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), actionType, entityType, entityId, reference, reason, affectedRows, affectedFiles, nowIso());
  }
}
