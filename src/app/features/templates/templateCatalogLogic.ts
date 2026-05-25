import type { TemplateCategory, TemplateRecord } from '../../core/models/template.model';

export const templateCategoryLabels: Record<TemplateCategory, string> = {
  praevention: 'Prävention',
  bem: 'BEM',
  beteiligung: 'SBV-Beteiligung',
  kuendigung: 'Kündigung',
  gleichstellung: 'Gleichstellung',
  auskunft: 'Auskunft',
  frist: 'Frist / Erinnerung',
  datenschutz: 'Datenschutz',
  sonstiges: 'Sonstiges'
};

export const TEMPLATE_CATEGORY_ORDER = Object.keys(templateCategoryLabels) as TemplateCategory[];

export type TemplateSortMode = 'category' | 'alphabetical';

export const TEMPLATE_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
export const DEFAULT_TEMPLATE_PAGE_SIZE = 12;

export function compareTemplatesByTitle(left: TemplateRecord, right: TemplateRecord): number {
  return left.title.localeCompare(right.title, 'de', { sensitivity: 'base' });
}

export function groupTemplates(templates: TemplateRecord[], sortMode: TemplateSortMode): Array<{ key: string; label: string; items: TemplateRecord[] }> {
  if (sortMode === 'alphabetical') {
    return [{ key: 'alphabetical', label: 'Alphabetisch', items: [...templates].sort(compareTemplatesByTitle) }];
  }

  const groups = TEMPLATE_CATEGORY_ORDER
    .map((item) => ({
      key: item,
      label: templateCategoryLabels[item],
      items: templates.filter((template) => template.category === item).sort(compareTemplatesByTitle)
    }))
    .filter((group) => group.items.length > 0);

  return groups;
}

export function clampTemplatePage(page: number, pageCount: number): number {
  return Math.min(Math.max(page, 1), Math.max(pageCount, 1));
}

