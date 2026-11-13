import { useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverCockpitItem } from '../../../domain/models/case-handover.model';
import { SelectInput } from '../../shared/components/IndustrialForm';
import { HandoverReturnPanel } from './HandoverReturnPanel';
import { MobileReturnImportPanel } from './MobileReturnImportPanel';
import { VacationV5ReturnExportPanel } from './VacationV5ReturnExportPanel';

export function HandoverReturnTab({
  items,
  cases,
  onCompleted,
}: {
  items: CaseHandoverCockpitItem[];
  cases: CaseRecord[];
  onCompleted: () => Promise<void>;
}) {
  const [mode, setMode] = useState('');
  return <div className="industrial-stack">
    <SelectInput label="Rückgabeablauf" value={mode} onValueChange={setMode} options={[
      { value: '', label: 'Bitte Rückgabeart wählen' },
      { value: 'v5', label: 'Erweiterte Vertretung zurückgeben' },
      { value: 'legacy', label: 'Fallvertretung zurückgeben' },
      { value: 'mobile', label: 'Mobile Änderungen übernehmen' },
    ]} />
    {mode === 'v5' ? <VacationV5ReturnExportPanel onCompleted={onCompleted} /> : null}
    {mode === 'legacy' ? <HandoverReturnPanel items={items} cases={cases} onCompleted={onCompleted} /> : null}
    {mode === 'mobile' ? <MobileReturnImportPanel onImported={onCompleted} /> : null}
  </div>;
}
