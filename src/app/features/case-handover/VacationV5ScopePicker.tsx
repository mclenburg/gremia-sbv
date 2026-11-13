import { useMemo, useState } from 'react';
import type { VacationV5ScopeCandidate, VacationV5ScopeKey } from '../../../domain/transfer/vacationV5File';
import type { VacationV5ScopeSelection } from '../../../domain/transfer/vacationV5ScopePolicy';
import { SearchInput } from '../../shared/components/IndustrialForm';

const GROUPS: Array<{ key: VacationV5ScopeKey; label: string }> = [
  { key: 'caseIds', label: 'Fallakten' }, { key: 'standaloneDeadlineIds', label: 'Fallfreie Fristen und Wiedervorlagen' },
  { key: 'meetingIds', label: 'Sitzungen und Tagesordnung' }, { key: 'recruitingIds', label: 'Stellenbesetzung und Gespräche' },
  { key: 'employerObligationIds', label: 'Arbeitgeberpflichten' },
  { key: 'inclusionAgreementIds', label: 'Inklusionsvereinbarungen' },
  { key: 'violationIds', label: 'Allgemeine Beteiligungsverstöße' },
  { key: 'assemblyIds', label: 'SBV-Versammlungen' },
  { key: 'inclusionOfficerSnapshotId', label: 'Inklusionsbeauftragter' },
];

function selected(selection: VacationV5ScopeSelection, candidate: VacationV5ScopeCandidate): boolean {
  if (candidate.scopeKey === 'inclusionOfficerSnapshotId') return selection.inclusionOfficerSnapshotId === candidate.id;
  return selection[candidate.scopeKey].includes(candidate.id);
}

function CandidateGroup({ group, candidates, selection, documentIds, onToggle, onToggleDocument }: {
  group: (typeof GROUPS)[number]; candidates: VacationV5ScopeCandidate[];
  selection: VacationV5ScopeSelection; documentIds: readonly string[];
  onToggle: (candidate: VacationV5ScopeCandidate) => void; onToggleDocument: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('de-DE');
    const matches = term ? candidates.filter((candidate) =>
      `${candidate.label} ${candidate.detail}`.toLocaleLowerCase('de-DE').includes(term)) : candidates;
    return matches.slice(0, 20);
  }, [candidates, query]);
  const selectedCount = candidates.filter((candidate) => selected(selection, candidate)).length;
  return <fieldset className="industrial-selection-card">
    <legend>{group.label}</legend>
    {candidates.length > 5 ? <SearchInput label={`${group.label} filtern`} value={query} onValueChange={setQuery} /> : null}
    <p className="industrial-meta" role="status">{selectedCount} von {candidates.length} ausgewählt
      {candidates.length > visible.length ? ` · ${visible.length} Treffer angezeigt` : ''}</p>
    <div className="handover-case-picker-list">
      {visible.map((candidate) => <div className="handover-case-picker-row" key={candidate.id}>
        <label><input className="industrial-input" type="checkbox" checked={selected(selection, candidate)}
          onChange={() => onToggle(candidate)} />
          <span><strong>{candidate.label}</strong><small>{candidate.detail}
            {candidate.dueAt ? ` · ${new Date(candidate.dueAt).toLocaleDateString('de-DE')}` : ''}
            {candidate.recommended ? ' · im Vertretungszeitraum' : ''}</small></span></label>
        {selected(selection, candidate) && candidate.documents.length ? <div className="industrial-stack">
          {candidate.documents.map((document) => <label className="industrial-checkbox-row" key={document.id}>
            <input className="industrial-input" type="checkbox" checked={documentIds.includes(document.id)}
              onChange={() => onToggleDocument(document.id)} />
            <span>{document.filename} · {new Intl.NumberFormat('de-DE').format(document.sizeBytes)} Byte
              {document.containsHealthData ? ' · Gesundheitsdaten' : ''}</span></label>)}
        </div> : null}
      </div>)}
    </div>
  </fieldset>;
}

export function VacationV5ScopePicker(props: {
  candidates: VacationV5ScopeCandidate[]; selection: VacationV5ScopeSelection; documentIds: readonly string[];
  onToggle: (candidate: VacationV5ScopeCandidate) => void; onToggleDocument: (id: string) => void;
}) {
  return <div className="industrial-stack">{GROUPS.map((group) => {
    const candidates = props.candidates.filter((candidate) => candidate.scopeKey === group.key);
    return candidates.length ? <CandidateGroup key={group.key} {...props} group={group} candidates={candidates} /> : null;
  })}</div>;
}
