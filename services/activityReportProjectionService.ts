import type { DatabaseAdapter } from './databaseService.js';
import { verifyAuditHashChain, type AuditChainRowInput } from './auditHashChain.js';
import {
  MEASURE_LIFECYCLE_SCHEMA_VERSION,
  type MeasureLifecycleAuditMetadata,
  type MeasureLifecycleEventName,
  type ReportableMeasureType,
} from '../src/domain/models/measure-lifecycle.model.js';
import { MEASURE_LIFECYCLE_SUBJECT_TYPE } from './measureLifecycleAuditService.js';

export const REPORTABLE_MEASURE_TYPES: readonly ReportableMeasureType[] = [
  'bem',
  'prevention',
  'sbv_participation',
  'termination_hearing',
  'equalization_gdb',
  'workplace_accommodation',
  'recruiting',
  'other',
] as const;

export const MEASURE_LIFECYCLE_EVENTS: readonly MeasureLifecycleEventName[] = [
  'created',
  'status_changed',
  'completed',
  'reopened',
  'cancelled',
  'deleted',
] as const;

export interface ActivityReportPeriod {
  start?: string;
  end?: string;
}

export interface MeasureLifecycleCounters {
  created: Record<ReportableMeasureType, number>;
  statusChanged: Record<ReportableMeasureType, number>;
  completed: Record<ReportableMeasureType, number>;
  reopened: Record<ReportableMeasureType, number>;
  cancelled: Record<ReportableMeasureType, number>;
  deleted: Record<ReportableMeasureType, number>;
}

export type ActivityReportCoverage = 'complete' | 'partial' | 'empty';

export interface ActivityReportProjection {
  counters: MeasureLifecycleCounters;
  activities: {
    createdBySubject: Record<string, number>;
    caseCategories: Record<string, number>;
    journalCategories: Record<string, number>;
    timedJournalEntries: number;
    violationStatuses: Record<string, number>;
    violationStages: Record<string, number>;
  };
  chain: {
    verified: true;
    checkedEntries: number;
    lastSequence?: number;
    latestHash: string;
    chainVersion: number;
  };
  ignoredBaselineEvents: number;
  ignoredInvalidLifecycleEvents: number;
  coverage: {
    status: ActivityReportCoverage;
    lifecycleStartedAt?: string;
  };
  warnings: string[];
}

export class ActivityReportIntegrityError extends Error {
  constructor(public readonly firstBrokenSequence?: number) {
    super(firstBrokenSequence
      ? `Die Audit-HashChain ist ab Sequenz ${firstBrokenSequence} nicht integer.`
      : 'Die Audit-HashChain ist nicht integer.');
    this.name = 'ActivityReportIntegrityError';
  }
}

function emptyByType(): Record<ReportableMeasureType, number> {
  return Object.fromEntries(REPORTABLE_MEASURE_TYPES.map((type) => [type, 0])) as Record<ReportableMeasureType, number>;
}

function emptyCounters(): MeasureLifecycleCounters {
  return {
    created: emptyByType(),
    statusChanged: emptyByType(),
    completed: emptyByType(),
    reopened: emptyByType(),
    cancelled: emptyByType(),
    deleted: emptyByType(),
  };
}

function increment(target: Record<string, number>, key: unknown): void {
  if (typeof key !== 'string' || !key.trim()) return;
  const normalized = key.trim();
  target[normalized] = (target[normalized] ?? 0) + 1;
}

function safeMetadata(row: PersonalDataAuditLogRow): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(row.metadata_json);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function parseBoundary(value: string | undefined, endExclusive: boolean): number | undefined {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (dateOnly && endExclusive) date.setDate(date.getDate() + 1);
  return date.getTime();
}

function inPeriod(occurredAt: string, period: ActivityReportPeriod): boolean {
  const time = new Date(occurredAt).getTime();
  if (Number.isNaN(time)) return false;
  const start = parseBoundary(period.start, false);
  const endExclusive = parseBoundary(period.end, true);
  return (start === undefined || time >= start) && (endExclusive === undefined || time < endExclusive);
}

function isLifecycleMetadata(value: unknown): value is MeasureLifecycleAuditMetadata {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MeasureLifecycleAuditMetadata>;
  return candidate.schemaVersion === MEASURE_LIFECYCLE_SCHEMA_VERSION
    && MEASURE_LIFECYCLE_EVENTS.includes(candidate.eventName as MeasureLifecycleEventName)
    && REPORTABLE_MEASURE_TYPES.includes(candidate.measureType as ReportableMeasureType);
}

interface PersonalDataAuditLogRow {
  sequence: number | string;
  occurred_at: string;
  actor: string;
  action: string;
  subject_type: string;
  subject_id: string | null;
  case_id: string | null;
  purpose: string;
  metadata_json: string;
  previous_hash: string;
  entry_hash: string;
}

function mapChainRow(row: PersonalDataAuditLogRow): AuditChainRowInput {
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
    entryHash: row.entry_hash,
  };
}

export class ActivityReportProjectionService {
  constructor(private readonly db: DatabaseAdapter) {}

  build(period: ActivityReportPeriod = {}): ActivityReportProjection {
    const rows = this.db.prepare<PersonalDataAuditLogRow>('SELECT * FROM personal_data_audit_log ORDER BY sequence ASC').all();
    const verification = verifyAuditHashChain(rows.map(mapChainRow));
    if (!verification.ok) throw new ActivityReportIntegrityError(verification.firstBrokenSequence);

    const counters = emptyCounters();
    const activities: ActivityReportProjection['activities'] = {
      createdBySubject: {},
      caseCategories: {},
      journalCategories: {},
      timedJournalEntries: 0,
      violationStatuses: {},
      violationStages: {},
    };
    const lifecycleRows = rows.filter((row) => row.subject_type === MEASURE_LIFECYCLE_SUBJECT_TYPE);
    const lifecycleStartedAt = lifecycleRows.length > 0 ? String(lifecycleRows[0].occurred_at) : undefined;
    let ignoredBaselineEvents = 0;
    let ignoredInvalidLifecycleEvents = 0;

    for (const row of rows) {
      if (!inPeriod(row.occurred_at, period)) continue;
      const metadata = safeMetadata(row);
      if (row.action === 'create') {
        increment(activities.createdBySubject, row.subject_type);
        if (row.subject_type === 'case') increment(activities.caseCategories, metadata?.category);
        if (row.subject_type === 'activity_journal') {
          increment(activities.journalCategories, metadata?.category);
          if (metadata?.hasTime === true) activities.timedJournalEntries += 1;
        }
        if (row.subject_type === 'sbv_participation_violation') {
          increment(activities.violationStatuses, metadata?.status);
          increment(activities.violationStages, metadata?.stage);
        }
      }
      if (row.subject_type !== MEASURE_LIFECYCLE_SUBJECT_TYPE) continue;
      if (!isLifecycleMetadata(metadata)) {
        ignoredInvalidLifecycleEvents += 1;
        continue;
      }
      if (metadata.eventName === 'created' && metadata.creationSource === 'migration_baseline') {
        ignoredBaselineEvents += 1;
        continue;
      }
      const type = metadata.measureType;
      switch (metadata.eventName) {
        case 'created': counters.created[type] += 1; break;
        case 'status_changed': counters.statusChanged[type] += 1; break;
        case 'completed': counters.completed[type] += 1; break;
        case 'reopened': counters.reopened[type] += 1; break;
        case 'cancelled': counters.cancelled[type] += 1; break;
        case 'deleted': counters.deleted[type] += 1; break;
      }
    }

    const warnings: string[] = [];
    const requestedStart = parseBoundary(period.start, false);
    const lifecycleStart = lifecycleStartedAt ? new Date(lifecycleStartedAt).getTime() : undefined;
    const lifecycleStartDay = lifecycleStartedAt ? new Date(lifecycleStartedAt) : undefined;
    lifecycleStartDay?.setHours(0, 0, 0, 0);
    const coverageStatus: ActivityReportCoverage = !lifecycleStartedAt
      ? 'empty'
      : requestedStart !== undefined && lifecycleStart !== undefined
        && lifecycleStartDay !== undefined && requestedStart < lifecycleStartDay.getTime()
        ? 'partial'
        : 'complete';
    if (coverageStatus === 'partial') {
      warnings.push(`Der gewählte Zeitraum beginnt vor Einführung des strukturierten Maßnahmen-Lifecycle-Protokolls am ${new Intl.DateTimeFormat('de-DE').format(new Date(lifecycleStartedAt!))}. Maßnahmen aus dem davorliegenden Zeitraum können unvollständig sein.`);
    } else if (coverageStatus === 'empty') {
      warnings.push('Es sind noch keine strukturierten Maßnahmen-Lifecycle-Ereignisse vorhanden. Maßnahmenzähler können daher nicht gebildet werden.');
    }
    if (ignoredInvalidLifecycleEvents > 0) {
      warnings.push(`${ignoredInvalidLifecycleEvents} Lifecycle-Ereignis(se) konnten wegen ungültiger oder unbekannter Metadaten nicht ausgewertet werden.`);
    }

    return {
      counters,
      activities,
      chain: {
        verified: true,
        checkedEntries: verification.checked,
        lastSequence: verification.lastSequence,
        latestHash: verification.latestHash,
        chainVersion: verification.chainVersion,
      },
      ignoredBaselineEvents,
      ignoredInvalidLifecycleEvents,
      coverage: { status: coverageStatus, lifecycleStartedAt },
      warnings,
    };
  }
}
