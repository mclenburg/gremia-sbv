import { useCallback, useMemo, useState } from 'react';
import type { CaseRecord } from '../../../../domain/models/case.model';
import type { CaseMeasureRecord } from '../../../../domain/models/case-measure.model';
import type { CreateSbvParticipationViolationInput, ParticipationViolationSourceContextType } from '../../../../domain/models/sbv-participation-violation.model';
import {
  applyViolationCaseContext,
  applyViolationMeasureContext,
  applyViolationSourceContextType,
  buildViolationCaseOptions,
  buildViolationFieldErrors,
  buildViolationMeasureOptions,
  createInitialViolationForm,
  validateViolationDraft,
  type SbvParticipationViolationPrefill,
} from '../sbvParticipationViolationViewLogic';

export type ViolationDraftContextInput = {
  cases: CaseRecord[];
  measures: CaseMeasureRecord[];
};

type ContextNotice = Pick<SbvParticipationViolationPrefill, 'sourceLabel' | 'privacyNotice'>;

export function useViolationDraftContext({ cases, measures }: ViolationDraftContextInput) {
  const [form, setForm] = useState<CreateSbvParticipationViolationInput>(() => createInitialViolationForm(cases));
  const [contextNotice, setContextNotice] = useState<ContextNotice | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const caseOptions = useMemo(() => buildViolationCaseOptions(cases), [cases]);
  const measureOptions = useMemo(() => buildViolationMeasureOptions(measures, cases), [measures, cases]);
  const validationIssues = useMemo(() => validationAttempted ? validateViolationDraft(form) : [], [form, validationAttempted]);
  const fieldErrors = useMemo(() => buildViolationFieldErrors(validationIssues), [validationIssues]);

  const updateCaseContext = useCallback((caseId: string) => {
    setForm((current) => applyViolationCaseContext(current, caseId));
    setValidationAttempted(false);
    setContextNotice(caseId ? {
      sourceLabel: 'Quelle: bewusst gewählter Fallkontext',
      privacyNotice: 'Der Fallkontext ist allgemein. Für den Standardfall sollte der Verstoß aus der konkreten SBV-Beteiligungsmaßnahme heraus angelegt werden.',
    } : null);
  }, []);

  const updateSourceContextType = useCallback((sourceContextType: ParticipationViolationSourceContextType) => {
    setForm((current) => applyViolationSourceContextType(current, sourceContextType));
    setValidationAttempted(false);
    if (sourceContextType === 'case_measure_participation') setContextNotice({
      sourceLabel: 'Quelle: SBV-Beteiligungsmaßnahme',
      privacyNotice: 'Bitte die konkrete Maßnahme über die fachliche Suchauswahl wählen oder den Entwurf direkt aus der Fallakte übernehmen.',
    });
    else if (sourceContextType === 'general_employer_practice') setContextNotice({
      sourceLabel: 'Quelle: allgemeine Arbeitgeberpraxis',
      privacyNotice: 'Der Verstoß bleibt bewusst fall- und personenunabhängig. Es ist keine technische Vorgangs-ID erforderlich.',
    });
    else setContextNotice({
      sourceLabel: 'Quelle: bewusst gewählter Sonderkontext',
      privacyNotice: 'Sonderkontexte speichern nur nach ausdrücklicher Bestätigung. Kein Kontext wird automatisch geraten.',
    });
  }, []);

  const updateMeasureContext = useCallback((measureId: string) => {
    setForm((current) => applyViolationMeasureContext(current, measureId, measures));
    setValidationAttempted(false);
    setContextNotice(measureId ? {
      sourceLabel: 'Quelle: bewusst gewählte SBV-Beteiligungsmaßnahme',
      privacyNotice: 'Die Fall- und Maßnahmenverknüpfung wird aus der Auswahl übernommen; technische IDs müssen nicht eingegeben werden.',
    } : null);
  }, [measures]);

  const updateForm = useCallback((patch: Partial<CreateSbvParticipationViolationInput>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const applyPrefill = useCallback((prefill: SbvParticipationViolationPrefill) => {
    setForm(prefill.form);
    setContextNotice({ sourceLabel: prefill.sourceLabel, privacyNotice: prefill.privacyNotice });
    setValidationAttempted(false);
  }, []);

  const reset = useCallback(() => {
    setForm(createInitialViolationForm(cases));
    setContextNotice(null);
    setValidationAttempted(false);
  }, [cases]);

  return {
    form, contextNotice, validationAttempted, validationIssues, fieldErrors, caseOptions, measureOptions,
    setValidationAttempted, updateForm, updateCaseContext, updateSourceContextType, updateMeasureContext,
    applyPrefill, reset,
  };
}
