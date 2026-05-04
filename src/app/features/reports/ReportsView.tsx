import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { renderActivityReport, type ActivityReportResult } from '@services/activityReportService';

function downloadTextFile(report: ActivityReportResult) {
  const blob = new Blob([report.body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = report.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function markdownToPrintableHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let inTable = false;
  function closeTable() {
    if (inTable) {
      html.push('</tbody></table>');
      inTable = false;
    }
  }
  for (const line of lines) {
    if (/^\|.+\|$/.test(line.trim())) {
      const cells = line.trim().slice(1, -1).split('|').map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      if (!inTable) {
        html.push('<table><tbody>');
        inTable = true;
      }
      html.push(`<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`);
      continue;
    }
    closeTable();
    if (line.startsWith('# ')) html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    else if (line.startsWith('## ')) html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    else if (line.startsWith('- ')) html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    else if (line.trim()) html.push(`<p>${escapeHtml(line)}</p>`);
    else html.push('<br />');
  }
  closeTable();
  return html.join('\n');
}

function openPdfPrintView(report: ActivityReportResult) {
  const printable = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
  if (!printable) throw new Error('PDF-Druckansicht konnte nicht geöffnet werden.');
  printable.document.write(`<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #111827; line-height: 1.45; }
    h1 { font-size: 22pt; margin: 0 0 12pt; }
    h2 { font-size: 15pt; margin: 18pt 0 8pt; border-bottom: 1px solid #d1d5db; padding-bottom: 4pt; }
    p, li, td { font-size: 10.5pt; }
    table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; page-break-inside: avoid; }
    td { border: 1px solid #d1d5db; padding: 5pt; vertical-align: top; }
    .no-print { margin-bottom: 16pt; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Als PDF drucken / speichern</button></div>
  ${markdownToPrintableHtml(report.body)}
</body>
</html>`);
  printable.document.close();
  printable.focus();
}

export function ReportsView() {
  const [periodLabel, setPeriodLabel] = useState(() => String(new Date().getFullYear()));
  const [report, setReport] = useState<ActivityReportResult | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const announce = useAnnouncer();

  async function generateReport() {
    setLoading(true);
    setMessage('');
    try {
      const bridge = await waitForBridge() as any;
      const [cases, deadlines, contacts, preventionProcesses, bemProcesses, equalizationProcesses, terminationProcesses] = await Promise.all([
        bridge.cases?.list?.() ?? [],
        bridge.deadlines?.list?.({ status: ['open', 'overdue'] }) ?? [],
        bridge.contacts?.list?.() ?? [],
        bridge.prevention?.list?.() ?? [],
        bridge.bem?.list?.() ?? [],
        bridge.equalization?.list?.() ?? [],
        bridge.termination?.list?.() ?? []
      ]);
      const next = renderActivityReport({
        periodLabel,
        cases,
        deadlines,
        contacts,
        preventionProcesses,
        bemProcesses,
        equalizationProcesses,
        terminationProcesses
      });
      setReport(next);
      setMessage('Tätigkeitsbericht wurde anonymisiert erzeugt.');
      announce('Tätigkeitsbericht wurde anonymisiert erzeugt.', 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Tätigkeitsbericht konnte nicht erzeugt werden.';
      setMessage(info);
      announce(info, 'assertive');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void generateReport();
  }, []);

  return (
    <ModuleFrame title="Berichte" description="Anonymisierte Tätigkeitsberichte und SBV-Auswertungen ohne sensible Freitexte.">
      <section className="reports-workbench">
        <div className="reports-toolbar">
          <label>
            <span>Berichtszeitraum</span>
            <input value={periodLabel} onChange={(event) => setPeriodLabel(event.currentTarget.value)} placeholder="z. B. 2026 oder Q2/2026" />
          </label>
          <button type="button" className="industrial-button" onClick={() => void generateReport()} disabled={loading}>
            Tätigkeitsbericht erzeugen
          </button>
        </div>

        {message && <div className="industrial-message">{message}</div>}

        {report && (
          <section className="reports-preview">
            <div className="reports-preview-header">
              <div>
                <p className="industrial-kicker">Anonymisierter Bericht</p>
                <h2>{report.title}</h2>
                <p>Enthält nur aggregierte Zahlen und Statusauswertungen.</p>
              </div>
              <div className="reports-export-actions">
                <button type="button" className="industrial-secondary-button" onClick={() => downloadTextFile(report)}>
                  <Download className="h-4 w-4" />
                  Markdown exportieren
                </button>
                <button type="button" className="industrial-button" onClick={() => openPdfPrintView(report)}>
                  PDF exportieren
                </button>
              </div>
            </div>
            <textarea className="industrial-output-area reports-output" value={report.body} readOnly aria-label="Tätigkeitsbericht Vorschau" />
          </section>
        )}
      </section>
    </ModuleFrame>
  );
}
