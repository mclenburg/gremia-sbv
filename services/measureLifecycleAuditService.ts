import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import {
  MEASURE_LIFECYCLE_SCHEMA_VERSION,
  type MeasureLifecycleAuditMetadata,
  type MeasureLifecycleCreationSource,
  type MeasureLifecycleDeletionScope,
  type MeasureLifecycleEventName,
  type ReportableMeasureType,
} from '../src/app/core/models/measure-lifecycle.model.js';

export const MEASURE_LIFECYCLE_SUBJECT_TYPE = 'measure_lifecycle' as const;

const COMPLETED_STATUSES = new Set(['completed', 'abgeschlossen', 'erledigt', 'beendet']);
const CANCELLED_STATUSES = new Set(['cancelled', 'abgebrochen', 'abgelehnt', 'zurueckgezogen']);

function normalizedStatus(status?: string): string | undefined {
  const value = status?.trim();
  return value || undefined;
}

export function lifecycleEventForStatusChange(previousStatus?: string, nextStatus?: string): MeasureLifecycleEventName | undefined {
  const previous = normalizedStatus(previousStatus);
  const next = normalizedStatus(nextStatus);
  if (!previous || !next || previous === next) return undefined;
  if (COMPLETED_STATUSES.has(next)) return 'completed';
  if (CANCELLED_STATUSES.has(next)) return 'cancelled';
  if (COMPLETED_STATUSES.has(previous) || CANCELLED_STATUSES.has(previous)) return 'reopened';
  return 'status_changed';
}

export interface AppendMeasureLifecycleInput {
  eventName: MeasureLifecycleEventName;
  measureType: ReportableMeasureType;
  subjectId: string;
  caseId?: string;
  previousStatus?: string;
  nextStatus?: string;
  creationSource?: MeasureLifecycleCreationSource;
  deletionScope?: MeasureLifecycleDeletionScope;
}

export class MeasureLifecycleAuditService {
  private readonly audit: PersonalDataAuditLogService;

  constructor(private readonly db: DatabaseAdapter) {
    this.audit = new PersonalDataAuditLogService(db);
  }

  append(input: AppendMeasureLifecycleInput): void {
    const metadata: MeasureLifecycleAuditMetadata = {
      schemaVersion: MEASURE_LIFECYCLE_SCHEMA_VERSION,
      eventName: input.eventName,
      measureType: input.measureType,
      ...(input.previousStatus ? { previousStatus: input.previousStatus } : {}),
      ...(input.nextStatus ? { nextStatus: input.nextStatus } : {}),
      ...(input.creationSource ? { creationSource: input.creationSource } : {}),
      ...(input.deletionScope ? { deletionScope: input.deletionScope } : {}),
    };
    const action = input.eventName === 'created' ? 'create' : input.eventName === 'deleted' ? 'delete' : 'update';
    this.audit.append({
      action,
      subjectType: MEASURE_LIFECYCLE_SUBJECT_TYPE,
      subjectId: input.subjectId,
      caseId: input.caseId,
      purpose: 'Maßnahmen-Lifecycle',
      metadata: { ...metadata },
    });
  }

  created(measureType: ReportableMeasureType, subjectId: string, caseId: string | undefined, status: string | undefined, creationSource: MeasureLifecycleCreationSource = 'system'): void {
    this.append({ eventName: 'created', measureType, subjectId, caseId, nextStatus: status, creationSource });
  }

  statusChanged(measureType: ReportableMeasureType, subjectId: string, caseId: string | undefined, previousStatus?: string, nextStatus?: string): void {
    const eventName = lifecycleEventForStatusChange(previousStatus, nextStatus);
    if (!eventName) return;
    this.append({ eventName, measureType, subjectId, caseId, previousStatus, nextStatus });
  }

  deleted(measureType: ReportableMeasureType, subjectId: string, caseId: string | undefined, status: string | undefined, deletionScope: MeasureLifecycleDeletionScope): void {
    this.append({ eventName: 'deleted', measureType, subjectId, caseId, previousStatus: status, deletionScope });
  }

  hasLifecycleEntry(subjectId: string): boolean {
    return Boolean(this.db.prepare<{ value: number }>(`
      SELECT 1 AS value FROM personal_data_audit_log
      WHERE subject_type = ? AND subject_id = ?
      LIMIT 1
    `).get(MEASURE_LIFECYCLE_SUBJECT_TYPE, subjectId));
  }

  ensureBaselineForTable(options: {
    table: string;
    measureType: ReportableMeasureType;
    statusColumn: string;
    caseColumn?: string;
    typeColumn?: string;
    typeMap?: (value: string) => ReportableMeasureType;
  }): number {
    const exists = this.db.prepare<{ value: number }>("SELECT 1 AS value FROM sqlite_master WHERE type = 'table' AND name = ?").get(options.table);
    if (!exists) return 0;
    const rows = this.db.prepare<any>(`
      SELECT id, ${options.statusColumn} AS status${options.caseColumn ? `, ${options.caseColumn} AS case_id` : ''}${options.typeColumn ? `, ${options.typeColumn} AS measure_type` : ''}
      FROM ${options.table}
    `).all();
    let created = 0;
    for (const row of rows) {
      if (this.hasLifecycleEntry(row.id)) continue;
      this.created(options.typeMap && row.measure_type ? options.typeMap(row.measure_type) : options.measureType, row.id, row.case_id ?? undefined, row.status, 'migration_baseline');
      created += 1;
    }
    return created;
  }
}
