import { useMemo, useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { SearchInput } from '../../shared/components/IndustrialForm';
import { filterHandoverCases, toggleHandoverCase } from './caseHandoverCockpitPolicy';

export function CaseHandoverCasePicker({
  cases,
  selectedIds,
  onChange,
  legend,
}: {
  cases: readonly CaseRecord[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  legend: string;
}) {
  const [query, setQuery] = useState('');
  const visibleCases = useMemo(() => filterHandoverCases(cases, query), [cases, query]);
  const selected = new Set(selectedIds);
  return <fieldset className="industrial-selection-card">
    <legend>{legend}</legend>
    {cases.length > 5 ? <SearchInput label="Fallakten filtern" value={query} onValueChange={setQuery} placeholder="Aktenzeichen, Name oder Kategorie …" /> : null}
    <div className="industrial-action-row mt-4">
      <ToolbarButton type="button" onClick={() => onChange([...new Set([...selectedIds, ...visibleCases.map((record) => record.id)])])}>Sichtbare auswählen</ToolbarButton>
      <ToolbarButton type="button" onClick={() => onChange(selectedIds.filter((id) => !visibleCases.some((record) => record.id === id)))}>Sichtbare abwählen</ToolbarButton>
      <span role="status" aria-live="polite">{selectedIds.length} von {cases.length} ausgewählt</span>
    </div>
    <div className="industrial-checkbox-grid mt-4">
      {visibleCases.map((record) => <div className="industrial-checkbox-row" key={record.id}>
        <label>
          <input type="checkbox" checked={selected.has(record.id)} onChange={() => onChange(toggleHandoverCase(selectedIds, record.id))} />
          <span><strong>{record.caseNumber}</strong><br /><small>{record.displayName} · {record.category}</small></span>
        </label>
      </div>)}
      {!visibleCases.length ? <p>Keine passende Fallakte gefunden.</p> : null}
    </div>
  </fieldset>;
}
