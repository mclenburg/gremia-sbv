import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { TextareaInput, TextInput } from '../../shared/components/IndustrialForm';

export function GremiaBrInformationRequestComposer({
  items, reason, dueDate, busy, disabled, onItemsChange, onReasonChange, onDueDateChange, onCreate,
}: {
  items: string;
  reason: string;
  dueDate: string;
  busy: boolean;
  disabled: boolean;
  onItemsChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="industrial-form-section">
      <h3>Informationen anfordern</h3>
      <div className="industrial-form-grid two-columns">
        <TextareaInput label="Welche Angaben fehlen?" value={items} onValueChange={onItemsChange} maxLength={4096} disabled={disabled || busy} wide required />
        <TextareaInput label="Begründung" value={reason} onValueChange={onReasonChange} maxLength={1024} disabled={disabled || busy} wide />
        <TextInput label="Antwortfrist" type="date" value={dueDate} onValueChange={onDueDateChange} disabled={disabled || busy} />
      </div>
      <div className="industrial-action-row">
        <IndustrialButton disabled={disabled || busy || !items.trim()} loading={busy} onClick={onCreate}>Informationsanforderung erstellen</IndustrialButton>
      </div>
    </div>
  );
}
