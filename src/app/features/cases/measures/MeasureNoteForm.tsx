import {
  IndustrialActionRow,
  IndustrialField,
  IndustrialFormGrid,
} from "../../../shared/components/WorkbenchLayout";
import { TextCommandTextarea } from "../../../shared/textCommands/TextCommandTextarea";
import type { MeasureNoteFormState } from "./measureNoteTypes";

export function MeasureNoteFields({
  fieldPrefix,
  form,
  onChange,
}: {
  fieldPrefix: string;
  form: MeasureNoteFormState;
  onChange: (patch: Partial<MeasureNoteFormState>) => void;
}) {
  return (
    <>
      <IndustrialFormGrid columns={3}>
        <IndustrialField label="Titel">
          <input value={form.title} onChange={(event) => onChange({ title: event.target.value })} />
        </IndustrialField>
        <IndustrialField label="Termin / Zeitpunkt">
          <input type="datetime-local" value={form.noteAt} onChange={(event) => onChange({ noteAt: event.target.value })} />
        </IndustrialField>
        <IndustrialField label="Beteiligte">
          <input value={form.participants} onChange={(event) => onChange({ participants: event.target.value })} placeholder="z. B. SBV, HR, betroffene Person" />
        </IndustrialField>
      </IndustrialFormGrid>
      <IndustrialFormGrid columns={2}>
        <IndustrialField label="Protokoll">
          <TextCommandTextarea
            fieldId={`${fieldPrefix}-content`}
            value={form.content}
            onChange={(event) => onChange({ content: event.currentTarget.value })}
            rows={6}
            placeholder="Was wurde besprochen, zugesagt oder offengelassen?"
          />
        </IndustrialField>
        <IndustrialField label="Nächste Schritte">
          <TextCommandTextarea
            fieldId={`${fieldPrefix}-next`}
            value={form.nextSteps}
            onChange={(event) => onChange({ nextSteps: event.currentTarget.value })}
            rows={6}
            placeholder="Wiedervorlage, Unterlagenanforderung, Frist, Eskalation …"
          />
        </IndustrialField>
      </IndustrialFormGrid>
    </>
  );
}

export function MeasureNoteForm({
  fieldPrefix,
  form,
  submitLabel,
  cancelLabel = "Abbrechen",
  onChange,
  onCancel,
  onSubmit,
}: {
  fieldPrefix: string;
  form: MeasureNoteFormState;
  submitLabel: string;
  cancelLabel?: string;
  onChange: (patch: Partial<MeasureNoteFormState>) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <MeasureNoteFields fieldPrefix={fieldPrefix} form={form} onChange={onChange} />
      <IndustrialActionRow>
        <button type="button" className="industrial-secondary-button" onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className="industrial-button" onClick={onSubmit}>{submitLabel}</button>
      </IndustrialActionRow>
    </>
  );
}
