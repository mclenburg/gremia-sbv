import { Download, UploadCloud } from 'lucide-react';
import { SearchInput } from '../../shared/components/IndustrialForm';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';

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
      <IndustrialButton data-e2e="open-person-create-dialog" onClick={onOpenCreate}>Person anlegen</IndustrialButton>
      <ToolbarButton onClick={onOpenImport} data-e2e="open-person-import-wizard"><UploadCloud className="h-4 w-4" aria-hidden="true" /> Personen importieren</ToolbarButton>
      <ToolbarButton onClick={onExportIcal}><Download className="h-4 w-4" aria-hidden="true" /> Fristen exportieren</ToolbarButton>
    </div>
  );
}
