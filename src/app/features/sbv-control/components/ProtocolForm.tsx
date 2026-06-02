import { Plus, Save } from 'lucide-react';
import type { SbvControlProtocolPartner, SbvControlProtocolStatus, SbvControlProtocolTopic } from '../../../core/models/sbv-control-protocol.model';
import { DateInput, FormActions, SelectInput, TextareaInput, TextInput } from '../../../shared/components/IndustrialForm';
import { IndustrialButton, ToolbarButton } from '../../../shared/components/IndustrialButton';
import { protocolPartnerLabels, protocolStatusLabels, protocolTopicLabels } from '../sbvControlTypes';
import type { UseSbvControlProtocolsValue } from '../hooks/useSbvControlProtocols';

export function ProtocolForm({
  state,
  onSubmit,
}: {
  state: UseSbvControlProtocolsValue;
  onSubmit: () => void;
}) {
  const { protocolForm, protocolTitleError, editingProtocolId } = state;

  return (
    <form
      className="sbv-resource-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <TextInput
        label="Titel / Anlass"
        value={protocolForm.title ?? ''}
        onValueChange={(value) => state.updateProtocolForm('title', value)}
        onBlur={() => state.setProtocolTitleTouched(true)}
        placeholder="z. B. Gespräch zur Homeoffice-Regelung oder Anpassung Inklusionsvereinbarung"
        required
        error={protocolTitleError}
      />
      <div className="sbv-resource-form-row">
        <DateInput
          label="Datum"
          value={protocolForm.meetingAt ?? ''}
          onValueChange={(value) => state.updateProtocolForm('meetingAt', value)}
        />
        <SelectInput
          label="Gesprächspartner"
          value={protocolForm.partner ?? 'employer'}
          options={Object.entries(protocolPartnerLabels).map(([value, label]) => ({ value, label }))}
          onValueChange={(value) => state.updateProtocolForm('partner', value as SbvControlProtocolPartner)}
        />
        <SelectInput
          label="Status"
          value={protocolForm.status ?? 'documented'}
          options={Object.entries(protocolStatusLabels).map(([value, label]) => ({ value, label }))}
          onValueChange={(value) => state.updateProtocolForm('status', value as SbvControlProtocolStatus)}
        />
      </div>
      <SelectInput
        label="Thema"
        value={protocolForm.topic ?? 'workplace_rules'}
        options={Object.entries(protocolTopicLabels).map(([value, label]) => ({ value, label }))}
        onValueChange={(value) => state.updateProtocolForm('topic', value as SbvControlProtocolTopic)}
      />
      <TextInput
        label="Rechts-/Aufgabenbezug"
        value={protocolForm.legalContext ?? ''}
        onValueChange={(value) => state.updateProtocolForm('legalContext', value)}
      />
      <TextInput
        label="Teilnehmende / Rollen"
        value={protocolForm.participants ?? ''}
        onValueChange={(value) => state.updateProtocolForm('participants', value)}
        placeholder="z. B. Arbeitgeber, BR-Vorsitz, SBV; keine unnötigen Personendaten"
      />
      <TextareaInput
        label="Besprochene Punkte"
        rows={4}
        value={protocolForm.discussion ?? ''}
        onValueChange={(value) => state.updateProtocolForm('discussion', value)}
        placeholder="Übergreifende Punkte ohne Fallzuordnung dokumentieren. Keine Diagnosen oder Einzelfallakten übertragen."
      />
      <TextareaInput
        label="Ergebnis / Position der SBV"
        rows={3}
        value={protocolForm.result ?? ''}
        onValueChange={(value) => state.updateProtocolForm('result', value)}
      />
      <TextareaInput
        label="Nächste Schritte / Wiedervorlage"
        rows={3}
        value={protocolForm.nextSteps ?? ''}
        onValueChange={(value) => state.updateProtocolForm('nextSteps', value)}
      />
      <FormActions className="sbv-resource-actions">
        <IndustrialButton type="submit" disabled={!protocolForm.title?.trim()}>
          <Save className="h-4 w-4" />
          {editingProtocolId ? 'Protokoll aktualisieren' : 'Protokoll speichern'}
        </IndustrialButton>
        {editingProtocolId && (
          <ToolbarButton onClick={state.resetProtocolForm}>
            <Plus className="h-4 w-4" />
            Neu erfassen
          </ToolbarButton>
        )}
      </FormActions>
    </form>
  );
}
