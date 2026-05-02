export type TemplateContext = Record<string, string | undefined | null>;

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function extractPlaceholders(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    found.add(match[1]);
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

export function renderTemplateText(text: string, context: TemplateContext): { text: string; unresolvedPlaceholders: string[] } {
  const unresolved = new Set<string>();
  const rendered = text.replace(PLACEHOLDER_PATTERN, (full, key: string) => {
    const value = context[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      unresolved.add(key);
      return full;
    }
    return String(value);
  });
  return { text: rendered, unresolvedPlaceholders: [...unresolved].sort((a, b) => a.localeCompare(b)) };
}

export function normalizeTemplateKey(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'vorlage';
}

export function buildFallbackTemplateContext(now = new Date()): TemplateContext {
  return {
    heute: now.toLocaleDateString('de-DE'),
    'sbv.bezeichnung': 'Schwerbehindertenvertretung',
    'sbv.name': 'Schwerbehindertenvertretung',
    'arbeitgeber.ansprechpartner': 'Personalabteilung',
    'frist.datum': '',
    normen: ''
  };
}
