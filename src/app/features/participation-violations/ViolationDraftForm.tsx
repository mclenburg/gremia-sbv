import { type FormEvent } from 'react';
import { AlertTriangle, FileWarning } from 'lucide-react';
import type { ParticipationViolationSourceContextType, ParticipationViolationStage, ParticipationViolationType } from '../../../domain/models/sbv-participation-violation.model';
import { FormSection, SearchableSelectInput, SelectInput, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialWarningPanel } from '../../shared/components/WorkbenchLayout';
import type { useSbvParticipationViolations } from './hooks/useSbvParticipationViolations';
import {
  needsEscalationHint,
  participationViolationSourceContextOptions,
  stageOptions,
  violationTypeOptions,
} from './sbvParticipationViolationViewLogic';

type ViolationState = ReturnType<typeof useSbvParticipationViolations>;
export const VIOLATION_DRAFT_FORM_ID = 'participation-violation-create-form';

export function ViolationDraftForm({ state, onCreated }: { state: ViolationState; onCreated?: () => void }) {
  const sourceContextOptions = participationViolationSourceContextOptions.some((option) => option.value === state.form.sourceContextType)
    ? participationViolationSourceContextOptions
    : [...participationViolationSourceContextOptions, { value: state.form.sourceContextType, label: 'Aus Fachvorgang übernommen' }];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void state.createViolation().then((created) => { if (created) onCreated?.(); });
  }

  return <FormSection
    kicker="Bewusster Entwurf"
    title="Beteiligungsverstoß erfassen"
    description="Entwurf mit nachvollziehbarem Ausgangskontext."
    helpId="participationViolations.sourceContext"
  >
    {state.contextNotice && <IndustrialWarningPanel>
      <div className="flex items-start gap-3">
        <FileWarning className="mt-1 h-5 w-5 text-yellow-300" aria-hidden="true" />
        <div><strong>{state.contextNotice.sourceLabel}</strong><p>{state.contextNotice.privacyNotice}</p></div>
      </div>
    </IndustrialWarningPanel>}

    {needsEscalationHint(state.form.stage) && <IndustrialWarningPanel>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-5 w-5 text-yellow-300" aria-hidden="true" />
        <div>
          <strong>Scharfe Eskalationsstufe</strong>
          <p>Abmahnung, Aussetzungsverlangen und OWi-Vorbereitung sollten bei streitigen oder folgenreichen Sachverhalten anwaltlich abgestimmt werden.</p>
        </div>
      </div>
    </IndustrialWarningPanel>}

    <form id={VIOLATION_DRAFT_FORM_ID} onSubmit={handleSubmit} noValidate aria-label="Beteiligungsverstoß bewusst speichern">
      <div className="industrial-form-grid industrial-form-grid-auto">
        <SelectInput
          label="Ausgangskontext"
          value={state.form.sourceContextType}
          options={sourceContextOptions}
          onValueChange={(value) => state.updateSourceContextType(value as ParticipationViolationSourceContextType)}
          helpId="participationViolations.sourceContext"
        />
        <SelectInput
          label="Eskalationsstufe"
          value={state.form.stage}
          options={stageOptions}
          onValueChange={(stage) => state.updateForm({ stage: stage as ParticipationViolationStage })}
          helpId="participationViolations.stageAndType"
        />
        <SelectInput
          label="Verstoßart"
          value={state.form.violationType}
          options={violationTypeOptions}
          onValueChange={(violationType) => state.updateForm({ violationType: violationType as ParticipationViolationType })}
          helpId="participationViolations.stageAndType"
        />
        {state.form.sourceContextType === 'case' ? <SearchableSelectInput
          label="Fallakte suchen und auswählen"
          value={state.form.caseId ?? ''}
          options={state.caseOptions}
          onValueChange={state.updateCaseContext}
          required
          error={state.fieldErrors.caseId}
          helpId="participationViolations.sourceContext"
        /> : null}
        {state.form.sourceContextType === 'case_measure_participation' ? <SearchableSelectInput
          label="SBV-Beteiligungsmaßnahme suchen und auswählen"
          value={state.form.sourceContextId}
          options={state.measureOptions}
          onValueChange={state.updateMeasureContext}
          required
          error={state.fieldErrors.sourceContextId}
          helpId="participationViolations.sourceContext"
        /> : null}
        <TextInput label="Betreff" value={state.form.subject} required error={state.fieldErrors.subject} onValueChange={(subject) => state.updateForm({ subject })} />
        <TextInput label="Rechtsgrundlage" value={state.form.legalBasis ?? ''} onValueChange={(legalBasis) => state.updateForm({ legalBasis })} />
      </div>
      <TextareaInput label="Maßnahme / Sachverhalt" value={state.form.measureDescription} required error={state.fieldErrors.measureDescription} onValueChange={(measureDescription) => state.updateForm({ measureDescription })} />
      <TextareaInput label="Was war falsch?" value={state.form.wrongBehavior} required error={state.fieldErrors.wrongBehavior} onValueChange={(wrongBehavior) => state.updateForm({ wrongBehavior })} />
      <TextareaInput label="Was wäre richtig gewesen?" value={state.form.requiredBehavior} required error={state.fieldErrors.requiredBehavior} onValueChange={(requiredBehavior) => state.updateForm({ requiredBehavior })} />
      <TextareaInput label="Konsequenz-/Warnhinweis" value={state.form.consequenceWarning ?? ''} onValueChange={(consequenceWarning) => state.updateForm({ consequenceWarning })} />
    </form>
  </FormSection>;
}
