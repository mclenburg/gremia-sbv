import { FileText, MessageSquare, Workflow, Wrench } from 'lucide-react';
import type { CaseTreePanelProps } from './caseWorkbenchTypes';

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
  selection,
  onSelect,
  formatProcessNodeSubtitle,
  formatNoteDate,
  formatBytes
}: CaseTreePanelProps) {
  return (
    <aside className="industrial-panel case-tree-panel">
      <p className="industrial-kicker">Fallakte</p>
      <h2>{selectedCase?.caseNumber ?? 'Keine Auswahl'}</h2>
      <p className="industrial-meta">{selectedCase?.displayName ?? 'Bitte oben einen Fall auswählen.'}</p>

      <div className="case-tree-group process-drop-zone">
        <div className="case-tree-group-title"><Workflow className="h-4 w-4" /> Maßnahmen <span>{preventionProcesses.length + bemProcesses.length + equalizationProcesses.length + terminationProcesses.length + participationProcesses.length + workplaceAccommodationProcesses.length}</span></div>
        {preventionProcesses.map((process) => (
          <button
            key={process.id}
            type="button"
            className={`case-tree-node ${selection.type === 'process' && selection.id === process.id ? 'active' : ''}`}
            onClick={() => onSelect({ type: 'process', processType: 'prevention', id: process.id })}
          >
            <span>Prävention</span>
            <small>{formatProcessNodeSubtitle('prevention', process.status)}</small>
          </button>
        ))}
        {bemProcesses.map((process) => (
          <button
            key={process.id}
            type="button"
            className={`case-tree-node ${selection.type === 'process' && selection.id === process.id ? 'active' : ''}`}
            onClick={() => onSelect({ type: 'process', processType: 'bem', id: process.id })}
          >
            <span>BEM</span>
            <small>{formatProcessNodeSubtitle('bem', process.status)}</small>
          </button>
        ))}
        {equalizationProcesses.map((process) => (
          <button
            key={process.id}
            type="button"
            className={`case-tree-node ${selection.type === 'process' && selection.id === process.id ? 'active' : ''}`}
            onClick={() => onSelect({ type: 'process', processType: 'equalization', id: process.id })}
          >
            <span>Gleichstellung</span>
            <small>{formatProcessNodeSubtitle('equalization', process.applicationStatus)}</small>
          </button>
        ))}
        {terminationProcesses.map((process) => (
          <button
            key={process.id}
            type="button"
            className={`case-tree-node ${selection.type === 'process' && selection.id === process.id ? 'active' : ''}`}
            onClick={() => onSelect({ type: 'process', processType: 'termination_hearing', id: process.id })}
          >
            <span>Kündigung</span>
            <small>{formatProcessNodeSubtitle('termination_hearing', process.status)}</small>
          </button>
        ))}

        {participationProcesses.map((process) => (
          <button
            key={process.id}
            type="button"
            className={`case-tree-node ${selection.type === 'process' && selection.id === process.id ? 'active' : ''}`}
            onClick={() => onSelect({ type: 'process', processType: 'participation', id: process.id })}
          >
            <span>SBV-Beteiligung</span>
            <small>{formatProcessNodeSubtitle('participation', process.status)}</small>
          </button>
        ))}


        {workplaceAccommodationProcesses.map((process) => (
          <button
            key={process.id}
            type="button"
            className={`case-tree-node ${selection.type === 'process' && selection.id === process.id ? 'active' : ''}`}
            onClick={() => onSelect({ type: 'process', processType: 'workplace_accommodation', id: process.id })}
          >
            <span><Wrench className="mr-1 inline h-3.5 w-3.5" />Arbeitsplatzgestaltung</span>
            <small>{formatProcessNodeSubtitle('workplace_accommodation', process.status)}</small>
          </button>
        ))}
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
