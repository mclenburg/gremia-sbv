import { Download, UploadCloud } from 'lucide-react';
import { SearchInput } from '../../shared/components/IndustrialForm';
import { ToolbarButton } from '../../shared/components/IndustrialButton';

interface PersonToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenImport: () => void;
  onExportIcal: () => void;
}

export function PersonToolbar({ query, onQueryChange, onOpenImport, onExportIcal }: PersonToolbarProps) {
  return (
    <div className="person-toolbar">
      <SearchInput
        label="Person suchen"
        value={query}
        onValueChange={onQueryChange}
        placeholder="Name, E-Mail, Organisationseinheit"
        className="person-search-input"
      />
      <ToolbarButton onClick={onOpenImport} data-e2e="open-person-import-wizard"><UploadCloud className="h-4 w-4" aria-hidden="true" /> Personen importieren</ToolbarButton>
      <ToolbarButton onClick={onExportIcal}><Download className="h-4 w-4" aria-hidden="true" /> Fristen exportieren</ToolbarButton>
    </div>
  );
}
