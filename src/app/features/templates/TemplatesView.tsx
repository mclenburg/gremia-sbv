import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { TemplateHelpModal } from './TemplateHelpModal';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { CreateTemplateInput, TemplateCategory, TemplateRecord } from '../../core/models/template.model';
import { DEFAULT_TEMPLATE_PAGE_SIZE, TEMPLATE_CATEGORY_ORDER, clampTemplatePage, compareTemplatesByTitle, groupTemplates, type TemplateSortMode } from './templateCatalogLogic';
import type { PreventionStatus } from '../../core/models/prevention.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { TemplateEditorModal } from './TemplateEditorModal';
import { TemplateCatalogToolbar, TemplateDetailPanel, TemplateFilterForm, TemplateListPanel } from './TemplateCatalogPanels';

const EMPTY_TEMPLATE: CreateTemplateInput = {
  title: '',
  category: 'sonstiges',
  subject: '',
  body: '',
  description: '',
  legalBasis: [],
  tags: []
};

function uniqueCsvValues(values: string[] | undefined): string[] {
  return (values ?? [])
    .flatMap((entry) => String(entry).split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, all) => all.indexOf(entry) === index);
}

function preventionTags(category: TemplateCategory, status: PreventionStatus | ''): string[] {
  return [
    ...(category === 'praevention' ? ['massnahme:prevention'] : []),
    ...(category === 'praevention' && status ? [`status:${status}`] : [])
  ];
}

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
  const [isTemplateHelpOpen, setIsTemplateHelpOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null);
  const [editTemplateProcessStatus, setEditTemplateProcessStatus] = useState<PreventionStatus | ''>('');
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();
  const categories = TEMPLATE_CATEGORY_ORDER;

  async function loadTemplates(nextQuery = query, nextCategory = category) {
    const bridge = await waitForBridge();
    if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
    const rows = await bridge.templates.list({ query: nextQuery, category: nextCategory || undefined, limit: 300 });
    setTemplates(rows);
    if (!selectedTemplateId && rows[0]) setSelectedTemplateId(rows[0].id);
  }

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

  async function applyFilters(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setInfo('');
    try {
      setCurrentPage(1);
      await loadTemplates(query, category);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Vorlagen konnten nicht geladen werden.');
    }
  }

  async function createOwnTemplate(event: FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      const created = await bridge.templates.create({
        ...newTemplate,
        legalBasis: uniqueCsvValues(newTemplate.legalBasis),
        tags: [...uniqueCsvValues(newTemplate.tags), ...preventionTags(newTemplate.category, newTemplateProcessStatus)]
          .filter((entry, index, all) => all.indexOf(entry) === index)
      });
      setNewTemplate({ ...EMPTY_TEMPLATE });
      setNewTemplateProcessStatus('');
      setIsCreateTemplateModalOpen(false);
      await loadTemplates(query, category);
      setSelectedTemplateId(created.id);
      setInfo('Eigene Vorlage wurde gespeichert.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Vorlage konnte nicht gespeichert werden.');
    }
  }

  function openEditTemplate(template: TemplateRecord) {
    setEditingTemplate({ ...template, legalBasis: [...template.legalBasis], tags: [...template.tags] });
    const statusTag = template.tags.find((tag) => tag.startsWith('status:'));
    setEditTemplateProcessStatus(statusTag ? statusTag.replace('status:', '') as PreventionStatus : '');
    setError('');
    setInfo('');
  }

  async function saveEditedTemplate(event: FormEvent) {
    event.preventDefault();
    if (!editingTemplate) return;
    setError('');
    setInfo('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      if (!bridge.templates.update) throw new Error('Vorlagenänderung wird von der Datenbrücke noch nicht unterstützt.');
      const baseTags = uniqueCsvValues(editingTemplate.tags).filter((entry) => !entry.startsWith('status:') && entry !== 'massnahme:prevention');
      await bridge.templates.update(editingTemplate.id, {
        title: editingTemplate.title,
        category: editingTemplate.category,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        description: editingTemplate.description,
        legalBasis: uniqueCsvValues(editingTemplate.legalBasis),
        tags: [...baseTags, ...preventionTags(editingTemplate.category, editTemplateProcessStatus)]
      });
      setEditingTemplate(null);
      await loadTemplates(query, category);
      setSelectedTemplateId(editingTemplate.id);
      setInfo('Vorlage wurde aktualisiert.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Vorlage konnte nicht aktualisiert werden.');
    }
  }

  async function deleteTemplate(template: TemplateRecord) {
    const confirmed = await confirmDialog({
      variant: 'danger',
      title: 'Vorlage löschen?',
      message: `Die Vorlage „${template.title}“ wird dauerhaft gelöscht.`,
      confirmLabel: 'Vorlage löschen',
      cancelLabel: 'Abbrechen'
    });
    if (!confirmed) return;
    setError('');
    setInfo('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      if (!bridge.templates.delete) throw new Error('Vorlagenlöschung wird von der Datenbrücke noch nicht unterstützt.');
      await bridge.templates.delete(template.id);
      if (selectedTemplateId === template.id) setSelectedTemplateId('');
      await loadTemplates(query, category);
      setInfo('Vorlage wurde gelöscht.');
      announce('Vorlage wurde gelöscht.', 'polite');
    } catch (deleteError) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : 'Vorlage konnte nicht gelöscht werden.';
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    }
  }

  return (
    <ModuleFrame title="Vorlagen" kicker="Schriftverkehr" description="Standardschreiben mit Platzhaltern. Tonalität: freundlich, rechtlich klar, verbindlich und ohne unnötige Diskussionsöffnung.">
      <section className="industrial-panel">
        <TemplateCatalogToolbar onCreate={() => setIsCreateTemplateModalOpen(true)} onOpenHelp={() => setIsTemplateHelpOpen(true)} />
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
      {isTemplateHelpOpen && <TemplateHelpModal onClose={() => setIsTemplateHelpOpen(false)} />}
    </ModuleFrame>
  );
}
