import { Download, UploadCloud } from 'lucide-react';
import { SearchInput } from '../../shared/components/IndustrialForm';

interface PersonToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenCreate: () => void;
  onOpenImport: () => void;
  onExportIcal: () => void;
}

export function PersonToolbar({ query, onQueryChange, onOpenCreate, onOpenImport, onExportIcal }: PersonToolbarProps) {
  return (
    <div className="person-toolbar">
      <SearchInput
        label="Person suchen"
        value={query}
        onValueChange={onQueryChange}
        placeholder="Name, E-Mail, Organisationseinheit"
        className="person-search-input"
      />
      <button type="button" className="industrial-button" data-e2e="open-person-create-dialog" onClick={onOpenCreate}>Person anlegen</button>
      <button type="button" className="industrial-button" onClick={onOpenImport} data-e2e="open-person-import-wizard"><UploadCloud className="h-4 w-4" aria-hidden="true" /> Personen importieren</button>
      <button type="button" className="industrial-secondary-button" onClick={onExportIcal}><Download className="h-4 w-4" aria-hidden="true" /> Fristen exportieren</button>
    </div>
  );
}
