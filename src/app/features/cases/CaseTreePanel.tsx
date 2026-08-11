import { FileText, MessageSquare, ShieldAlert, Trash2, Workflow } from 'lucide-react';
import { IconButton } from '../../shared/components/IndustrialButton';
import type { CaseTreePanelProps } from './caseWorkbenchTypes';
import { requiresCaseProcessPrivacyReview } from './caseProcessPrivacy';


function PrivacyReviewMarker() {
  const message = 'Datenschutzprüfung erforderlich: weitere Speicherung der abgeschlossenen Maßnahme prüfen.';
  return <span className="case-tree-privacy-marker" role="img" aria-label={message}
    title="Datenschutzprüfung erforderlich: Prüfen, ob die weitere Speicherung dieser abgeschlossenen Maßnahme noch erforderlich ist.">
    <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
    <span aria-hidden="true">DS</span>
  </span>;
}

function ProcessNode({ id, processType, label, status, selection, onSelect, onDeleteProcess, subtitle, disabled }: {
  id: string; processType: Parameters<CaseTreePanelProps['formatProcessNodeSubtitle']>[0]; label: string; status?: string; selection: CaseTreePanelProps['selection'];
  onSelect: CaseTreePanelProps['onSelect']; onDeleteProcess?: CaseTreePanelProps['onDeleteProcess']; subtitle: string; disabled?: boolean;
}) {
  return <div className="case-tree-process-row">
    <button type="button" disabled={disabled} className={`case-tree-node ${selection.type === 'process' && selection.id === id ? 'active' : ''}`} onClick={() => onSelect({ type: 'process', processType, id })}>
      <span className="case-tree-process-title">{label}{requiresCaseProcessPrivacyReview(processType, status) ? <PrivacyReviewMarker /> : null}</span>
      <small>{subtitle}</small>
    </button>
    {onDeleteProcess ? <IconButton className="privacy-destructive-action case-tree-process-delete" aria-label={`${label} löschen`} title={`${label} löschen`} disabled={disabled} onClick={() => onDeleteProcess({ id, processType, label })}>
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </IconButton> : null}
  </div>;
}

export function CaseTreePanel({
  selectedCase,
  notes,
  documents,
  preventionProcesses,
  bemProcesses,
  equalizationProcesses,
  terminationProcesses,
  participationProcesses,
  workplaceAccommodationProcesses,
  isLoading = false,
  selection,
  onSelect,
  formatProcessNodeSubtitle,
  formatNoteDate,
  formatBytes,
  onDeleteProcess
}: CaseTreePanelProps) {
  return (
    <aside className="industrial-panel case-tree-panel">
      <p className="industrial-kicker">Fallakte</p>
      <h2>{selectedCase?.caseNumber ?? 'Keine Auswahl'}</h2>
      <p className="industrial-meta">{selectedCase?.displayName ?? 'Bitte oben einen Fall auswählen.'}</p>
      {isLoading ? (
        <p className="case-tree-loading" role="status" aria-live="polite">
          Fallstruktur wird geladen …
        </p>
      ) : null}

      <div className="case-tree-group process-drop-zone" aria-busy={isLoading ? "true" : undefined}>
        <div className="case-tree-group-title"><Workflow className="h-4 w-4" /> Maßnahmen <span>{preventionProcesses.length + bemProcesses.length + equalizationProcesses.length + terminationProcesses.length + participationProcesses.length + workplaceAccommodationProcesses.length}</span></div>
        {preventionProcesses.map((process) => <ProcessNode key={process.id} id={process.id} processType="prevention" label="Prävention" status={process.status} selection={selection} onSelect={onSelect} onDeleteProcess={onDeleteProcess} disabled={isLoading} subtitle={formatProcessNodeSubtitle('prevention', process.status)} />)}
        {bemProcesses.map((process) => <ProcessNode key={process.id} id={process.id} processType="bem" label="BEM" status={process.status} selection={selection} onSelect={onSelect} onDeleteProcess={onDeleteProcess} disabled={isLoading} subtitle={formatProcessNodeSubtitle('bem', process.status)} />)}
        {equalizationProcesses.map((process) => <ProcessNode key={process.id} id={process.id} processType="equalization" label="Gleichstellung" status={process.applicationStatus} selection={selection} onSelect={onSelect} onDeleteProcess={onDeleteProcess} disabled={isLoading} subtitle={formatProcessNodeSubtitle('equalization', process.applicationStatus)} />)}
        {terminationProcesses.map((process) => <ProcessNode key={process.id} id={process.id} processType="termination_hearing" label="Kündigung" status={process.status} selection={selection} onSelect={onSelect} onDeleteProcess={onDeleteProcess} disabled={isLoading} subtitle={formatProcessNodeSubtitle('termination_hearing', process.status)} />)}
        {participationProcesses.map((process) => <ProcessNode key={process.id} id={process.id} processType="participation" label="SBV-Beteiligung" status={process.status} selection={selection} onSelect={onSelect} onDeleteProcess={onDeleteProcess} disabled={isLoading} subtitle={formatProcessNodeSubtitle('participation', process.status)} />)}
        {workplaceAccommodationProcesses.map((process) => <ProcessNode key={process.id} id={process.id} processType="workplace_accommodation" label="Arbeitsplatzgestaltung" status={process.status} selection={selection} onSelect={onSelect} onDeleteProcess={onDeleteProcess} disabled={isLoading} subtitle={formatProcessNodeSubtitle('workplace_accommodation', process.status)} />)}
        {!preventionProcesses.length && !bemProcesses.length && !equalizationProcesses.length && !terminationProcesses.length && !participationProcesses.length && !workplaceAccommodationProcesses.length && <p className="case-tree-empty">Noch keine Maßnahme in dieser Akte.</p>}
      </div>

      <button type="button" className={`case-tree-node ${selection.type === 'overview' ? 'active' : ''}`} onClick={() => onSelect({ type: 'overview' })}>
        Übersicht
      </button>

      <div className="case-tree-group">
        <div className="case-tree-group-title"><MessageSquare className="h-4 w-4" /> Notizen & Protokolle <span>{notes.length}</span></div>
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            className={`case-tree-node ${selection.type === 'note' && selection.id === note.id ? 'active' : ''}`}
            onClick={() => onSelect({ type: 'note', id: note.id })}
          >
            <span>{note.title}</span>
            <small>{formatNoteDate(note.noteDate)} · {(note.caseNumbers ?? []).join(', ')}</small>
          </button>
        ))}
      </div>

      <div className="case-tree-group">
        <div className="case-tree-group-title"><FileText className="h-4 w-4" /> Dokumente <span>{documents.length}</span></div>
        {documents.map((document) => (
          <button
            key={document.id}
            type="button"
            className={`case-tree-node ${selection.type === 'document' && selection.id === document.id ? 'active' : ''}`}
            onClick={() => onSelect({ type: 'document', id: document.id })}
          >
            <span>{document.displayTitle}</span>
            <small>{formatBytes(document.sizeBytes)}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
