import type { CaseRecord } from '../../../domain/models/case.model';
import type { GremiaBrRemoteCase } from '../../../domain/models/gremia-br.model';
import { SearchableSelectInput, SelectInput } from '../../shared/components/IndustrialForm';
import { caseOptions } from './gremiaBrWorkspaceModel';

export function GremiaBrProcedureSelection({
  cases, remoteCases, localCaseId, remoteCaseId, procedureId, disabled, remoteDisabled,
  onLocalCaseChange, onRemoteCaseChange, onProcedureChange,
}: {
  cases: CaseRecord[];
  remoteCases: GremiaBrRemoteCase[];
  localCaseId: string;
  remoteCaseId: string;
  procedureId: string;
  disabled: boolean;
  remoteDisabled: boolean;
  onLocalCaseChange: (id: string) => void;
  onRemoteCaseChange: (id: string) => void;
  onProcedureChange: (id: string) => void;
}) {
  const remoteCase = remoteCases.find((item) => item.id === remoteCaseId);
  const availableProcedures = remoteCase?.procedureIds ?? [];
  return (
    <div className="industrial-form-grid two-columns">
      <SearchableSelectInput label="Lokale Fallakte" value={localCaseId} options={caseOptions(cases)} onValueChange={onLocalCaseChange} disabled={disabled} placeholder="Fallakte suchen …" required />
      <SearchableSelectInput
        label="Gremia.BR-Sachverhalt"
        value={remoteCaseId}
        options={remoteCases.filter((item) => item.procedureIds.length > 0).map((item) => ({ value: item.id, label: `${item.reference} · ${item.subject}` }))}
        onValueChange={onRemoteCaseChange}
        disabled={disabled || remoteDisabled}
        placeholder="Kennzeichen oder Betreff suchen …"
        required
      />
      {remoteCase ? (
        <SelectInput
          label="Verfahren im Sachverhalt"
          value={procedureId}
          options={[{ value: '', label: 'Verfahren auswählen …' }, ...availableProcedures.map((id, index) => ({ value: id, label: `Verfahren ${index + 1} von ${availableProcedures.length}` }))]}
          onValueChange={onProcedureChange}
          disabled={disabled}
          required
        />
      ) : null}
    </div>
  );
}
