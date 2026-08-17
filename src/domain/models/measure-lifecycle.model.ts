export const MEASURE_LIFECYCLE_SCHEMA_VERSION = '1' as const;

export type MeasureLifecycleEventName =
  | 'created'
  | 'status_changed'
  | 'completed'
  | 'reopened'
  | 'cancelled'
  | 'deleted';

export type ReportableMeasureType =
  | 'bem'
  | 'prevention'
  | 'sbv_participation'
  | 'termination_hearing'
  | 'equalization_gdb'
  | 'workplace_accommodation'
  | 'recruiting'
  | 'other';

export type MeasureLifecycleCreationSource =
  | 'manual'
  | 'inline_command'
  | 'import'
  | 'migration_baseline'
  | 'system';

export type MeasureLifecycleDeletionScope =
  | 'single_measure'
  | 'case_cascade'
  | 'retention';

export interface MeasureLifecycleAuditMetadata {
  schemaVersion: typeof MEASURE_LIFECYCLE_SCHEMA_VERSION;
  eventName: MeasureLifecycleEventName;
  measureType: ReportableMeasureType;
  previousStatus?: string;
  nextStatus?: string;
  creationSource?: MeasureLifecycleCreationSource;
  deletionScope?: MeasureLifecycleDeletionScope;
}
