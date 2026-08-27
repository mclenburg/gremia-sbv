import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { DateInput } from '../../shared/components/IndustrialForm';
import { EmptyState, IndustrialRecordCard, ModuleFeedback, WorkbenchPage } from '../../shared/components/WorkbenchLayout';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
  ReportType,
} from '../../../domain/models/report.model';
import {
  buildReportPdfExportFeedback,
  defaultReportDateRange,
  formatReportDateTime,
  groupReportDescriptorsByPriority,
  REPORT_GROUP_LABELS,
  reportConfidentialityDisplayLabel,
  sortReportDescriptorsByPriority,
} from './reportService';

export function ReportsView() {
  const defaultDateRange = defaultReportDateRange();
  const [descriptors, setDescriptors] = useState<ReportDescriptor[]>([]);
  const [history, setHistory] = useState<ReportExportHistoryItem[]>([]);
  const [selectedType, setSelectedType] = useState<ReportType>('activity');
  const [periodStart, setPeriodStart] = useState(defaultDateRange.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultDateRange.periodEnd);
  const [lastResult, setLastResult] = useState<ReportGenerationResult | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const announce = useAnnouncer();

  const selectedDescriptor = descriptors.find((descriptor) => descriptor.type === selectedType) ?? descriptors[0];
  const groupedDescriptors = groupReportDescriptorsByPriority(descriptors);

  const loadReports = useCallback(async () => {
    const bridge = await waitForBridge();
    if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
    const [nextDescriptors, nextHistory] = await Promise.all([
      bridge.reports.descriptors(),
      bridge.reports.history(25),
    ]);
    setDescriptors(sortReportDescriptorsByPriority(nextDescriptors));
    setHistory(nextHistory);
    if (nextDescriptors.length && !nextDescriptors.some((descriptor: ReportDescriptor) => descriptor.type === selectedType)) {
      setSelectedType(nextDescriptors[0].type);
    }
  }, [selectedType]);

  async function generateReport(openAfterCreate = false) {
    if (!selectedDescriptor) return;
    setLoading(true);
    setMessage('');
    setLastResult(null);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
      const input: GenerateReportInput = {
        type: selectedDescriptor.type,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
      };
      const result: ReportGenerationResult = await bridge.reports.generate(input);
      setLastResult(result);
      if (!result.ok) throw new Error(result.error || 'Bericht konnte nicht erzeugt werden.');
      await loadReports();
      const openResult = openAfterCreate
        ? await bridge.reports.openExportFolder(result.fileName)
        : undefined;
      const feedback = buildReportPdfExportFeedback({
        title: result.title,
        fileName: result.fileName,
        openRequested: openAfterCreate,
        openResult,
      });
      setMessage(feedback.message);
      announce(feedback.message, feedback.announceMode);
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Bericht konnte nicht erzeugt werden.';
      setMessage(info);
      announce(info, 'assertive');
    } finally {
      setLoading(false);
    }
  }

  async function openReport(fileName: string) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
      const result = await bridge.reports.openExportFolder(fileName);
      if (!result.opened) throw new Error(result.error ?? 'Bericht wurde bereitgestellt, konnte aber nicht an die externe Vorschau übergeben werden.');
      const info = `Bericht wurde an die externe Vorschau übergeben: ${fileName}`;
      setMessage(info);
      announce(info, 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Bericht konnte nicht geöffnet werden.';
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <WorkbenchPage title="Berichte" description="SBV-Fachberichte, Datenschutzprüfungen und Systemberichte als verschlüsselte PDF-Reports.">
      <ModuleFeedback items={[message ? { id: 'reports-message', message } : null]} />
      <section className="reports-workbench">
        <div className="reports-toolbar reports-toolbar-grid">
          <DateInput label="Von" value={periodStart} onValueChange={setPeriodStart} />
          <DateInput label="Bis" value={periodEnd} onValueChange={setPeriodEnd} />
          <ToolbarButton onClick={() => void loadReports()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </ToolbarButton>
          <IndustrialButton onClick={() => void generateReport(false)} disabled={loading || !selectedDescriptor}>
            <Download className="h-4 w-4" />
            PDF speichern
          </IndustrialButton>
          <IndustrialButton onClick={() => void generateReport(true)} disabled={loading || !selectedDescriptor}>
            <ExternalLink className="h-4 w-4" />
            PDF erzeugen
          </IndustrialButton>
        </div>


        <div className="reports-layout-grid">
          <section className="reports-catalog" aria-label="Berichtskatalog">
            {groupedDescriptors.map(([group, items]) => (
              <div className="reports-group" key={group}>
                <h2>{REPORT_GROUP_LABELS[group] ?? group}</h2>
                <div className="reports-card-list">
                  {items.map((descriptor) => (
                    <ToolbarButton
                      key={descriptor.type}
                      className={`reports-card ${selectedType === descriptor.type ? 'is-selected' : ''}`}
                      onClick={() => setSelectedType(descriptor.type)}
                      aria-pressed={selectedType === descriptor.type}
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
            {selectedDescriptor ? (
              <>
                <p className="industrial-kicker">Ausgewählter Bericht</p>
                <h2>{selectedDescriptor.title}</h2>
                <p>{selectedDescriptor.description}</p>
                <dl className="reports-meta-list">
                  <div><dt>Vertraulichkeit</dt><dd>{reportConfidentialityDisplayLabel(selectedDescriptor.confidentiality)}</dd></div>
                  <div><dt>Zeitraum</dt><dd>{periodStart || '—'} bis {periodEnd || '—'}</dd></div>
                  <div><dt>Format</dt><dd>verschlüsselter .gsbvpdf-Container</dd></div>
                </dl>
                {lastResult?.ok && lastResult.reportType === selectedDescriptor.type && (
                  <div className="reports-result-card">
                    <strong>Zuletzt erzeugt</strong>
                    <span>{lastResult.fileName}</span>
                    <ToolbarButton onClick={() => void openReport(lastResult.fileName)}>
                      PDF öffnen
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
            {history.length ? history.map((item) => (
              <IndustrialRecordCard className="reports-history-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{formatReportDateTime(item.generatedAt)} · {item.fileName}</span>
                  {item.warningCount > 0 && <em>{item.warningCount} Prüfhinweis(e)</em>}
                </div>
                <ToolbarButton onClick={() => void openReport(item.fileName)}>
                  Öffnen
                </ToolbarButton>
              </IndustrialRecordCard>
            )) : <EmptyState title="Keine Reports" text="Noch keine PDF-Reports erzeugt." />}
          </div>
        </section>
      </section>
    </WorkbenchPage>
  );
}
