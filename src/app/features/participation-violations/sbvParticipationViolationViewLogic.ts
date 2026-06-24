import type { CaseRecord } from '../../core/models/case.model';
import type {
  CreateSbvParticipationViolationInput,
  ParticipationViolationStage,
  ParticipationViolationStatus,
  ParticipationViolationType,
  SbvParticipationViolationRecord,
} from '../../core/models/sbv-participation-violation.model';
import {
  sbvParticipationViolationStageLabels,
  sbvParticipationViolationStageOptions,
  sbvParticipationViolationStatusLabels,
  sbvParticipationViolationTypeLabels,
  sbvParticipationViolationTypeOptions,
} from '../../core/labels/sbvParticipationViolationLabels';

export const stageLabels = sbvParticipationViolationStageLabels;
export const statusLabels = sbvParticipationViolationStatusLabels;
export const violationTypeLabels = sbvParticipationViolationTypeLabels;
export const stageOptions = sbvParticipationViolationStageOptions;
export const violationTypeOptions = sbvParticipationViolationTypeOptions;

export function createInitialViolationForm(cases: CaseRecord[]): CreateSbvParticipationViolationInput {
  const firstCase = cases[0];
  return {
    stage: 'request',
    violationType: 'incomplete_information',
    sourceContextType: firstCase ? 'case' : 'activity_journal',
    sourceContextId: firstCase?.id ?? '',
    caseId: firstCase?.id,
    subject: '',
    measureDescription: '',
    wrongBehavior: '',
    requiredBehavior: 'Die SBV ist nach § 178 Abs. 2 Satz 1 SGB IX unverzüglich und umfassend zu unterrichten und vor einer Entscheidung anzuhören.',
    legalBasis: '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX',
  };
}

export function needsEscalationHint(stage: ParticipationViolationStage): boolean {
  return stage === 'abmahnung' || stage === 'suspension_request' || stage === 'owi_preparation';
}

export function buildViolationCaseOptions(cases: CaseRecord[]): Array<{ value: string; label: string }> {
  return [
    { value: '', label: 'Fallfrei / Kontext-ID manuell' },
    ...cases.map((caseFile) => ({ value: caseFile.id, label: `${caseFile.caseNumber} · ${caseFile.displayName}` })),
  ];
}

export function applyViolationCaseContext(
  form: CreateSbvParticipationViolationInput,
  caseId: string,
): CreateSbvParticipationViolationInput {
  return {
    ...form,
    sourceContextType: caseId ? 'case' : form.sourceContextType,
    sourceContextId: caseId || form.sourceContextId,
    caseId: caseId || undefined,
  };
}

export function buildViolationSummaryItems(items: SbvParticipationViolationRecord[]): Array<{ label: string; value: number }> {
  return [
    { label: 'offen', value: items.filter((item) => ['draft', 'open', 'sent', 'escalated'].includes(item.status)).length },
    { label: 'Abmahnstufe', value: items.filter((item) => item.stage === 'abmahnung').length },
    { label: 'Aussetzung', value: items.filter((item) => item.stage === 'suspension_request').length },
  ];
}

export type ViolationStatusAction = {
  label: string;
  targetStatus: ParticipationViolationStatus;
};

export function getNextStatusActions(status: ParticipationViolationStatus): ViolationStatusAction[] {
  if (status === 'draft') return [{ label: 'Öffnen', targetStatus: 'open' }];
  if (status === 'open') return [
    { label: 'Versand markieren', targetStatus: 'sent' },
    { label: 'Schließen', targetStatus: 'closed' },
  ];
  if (status === 'sent') return [
    { label: 'Geheilt', targetStatus: 'remedied' },
    { label: 'Schließen', targetStatus: 'closed' },
  ];
  if (status === 'remedied' || status === 'escalated') return [{ label: 'Schließen', targetStatus: 'closed' }];
  return [];
}
