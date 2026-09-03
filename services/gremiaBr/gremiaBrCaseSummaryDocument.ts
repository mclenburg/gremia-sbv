import {
  externalReportDocument,
  paragraph,
  section,
  table,
  type PdfDocumentDefinition,
} from '../documents/pdfDocumentDefinition.js';
import type {
  CaseSummaryRow,
  DeadlineRow,
  GremiaBrReferenceRow,
  MeasureRow,
} from './gremiaBrWorkspaceActionSupport.js';

export type GremiaBrCaseSummaryDocumentInput = {
  caseSummary: CaseSummaryRow;
  purpose: string;
  recipientLabel?: string;
  measures: readonly MeasureRow[];
  deadlines: readonly DeadlineRow[];
  references: readonly GremiaBrReferenceRow[];
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date);
}

function personLabel(row: CaseSummaryRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ') || 'In der Fallakte nicht verknüpft';
}

function measureNextSteps(measures: readonly MeasureRow[]): string {
  return measures
    .map((measure) => measure.next_step?.trim())
    .filter((text): text is string => Boolean(text))
    .slice(0, 3)
    .join(' ') || 'Keine nächsten Maßnahmenschritte hinterlegt.';
}

export function buildGremiaBrCaseSummaryDocument(input: GremiaBrCaseSummaryDocumentInput): PdfDocumentDefinition {
  const row = input.caseSummary;
  return externalReportDocument(
    'Fallzusammenfassung für Gremia.BR',
    'Zuarbeit der SBV für den Betriebsrat',
    [
      section('Freigabekontext', [
        paragraph('Diese Zusammenfassung wird auf bewusste Veranlassung der SBV erzeugt, um den Betriebsrat zu informieren oder eine Behandlung im Gremium zu ermöglichen. Sie ersetzt keine vollständige Fallakte. Vor Übergabe ist zu prüfen, ob Umfang und Zweck erforderlich sind.'),
        paragraph(`Zweck der Übergabe: ${input.purpose}`),
        table(['Feld', 'Wert'], [
          ['Zweck', input.purpose],
          ['Empfänger/Ziel', input.recipientLabel?.trim() || 'Gremia.BR-Arbeitsbereich'],
        ]),
      ]),
      section('Fallüberblick', [
        table(['Feld', 'Wert'], [
          ['Aktenzeichen', row.case_number],
          ['Titel', row.display_name],
          ['Kategorie', row.category],
          ['Status', row.status],
          ['Priorität', row.priority],
          ['Risiko', row.risk_level ?? 'normal'],
          ['Geöffnet', formatDate(row.opened_at)],
          ['Geschlossen', formatDate(row.closed_at)],
        ]),
      ]),
      section('Personen- und Schutzstatus', [
        table(['Feld', 'Wert'], [
          ['Person', personLabel(row)],
          ['Organisationseinheit', row.organizational_unit ?? '—'],
          ['Beschäftigungsstatus', row.employment_state ?? '—'],
          ['Schutzstatus', row.protection_status ?? '—'],
          ['Status gültig bis', formatDate(row.status_valid_until)],
        ]),
      ]),
      section('Sachstand der SBV', [
        paragraph(row.summary?.trim() || 'Kein zusammenfassender Sachstand in der Fallakte hinterlegt.'),
      ]),
      section('Maßnahmen', [
        paragraph(measureNextSteps(input.measures)),
        table(
          ['Maßnahme', 'Typ', 'Status', 'Risiko', 'Nächster Schritt', 'Fällig'],
          input.measures.map((measure) => [
            measure.title,
            measure.type,
            measure.status,
            measure.risk_level ?? 'normal',
            measure.next_step ?? measure.summary ?? '—',
            formatDate(measure.due_at ?? measure.closed_at ?? measure.opened_at),
          ]),
          'Keine Maßnahmen zur Fallakte erfasst.',
        ),
      ]),
      section('Offene Fristen', [
        table(
          ['Frist', 'Fällig', 'Status', 'Gewichtung', 'Rechtsgrundlage'],
          input.deadlines.map((deadline) => [
            deadline.title,
            formatDate(deadline.due_at),
            deadline.status,
            deadline.severity,
            deadline.legal_basis ?? '—',
          ]),
          'Keine offenen Fristen zur Fallakte erfasst.',
        ),
      ]),
      section('Bekannte Gremia.BR-Bezüge', [
        table(
          ['Typ', 'Titel', 'Hinweis'],
          input.references.map((reference) => [
            reference.source_type,
            reference.title,
            reference.description ?? '—',
          ]),
          'Keine vorhandenen Gremia.BR-Referenzen in der Fallakte.',
        ),
      ]),
    ],
  );
}
