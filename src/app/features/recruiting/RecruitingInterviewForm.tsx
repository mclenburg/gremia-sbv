import { BriefcaseBusiness } from 'lucide-react';
import type { RecruitingAccessibilityCheckStatus, RecruitingApplicantReferenceMode, RecruitingApplicantStatus } from '../../../domain/models/recruiting-participation.model';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { CheckboxField, DateInput, FormSection, SelectInput, TextInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { type InterviewFormState, applicantStatusOptions, applicantReferenceModeOptions, accessibilityOptions } from './recruitingParticipationViewSupport';

export function RecruitingInterviewForm({ interviewForm, saving, updateInterviewForm, onAdd }: {
  interviewForm: InterviewFormState;
  saving: boolean;
  updateInterviewForm: (patch: Partial<InterviewFormState>) => void;
  onAdd: () => void;
}) {
  return (
    <FormSection kicker="Vorstellungsgespräche" title="Beteiligungsereignis hinzufügen" helpId="recruiting.interviewEvent">
      <div className="industrial-form-grid">
        <DateInput label="Gesprächsdatum" value={interviewForm.interviewDate} onValueChange={(value) => updateInterviewForm({ interviewDate: value })} />
        <TextInput label="Bewerbungsreferenz" value={interviewForm.applicantRef} onValueChange={(value) => updateInterviewForm({ applicantRef: value })} helpId="recruiting.applicantReference" />
        <SelectInput label="Referenzmodus" value={interviewForm.applicantReferenceMode} options={applicantReferenceModeOptions} onValueChange={(value) => updateInterviewForm({ applicantReferenceMode: value as RecruitingApplicantReferenceMode })} />
        <SelectInput label="Schutzstatus im Verfahren" value={interviewForm.applicantStatus} options={applicantStatusOptions} onValueChange={(value) => updateInterviewForm({ applicantStatus: value as RecruitingApplicantStatus })} />
        <DateInput label="SBV-Einladung am" value={interviewForm.sbvInvitationDate} onValueChange={(value) => updateInterviewForm({ sbvInvitationDate: value })} />
        <SelectInput label="Barrierefreiheit Gespräch" value={interviewForm.accessibilityCheckStatus} options={accessibilityOptions} onValueChange={(value) => updateInterviewForm({ accessibilityCheckStatus: value as RecruitingAccessibilityCheckStatus })} />
        <CheckboxField label="SBV eingeladen" checked={interviewForm.sbvInvited} onCheckedChange={(checked) => updateInterviewForm({ sbvInvited: checked })} />
        <CheckboxField label="SBV teilgenommen" checked={interviewForm.sbvAttended} onCheckedChange={(checked) => updateInterviewForm({ sbvAttended: checked })} />
        <CheckboxField label="Nachhaltung erforderlich" checked={interviewForm.followUpNeeded} onCheckedChange={(checked) => updateInterviewForm({ followUpNeeded: checked })} />
        <TextareaInput label="Verfahrensnotiz zum Ereignis" wide value={interviewForm.proceduralNote} onValueChange={(value) => updateInterviewForm({ proceduralNote: value })} helpId="recruiting.proceduralNote" />
      </div>
      <div className="industrial-action-row">
        <IndustrialButton loading={saving} onClick={onAdd}><BriefcaseBusiness className="industrial-icon" /> Gespräch erfassen</IndustrialButton>
      </div>
    </FormSection>
  );
}
