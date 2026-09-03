import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { directCasePrivacyEntities, resolveAnonymizationValue } from './privacyEntityRegistry.js';
import type { ReportableMeasureType } from '../src/domain/models/measure-lifecycle.model.js';
export const CASE_ANONYMIZE_CONFIRMATION = 'FALL ANONYMISIEREN';
export const CASE_DELETE_CONFIRMATION = 'FALL LÖSCHEN';

/** SQLite row at the persistence boundary. Values remain scalar and must be
 * normalized by the service mapper before entering the domain model. */
export type DatabaseScalar = string;
export type DatabaseRow = Record<string, DatabaseScalar>;

export function nowIso(): string {
  return new Date().toISOString();
}

export function bool(value: unknown): boolean {
  return Boolean(value);
}

export function readNumberSetting(db: DatabaseAdapter, key: string, fallback: number): number {
  try {
    const row = db.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?').get(key);
    const parsed = Number(row?.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function readTextSetting(db: DatabaseAdapter, key: string): string | undefined {
  try {
    const row = db.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?').get(key);
    return typeof row?.value === 'string' ? row.value : undefined;
  } catch {
    return undefined;
  }
}

export function writeSetting(db: DatabaseAdapter, key: string, value: number | string): void {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, String(value), nowIso());
}

export function safeRun(db: DatabaseAdapter, sql: string, ...params: unknown[]): number {
  const result = db.prepare<DatabaseRow>(sql).run(...params) as { changes?: number } | undefined;
  return Number(result?.changes ?? 0);
}

export function tableExists(db: DatabaseAdapter, table: string): boolean {
  return Boolean(db.prepare<DatabaseRow>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

export function getColumns(db: DatabaseAdapter, table: string): string[] {
  try {
    const rows = db.prepare<DatabaseRow>(`PRAGMA table_info(${table})`).all();
    return rows.map((row) => String(row.name));
  } catch {
    return [];
  }
}

export function hasColumn(db: DatabaseAdapter, table: string, column: string): boolean {
  return getColumns(db, table).includes(column);
}

export function latestActivityExpression(db: DatabaseAdapter): string {
  const casesUpdated = hasColumn(db, 'cases', 'updated_at') ? 'c.updated_at' : 'c.opened_at';
  const measureNotesActivity = tableExists(db, 'case_measure_notes')
    ? 'COALESCE((SELECT MAX(mn.updated_at) FROM case_measure_notes mn WHERE mn.case_id = c.id), c.opened_at), '
    : '';
  return `MAX(COALESCE(${casesUpdated}, c.opened_at), COALESCE((SELECT MAX(n.updated_at) FROM case_notes n WHERE n.case_id = c.id), c.opened_at), COALESCE((SELECT MAX(d.created_at) FROM case_documents d WHERE d.case_id = c.id), c.opened_at), ${measureNotesActivity}COALESCE((SELECT MAX(dl.updated_at) FROM deadlines dl WHERE dl.case_id = c.id), c.opened_at))`;
}




export type IndirectAnonymizationTarget = {
  table: string;
  whereSql: string;
  assignments: ReadonlyArray<readonly [string, unknown]>;
};

export function anonymizeIndirectCaseSearchSources(db: DatabaseAdapter, caseId: string, stamp: string, timestamp: string): number {
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

export function anonymizeRegisteredCasePrivacyEntities(db: DatabaseAdapter, caseId: string, stamp: string, timestamp: string): number {
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


export type CaseDocumentFileRow = {
  id?: string;
  storage_path?: string | null;
};

export type CaseDocumentFileRemovalResult = {
  affectedFiles: number;
  errors: string[];
};

export function isPathInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function listFilesRecursive(root: string): string[] {
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

export function removeCaseDocumentFiles(dataDir: string, caseId: string, documents: CaseDocumentFileRow[]): CaseDocumentFileRemovalResult {
  const errors: string[] = [];
  let affectedFiles = 0;
  const caseDir = path.resolve(dataDir, 'documents', caseId);
  let caseDirFiles: string[] = [];
  try {
    caseDirFiles = listFilesRecursive(caseDir);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  for (const document of documents) {
    if (!document.storage_path) continue;
    const absolute = path.resolve(document.storage_path);
    if (isPathInside(caseDir, absolute)) continue;
    errors.push(`Dokumentpfad liegt außerhalb des Fall-Tresors und wurde nicht gelöscht: ${path.basename(absolute)}`);
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

export function listCleartextFiles(dataDir: string): string[] {
  const suspicious: string[] = [];
  const roots = ['documents', 'exports'];
  const allowed = new Set(['.gsbvdoc', '.gsbvpdf']);

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(dataDir, absolute).split(path.sep).join('/');
      if (entry.isSymbolicLink()) {
        suspicious.push(relative);
        continue;
      }
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!allowed.has(path.extname(entry.name).toLowerCase())) {
        suspicious.push(relative);
      }
    }
  };

  for (const root of roots) walk(path.join(dataDir, root));
  return suspicious.sort((a, b) => a.localeCompare(b, 'de-DE'));
}

export interface RetentionLifecycleRow {
  id: string;
  caseId?: string;
  status?: string;
  measureType: ReportableMeasureType;
}

export function lifecycleRowsForCase(db: DatabaseAdapter, caseId: string): RetentionLifecycleRow[] {
  const result: RetentionLifecycleRow[] = [];
  const collect = (table: string, type: ReportableMeasureType, statusColumn: string, typeColumn?: string) => {
    if (!tableExists(db, table)) return;
    const rows = db.prepare<DatabaseRow>(`SELECT id, case_id, ${statusColumn} AS status${typeColumn ? `, ${typeColumn} AS measure_type` : ''} FROM ${table} WHERE case_id = ?`).all(caseId);
    for (const row of rows) result.push({ id: row.id, caseId: row.case_id, status: row.status, measureType: typeColumn ? row.measure_type as ReportableMeasureType : type });
  };
  collect('case_measures', 'other', 'status', 'type');
  collect('bem_processes', 'bem', 'status');
  collect('prevention_processes', 'prevention', 'status');
  collect('equalization_processes', 'equalization_gdb', 'application_status');
  collect('termination_hearings', 'termination_hearing', 'status');
  return result;
}
