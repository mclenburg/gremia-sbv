import { PlusCircle, Save } from 'lucide-react';
import type {
  RecruitingParticipationRecord,
  RecruitingParticipationStatus,
  RecruitingViolationReviewReason,
} from '../../../domain/models/recruiting-participation.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { CheckboxField, DateInput, FormSection, SelectInput, TextInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { ActivityJournalContextButton } from '../activity-journal/components/ActivityJournalContextButton';
import {
  inputFromForm,
  statusOptions,
  violationReasonOptions,
  type ParticipationFormState,
} from './recruitingParticipationViewSupport';
import { suggestNextRecruitingStatus } from './recruitingViewLogic';

export function RecruitingProcedureForm({
  form,
  selected,
  saving,
  creating,
  onFormChange,
  onCreate,
  onUpdate,
  onClose,
}: {
  form: ParticipationFormState;
  selected: RecruitingParticipationRecord | null;
  saving: boolean;
  creating: boolean;
  onFormChange: (patch: Partial<ParticipationFormState>) => void;
  onCreate: () => void;
  onUpdate: () => void;
  onClose: () => void;
}) {
  const content = <FormSection
    kicker="Verfahrensdaten"
    title={selected ? 'Stellenbesetzung bearbeiten' : 'Stellenbesetzung anlegen'}
    description="Verfahrensstand und Anhörung vor Auswahlentscheidung."
    helpId="recruiting.procedureData"
    actions={selected ? <ActivityJournalContextButton compact label="Tätigkeit erfassen" context={{ contextType: 'recruiting_participation', contextId: selected.id, title: selected.vacancyTitle, category: 'participation' }} /> : null}
  >
    <div className="industrial-form-grid">
      <TextInput label="Stelle / Bezeichnung" required value={form.vacancyTitle} onValueChange={(vacancyTitle) => onFormChange({ vacancyTitle })} />
      <TextInput label="Kennziffer" value={form.vacancyReference} onValueChange={(vacancyReference) => onFormChange({ vacancyReference })} />
      <TextInput label="Organisationseinheit" value={form.department} onValueChange={(department) => onFormChange({ department })} />
      <TextInput label="Ort / Standort" value={form.location} onValueChange={(location) => onFormChange({ location })} />
      <SelectInput label="Status" value={form.status} options={statusOptions} onValueChange={(status) => onFormChange({ status: status as RecruitingParticipationStatus })} />
      <DateInput label="Unterrichtung erhalten" value={form.employerNoticeDate} onValueChange={(employerNoticeDate) => onFormChange({ employerNoticeDate })} />
      <TextInput label="Anzahl bekannter schwerbehinderter/gleichgestellter Bewerbungen" type="number" min="0" value={form.severelyDisabledApplicantCount} onValueChange={(severelyDisabledApplicantCount) => onFormChange({ severelyDisabledApplicantCount })} />
      <CheckboxField label="Schwerbehinderte / gleichgestellte Bewerbung bekannt" checked={form.hasSeverelyDisabledApplicants} onCheckedChange={(hasSeverelyDisabledApplicants) => onFormChange({ hasSeverelyDisabledApplicants })} />
      {form.employerNoticeDate ? <>
        <DateInput label="Unterlagen erhalten" value={form.documentsReceivedDate} onValueChange={(documentsReceivedDate) => onFormChange({ documentsReceivedDate })} />
        <CheckboxField label="Unterlagen vollständig" checked={form.documentsComplete} onCheckedChange={(documentsComplete) => onFormChange({ documentsComplete })} />
      </> : null}
      {form.hasSeverelyDisabledApplicants ? <>
        <DateInput label="Anhörung angefordert am" value={form.hearingRequestedDate} onValueChange={(hearingRequestedDate) => onFormChange({ hearingRequestedDate })} />
        <DateInput label="Anhörung / Stellungnahme bis" value={form.hearingDueDate} onValueChange={(hearingDueDate) => onFormChange({ hearingDueDate })} />
        {form.hearingRequestedDate || form.hearingDueDate ? <DateInput label="Stellungnahme abgegeben" value={form.statementSubmittedDate} onValueChange={(statementSubmittedDate) => onFormChange({ statementSubmittedDate })} /> : null}
        <CheckboxField label="SBV zu allen bekannten Gesprächen eingeladen" checked={form.sbvInvitedToAllKnownInterviews} onCheckedChange={(sbvInvitedToAllKnownInterviews) => onFormChange({ sbvInvitedToAllKnownInterviews })} />
        <CheckboxField label="SBV hat teilgenommen" checked={form.sbvParticipated} onCheckedChange={(sbvParticipated) => onFormChange({ sbvParticipated })} />
      </> : null}
      {form.statementSubmittedDate || form.status === 'decision_known' || form.status === 'closed' ? <>
        <DateInput label="Entscheidung bekannt" value={form.decisionKnownDate} onValueChange={(decisionKnownDate) => onFormChange({ decisionKnownDate })} />
        <DateInput label="BR-Verfahren / Vorlage bekannt" value={form.brProcedureDate} onValueChange={(brProcedureDate) => onFormChange({ brProcedureDate })} />
        <CheckboxField label="Entscheidung vor SBV-Anhörung dokumentiert" checked={form.decisionBeforeHearing} onCheckedChange={(decisionBeforeHearing) => onFormChange({ decisionBeforeHearing, flaggedForViolationReview: decisionBeforeHearing ? true : form.flaggedForViolationReview, violationReviewReason: decisionBeforeHearing ? 'decision_before_hearing' : form.violationReviewReason })} />
      </> : null}
      {form.hasSeverelyDisabledApplicants || form.decisionBeforeHearing ? <CheckboxField label="Zur Verstoßprüfung vormerken" checked={form.flaggedForViolationReview} onCheckedChange={(flaggedForViolationReview) => onFormChange({ flaggedForViolationReview })} helpId="participationViolations.sourceContext" /> : null}
      {form.flaggedForViolationReview ? <SelectInput label="Prüfanlass" value={form.violationReviewReason} options={violationReasonOptions} onValueChange={(violationReviewReason) => onFormChange({ violationReviewReason: violationReviewReason as RecruitingViolationReviewReason })} /> : null}
      <TextareaInput label="Verfahrensnotiz" wide value={form.notes} onValueChange={(notes) => onFormChange({ notes })} helpId="recruiting.proceduralNote" />
    </div>
    <div className="industrial-action-row mt-4">
      {selected
        ? <IndustrialButton loading={saving} onClick={onUpdate}><Save className="h-4 w-4" /> Speichern</IndustrialButton>
        : <IndustrialButton loading={saving} onClick={onCreate}><PlusCircle className="h-4 w-4" /> Stellenbesetzung anlegen</IndustrialButton>}
      {selected ? <ToolbarButton onClick={() => onFormChange({ status: suggestNextRecruitingStatus({ ...selected, ...inputFromForm(form) } as RecruitingParticipationRecord) })}>Status vorschlagen</ToolbarButton> : null}
    </div>
  </FormSection>;

  return creating
    ? <IndustrialModal title="Stellenbesetzung anlegen" kicker="Neuer Vorgang" onClose={onClose} wide>{content}</IndustrialModal>
    : content;
}
