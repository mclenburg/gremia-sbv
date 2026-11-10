import type { VacationHandoverFormatVersion } from '../../../domain/models/case-handover.model';
import { SelectInput } from '../../shared/components/IndustrialForm';

export function VacationHandoverCompatibilityField({ value, onChange }: {
  value: VacationHandoverFormatVersion;
  onChange: (value: VacationHandoverFormatVersion) => void;
}) {
  return <>
    <SelectInput
      label="Zielformat der Vertretungsinstanz"
      value={String(value)}
      options={[
        { value: '4', label: 'Aktuelle Gremia.SBV-Version' },
        { value: '2', label: 'Ältere Version seit Einführung der Instanz-ID' },
      ]}
      onValueChange={(next) => onChange(Number(next) as VacationHandoverFormatVersion)}
      wide
    />
    {value === 2 ? <p className="industrial-modal-preview industrial-modal-wide" role="note">Ältere Zielversion: Empfängerkennung und Transport-Passphrase sind erforderlich. Ob die Zielversion ein Rückgabe-Delta erstellen kann, hängt von ihrem Funktionsstand ab.</p> : null}
  </>;
}
