import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
  ReportType,
} from '../../core/models/report.model';

const GROUP_LABELS: Record<string, string> = {
  sbv: 'SBV-Fachberichte',
  datenschutz: 'Datenschutz & Compliance',
  system: 'Systemberichte',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfYear(): string {
  const date = new Date();
  return `${date.getFullYear()}-01-01`;
}

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function confidentialityLabel(value: ReportDescriptor['confidentiality']): string {
  if (value === 'anonymized') return 'Anonymisiert';
  if (value === 'technical') return 'Technisch vertraulich';
  return 'Intern vertraulich';
}

export function ReportsView() {
  const [descriptors, setDescriptors] = useState<ReportDescriptor[]>([]);
  const [history, setHistory] = useState<ReportExportHistoryItem[]>([]);
  const [selectedType, setSelectedType] = useState<ReportType>('activity');
  const [periodStart, setPeriodStart] = useState(startOfYear);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [lastResult, setLastResult] = useState<ReportGenerationResult | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const announce = useAnnouncer();

  const selectedDescriptor = descriptors.find((descriptor) => descriptor.type === selectedType) ?? descriptors[0];
  const groupedDescriptors = useMemo(() => {
    const groups = new Map<string, ReportDescriptor[]>();
    for (const descriptor of descriptors) {
      const group = descriptor.group ?? 'sbv';
      const current = groups.get(group) ?? [];
      current.push(descriptor);
      groups.set(group, current);
    }
    return Array.from(groups.entries()).map(([group, items]) => [
      group,
      items.sort((left, right) => left.shortTitle.localeCompare(right.shortTitle, 'de')),
    ] as const);
  }, [descriptors]);

  async function loadReports() {
    const bridge = await waitForBridge();
    if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
    const [nextDescriptors, nextHistory] = await Promise.all([
      bridge.reports.descriptors(),
      bridge.reports.history(25),
    ]);
    setDescriptors(nextDescriptors);
    setHistory(nextHistory);
    if (nextDescriptors.length && !nextDescriptors.some((descriptor: ReportDescriptor) => descriptor.type === selectedType)) {
      setSelectedType(nextDescriptors[0].type);
    }
  }

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
      if (openAfterCreate) {
        await bridge.reports.openExportFolder(result.filePath);
      }
      const info = `${result.title} wurde als verschlüsselter PDF-Report erzeugt.`;
      setMessage(info);
      announce(info, 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Bericht konnte nicht erzeugt werden.';
      setMessage(info);
      announce(info, 'assertive');
    } finally {
      setLoading(false);
    }
  }

  async function openReport(filePath: string) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
      await bridge.reports.openExportFolder(filePath);
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Bericht konnte nicht geöffnet werden.';
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  return (
    <ModuleFrame title="Berichte" description="SBV-Fachberichte, Datenschutzprüfungen und Systemberichte als verschlüsselte PDF-Reports.">
      <section className="reports-workbench">
        <div className="reports-toolbar reports-toolbar-grid">
          <label>
            <span>Von</span>
            <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.currentTarget.value)} />
          </label>
          <label>
            <span>Bis</span>
            <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.currentTarget.value)} />
          </label>
          <button type="button" className="industrial-secondary-button" onClick={() => void loadReports()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </button>
          <button type="button" className="industrial-button" onClick={() => void generateReport(false)} disabled={loading || !selectedDescriptor}>
            <Download className="h-4 w-4" />
            PDF erzeugen
          </button>
          <button type="button" className="industrial-button" onClick={() => void generateReport(true)} disabled={loading || !selectedDescriptor}>
            <ExternalLink className="h-4 w-4" />
            PDF erzeugen & öffnen
          </button>
        </div>

        {message && <div className="industrial-message">{message}</div>}

        <div className="reports-layout-grid">
          <section className="reports-catalog" aria-label="Berichtskatalog">
            {groupedDescriptors.map(([group, items]) => (
              <div className="reports-group" key={group}>
                <h2>{GROUP_LABELS[group] ?? group}</h2>
                <div className="reports-card-list">
                  {items.map((descriptor) => (
                    <button
                      type="button"
                      key={descriptor.type}
                      className={`reports-card ${selectedType === descriptor.type ? 'is-selected' : ''}`}
                      onClick={() => setSelectedType(descriptor.type)}
                      aria-pressed={selectedType === descriptor.type}
                    >
                      <span className="reports-card-icon"><FileText className="h-4 w-4" /></span>
                      <span className="reports-card-body">
                        <strong>{descriptor.shortTitle}</strong>
                        <small>{descriptor.description}</small>
                        <em>{confidentialityLabel(descriptor.confidentiality)}</em>
                      </span>
                    </button>
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
                  <div><dt>Vertraulichkeit</dt><dd>{confidentialityLabel(selectedDescriptor.confidentiality)}</dd></div>
                  <div><dt>Zeitraum</dt><dd>{periodStart || '—'} bis {periodEnd || '—'}</dd></div>
                  <div><dt>Format</dt><dd>verschlüsselter .gsbvpdf-Container</dd></div>
                </dl>
                {lastResult?.ok && lastResult.reportType === selectedDescriptor.type && (
                  <div className="reports-result-card">
                    <strong>Zuletzt erzeugt</strong>
                    <span>{lastResult.fileName}</span>
                    <button type="button" className="industrial-secondary-button" onClick={() => void openReport(lastResult.filePath)}>
                      PDF öffnen
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p>Keine Berichte verfügbar.</p>
            )}
          </aside>
        </div>

        <section className="reports-history" aria-label="Berichtshistorie">
          <div className="reports-preview-header">
            <div>
              <p className="industrial-kicker">Historie</p>
              <h2>Zuletzt erzeugte verschlüsselte PDF-Reports</h2>
              <p>Beim Öffnen wird temporär eine Klartext-Arbeitskopie erzeugt und vom Sicherheitsmodul verwaltet.</p>
            </div>
          </div>
          <div className="reports-history-list">
            {history.length ? history.map((item) => (
              <article className="reports-history-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{formatDateTime(item.generatedAt)} · {item.fileName}</span>
                  {item.warningCount > 0 && <em>{item.warningCount} Prüfhinweis(e)</em>}
                </div>
                <button type="button" className="industrial-secondary-button" onClick={() => void openReport(item.filePath)}>
                  Öffnen
                </button>
              </article>
            )) : <div className="industrial-empty-state">Noch keine PDF-Reports erzeugt.</div>}
          </div>
        </section>
      </section>
    </ModuleFrame>
  );
}
