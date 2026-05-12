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
  type RetentionCaseSnapshot,
  type RetentionContactSnapshot,
  type RetentionDeadlineSnapshot,
  type RetentionDocumentSnapshot
} from './retentionPolicy.js';

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
    writeSetting(db, 'retention.minimumGroupSizeForReports', next.minimumGroupSizeForReports);
    return next;
  }

  buildDashboard(): RetentionDashboard {
    const db = this.db;
    const cases = this.listCaseSnapshots(db);
    const contacts = this.listContactSnapshots(db);
    const documents = this.listDocumentSnapshots(db);
    const deadlines = this.listDeadlineSnapshots(db);
    const cleartextFiles = listCleartextFiles(this.dataDirProvider());
    return buildRetentionDashboard({
      settings: this.getSettings(),
      cases,
      contacts,
      documents,
      deadlines,
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
    return rows.map((row) => ({
      id: row.id,
      caseId: row.case_id,
      caseNumber: row.case_number,
      displayTitle: row.display_title ?? row.filename ?? row.id,
      storagePath: row.storage_path,
      hasMetadata: bool(row.storage_path) && bool(row.document_key) && bool(row.iv) && bool(row.auth_tag),
      fileExists: bool(row.storage_path) && fs.existsSync(row.storage_path),
      createdAt: row.created_at
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

    let affectedRows = 0;
    const stamp = `Anonymisiert am ${new Date().toLocaleDateString('de-DE')}`;
    affectedRows += safeRun(db, `UPDATE cases SET display_name = '[Fall anonymisiert]', summary = ?, is_pseudonymized = 1, updated_at = ? WHERE id = ?`, stamp, nowIso(), caseId);
    affectedRows += safeRun(db, `UPDATE case_notes SET participants = '[anonymisiert]', content = ?, next_steps = NULL, contains_health_data = 0, updated_at = ? WHERE case_id = ?`, stamp, nowIso(), caseId);
    affectedRows += safeRun(db, `DELETE FROM case_notes_fts WHERE case_id = ?`, caseId);
    if (tableExists(db, 'case_measure_notes')) {
      affectedRows += safeRun(db, `UPDATE case_measure_notes SET title = '[Maßnahmennotiz anonymisiert]', participants = '[anonymisiert]', content = ?, next_steps = NULL, contains_health_data = 0, confidential_level = 'normal', updated_at = ? WHERE case_id = ?`, stamp, nowIso(), caseId);
    }
    affectedRows += safeRun(db, `UPDATE case_documents SET extracted_text = NULL, display_title = '[Dokument anonymisiert]' WHERE case_id = ?`, caseId);
    affectedRows += safeRun(db, `DELETE FROM case_documents_fts WHERE case_id = ?`, caseId);
    this.recordAction(db, 'case_anonymized', 'case', caseId, row.case_number, reason, affectedRows, 0);
    return { ok: true, action: 'case_anonymized', message: `Fall ${row.case_number} wurde anonymisiert.`, affectedRows, affectedFiles: 0 };
  }

  async deleteCase(caseId: string, reason: string, confirmation: string): Promise<RetentionOperationResult> {
    if (confirmation !== CASE_DELETE_CONFIRMATION) {
      return { ok: false, action: 'none', error: `Bitte exakt „${CASE_DELETE_CONFIRMATION}“ eingeben.` };
    }
    const db = this.db;
    const row = db.prepare<any>('SELECT id, case_number FROM cases WHERE id = ?').get(caseId);
    if (!row) return { ok: false, action: 'none', error: 'Fall nicht gefunden.' };

    const documents = db.prepare<any>('SELECT id, storage_path FROM case_documents WHERE case_id = ?').all(caseId);
    let affectedRows = 0;
    let affectedFiles = 0;
    for (const document of documents) {
      if (document.storage_path) {
        await fs.promises.rm(document.storage_path, { force: true }).then(() => { affectedFiles += 1; }).catch(() => undefined);
      }
    }

    affectedRows += safeRun(db, `DELETE FROM case_documents_fts WHERE case_id = ?`, caseId);
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

    const caseDir = path.join(this.dataDirProvider(), 'documents', caseId);
    await fs.promises.rm(caseDir, { recursive: true, force: true }).catch(() => undefined);
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
