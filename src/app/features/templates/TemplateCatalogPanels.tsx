import type { FormEvent } from 'react';
import { FileText, HelpCircle, Plus, Search, Trash2 } from 'lucide-react';
import { IconButton, IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { SelectInput, TextInput } from '../../shared/components/IndustrialForm';
import type { TemplateCategory, TemplateRecord } from '../../core/models/template.model';
import type { TemplateSortMode } from './templateCatalogLogic';
import { TEMPLATE_PAGE_SIZE_OPTIONS, templateCategoryLabels } from './templateCatalogLogic';

type TemplateGroup = {
  key: string;
  label: string;
  items: TemplateRecord[];
};

export function TemplateCatalogToolbar({
  onCreate,
  onOpenHelp,
}: {
  onCreate: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <div className="template-catalog-toolbar">
      <div className="template-title-cluster">
        <IconButton
          className="template-help-button"
          onClick={onOpenHelp}
          aria-label="Hilfe zu Vorlagen und Platzhaltern öffnen"
          title="Hilfe zu Platzhaltern"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        <div>
          <p className="industrial-kicker">Auswahl</p>
          <h2>Vorlagenkatalog</h2>
        </div>
      </div>
      <IndustrialButton onClick={onCreate}>
        <Plus className="h-4 w-4" aria-hidden="true" /> Neue Vorlage
      </IndustrialButton>
    </div>
  );
}

export function TemplateFilterForm({
  query,
  category,
  sortMode,
  pageSize,
  categories,
  onQueryChange,
  onCategoryChange,
  onSortModeChange,
  onPageSizeChange,
  onSubmit,
}: {
  query: string;
  category: TemplateCategory | '';
  sortMode: TemplateSortMode;
  pageSize: number;
  categories: TemplateCategory[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: TemplateCategory | '') => void;
  onSortModeChange: (value: TemplateSortMode) => void;
  onPageSizeChange: (value: number) => void;
  onSubmit: (event?: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="template-filter-form">
      <TextInput label="Suche" value={query} onValueChange={onQueryChange} placeholder="Prävention, Beteiligung, Kündigung ..." />
      <SelectInput
        label="Kategorie"
        value={category}
        onValueChange={(value) => onCategoryChange(value as TemplateCategory | '')}
        options={[{ value: '', label: 'Alle' }, ...categories.map((item) => ({ value: item, label: templateCategoryLabels[item] }))]}
      />
      <SelectInput
        label="Sortierung"
        value={sortMode}
        onValueChange={(value) => onSortModeChange(value as TemplateSortMode)}
        options={[{ value: 'category', label: 'Thematisch gruppiert' }, { value: 'alphabetical', label: 'Alphabetisch' }]}
      />
      <SelectInput
        label="Pro Seite"
        value={String(pageSize)}
        onValueChange={(value) => onPageSizeChange(Number(value))}
        options={TEMPLATE_PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
      />
      <ToolbarButton type="submit"><Search className="h-4 w-4" aria-hidden="true" />Filtern</ToolbarButton>
    </form>
  );
}

export function TemplateListPanel({
  groups,
  selectedTemplate,
  visibleRangeLabel,
  sortMode,
  pageCount,
  safeCurrentPage,
  hasTemplates,
  pageSize,
  templateCount,
  onSelectTemplate,
  onDeleteTemplate,
  onPreviousPage,
  onNextPage,
}: {
  groups: TemplateGroup[];
  selectedTemplate?: TemplateRecord;
  visibleRangeLabel: string;
  sortMode: TemplateSortMode;
  pageCount: number;
  safeCurrentPage: number;
  hasTemplates: boolean;
  pageSize: number;
  templateCount: number;
  onSelectTemplate: (id: string) => void;
  onDeleteTemplate: (template: TemplateRecord) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  return (
    <div className="template-list-panel" aria-label="Vorlagenliste">
      <div className="template-list-summary">
        <span>{visibleRangeLabel}</span>
        <span>{sortMode === 'category' ? 'thematisch sortiert' : 'alphabetisch sortiert'}</span>
      </div>
      {groups.map((group) => (
        <section key={group.key} className="template-list-group" aria-labelledby={`template-group-${group.key}`}>
          <h3 id={`template-group-${group.key}`}>{group.label}</h3>
          <div className="template-list-stack">
            {group.items.map((template) => (
              <div key={template.id} className={`template-list-row ${selectedTemplate?.id === template.id ? 'active' : ''}`}>
                <ToolbarButton className="industrial-list-item template-list-main w-full text-left" onClick={() => onSelectTemplate(template.id)}>
                  <strong>{template.title}</strong>
                  <span>{templateCategoryLabels[template.category]} · {template.legalBasis.join(', ') || 'ohne Normbezug'}</span>
                  <p>{template.description}</p>
                </ToolbarButton>
                <IconButton className="template-trash-button" onClick={() => onDeleteTemplate(template)} aria-label={`Vorlage ${template.title} löschen`} title="Vorlage löschen">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </div>
            ))}
          </div>
        </section>
      ))}
      {!hasTemplates && <div className="industrial-empty">Keine Vorlage gefunden.</div>}
      {templateCount > pageSize && (
        <nav className="template-pagination" aria-label="Vorlagen-Seiten">
          <ToolbarButton onClick={onPreviousPage} disabled={safeCurrentPage <= 1}>Zurück</ToolbarButton>
          <span>Seite {safeCurrentPage} von {pageCount}</span>
          <ToolbarButton onClick={onNextPage} disabled={safeCurrentPage >= pageCount}>Weiter</ToolbarButton>
        </nav>
      )}
    </div>
  );
}

export function TemplateDetailPanel({
  selectedTemplate,
  onEditTemplate,
}: {
  selectedTemplate?: TemplateRecord;
  onEditTemplate: (template: TemplateRecord) => void;
}) {
  return (
    <div className="industrial-subpanel template-detail-panel">
      {selectedTemplate ? (
        <>
          <div className="template-detail-header">
            <div>
              <p className="industrial-kicker">{templateCategoryLabels[selectedTemplate.category]}</p>
              <h2>{selectedTemplate.title}</h2>
              <p>{selectedTemplate.description}</p>
            </div>
            <IndustrialButton className="template-detail-edit-button" onClick={() => onEditTemplate(selectedTemplate)}>
              <FileText className="h-4 w-4" aria-hidden="true" />Bearbeiten
            </IndustrialButton>
          </div>
          <div className="template-detail-meta">
            <div><span>Normen</span><strong>{selectedTemplate.legalBasis.join(', ') || 'ohne Normbezug'}</strong></div>
            <div><span>Tags</span><strong>{selectedTemplate.tags.join(', ') || 'keine Tags'}</strong></div>
          </div>
          <div className="template-body-panel">
            <div className="template-body-heading">
              <h4>Vorlagentext</h4>
              <p className="industrial-meta"><strong>Betreff:</strong> {selectedTemplate.subject || 'ohne Betreff'}</p>
            </div>
            <pre className="industrial-prewrap template-body-preview">{selectedTemplate.body}</pre>
          </div>
        </>
      ) : (
        <div className="industrial-empty">Bitte eine Vorlage auswählen.</div>
      )}
    </div>
  );
}
