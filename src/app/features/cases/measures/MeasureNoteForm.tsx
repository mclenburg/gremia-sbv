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
  const protocolHelpId = `${fieldPrefix}-content-privacy-help`;
  const nextStepsHelpId = `${fieldPrefix}-next-steps-help`;

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
            aria-describedby={protocolHelpId}
          />
          <small id={protocolHelpId} className="industrial-field-help">Datensparsam dokumentieren: Zusagen, offene Punkte und arbeitsbezogene Beobachtungen reichen regelmäßig aus.</small>
        </IndustrialField>
        <IndustrialField label="Nächste Schritte">
          <TextCommandTextarea
            fieldId={`${fieldPrefix}-next`}
            value={form.nextSteps}
            onChange={(event) => onChange({ nextSteps: event.currentTarget.value })}
            rows={6}
            placeholder="Wiedervorlage, Unterlagenanforderung, Frist, Eskalation …"
            aria-describedby={nextStepsHelpId}
          />
          <small id={nextStepsHelpId} className="industrial-field-help">Nächsten sauberen Schritt konkret erfassen: Verantwortliche, Termin und Eskalationspfad.</small>
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
  const protocolHelpId = `${fieldPrefix}-content-privacy-help`;
  const nextStepsHelpId = `${fieldPrefix}-next-steps-help`;

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
