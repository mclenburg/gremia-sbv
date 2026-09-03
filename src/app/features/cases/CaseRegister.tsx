import { Plus, Trash2, Upload } from 'lucide-react';
import { IndustrialButton, GhostButton, IconButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { SearchInput } from '../../shared/components/IndustrialForm';
import { EmptyState } from '../../shared/components/WorkbenchLayout';
import type { CaseCategory, CaseRecord } from '../../../domain/models/case.model';

export function CaseRegister({
  filteredCount,
  visibleCases,
  selectedCaseId,
  caseFilter,
  onCaseFilterChange,
  onSelectCase,
  onCreateCase,
  onImportHandover,
  onPrivacyAction,
  onBulkMarkClosedLegacyCases,
  closedLegacyBulkCount,
  page,
  pageCount,
  pageSize,
  onPageChange
}: {
  filteredCount: number;
  visibleCases: CaseRecord[];
  selectedCaseId: string;
  caseFilter: string;
  onCaseFilterChange: (value: string) => void;
  onSelectCase: (caseId: string) => void;
  onCreateCase: () => void;
  onImportHandover?: () => void;
  onPrivacyAction?: (record: CaseRecord) => void;
  onBulkMarkClosedLegacyCases?: () => void;
  closedLegacyBulkCount?: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const hasActiveFilter = caseFilter.trim().length > 0;

  return (
    <section className="industrial-panel case-register-panel compact">
      <div className="case-register-toolbar compact">
        <div className="case-register-meta">
          <p className="industrial-kicker">Fallliste</p>
          <strong>{filteredCount} Fälle</strong>
        </div>
        <div className="case-register-actions">
          <SearchInput
            label="Fallakte suchen"
            value={caseFilter}
            onValueChange={onCaseFilterChange}
            placeholder="Fälle filtern nach Aktenzeichen, Name, Kurzbeschreibung …"
            data-global-search-target="cases"
            className="case-register-search-input"
          />
          {Boolean(closedLegacyBulkCount) && (
            <ToolbarButton onClick={onBulkMarkClosedLegacyCases} data-e2e="bulk-mark-closed-legacy">
              {closedLegacyBulkCount} Altakten vormerken
            </ToolbarButton>
          )}
          {onImportHandover && <ToolbarButton onClick={onImportHandover}><Upload className="h-4 w-4" />Übergabe importieren</ToolbarButton>}
        </div>
      </div>
      <div className="industrial-table-shell case-register-table-shell">
        <table className="industrial-table case-register-table">
          <thead>
            <tr>
              <th>Aktenzeichen</th>
              <th>Name / Pseudonym</th>
              <th>Kategorie</th>
              <th>Status</th>
              <th>Bindung</th>
              <th>Kurzbeschreibung</th>
              <th><span className="sr-only">Aktionen</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleCases.map((record) => (
              <tr key={record.id} data-e2e={`case-row-${record.caseNumber}`} className={record.id === selectedCaseId ? 'selected' : ''} tabIndex={0} aria-label={`Fall ${record.caseNumber}: ${record.displayName}`} onClick={() => onSelectCase(record.id)} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectCase(record.id); } }}>
                <td><strong>{record.caseNumber}</strong></td>
                <td>{record.displayName}</td>
                <td>{record.category as CaseCategory}</td>
                <td>{record.status}</td>
                <td>{record.personBindingState === 'legacy_unlinked' ? 'Altfall' : record.personBindingState === 'anonymous_request' ? 'Anonym' : record.protectedPersonId ? 'Person' : '—'}</td>
                <td>{record.summary ?? '—'}</td>
                <td className="case-register-row-actions">{onPrivacyAction ? <IconButton className="privacy-destructive-action case-register-privacy-action" aria-label={`Fallakte löschen oder anonymisieren: ${record.caseNumber}`} title={`Fallakte löschen oder anonymisieren: ${record.caseNumber}`} onClick={(event) => { event.stopPropagation(); onPrivacyAction(record); }}><Trash2 className="h-4 w-4" aria-hidden="true" /></IconButton> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleCases.length && (
          <EmptyState
            title={hasActiveFilter ? 'Keine passenden Fälle' : 'Noch keine Fallakte'}
            text={hasActiveFilter
              ? 'Die aktuelle Suche liefert keine Fallakte. Filter anpassen oder zurücksetzen.'
              : 'Lege die erste Fallakte an, um Beratung, Fristen, Notizen und Maßnahmen zusammenzuführen.'}
            action={hasActiveFilter
              ? <GhostButton compact onClick={() => onCaseFilterChange('')}>Filter zurücksetzen</GhostButton>
              : <IndustrialButton compact onClick={onCreateCase}><Plus className="h-4 w-4" aria-hidden="true" />Ersten Fall anlegen</IndustrialButton>}
          />
        )}
      </div>
      <div className="case-pagination" aria-label="Falllisten-Seiten">
        <span className="case-pagination-label">Seite {page} von {pageCount} · maximal {pageSize} Fälle pro Seite</span>
        <ToolbarButton disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Zurück</ToolbarButton>
        <ToolbarButton disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Weiter</ToolbarButton>
      </div>
    </section>
  );
}
