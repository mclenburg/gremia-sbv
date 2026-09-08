import { useMemo, useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { SearchInput } from '../../shared/components/IndustrialForm';
import { filterHandoverCases, toggleHandoverCase } from './caseHandoverCockpitPolicy';

const MAX_VISIBLE_CASE_OPTIONS = 20;

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
  const displayedCases = visibleCases.slice(0, MAX_VISIBLE_CASE_OPTIONS);
  const selectedCases = useMemo(() => cases.filter((record) => selectedIds.includes(record.id)), [cases, selectedIds]);
  const selected = new Set(selectedIds);
  return <fieldset className="industrial-selection-card">
    <legend>{legend}</legend>
    {cases.length > 5 ? <SearchInput label="Fallakten filtern" value={query} onValueChange={setQuery} placeholder="Aktenzeichen, Name oder Kategorie …" /> : null}
    <div className="industrial-action-row">
      <ToolbarButton type="button" onClick={() => onChange([...new Set([...selectedIds, ...displayedCases.map((record) => record.id)])])}>Angezeigte auswählen</ToolbarButton>
      <ToolbarButton type="button" onClick={() => onChange(selectedIds.filter((id) => !displayedCases.some((record) => record.id === id)))}>Angezeigte abwählen</ToolbarButton>
      <span role="status" aria-live="polite">{selectedIds.length} von {cases.length} ausgewählt</span>
    </div>
    {visibleCases.length > displayedCases.length ? (
      <p className="industrial-meta" role="status" aria-live="polite">
        {displayedCases.length} von {visibleCases.length} Treffern angezeigt. Bitte filtern, um weitere Fallakten gezielt auszuwählen.
      </p>
    ) : null}
    <div className="handover-case-picker-list" aria-label={`${legend}: Treffer`}>
      {displayedCases.map((record) => <div className="handover-case-picker-row" key={record.id}>
        <label>
          <input type="checkbox" checked={selected.has(record.id)} onChange={() => onChange(toggleHandoverCase(selectedIds, record.id))} className="industrial-input" />
          <span><strong>{record.caseNumber}</strong><small>{record.displayName} · {record.category} · {record.status}</small></span>
        </label>
      </div>)}
      {!visibleCases.length ? <p>Keine passende Fallakte gefunden.</p> : null}
    </div>
    <div className="handover-selected-cases" aria-label="Ausgewählte Fallakten">
      {selectedCases.length ? selectedCases.slice(0, 8).map((record) => (
        <span className="handover-selected-case-chip" key={record.id}>
          {record.caseNumber} · {record.displayName}
        </span>
      )) : <span className="industrial-meta">Keine Fallakte ausgewählt.</span>}
      {selectedCases.length > 8 ? <span className="industrial-meta">+ {selectedCases.length - 8} weitere ausgewählt</span> : null}
    </div>
  </fieldset>;
}
