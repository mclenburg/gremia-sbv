import { CalendarCheck } from 'lucide-react';
import type { PersonImportExecuteResult, PersonImportRunItemRecord } from '../../../domain/models/protected-person.model';

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

function ImportReviewItems({ items }: { items: PersonImportRunItemRecord[] }) {
  return (
    <section className="person-import-review" aria-labelledby="person-import-review-heading">
      <h4 id="person-import-review-heading">Manuell zu prüfen</h4>
      <div className="person-preview-table-wrapper">
        <table className="industrial-table person-preview-table">
          <thead><tr><th>Zeile</th><th>Ergebnis</th><th>Abgleich</th><th>Grund</th></tr></thead>
          <tbody>
            {items.slice(0, 20).map((item) => (
              <tr key={item.id}>
                <td>{item.rowNumber}</td>
                <td>{importActionLabel(item.action)}</td>
                <td>{item.matchStrategy ?? '—'}</td>
                <td>{item.conflictReason ?? item.validationMessage ?? (item.changedFields.join(', ') || 'Bitte prüfen.')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > 20 ? <p className="industrial-muted">Es werden die ersten 20 Prüfeinträge angezeigt. Nutze das Importprotokoll für die vollständige Liste.</p> : null}
    </section>
  );
}

export function PersonImportResultStep({ result, onClose }: { result: PersonImportExecuteResult; onClose: () => void }) {
  const reviewItems = result.run.items?.filter((item) => item.action === 'conflict' || item.action === 'skipped') ?? [];
  return (
    <div className="person-import-section">
      <h3><CalendarCheck className="inline-icon" aria-hidden="true" /> Import abgeschlossen</h3>
      <div className="person-import-summary result"><span>Neu: {result.run.createdCount}</span><span>Aktualisiert: {result.run.updatedCount}</span><span>Unverändert: {result.run.unchangedCount}</span><span>Konflikte: {result.run.conflictCount}</span><span>Übersprungen: {result.run.skippedCount}</span></div>
      <p className="industrial-muted">Die Importdatei wurde nicht dauerhaft gespeichert. Das Importprotokoll enthält keine Rohdaten.</p>
      {reviewItems.length ? <ImportReviewItems items={reviewItems} /> : <p className="industrial-message industrial-message-ok" role="status">Keine offenen Konflikte oder übersprungenen Zeilen im Importprotokoll.</p>}
      <div className="person-import-footer"><button type="button" className="industrial-secondary-button" data-e2e="person-import-close-result" onClick={onClose}>Schließen</button></div>
    </div>
  );
}
