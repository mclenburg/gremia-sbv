import { useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import type { PersonImportExecuteResult, PersonImportRunItemRecord } from '../../../domain/models/protected-person.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { SearchInput } from '../../shared/components/IndustrialForm';

function importActionLabel(action: PersonImportRunItemRecord['action']): string {
  const labels: Record<PersonImportRunItemRecord['action'], string> = {
    created: 'neu angelegt',
    updated: 'aktualisiert',
    unchanged: 'unverändert',
    conflict: 'Konflikt',
    skipped: 'übersprungen',
    not_in_list: 'nicht in Liste',
  };
  return labels[action];
}

function itemSearchText(item: PersonImportRunItemRecord): string {
  return [
    item.rowNumber,
    importActionLabel(item.action),
    item.matchStrategy,
    item.conflictReason,
    item.validationMessage,
    ...(item.changedFields ?? []),
  ].filter(Boolean).join(' ').toLocaleLowerCase('de-DE');
}

function ImportReviewItems({ items, onOpenPerson }: { items: PersonImportRunItemRecord[]; onOpenPerson?: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const visibleItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('de-DE');
    if (!needle) return items;
    return items.filter((item) => itemSearchText(item).includes(needle));
  }, [items, query]);
  return (
    <section className="person-import-review" aria-labelledby="person-import-review-heading">
      <div className="person-import-review-header">
        <div>
          <h4 id="person-import-review-heading">Manuell zu prüfen</h4>
          <p className="industrial-muted">{items.length === 1 ? '1 Prüfeintrag' : `${items.length} Prüfeinträge`} aus dem Importlauf. Konflikte sind echte Abgleichunsicherheiten, keine normalen Aktualisierungen.</p>
        </div>
        {items.length > 5 ? <SearchInput label="Prüfeinträge filtern" value={query} onValueChange={setQuery} placeholder="Zeile, Grund oder Abgleich tippen …" /> : null}
      </div>
      <div className="person-preview-table-wrapper">
        <table className="industrial-table person-preview-table">
          <thead><tr><th>Zeile</th><th>Ergebnis</th><th>Abgleich</th><th>Grund</th><th>Aktion</th></tr></thead>
          <tbody>
            {visibleItems.map((item) => {
              const personId = item.protectedPersonId;
              return (
                <tr key={item.id}>
                  <td>{item.rowNumber}</td>
                  <td>{importActionLabel(item.action)}</td>
                  <td>{item.matchStrategy ?? '—'}</td>
                  <td>{item.conflictReason ?? item.validationMessage ?? (item.changedFields.join(', ') || 'Bitte prüfen.')}</td>
                  <td>{personId && onOpenPerson ? <ToolbarButton type="button" compact onClick={() => onOpenPerson(personId)}>Person öffnen</ToolbarButton> : '—'}</td>
                </tr>
              );
            })}
            {!visibleItems.length ? <tr><td colSpan={5}>Keine Prüfeinträge zum aktuellen Filter.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PersonImportResultStep({ result, onClose, onOpenPerson }: { result: PersonImportExecuteResult; onClose: () => void; onOpenPerson?: (id: string) => void }) {
  const reviewItems = result.run.items?.filter((item) => item.action === 'conflict' || item.action === 'skipped') ?? [];
  return (
    <div className="person-import-section">
      <h3><CalendarCheck className="inline-icon" aria-hidden="true" /> Import abgeschlossen</h3>
      <div className="person-import-summary result"><span>Neu: {result.run.createdCount}</span><span>Aktualisiert: {result.run.updatedCount}</span><span>Unverändert: {result.run.unchangedCount}</span><span>Konflikte: {result.run.conflictCount}</span><span>Übersprungen: {result.run.skippedCount}</span></div>
      <p className="industrial-muted">Die Importdatei wurde nicht dauerhaft gespeichert. Das Importprotokoll enthält keine Rohdaten.</p>
      {reviewItems.length ? <ImportReviewItems items={reviewItems} onOpenPerson={onOpenPerson} /> : <p className="industrial-message industrial-message-ok" role="status">Keine offenen Konflikte oder übersprungenen Zeilen im Importprotokoll.</p>}
      <div className="person-import-footer">
        <IndustrialButton type="button" variant="secondary" data-e2e="person-import-close-result" onClick={onClose}>
          Schließen
        </IndustrialButton>
      </div>
    </div>
  );
}
