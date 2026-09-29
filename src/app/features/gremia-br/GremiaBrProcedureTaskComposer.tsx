import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { TextareaInput, TextInput } from '../../shared/components/IndustrialForm';

export function GremiaBrProcedureTaskComposer({
  title, description, dueDate, busy, disabled, onTitleChange, onDescriptionChange, onDueDateChange, onCreate,
}: {
  title: string;
  description: string;
  dueDate: string;
  busy: boolean;
  disabled: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="industrial-form-section">
      <h3>Eigene Aufgabe anlegen</h3>
      <div className="industrial-form-grid two-columns">
        <TextInput label="Aufgabentitel" value={title} onValueChange={onTitleChange} maxLength={512} disabled={disabled || busy} wide required />
        <TextareaInput label="Beschreibung" value={description} onValueChange={onDescriptionChange} maxLength={4096} disabled={disabled || busy} wide />
        <TextInput label="Fällig am" type="date" value={dueDate} onValueChange={onDueDateChange} disabled={disabled || busy} />
      </div>
      <div className="industrial-action-row">
        <IndustrialButton disabled={disabled || busy || !title.trim()} loading={busy} onClick={onCreate}>Eigene Aufgabe in Gremia.BR anlegen</IndustrialButton>
      </div>
    </div>
  );
}
