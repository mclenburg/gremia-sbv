import type { CaseMeasureType } from './case-measure.model';
export type TemplateCategory =
  | 'praevention'
  | 'bem'
  | 'beteiligung'
  | 'kuendigung'
  | 'gleichstellung'
  | 'auskunft'
  | 'frist'
  | 'datenschutz'
  | 'sonstiges';

export interface TemplateRecord {
  id: string;
  key: string;
  title: string;
  category: TemplateCategory;
  description?: string;
  subject: string;
  body: string;
  legalBasis: string[];
  tags: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  key?: string;
  title: string;
  category: TemplateCategory;
  description?: string;
  subject: string;
  body: string;
  legalBasis?: string[];
  tags?: string[];
}

export interface UpdateTemplateInput {
  title?: string;
  category?: TemplateCategory;
  description?: string;
  subject?: string;
  body?: string;
  legalBasis?: string[];
  tags?: string[];
}

export interface TemplateListFilters {
  query?: string;
  category?: TemplateCategory;
  includeSystem?: boolean;
  limit?: number;
  measureType?: CaseMeasureType;
}

export interface RenderTemplateInput {
  templateId: string;
  caseId?: string;
  values?: Record<string, string>;
  archive?: boolean;
}


export type TemplateSourceType = 'case' | 'case_measure' | 'prevention' | 'bem' | 'deadline' | 'termination' | 'equalization' | 'participation' | 'workplace_accommodation';

export interface RenderContextTemplateInput {
  templateKey: string;
  caseId: string;
  sourceType?: TemplateSourceType;
  sourceId?: string;
  sourceLabel?: string;
  values?: Record<string, string>;
  archive?: boolean;
}

export interface ContextualTemplateAction {
  id: string;
  label: string;
  templateKey: string;
  category: TemplateCategory;
  sourceType: TemplateSourceType;
  description: string;
}

export interface RenderedTemplateResult {
  templateId: string;
  title: string;
  subject: string;
  body: string;
  caseId?: string;
  archivedId?: string;
  unresolvedPlaceholders: string[];
  renderedAt: string;
}
