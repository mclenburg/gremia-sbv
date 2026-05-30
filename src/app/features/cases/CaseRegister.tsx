import { Plus, Upload } from 'lucide-react';
import { IndustrialButton, GhostButton } from '../../shared/components/IndustrialButton';
import { EmptyState } from '../../shared/components/WorkbenchLayout';
import type { CaseCategory, CaseRecord } from '../../core/models/case.model';

export function CaseRegister({
  filteredCount,
  visibleCases,
  selectedCaseId,
  caseFilter,
  onCaseFilterChange,
  onSelectCase,
  onCreateCase,
  onImportHandover,
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
          <input
            className="industrial-input"
            data-global-search-target="cases"
            value={caseFilter}
            onChange={(event) => onCaseFilterChange(event.target.value)}
            placeholder="Fälle filtern nach Aktenzeichen, Name, Kurzbeschreibung …"
          />
          {Boolean(closedLegacyBulkCount) && (
            <button type="button" className="industrial-secondary-button compact" onClick={onBulkMarkClosedLegacyCases} data-e2e="bulk-mark-closed-legacy">
              {closedLegacyBulkCount} Altakten vormerken
            </button>
          )}
          {onImportHandover && <button type="button" className="industrial-secondary-button compact" onClick={onImportHandover}><Upload className="h-4 w-4" />Übergabe importieren</button>}
          <button type="button" className="industrial-button" onClick={onCreateCase}><Plus className="h-4 w-4" />Fallakte</button>
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
            </tr>
          </thead>
          <tbody>
            {visibleCases.map((record) => (
              <tr key={record.id} data-e2e={`case-row-${record.caseNumber}`} className={record.id === selectedCaseId ? 'selected' : ''} onClick={() => onSelectCase(record.id)}>
                <td><strong>{record.caseNumber}</strong></td>
                <td>{record.displayName}</td>
                <td>{record.category as CaseCategory}</td>
                <td>{record.status}</td>
                <td>{record.personBindingState === 'legacy_unlinked' ? 'Altfall' : record.personBindingState === 'anonymous_request' ? 'Anonym' : record.protectedPersonId ? 'Person' : '—'}</td>
                <td>{record.summary ?? '—'}</td>
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
        <span>Seite {page} von {pageCount} · maximal {pageSize} Fälle pro Seite</span>
        <button type="button" className="industrial-secondary-button compact" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Zurück</button>
        <button type="button" className="industrial-secondary-button compact" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Weiter</button>
      </div>
    </section>
  );
}
