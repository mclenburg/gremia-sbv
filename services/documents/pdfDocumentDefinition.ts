export type PdfScalar = string | number;

export type PdfBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: PdfScalar[][]; empty: string }
  | { type: 'metrics'; entries: Array<[string, PdfScalar]> }
  | { type: 'section'; title: string; blocks: PdfBlock[] }
  | { type: 'spacer'; height: number };

export interface PdfDocumentDefinition {
  title: string;
  subtitle?: string;
  classification?: string;
  blocks: PdfBlock[];
  warnings?: string[];
  footer?: string;
}

export function paragraph(text: unknown): PdfBlock {
  return { type: 'paragraph', text: String(text ?? '') };
}

export function list(items: readonly unknown[]): PdfBlock {
  return { type: 'list', items: items.map((item) => String(item ?? '')) };
}

export function table(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  empty = 'Keine Daten vorhanden.',
): PdfBlock {
  return {
    type: 'table',
    headers: [...headers],
    rows: rows.map((row) => row.map((cell) => String(cell ?? ''))),
    empty,
  };
}

export function metricCards(metrics: Record<string, PdfScalar>): PdfBlock {
  return { type: 'metrics', entries: Object.entries(metrics) };
}

export function section(title: string, blocks: readonly PdfBlock[]): PdfBlock {
  return { type: 'section', title, blocks: [...blocks] };
}

export function spacer(height = 8): PdfBlock {
  return { type: 'spacer', height };
}

export function reportDocument(
  title: string,
  subtitle: string,
  classification: string,
  blocks: readonly PdfBlock[],
  warnings: readonly string[],
): PdfDocumentDefinition {
  return {
    title,
    subtitle,
    classification,
    blocks: [...blocks],
    warnings: [...warnings],
    footer: 'Offline erzeugt durch Gremia.SBV. Tätigkeitsberichte sind anonymisiert zu verwenden; interne Prüfberichte bleiben vertraulich.',
  };
}
