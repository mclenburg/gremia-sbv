import { Download, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { DateInput } from '../../shared/components/IndustrialForm';
import { EmptyState, IndustrialRecordCard, ModuleFeedback, WorkbenchPage } from '../../shared/components/WorkbenchLayout';
import {
  formatReportDateTime,
  isReportOpenActionDisabled,
  REPORT_GROUP_LABELS,
  reportConfidentialityDisplayLabel,
} from './reportService';
import { useReportsViewModel } from './useReportsViewModel';

export function ReportsView() {
  const reports = useReportsViewModel();
  const lastGeneratedReport = reports.lastResult?.ok && reports.lastResult.reportType === reports.selectedDescriptor?.type
    ? reports.lastResult
    : null;

  return (
    <WorkbenchPage title="Berichte" description="SBV-Fachberichte, Datenschutzprüfungen und Systemberichte als verschlüsselte PDF-Reports.">
      <ModuleFeedback items={[reports.message ? { id: 'reports-message', message: reports.message } : null]} />
      <section className="reports-workbench">
        <div className="reports-toolbar reports-toolbar-grid">
          <DateInput label="Von" value={reports.periodStart} onValueChange={reports.setPeriodStart} />
          <DateInput label="Bis" value={reports.periodEnd} onValueChange={reports.setPeriodEnd} />
          <ToolbarButton onClick={() => void reports.loadReports()} disabled={reports.loading}>
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </ToolbarButton>
          <IndustrialButton onClick={() => void reports.generateReport(false)} disabled={reports.generationDisabled}>
            <Download className="h-4 w-4" />
            PDF speichern
          </IndustrialButton>
          <IndustrialButton onClick={() => void reports.generateReport(true)} disabled={reports.generationDisabled}>
            <ExternalLink className="h-4 w-4" />
            PDF erzeugen und öffnen
          </IndustrialButton>
        </div>

        <div className="reports-layout-grid">
          <section className="reports-catalog" aria-label="Berichtskatalog">
            {reports.groupedDescriptors.map(([group, items]) => (
              <div className="reports-group" key={group}>
                <h2>{REPORT_GROUP_LABELS[group] ?? group}</h2>
                <div className="reports-card-list">
                  {items.map((descriptor) => (
                    <ToolbarButton
                      key={descriptor.type}
                      className={`reports-card ${reports.selectedType === descriptor.type ? 'is-selected' : ''}`}
                      onClick={() => reports.setSelectedType(descriptor.type)}
                      aria-pressed={reports.selectedType === descriptor.type}
                    >
                      <span className="reports-card-icon"><FileText className="h-4 w-4" /></span>
                      <span className="reports-card-body">
                        <strong>{descriptor.shortTitle}</strong>
                        <small>{descriptor.description}</small>
                        <em>{reportConfidentialityDisplayLabel(descriptor.confidentiality)}</em>
                      </span>
                    </ToolbarButton>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <aside className="reports-detail-panel" aria-label="Ausgewählter Bericht">
            {reports.selectedDescriptor ? (
              <>
                <p className="industrial-kicker">Ausgewählter Bericht</p>
                <h2>{reports.selectedDescriptor.title}</h2>
                <p>{reports.selectedDescriptor.description}</p>
                <dl className="reports-meta-list">
                  <div><dt>Vertraulichkeit</dt><dd>{reportConfidentialityDisplayLabel(reports.selectedDescriptor.confidentiality)}</dd></div>
                  <div><dt>Zeitraum</dt><dd>{reports.periodStart || '—'} bis {reports.periodEnd || '—'}</dd></div>
                  <div><dt>Format</dt><dd>verschlüsselter .gsbvpdf-Container</dd></div>
                </dl>
                {lastGeneratedReport && (
                  <div className="reports-result-card">
                    <strong>Zuletzt erzeugt</strong>
                    <span>{lastGeneratedReport.fileName}</span>
                    <ToolbarButton
                      onClick={() => void reports.openReport(lastGeneratedReport.fileName, lastGeneratedReport.title)}
                      disabled={isReportOpenActionDisabled({ openingFileName: reports.openingFileName, fileName: lastGeneratedReport.fileName })}
                    >
                      {reports.openingFileName === lastGeneratedReport.fileName ? 'Öffnet…' : 'PDF öffnen'}
                    </ToolbarButton>
                  </div>
                )}
              </>
            ) : (
              <p>Keine Berichte verfügbar.</p>
            )}
          </aside>
        </div>

        <section className="reports-history" aria-label="Erzeugte Berichte">
          <div className="reports-preview-header">
            <div>
              <p className="industrial-kicker">Berichte</p>
              <h2>Zuletzt erzeugte verschlüsselte PDF-Reports</h2>
              <p>Beim Öffnen wird temporär eine Klartext-Arbeitskopie erzeugt und vom Sicherheitsmodul verwaltet.</p>
            </div>
          </div>
          <div className="reports-history-list">
            {reports.history.length ? reports.history.map((item) => (
              <IndustrialRecordCard className="reports-history-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{formatReportDateTime(item.generatedAt)} · {item.fileName}</span>
                  {item.warningCount > 0 && <em>{item.warningCount} Prüfhinweis(e)</em>}
                </div>
                <ToolbarButton
                  onClick={() => void reports.openReport(item.fileName, item.title)}
                  disabled={isReportOpenActionDisabled({ openingFileName: reports.openingFileName, fileName: item.fileName })}
                >
                  {reports.openingFileName === item.fileName ? 'Öffnet…' : 'Öffnen'}
                </ToolbarButton>
              </IndustrialRecordCard>
            )) : <EmptyState title="Keine Reports" text="Noch keine PDF-Reports erzeugt." />}
          </div>
        </section>
      </section>
    </WorkbenchPage>
  );
}
