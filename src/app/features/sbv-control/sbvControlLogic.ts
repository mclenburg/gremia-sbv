import type { ParticipationRecord } from '../../core/models/participation.model';
import type {
  CreateSbvResourceRecordInput,
  SbvResourceRecord,
  SbvResourceRecordKind,
} from '../../core/models/sbv-resource.model';
import { recordMatchesQuery } from '../../shared/components/WorkbenchLayout';
import { getParticipationEscalationAdvice } from '../participation/participationPolicy';
import type { ObligationItem } from './sbvControlTypes';

export type ResourceFormState = CreateSbvResourceRecordInput;

export const initialResourceForm: ResourceFormState = {
  kind: 'training',
  title: '',
  legalBasis: '§ 179 Abs. 4 Satz 3 SGB IX',
  startedAt: '',
  endedAt: '',
  provider: '',
  participants: '',
  taskContext: '',
  necessityReason: '',
  employerReaction: '',
  costNote: '',
  status: 'documented',
  notes: ''
};

export function countCriticalParticipation(records: ParticipationRecord[]) {
  return records.filter((record) => getParticipationEscalationAdvice(record).level === 'critical').length;
}

export function monthLabel(date = new Date()): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

export function toneLabel(risk: ObligationItem['risk']) {
  if (risk === 'critical') return 'kritisch';
  if (risk === 'warning') return 'prüfen';
  return 'ok';
}

export function formatDate(value?: string): string {
  if (!value) return 'ohne Datum';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('de-DE');
}

export function legalBasisForKind(kind: SbvResourceRecordKind): string {
  if (kind === 'training') return '§ 179 Abs. 4 Satz 3 SGB IX';
  if (kind === 'deputy_involvement') return '§ 178 Abs. 1 Satz 4 SGB IX, § 179 Abs. 4 SGB IX';
  if (kind === 'equipment') return '§ 179 Abs. 8 SGB IX';
  return '§ 179 SGB IX';
}

export function resourceFormFromRecord(record: SbvResourceRecord): ResourceFormState {
  return {
    kind: record.kind,
    title: record.title,
    legalBasis: record.legalBasis,
    startedAt: record.startedAt?.slice(0, 10) ?? '',
    endedAt: record.endedAt?.slice(0, 10) ?? '',
    provider: record.provider ?? '',
    participants: record.participants ?? '',
    taskContext: record.taskContext ?? '',
    necessityReason: record.necessityReason ?? '',
    employerReaction: record.employerReaction ?? '',
    costNote: record.costNote ?? '',
    status: record.status,
    notes: record.notes ?? ''
  };
}

export function updateResourceFormValue<K extends keyof ResourceFormState>(
  current: ResourceFormState,
  key: K,
  value: ResourceFormState[K]
): ResourceFormState {
  const next = { ...current, [key]: value };
  if (key === 'kind') next.legalBasis = legalBasisForKind(value as SbvResourceRecordKind);
  return next;
}

export function filterResourcesForQuery(records: SbvResourceRecord[], query: string) {
  return records.filter((record) =>
    recordMatchesQuery(
      [
        record.title,
        record.kind,
        record.status,
        record.legalBasis,
        record.provider ?? '',
        record.participants ?? '',
        record.taskContext ?? '',
        record.necessityReason ?? ''
      ],
      query
    )
  );
}


export type ResourceOperation = 'create' | 'update' | 'delete';

export function resourceOperationNotice(operation: ResourceOperation): string {
  if (operation === 'create') return 'Nachweis protokolliert.';
  if (operation === 'update') return 'Nachweis aktualisiert.';
  return 'Nachweis gelöscht.';
}

export function resourceOperationAnnouncement(operation: ResourceOperation): string {
  if (operation === 'create') return 'Nachweis wurde protokolliert.';
  if (operation === 'update') return 'Nachweis wurde aktualisiert.';
  return 'Nachweis wurde gelöscht.';
}

export function isResourceTitleMissing(form: ResourceFormState) {
  return !form.title?.trim();
}
