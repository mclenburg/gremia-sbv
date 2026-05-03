import { useEffect } from 'react';
import { FileText, FolderOpen } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { useReports } from './useReports';
import { reportConfidentialityLabel } from './reportService';

export function ReportsView() {
  const {
    descriptors,
    history,
    periodStart,
    periodEnd,
    generating,
    result,
    error,
    setPeriodStart,
    setPeriodEnd,
    generateReport
  } = useReports();
  const announce = useAnnouncer();

  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  useEffect(() => {
    if (result) announce(`Bericht ${result.title} wurde erzeugt.`, 'polite');
  }, [result, announce]);

  return (
    <ModuleFrame title="Berichte" kicker="Audit & Auswertung" description="PDF-Berichte im Industrial-Design: anonymisierter Tätigkeitsbericht, Datenschutz-Audit und interne Steuerungsberichte.">
      <section className="industrial-panel">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Zeitraum</p>
            <h2>Berichtsparameter</h2>
          </div>
        </div>
        <div className="industrial-form-grid">
          <label>
            <span>Von</span>
            <input type="datetime-local" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          </label>
          <label>
            <span>Bis</span>
            <input type="datetime-local" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </label>
        </div>
      </section>

      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      {result && (
        <section className="industrial-panel report-result-panel">
          <div className="industrial-panel-header compact">
            <div>
              <p className="industrial-kicker">PDF erzeugt</p>
              <h2>{result.title}</h2>
              <p>{result.fileName}</p>
            </div>
            <button className="industrial-secondary-button" onClick={() => void window.gremiaSbv?.reports?.openExportFolder(result.filePath)}>
              <FolderOpen className="h-4 w-4" /> PDF öffnen
            </button>
          </div>
          {!!result.warnings.length && (
            <div className="industrial-message industrial-message-warning mt-4">
              {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}
        </section>
      )}

      <section className="industrial-report-grid" aria-label="Berichtsauswahl">
        {descriptors.map((descriptor) => {
          const isGenerating = generating === descriptor.type;
          return (
            <article
              key={descriptor.type}
              className={`industrial-report-card clickable ${isGenerating ? 'is-busy' : ''}`}
              role="button"
              tabIndex={0}
              aria-busy={isGenerating}
              aria-label={`${descriptor.title} als PDF erzeugen`}
              onClick={() => { if (!generating) void generateReport(descriptor.type); }}
              onKeyDown={(event) => {
                if (!generating && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  void generateReport(descriptor.type);
                }
              }}
            >
              <div>
                <p className="industrial-kicker">{reportConfidentialityLabel(descriptor.confidentiality)}</p>
                <h3>{descriptor.title}</h3>
                <p>{descriptor.description}</p>
              </div>
              <div className="industrial-report-card-footer">
                <span>{isGenerating ? 'PDF wird erzeugt …' : 'Klicken zum Erzeugen'}</span>
                <FileText className="h-4 w-4" />
              </div>
            </article>
          );
        })}
      </section>

      <section className="industrial-panel">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Historie</p>
            <h2>Letzte PDF-Exporte</h2>
            <p>Archivierte Berichte werden verschlüsselt abgelegt. Beim Öffnen wird eine temporäre PDF-Arbeitskopie erzeugt.</p>
          </div>
        </div>
        <div className="industrial-table-shell case-register-table-shell">
          <table className="industrial-table">
            <thead><tr><th>Zeitpunkt</th><th>Bericht</th><th>Datei</th><th>Hinweise</th><th></th></tr></thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.generatedAt).toLocaleString('de-DE')}</td>
                  <td>{item.title}</td>
                  <td>{item.fileName}</td>
                  <td>{item.warningCount}</td>
                  <td><button className="industrial-icon-button" onClick={() => void window.gremiaSbv?.reports?.openExportFolder(item.filePath)} title="PDF öffnen"><FolderOpen className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={5}>Noch keine Berichte erzeugt.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </ModuleFrame>
  );
}

