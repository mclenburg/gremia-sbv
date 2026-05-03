import { CalendarPlus, FileText, Plus, Workflow } from 'lucide-react';
import type { CaseProcessType } from './caseWorkbenchTypes';

export function CaseWorkbenchFooter({
  disabled,
  onNewNote,
  onImportDocument,
  onDeadline,
  onProcess
}: {
  disabled: boolean;
  onNewNote: () => void;
  onImportDocument: () => void;
  onDeadline: () => void;
  onProcess: (type: CaseProcessType) => void;
}) {
  return (
    <footer className="case-workbench-footer" aria-label="Neue Akteneinträge">
      <button type="button" className="industrial-button" disabled={disabled} onClick={onNewNote}><Plus className="h-4 w-4" />Notiz / Protokoll</button>
      <button type="button" className="industrial-button" disabled={disabled} onClick={onImportDocument}><FileText className="h-4 w-4" />Dokument</button>
      <button type="button" className="industrial-button" disabled={disabled} onClick={onDeadline}><CalendarPlus className="h-4 w-4" />Frist</button>
      <button type="button" className="industrial-button" disabled={disabled} onClick={() => onProcess('prevention')}><Workflow className="h-4 w-4" />Prävention</button>
      <button type="button" className="industrial-secondary-button" disabled={disabled} onClick={() => onProcess('bem')}>BEM</button>
      <button type="button" className="industrial-secondary-button" disabled={disabled} onClick={() => onProcess('termination_hearing')}>Kündigungsanhörung</button>
      <button type="button" className="industrial-secondary-button" disabled={disabled} onClick={() => onProcess('equalization')}>Gleichstellung</button>
    </footer>
  );
}
