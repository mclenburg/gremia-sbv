import { useEffect, useMemo, useState } from 'react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { CreateTemplateInput, TemplateCategory, TemplateRecord } from '../../../domain/models/template.model';
import { DEFAULT_TEMPLATE_PAGE_SIZE, TEMPLATE_CATEGORY_ORDER, clampTemplatePage, compareTemplatesByTitle, groupTemplates, type TemplateSortMode } from './templateCatalogLogic';
import type { PreventionStatus } from '../../../domain/models/prevention.model';
import { createTemplateCatalogActions, createTemplateEditorActions, EMPTY_TEMPLATE } from './templateManagementActions';
import { TemplateEditorModal } from './TemplateEditorModal';
import { TemplateCatalogToolbar, TemplateDetailPanel, TemplateFilterForm, TemplateListPanel } from './TemplateCatalogPanels';

export function TemplatesView() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | ''>('');
  const [sortMode, setSortMode] = useState<TemplateSortMode>('category');
  const [pageSize, setPageSize] = useState<number>(DEFAULT_TEMPLATE_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [newTemplate, setNewTemplate] = useState<CreateTemplateInput>(EMPTY_TEMPLATE);
  const [newTemplateProcessStatus, setNewTemplateProcessStatus] = useState<PreventionStatus | ''>('');
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null);
  const [editTemplateProcessStatus, setEditTemplateProcessStatus] = useState<PreventionStatus | ''>('');
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();
  const categories = TEMPLATE_CATEGORY_ORDER;

  const { loadTemplates, applyFilters, deleteTemplate } = createTemplateCatalogActions({
    query, category, selectedTemplateId, setTemplates, setSelectedTemplateId, setCurrentPage, setInfo, setError, confirmDialog,
  });
  const { createOwnTemplate, openEditTemplate, saveEditedTemplate } = createTemplateEditorActions({
    query, category, newTemplate, newTemplateProcessStatus, editingTemplate, editTemplateProcessStatus,
    setNewTemplate, setNewTemplateProcessStatus, setIsCreateTemplateModalOpen, setEditingTemplate, setEditTemplateProcessStatus,
    setSelectedTemplateId, setInfo, setError, loadTemplates,
  });

  useEffect(() => {
    void loadTemplates().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Vorlagen konnten nicht geladen werden.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (error) announce(error, 'assertive'); }, [error, announce]);
  useEffect(() => { if (info) announce(info, 'polite'); }, [info, announce]);

  const sortedTemplates = useMemo(() => [...templates].sort((left, right) => {
    if (sortMode === 'alphabetical') return compareTemplatesByTitle(left, right);
    return categories.indexOf(left.category) - categories.indexOf(right.category) || compareTemplatesByTitle(left, right);
  }), [templates, sortMode, categories]);

  const pageCount = Math.max(1, Math.ceil(sortedTemplates.length / pageSize));
  const safeCurrentPage = clampTemplatePage(currentPage, pageCount);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagedTemplates = sortedTemplates.slice(pageStart, pageStart + pageSize);
  const groupedPagedTemplates = useMemo(() => groupTemplates(pagedTemplates, sortMode), [pagedTemplates, sortMode]);
  const visibleRangeLabel = templates.length ? `${pageStart + 1}–${Math.min(pageStart + pageSize, sortedTemplates.length)} von ${sortedTemplates.length}` : '0 Vorlagen';
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) ?? sortedTemplates[0], [templates, sortedTemplates, selectedTemplateId]);

  useEffect(() => { if (currentPage !== safeCurrentPage) setCurrentPage(safeCurrentPage); }, [currentPage, safeCurrentPage]);
  useEffect(() => {
    if (pagedTemplates.length && (!selectedTemplateId || !pagedTemplates.some((template) => template.id === selectedTemplateId))) {
      setSelectedTemplateId(pagedTemplates[0].id);
    }
  }, [pagedTemplates, selectedTemplateId]);

  return (
    <ModuleFrame title="Vorlagen" kicker="Schriftverkehr" description="Standardschreiben mit Platzhaltern. Tonalität: freundlich, rechtlich klar, verbindlich und ohne unnötige Diskussionsöffnung." helpId="templates.overview" actions={<TemplateCatalogToolbar onCreate={() => setIsCreateTemplateModalOpen(true)} />}>
      <section className="industrial-panel">
        <TemplateFilterForm
          query={query}
          category={category}
          sortMode={sortMode}
          pageSize={pageSize}
          categories={categories}
          onQueryChange={setQuery}
          onCategoryChange={(value) => { setCategory(value); setCurrentPage(1); }}
          onSortModeChange={(value) => { setSortMode(value); setCurrentPage(1); }}
          onPageSizeChange={(value) => { setPageSize(value); setCurrentPage(1); }}
          onSubmit={applyFilters}
        />
        <ModuleFeedback items={[info ? { id: 'templates-info', tone: 'success', message: info } : null, error ? { id: 'templates-error', tone: 'warning', message: error } : null]} />
        <div className="template-workbench-grid">
          <TemplateListPanel
            groups={groupedPagedTemplates}
            selectedTemplate={selectedTemplate}
            visibleRangeLabel={visibleRangeLabel}
            sortMode={sortMode}
            pageCount={pageCount}
            safeCurrentPage={safeCurrentPage}
            hasTemplates={templates.length > 0}
            pageSize={pageSize}
            templateCount={templates.length}
            onSelectTemplate={setSelectedTemplateId}
            onDeleteTemplate={(template) => void deleteTemplate(template)}
            onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNextPage={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
          />
          <TemplateDetailPanel selectedTemplate={selectedTemplate} onEditTemplate={openEditTemplate} />
        </div>
      </section>

      {isCreateTemplateModalOpen && <TemplateEditorModal mode="create" draft={newTemplate} categories={categories} processStatus={newTemplateProcessStatus} onDraftChange={(updater) => setNewTemplate((current) => updater(current))} onProcessStatusChange={setNewTemplateProcessStatus} onSubmit={createOwnTemplate} onClose={() => setIsCreateTemplateModalOpen(false)} />}
      {editingTemplate && <TemplateEditorModal mode="edit" draft={editingTemplate} categories={categories} processStatus={editTemplateProcessStatus} onDraftChange={(updater) => setEditingTemplate((current) => current ? updater(current) : current)} onProcessStatusChange={setEditTemplateProcessStatus} onSubmit={saveEditedTemplate} onClose={() => setEditingTemplate(null)} />}
    </ModuleFrame>
  );
}
