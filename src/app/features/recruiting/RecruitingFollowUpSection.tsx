import { AlertTriangle, CalendarClock, ClipboardList } from 'lucide-react';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { DateInput, FormSection } from '../../shared/components/IndustrialForm';

export function RecruitingFollowUpSection({ dueAt, saving, onDueAtChange, onFollowUp, onViolationReview }: {
  dueAt: string;
  saving: boolean;
  onDueAtChange: (value: string) => void;
  onFollowUp: (kind: 'documents' | 'hearing') => void;
  onViolationReview: () => void;
}) {
  return (
    <FormSection kicker="Nachhaltung" title="Wiedervorlage anlegen" helpId="recruiting.deadlineFollowUp">
      <div className="industrial-form-grid">
        <DateInput label="Wiedervorlage am" value={dueAt} onValueChange={onDueAtChange} />
      </div>
      <div className="industrial-action-row">
        <IndustrialButton variant="secondary" onClick={() => onFollowUp('documents')}><CalendarClock className="industrial-icon" /> Unterlagen nachhalten</IndustrialButton>
        <IndustrialButton variant="secondary" onClick={() => onFollowUp('hearing')}><ClipboardList className="industrial-icon" /> Anhörung nachhalten</IndustrialButton>
        <IndustrialButton variant="danger" loading={saving} onClick={onViolationReview}><AlertTriangle className="industrial-icon" /> Beteiligungsverstoß prüfen</IndustrialButton>
      </div>
    </FormSection>
  );
}
