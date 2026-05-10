import { Download, UploadCloud } from 'lucide-react';
import type { ProtectedPersonRecord } from '../../core/models/protected-person.model';
import type { PersonPrivacyActionMode } from './PersonPrivacyActionDialog';

interface PersonToolbarProps {
  query: string;
  selected: ProtectedPersonRecord | null;
  onQueryChange: (query: string) => void;
  onOpenCreate: () => void;
  onOpenCaseCreate: () => void;
  onOpenPrivacyAction: (mode: PersonPrivacyActionMode) => void;
  onOpenImport: () => void;
  onExportIcal: () => void;
}

export function PersonToolbar({ query, selected, onQueryChange, onOpenCreate, onOpenCaseCreate, onOpenPrivacyAction, onOpenImport, onExportIcal }: PersonToolbarProps) {
  return (
    <div className="person-toolbar">
      <label className="person-search"><span>Person suchen</span><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Name, E-Mail, Organisationseinheit" /></label>
      <button type="button" className="industrial-button" data-e2e="open-person-create-dialog" onClick={onOpenCreate}>Person anlegen</button>
      <button type="button" className="industrial-button" disabled={!selected} data-e2e="create-case-from-selected-person" onClick={onOpenCaseCreate}>Fallakte aus Person anlegen</button>
      <button type="button" className="industrial-secondary-button" disabled={!selected || selected.lifecycleState === 'anonymized'} data-e2e="open-person-anonymize-dialog" onClick={() => onOpenPrivacyAction('anonymize')}>Person anonymisieren</button>
      <button type="button" className="industrial-button" onClick={onOpenImport} data-e2e="open-person-import-wizard"><UploadCloud className="h-4 w-4" aria-hidden="true" /> Personen importieren</button>
      <button type="button" className="industrial-secondary-button" onClick={onExportIcal}><Download className="h-4 w-4" aria-hidden="true" /> Fristen exportieren</button>
    </div>
  );
}
