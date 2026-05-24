import { Plus, Save } from 'lucide-react';
import type {
  SbvResourceRecordKind,
  SbvResourceRecordStatus,
} from '../../../core/models/sbv-resource.model';
import {
  DateInput,
  FormActions,
  SelectInput,
  TextareaInput,
  TextInput,
} from '../../../shared/components/IndustrialForm';
import { IndustrialButton, ToolbarButton } from '../../../shared/components/IndustrialButton';
import { resourceKindLabels, resourceStatusLabels } from '../sbvControlTypes';
import type { UseSbvResourcesValue } from '../hooks/useSbvResources';

export function ResourceForm({
  state,
  onSubmit,
}: {
  state: UseSbvResourcesValue;
  onSubmit: () => void;
}) {
  const { resourceForm, resourceTitleError, editingResourceId } = state;

  return (
    <form
      className="sbv-resource-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <SelectInput
        label="Art"
        value={resourceForm.kind}
        options={Object.entries(resourceKindLabels).map(([value, label]) => ({ value, label }))}
        onValueChange={(value) => state.updateResourceForm('kind', value as SbvResourceRecordKind)}
      />
      <TextInput
        label="Titel / Anlass"
        value={resourceForm.title ?? ''}
        onValueChange={(value) => state.updateResourceForm('title', value)}
        onBlur={() => state.setResourceTitleTouched(true)}
        placeholder="z. B. Grundlagenschulung SBV I oder Heranziehung wegen BEM-Begleitung"
        required
        error={resourceTitleError}
      />
      <TextInput
        label="Rechtsgrundlage"
        value={resourceForm.legalBasis ?? ''}
        onValueChange={(value) => state.updateResourceForm('legalBasis', value)}
      />
      <div className="sbv-resource-form-row">
        <DateInput
          label="Beginn / Datum"
          value={resourceForm.startedAt ?? ''}
          onValueChange={(value) => state.updateResourceForm('startedAt', value)}
        />
        <DateInput
          label="Ende"
          value={resourceForm.endedAt ?? ''}
          onValueChange={(value) => state.updateResourceForm('endedAt', value)}
        />
        <SelectInput
          label="Status"
          value={resourceForm.status ?? 'documented'}
          options={Object.entries(resourceStatusLabels).map(([value, label]) => ({ value, label }))}
          onValueChange={(value) => state.updateResourceForm('status', value as SbvResourceRecordStatus)}
        />
      </div>
      <TextInput
        label="Anbieter / Beteiligte"
        value={resourceForm.provider ?? ''}
        onValueChange={(value) => state.updateResourceForm('provider', value)}
        placeholder="Seminaranbieter, Stellvertretung, IT, Arbeitgeber …"
      />
      <TextInput
        label="Teilnehmende / herangezogene Personen"
        value={resourceForm.participants ?? ''}
        onValueChange={(value) => state.updateResourceForm('participants', value)}
        placeholder="nur soweit für den Nachweis erforderlich"
      />
      <TextareaInput
        label="Aufgabenbezug / Anlass"
        rows={3}
        value={resourceForm.taskContext ?? ''}
        onValueChange={(value) => state.updateResourceForm('taskContext', value)}
        placeholder="Warum war die Schulung, Heranziehung oder Ausstattung für die SBV-Arbeit erforderlich?"
      />
      <TextareaInput
        label="Erforderlichkeit / Begründung"
        rows={3}
        value={resourceForm.necessityReason ?? ''}
        onValueChange={(value) => state.updateResourceForm('necessityReason', value)}
        placeholder="Rechtssichere Begründung für Kosten, Freistellung, Heranziehung oder Ausstattung."
      />
      <div className="sbv-resource-form-row">
        <TextInput
          label="Arbeitgeberreaktion"
          value={resourceForm.employerReaction ?? ''}
          onValueChange={(value) => state.updateResourceForm('employerReaction', value)}
          placeholder="zugestimmt, offen, abgelehnt, Rückfrage …"
        />
        <TextInput
          label="Kosten / Sachstand"
          value={resourceForm.costNote ?? ''}
          onValueChange={(value) => state.updateResourceForm('costNote', value)}
          placeholder="Kostenrahmen, Freistellung, Sachmittel …"
        />
      </div>
      <TextareaInput
        label="Notiz"
        rows={3}
        value={resourceForm.notes ?? ''}
        onValueChange={(value) => state.updateResourceForm('notes', value)}
      />
      <FormActions className="sbv-resource-actions">
        <IndustrialButton type="submit" disabled={!resourceForm.title?.trim()}>
          <Save className="h-4 w-4" />
          {editingResourceId ? 'Nachweis aktualisieren' : 'Nachweis speichern'}
        </IndustrialButton>
        {editingResourceId && (
          <ToolbarButton onClick={state.resetResourceForm}>
            <Plus className="h-4 w-4" />
            Neu erfassen
          </ToolbarButton>
        )}
      </FormActions>
    </form>
  );
}
