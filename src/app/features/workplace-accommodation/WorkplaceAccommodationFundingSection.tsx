import type { UpdateWorkplaceAccommodationInput, WorkplaceAccommodationRecord } from '../../core/models/workplace-accommodation.model';
import { DeferredDateTimeInput, DeferredTextInput, DeferredTextareaInput } from '../../shared/components/IndustrialForm';

function toDateTimeLocal(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export function WorkplaceAccommodationFundingSection({ process, onUpdate }: {
  process: WorkplaceAccommodationRecord;
  onUpdate: (input: UpdateWorkplaceAccommodationInput) => void;
}) {
  return <fieldset className="industrial-subsection compact">
    <legend>Förderpfad Arbeitsplatzgestaltung</legend>
    <div className="industrial-form-grid">
      <DeferredTextInput label="Träger" value={process.fundingCarrier ?? ''} onCommit={(value) => onUpdate({ fundingCarrier: value })} />
      <DeferredDateTimeInput label="Antrag gestellt" value={toDateTimeLocal(process.fundingAppliedAt)} onCommit={(value) => onUpdate({ fundingAppliedAt: fromDateTimeLocal(value) })} />
      <DeferredTextInput label="Unterlagenstatus" value={process.fundingDocumentsStatus ?? ''} onCommit={(value) => onUpdate({ fundingDocumentsStatus: value })} />
      <DeferredTextInput label="Förderbetrag optional" value={process.fundingAmount === undefined ? '' : String(process.fundingAmount)} onCommit={(value) => {
        const amount = value.trim() ? Number(value.replace(',', '.')) : undefined;
        if (amount === undefined || Number.isFinite(amount)) onUpdate({ fundingAmount: amount });
      }} />
      <DeferredDateTimeInput label="Bestellung / Beauftragung" value={toDateTimeLocal(process.orderedAt)} onCommit={(value) => onUpdate({ orderedAt: fromDateTimeLocal(value) })} />
    </div>
    <div className="industrial-form-grid two-columns">
      <DeferredTextareaInput label="Rückfragen des Trägers" value={process.fundingQuestions ?? ''} textCommandFieldId="workplace-funding-questions" rows={3} onCommit={(value) => onUpdate({ fundingQuestions: value })} wide />
      <DeferredTextareaInput label="Förderentscheidung" value={process.fundingDecision ?? ''} textCommandFieldId="workplace-funding-decision" rows={3} onCommit={(value) => onUpdate({ fundingDecision: value })} wide />
    </div>
  </fieldset>;
}
