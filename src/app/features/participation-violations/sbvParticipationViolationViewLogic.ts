import type { CaseRecord } from '../../core/models/case.model';
import type { ParticipationRecord } from '../../core/models/participation.model';
import type {
  CreateSbvParticipationViolationInput,
  ParticipationViolationSourceContextType,
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

export type SbvParticipationViolationPrefill = {
  form: CreateSbvParticipationViolationInput;
  sourceLabel: string;
  privacyNotice: string;
};

export const participationViolationSourceContextOptions: Array<{ value: ParticipationViolationSourceContextType; label: string }> = [
  { value: 'case_measure_participation', label: 'SBV-Beteiligungsmaßnahme' },
  { value: 'case', label: 'Fall allgemein' },
  { value: 'termination_hearing', label: 'Kündigungsanhörung' },
  { value: 'sbv_control_protocol', label: 'Steuerungsprotokoll' },
  { value: 'deadline', label: 'Frist / Wiedervorlage' },
  { value: 'activity_journal', label: 'Tätigkeitsjournal-Eintrag' },
  { value: 'sbv_participation', label: 'Legacy-Beteiligung' },
];

const participationMeasureLabels: Record<ParticipationRecord['measureType'], string> = {
  einstellung: 'Einstellung',
  versetzung: 'Versetzung',
  arbeitszeit: 'Arbeitszeit',
  arbeitsplatzgestaltung: 'Arbeitsplatzgestaltung',
  abmahnung: 'Abmahnung',
  kuendigung: 'Kündigung',
  bem_praevention: 'BEM / Prävention',
  regelung_praxis: 'Regelung / betriebliche Praxis',
  sonstiges: 'Sonstiges',
};

export function createInitialViolationForm(_cases: CaseRecord[]): CreateSbvParticipationViolationInput {
  return {
    stage: 'request',
    violationType: 'incomplete_information',
    sourceContextType: 'case_measure_participation',
    sourceContextId: '',
    caseId: undefined,
    subject: '',
    measureDescription: '',
    wrongBehavior: '',
    requiredBehavior: 'Die SBV ist nach § 178 Abs. 2 Satz 1 SGB IX unverzüglich und umfassend zu unterrichten und vor einer Entscheidung anzuhören.',
    legalBasis: '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX',
  };
}


export type ViolationDraftField =
  | 'sourceContextType'
  | 'sourceContextId'
  | 'caseId'
  | 'subject'
  | 'measureDescription'
  | 'wrongBehavior'
  | 'requiredBehavior';

export type ViolationDraftValidationCode =
  | 'missing_source_context'
  | 'missing_case_context'
  | 'case_context_mismatch'
  | 'missing_subject'
  | 'missing_measure_description'
  | 'missing_wrong_behavior'
  | 'missing_required_behavior';

export type ViolationDraftValidationIssue = {
  field: ViolationDraftField;
  code: ViolationDraftValidationCode;
  message: string;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function validateViolationDraft(form: CreateSbvParticipationViolationInput): ViolationDraftValidationIssue[] {
  const issues: ViolationDraftValidationIssue[] = [];

  if (!hasText(form.sourceContextId)) {
    issues.push({
      field: 'sourceContextId',
      code: 'missing_source_context',
      message: form.sourceContextType === 'case_measure_participation'
        ? 'Bitte die konkrete SBV-Beteiligungsmaßnahme auswählen oder die Maßnahmen-ID bewusst eintragen.'
        : 'Bitte zuerst den konkreten Ausgangskontext auswählen oder die Kontext-ID bewusst eintragen.',
    });
  }

  if (form.sourceContextType === 'case') {
    if (!hasText(form.caseId)) {
      issues.push({
        field: 'caseId',
        code: 'missing_case_context',
        message: 'Bitte den Fall bewusst auswählen.',
      });
    } else if (form.sourceContextId !== form.caseId) {
      issues.push({
        field: 'caseId',
        code: 'case_context_mismatch',
        message: 'Der Fallbezug passt nicht zum Ausgangskontext. Bitte Kontext neu auswählen.',
      });
    }
  }

  if (!hasText(form.subject)) {
    issues.push({ field: 'subject', code: 'missing_subject', message: 'Bitte einen kurzen Betreff erfassen.' });
  }
  if (!hasText(form.measureDescription)) {
    issues.push({ field: 'measureDescription', code: 'missing_measure_description', message: 'Bitte Maßnahme oder Sachverhalt kurz beschreiben.' });
  }
  if (!hasText(form.wrongBehavior)) {
    issues.push({ field: 'wrongBehavior', code: 'missing_wrong_behavior', message: 'Bitte dokumentieren, worin der Beteiligungsverstoß liegt.' });
  }
  if (!hasText(form.requiredBehavior)) {
    issues.push({ field: 'requiredBehavior', code: 'missing_required_behavior', message: 'Bitte dokumentieren, welches Verfahren rechtlich richtig gewesen wäre.' });
  }

  return issues;
}

export function buildViolationFieldErrors(issues: ViolationDraftValidationIssue[]): Partial<Record<ViolationDraftField, string>> {
  return issues.reduce<Partial<Record<ViolationDraftField, string>>>((errors, issue) => {
    if (!errors[issue.field]) errors[issue.field] = issue.message;
    return errors;
  }, {});
}

export function summarizeViolationDraftValidation(issues: ViolationDraftValidationIssue[]): string {
  if (issues.length === 0) return '';
  if (issues.some((issue) => issue.code === 'missing_source_context' || issue.code === 'missing_case_context' || issue.code === 'case_context_mismatch')) {
    return 'Bitte zuerst den Ausgangskontext eindeutig festlegen. Der Beteiligungsverstoß wird erst danach bewusst gespeichert.';
  }
  return 'Bitte die Pflichtfelder prüfen. Der Entwurf wurde nicht gespeichert.';
}

export function needsEscalationHint(stage: ParticipationViolationStage): boolean {
  return stage === 'abmahnung' || stage === 'suspension_request' || stage === 'owi_preparation';
}

export function buildViolationCaseOptions(cases: CaseRecord[]): Array<{ value: string; label: string }> {
  return [
    { value: '', label: 'Kein Fall direkt gewählt' },
    ...cases.map((caseFile) => ({ value: caseFile.id, label: `${caseFile.caseNumber} · ${caseFile.displayName}` })),
  ];
}

export function applyViolationCaseContext(
  form: CreateSbvParticipationViolationInput,
  caseId: string,
): CreateSbvParticipationViolationInput {
  if (!caseId) {
    return { ...form, caseId: undefined, sourceContextId: form.sourceContextType === 'case' ? '' : form.sourceContextId };
  }
  return {
    ...form,
    sourceContextType: 'case',
    sourceContextId: caseId,
    caseId,
    relatedCaseMeasureId: undefined,
  };
}

export function applyViolationSourceContextType(
  form: CreateSbvParticipationViolationInput,
  sourceContextType: ParticipationViolationSourceContextType,
): CreateSbvParticipationViolationInput {
  return {
    ...form,
    sourceContextType,
    sourceContextId: '',
    caseId: undefined,
    relatedParticipationId: undefined,
    relatedCaseMeasureId: undefined,
    relatedTerminationHearingId: undefined,
    relatedDeadlineId: undefined,
    relatedActivityJournalEntryId: undefined,
    relatedSbvControlProtocolId: undefined,
  };
}

export function buildParticipationViolationPrefillFromMeasure(
  process: ParticipationRecord,
  caseRecord?: CaseRecord,
): SbvParticipationViolationPrefill {
  const measureLabel = participationMeasureLabels[process.measureType];
  const hasCriticalDecision = (process.decisionStage === 'entscheidung_getroffen' || process.decisionStage === 'umgesetzt') && !process.hearingBeforeDecision;
  const violationType: ParticipationViolationType = !process.informationComplete
    ? 'incomplete_information'
    : hasCriticalDecision
      ? 'implementation_without_participation'
      : 'not_heard';
  const wrongBehavior = process.violationSummary?.trim()
    || (!process.informationComplete
      ? 'Die Unterrichtung der SBV ist nach aktuellem Prüfstand nicht vollständig dokumentiert.'
      : hasCriticalDecision
        ? 'Die Arbeitgeberentscheidung bzw. Umsetzung ist dokumentiert, ohne dass eine ordnungsgemäße vorherige Anhörung der SBV erkennbar ist.'
        : 'Die vorherige Anhörung der SBV ist nach aktuellem Prüfstand nicht belastbar dokumentiert.');

  return {
    form: {
      stage: process.suspensionRequestedAt ? 'suspension_request' : 'request',
      violationType,
      sourceContextType: 'case_measure_participation',
      sourceContextId: process.id,
      caseId: process.caseId,
      relatedCaseMeasureId: process.id,
      subject: `Beteiligungsverstoß zur SBV-Beteiligung ${measureLabel}`,
      measureDescription: `SBV-Beteiligungsmaßnahme ${measureLabel}. Fallbezug: ${caseRecord?.caseNumber ?? 'Fallakte'}.`,
      wrongBehavior,
      requiredBehavior: 'Die SBV ist nach § 178 Abs. 2 Satz 1 SGB IX unverzüglich und umfassend zu unterrichten und vor einer Entscheidung anzuhören. Eine unterbliebene Beteiligung ist nach § 178 Abs. 2 Satz 2 SGB IX innerhalb von sieben Tagen nachzuholen; die Durchführung oder Vollziehung ist auszusetzen.',
      consequenceWarning: process.suspensionRequestedAt
        ? 'Die Aussetzung wurde bereits verlangt. Nachholung, Fristablauf und weitere Eskalation sind gesondert zu prüfen.'
        : 'Bei nicht rechtzeitiger Nachholung kommt eine Eskalation bis zur förmlichen Rüge, Aussetzungsaufforderung und OWi-Prüfung in Betracht.',
      legalBasis: '§ 178 Abs. 2 Satz 1 und Satz 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX',
      followUpDueAt: process.suspensionDueAt,
    },
    sourceLabel: `Quelle: SBV-Beteiligungsmaßnahme ${measureLabel}${caseRecord ? ` · ${caseRecord.caseNumber}` : ''}`,
    privacyNotice: 'Der Entwurf wurde aus der Maßnahme vorbelegt. Es wurde noch kein Beteiligungsverstoß gespeichert und es werden keine Klarnamen oder medizinischen Details automatisch in Schreiben übernommen.',
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
