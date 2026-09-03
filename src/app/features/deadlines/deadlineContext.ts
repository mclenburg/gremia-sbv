import type { ViewId } from '../../core/navigation/modules';
import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseMeasureRecord, CaseMeasureType } from '../../../domain/models/case-measure.model';
import { caseMeasureTypeLabels } from '../../../domain/models/case-measure.model';
import type { DeadlineProcessType, DeadlineRecord } from '../../../domain/models/deadline.model';
import { deadlineProcessTypeLabels, deadlineTypeLabels } from './deadlineLabels';

const measureTypeTarget: Partial<Record<CaseMeasureType, CaseNodeTarget['nodeType']>> = {
  bem: 'bem',
  prevention: 'prevention',
  sbv_participation: 'participation',
  termination_hearing: 'termination_hearing',
  equalization_gdb: 'equalization',
  workplace_accommodation: 'workplace_accommodation',
};

const processTypeTarget: Partial<Record<DeadlineProcessType, CaseNodeTarget['nodeType']>> = {
  bem: 'bem',
  prevention: 'prevention',
  equalization: 'equalization',
  gdb: 'equalization',
  termination_hearing: 'termination_hearing',
};

const processFallbackView: Partial<Record<DeadlineProcessType, ViewId>> = {
  activity_journal: 'activity_journal',
  custom: 'deadlines',
  election: 'elections',
  employer_obligation_review: 'sbv_control',
  inclusion_agreement: 'sbv_control',
  recruiting_participation: 'recruiting_participations',
  sbv_assembly: 'sbv_control',
  sbv_control_protocol: 'sbv_control',
  sbv_meeting: 'meetings',
  sbv_participation_violation: 'participation_violations',
};

export type DeadlineOpenTarget =
  | { kind: 'case'; target: CaseNodeTarget }
  | { kind: 'view'; view: ViewId };

export type DeadlineContextInfo = {
  primary: string;
  secondary: string;
  actionLabel: string;
  openTarget: DeadlineOpenTarget;
};

function caseLabel(deadline: DeadlineRecord, casesById: Map<string, CaseRecord>): string | undefined {
  if (!deadline.caseId) return undefined;
  const record = casesById.get(deadline.caseId);
  if (!record) return 'Fallzuordnung nicht auflösbar';
  return `${record.caseNumber} · ${record.displayName}`;
}

function measureContext(deadline: DeadlineRecord, measuresById: Map<string, CaseMeasureRecord>): { label: string; targetNode?: CaseNodeTarget['nodeType'] } | undefined {
  if (!deadline.measureId) return undefined;
  const measure = measuresById.get(deadline.measureId);
  if (!measure) return { label: 'Maßnahme nicht auflösbar' };
  return {
    label: `${caseMeasureTypeLabels[measure.type]} · ${measure.title}`,
    targetNode: measureTypeTarget[measure.type],
  };
}

export function resolveDeadlineOpenTarget(deadline: DeadlineRecord, measuresById = new Map<string, CaseMeasureRecord>()): DeadlineOpenTarget {
  if (deadline.caseId) {
    const measure = measureContext(deadline, measuresById);
    if (measure?.targetNode && deadline.measureId) {
      return { kind: 'case', target: { caseId: deadline.caseId, nodeType: measure.targetNode, nodeId: deadline.measureId } };
    }

    const processNode = processTypeTarget[deadline.processType];
    if (processNode && deadline.processId) {
      return { kind: 'case', target: { caseId: deadline.caseId, nodeType: processNode, nodeId: deadline.processId } };
    }

    return { kind: 'case', target: { caseId: deadline.caseId, nodeType: 'overview' } };
  }

  return { kind: 'view', view: processFallbackView[deadline.processType] ?? 'deadlines' };
}

export function resolveDeadlineContextInfo(
  deadline: DeadlineRecord,
  casesById = new Map<string, CaseRecord>(),
  measuresById = new Map<string, CaseMeasureRecord>(),
): DeadlineContextInfo {
  const processLabel = deadlineProcessTypeLabels[deadline.processType];
  const typeLabel = deadlineTypeLabels[deadline.deadlineType];
  const linkedCase = caseLabel(deadline, casesById);
  const measure = measureContext(deadline, measuresById);
  const openTarget = resolveDeadlineOpenTarget(deadline, measuresById);

  if (linkedCase && measure) {
    return {
      primary: linkedCase,
      secondary: measure.label,
      actionLabel: measure.targetNode ? 'Maßnahme öffnen' : 'Fallakte öffnen',
      openTarget,
    };
  }

  if (linkedCase) {
    return {
      primary: linkedCase,
      secondary: `${processLabel} · ${typeLabel}`,
      actionLabel: 'Fallakte öffnen',
      openTarget,
    };
  }

  if (deadline.sourceEvent === 'protected_person.status_expiry_warning' || deadline.sourceEvent === 'protected_person.status_expired_privacy_review') {
    return {
      primary: 'Personenverzeichnis',
      secondary: `${processLabel} · ${typeLabel}`,
      actionLabel: 'Personen öffnen',
      openTarget: { kind: 'view', view: 'persons' },
    };
  }

  return {
    primary: deadline.processType === 'custom' ? 'Allgemeine SBV-Aufgabe ohne Fallbezug' : processLabel,
    secondary: typeLabel,
    actionLabel: openTarget.kind === 'view' && openTarget.view === 'deadlines' ? 'Fristenregister öffnen' : 'Vorgang öffnen',
    openTarget,
  };
}
