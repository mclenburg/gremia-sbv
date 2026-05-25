import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FileText, HelpCircle, Plus, Save, Search, Trash2 } from 'lucide-react';
import { TemplateHelpModal } from './TemplateHelpModal';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { CreateTemplateInput, TemplateCategory, TemplateRecord } from '../../core/models/template.model';
import { DEFAULT_TEMPLATE_PAGE_SIZE, TEMPLATE_CATEGORY_ORDER, TEMPLATE_PAGE_SIZE_OPTIONS, clampTemplatePage, compareTemplatesByTitle, groupTemplates, templateCategoryLabels, type TemplateSortMode } from './templateCatalogLogic';
import type { PreventionStatus } from '../../core/models/prevention.model';
import { preventionStatusOrder, statusLabel } from '../prevention/preventionShared';
import { waitForBridge } from '../../core/bridge/waitForBridge';

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
  const [newTemplate, setNewTemplate] = useState<CreateTemplateInput>({
    title: '',
    category: 'sonstiges',
    subject: '',
    body: '',
    description: '',
    legalBasis: [],
    tags: []
  });
  const [newTemplateProcessStatus, setNewTemplateProcessStatus] = useState<PreventionStatus | ''>('');
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [isTemplateHelpOpen, setIsTemplateHelpOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null);
  const [editTemplateProcessStatus, setEditTemplateProcessStatus] = useState<PreventionStatus | ''>('');
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();
  const categories = TEMPLATE_CATEGORY_ORDER;


  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  useEffect(() => {
    if (info) announce(info, 'polite');
  }, [info, announce]);

  async function loadTemplates(nextQuery = query, nextCategory = category) {
    const bridge = await waitForBridge();
    if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
    const rows = await bridge.templates.list({ query: nextQuery, category: nextCategory || undefined, limit: 300 });
    setTemplates(rows);
    if (!selectedTemplateId && rows[0]) setSelectedTemplateId(rows[0].id);
  }

  useEffect(() => {
    loadTemplates().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Vorlagen konnten nicht geladen werden.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedTemplates = useMemo(() => [...templates].sort((left, right) => {
    if (sortMode === 'alphabetical') return compareTemplatesByTitle(left, right);
    const categoryOrder = categories.indexOf(left.category) - categories.indexOf(right.category);
    return categoryOrder || compareTemplatesByTitle(left, right);
  }), [templates, sortMode]);

  const pageCount = Math.max(1, Math.ceil(sortedTemplates.length / pageSize));
  const safeCurrentPage = clampTemplatePage(currentPage, pageCount);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagedTemplates = sortedTemplates.slice(pageStart, pageStart + pageSize);
  const groupedPagedTemplates = useMemo(() => groupTemplates(pagedTemplates, sortMode), [pagedTemplates, sortMode]);
  const visibleRangeLabel = templates.length
    ? `${pageStart + 1}–${Math.min(pageStart + pageSize, sortedTemplates.length)} von ${sortedTemplates.length}`
    : '0 Vorlagen';

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) ?? sortedTemplates[0], [templates, sortedTemplates, selectedTemplateId]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) setCurrentPage(safeCurrentPage);
  }, [currentPage, safeCurrentPage]);

  useEffect(() => {
    if (!pagedTemplates.length) return;
    if (!selectedTemplateId || !pagedTemplates.some((template) => template.id === selectedTemplateId)) {
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
        legalBasis: (newTemplate.legalBasis ?? []).flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean),
        tags: [
          ...(newTemplate.tags ?? []).flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean),
          ...(newTemplate.category === 'praevention' ? ['massnahme:prevention'] : []),
          ...(newTemplate.category === 'praevention' && newTemplateProcessStatus ? [`status:${newTemplateProcessStatus}`] : [])
        ].filter((entry, index, all) => all.indexOf(entry) === index)
      });
      setNewTemplate({ title: '', category: 'sonstiges', subject: '', body: '', description: '', legalBasis: [], tags: [] });
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
    setEditingTemplate({
      ...template,
      legalBasis: [...template.legalBasis],
      tags: [...template.tags]
    });
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
      const nextTags = [
        ...(editingTemplate.tags ?? []).flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean).filter((entry) => !entry.startsWith('status:') && entry !== 'massnahme:prevention'),
        ...(editingTemplate.category === 'praevention' ? ['massnahme:prevention'] : []),
        ...(editingTemplate.category === 'praevention' && editTemplateProcessStatus ? [`status:${editTemplateProcessStatus}`] : [])
      ].filter((entry, index, all) => all.indexOf(entry) === index);

      const payload = {
        title: editingTemplate.title,
        category: editingTemplate.category,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        description: editingTemplate.description,
        legalBasis: (editingTemplate.legalBasis ?? []).flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean),
        tags: nextTags
      };

      if (bridge.templates.update) {
        await bridge.templates.update(editingTemplate.id, payload);
      } else {
        throw new Error('Vorlagenänderung wird von der Datenbrücke noch nicht unterstützt.');
      }
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
      if (bridge.templates.delete) {
        await bridge.templates.delete(template.id);
      } else {
        throw new Error('Vorlagenlöschung wird von der Datenbrücke noch nicht unterstützt.');
      }
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
    <ModuleFrame
      title="Vorlagen"
      kicker="Schriftverkehr"
      description="Standardschreiben mit Platzhaltern. Tonalität: freundlich, rechtlich klar, verbindlich und ohne unnötige Diskussionsöffnung."
    >
      <section className="industrial-panel">
        <div className="template-catalog-toolbar">
          <div className="template-title-cluster">
            <button
              type="button"
              className="template-help-button"
              onClick={() => setIsTemplateHelpOpen(true)}
              aria-label="Hilfe zu Vorlagen und Platzhaltern öffnen"
              title="Hilfe zu Platzhaltern"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <div>
              <p className="industrial-kicker">Auswahl</p>
              <h2>Vorlagenkatalog</h2>
            </div>
          </div>
          <button type="button" className="industrial-button" onClick={() => setIsCreateTemplateModalOpen(true)}>
            <Plus className="h-4 w-4" /> Neue Vorlage
          </button>
        </div>
        <form onSubmit={applyFilters} className="template-filter-form">
          <label><span>Suche</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Prävention, Beteiligung, Kündigung ..." /></label>
          <label><span>Kategorie</span><select value={category} onChange={(event) => { setCategory(event.target.value as TemplateCategory | ''); setCurrentPage(1); }}><option value="">Alle</option>{categories.map((item) => <option key={item} value={item}>{templateCategoryLabels[item]}</option>)}</select></label>
          <label><span>Sortierung</span><select value={sortMode} onChange={(event) => { setSortMode(event.target.value as TemplateSortMode); setCurrentPage(1); }}><option value="category">Thematisch gruppiert</option><option value="alphabetical">Alphabetisch</option></select></label>
          <label><span>Pro Seite</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }}>{TEMPLATE_PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <button type="submit" className="industrial-secondary-button"><Search className="h-4 w-4" />Filtern</button>
        </form>
        <ModuleFeedback items={[info ? { id: 'templates-info', tone: 'success', message: info } : null, error ? { id: 'templates-error', tone: 'warning', message: error } : null]} />
        <div className="template-workbench-grid">
          <div className="template-list-panel" aria-label="Vorlagenliste">
            <div className="template-list-summary">
              <span>{visibleRangeLabel}</span>
              <span>{sortMode === 'category' ? 'thematisch sortiert' : 'alphabetisch sortiert'}</span>
            </div>
            {groupedPagedTemplates.map((group) => (
              <section key={group.key} className="template-list-group" aria-labelledby={`template-group-${group.key}`}>
                <h3 id={`template-group-${group.key}`}>{group.label}</h3>
                <div className="template-list-stack">
                  {group.items.map((template) => (
                    <div key={template.id} className={`template-list-row ${selectedTemplate?.id === template.id ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="industrial-list-item template-list-main w-full text-left"
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        <strong>{template.title}</strong>
                        <span>{templateCategoryLabels[template.category]} · {template.legalBasis.join(', ') || 'ohne Normbezug'}</span>
                        <p>{template.description}</p>
                      </button>
                      <button
                        type="button"
                        className="template-trash-button"
                        onClick={() => void deleteTemplate(template)}
                        aria-label={`Vorlage ${template.title} löschen`}
                        title="Vorlage löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {!templates.length && <div className="industrial-empty">Keine Vorlage gefunden.</div>}
            {templates.length > pageSize && (
              <nav className="template-pagination" aria-label="Vorlagen-Seiten">
                <button type="button" className="industrial-secondary-button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage <= 1}>Zurück</button>
                <span>Seite {safeCurrentPage} von {pageCount}</span>
                <button type="button" className="industrial-secondary-button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={safeCurrentPage >= pageCount}>Weiter</button>
              </nav>
            )}
          </div>

          <div className="industrial-subpanel template-detail-panel">
            {selectedTemplate ? (
              <>
                <div className="template-detail-header">
                  <div>
                    <p className="industrial-kicker">{templateCategoryLabels[selectedTemplate.category]}</p>
                    <h2>{selectedTemplate.title}</h2>
                    <p>{selectedTemplate.description}</p>
                  </div>
                  <button type="button" className="industrial-button template-detail-edit-button" onClick={() => openEditTemplate(selectedTemplate)}><FileText className="h-4 w-4" />Bearbeiten</button>
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
        </div>
      </section>

      {isCreateTemplateModalOpen && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal template-create-modal" role="dialog" aria-modal="true" aria-labelledby="template-create-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Eigene Vorlage</p>
                <h2 id="template-create-title">Vorlage ergänzen</h2>
                <p>Neue Standardschreiben werden hier angelegt und können anschließend aus Fallakte oder Maßnahme heraus genutzt werden.</p>
              </div>
            </div>
        <form onSubmit={createOwnTemplate} className="template-create-form">
          <div className="template-form-grid">
            <label><span>Titel</span><input value={newTemplate.title} onChange={(event) => setNewTemplate((draft) => ({ ...draft, title: event.target.value }))} autoFocus /></label>
            <label><span>Kategorie</span><select value={newTemplate.category} onChange={(event) => setNewTemplate((draft) => ({ ...draft, category: event.target.value as TemplateCategory }))}>{categories.map((item) => <option key={item} value={item}>{templateCategoryLabels[item]}</option>)}</select></label>
            <label><span>Maßnahmenstatus</span><select value={newTemplateProcessStatus} onChange={(event) => setNewTemplateProcessStatus(event.target.value as PreventionStatus | '')} disabled={newTemplate.category !== 'praevention'}><option value="">alle / nicht gebunden</option>{preventionStatusOrder.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
            <label><span>Normen</span><input value={(newTemplate.legalBasis ?? []).join(', ')} onChange={(event) => setNewTemplate((draft) => ({ ...draft, legalBasis: [event.target.value] }))} placeholder="§ 178 Abs. 2 Satz 1 SGB IX" /></label>
            <label><span>Tags</span><input value={(newTemplate.tags ?? []).join(', ')} onChange={(event) => setNewTemplate((draft) => ({ ...draft, tags: [event.target.value] }))} placeholder="Beteiligung, Frist, HR" /></label>
          </div>
          <label><span>Beschreibung</span><input value={newTemplate.description ?? ''} onChange={(event) => setNewTemplate((draft) => ({ ...draft, description: event.target.value }))} /></label>
          <label><span>Betreff</span><input value={newTemplate.subject} onChange={(event) => setNewTemplate((draft) => ({ ...draft, subject: event.target.value }))} placeholder="Beteiligung der SBV – {{fall.aktenzeichen}}" /></label>
          <label><span>Text</span><TextCommandTextarea fieldId="template-new-body" value={newTemplate.body} onChange={(event) => setNewTemplate((draft) => ({ ...draft, body: event.target.value }))} placeholder="Sehr geehrte Damen und Herren, ..." /></label>
          <div className="template-form-hint">Platzhalter kannst du über das Hilfe-Symbol im Vorlagenkatalog nachschlagen.</div>
          <div className="industrial-modal-actions">
            <button type="button" className="industrial-secondary-button" onClick={() => setIsCreateTemplateModalOpen(false)}>Abbrechen</button>
            <button type="submit" className="industrial-button"><Save className="h-4 w-4" />Vorlage speichern</button>
          </div>
        </form>
          </section>
        </div>
      )}
      {editingTemplate && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal template-create-modal" role="dialog" aria-modal="true" aria-labelledby="template-edit-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Vorlage bearbeiten</p>
                <h2 id="template-edit-title">{editingTemplate.title}</h2>
                <p>Text, Tags, Normen und Zuordnung dieser Vorlage ändern.</p>
              </div>
            </div>
            <form onSubmit={saveEditedTemplate} className="template-create-form">
              <div className="template-form-grid">
                <label><span>Titel</span><input value={editingTemplate.title} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, title: event.target.value } : draft)} autoFocus /></label>
                <label><span>Kategorie</span><select value={editingTemplate.category} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, category: event.target.value as TemplateCategory } : draft)}>{categories.map((item) => <option key={item} value={item}>{templateCategoryLabels[item]}</option>)}</select></label>
                <label><span>Maßnahmenstatus</span><select value={editTemplateProcessStatus} onChange={(event) => setEditTemplateProcessStatus(event.target.value as PreventionStatus | '')} disabled={editingTemplate.category !== 'praevention'}><option value="">alle / nicht gebunden</option>{preventionStatusOrder.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
                <label><span>Normen</span><input value={(editingTemplate.legalBasis ?? []).join(', ')} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, legalBasis: [event.target.value] } : draft)} placeholder="§ 178 Abs. 2 Satz 1 SGB IX" /></label>
                <label><span>Tags</span><input value={(editingTemplate.tags ?? []).filter((tag) => tag !== 'massnahme:prevention' && !tag.startsWith('status:')).join(', ')} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, tags: [event.target.value] } : draft)} placeholder="Beteiligung, Frist, HR" /></label>
              </div>
              <label><span>Beschreibung</span><input value={editingTemplate.description ?? ''} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, description: event.target.value } : draft)} /></label>
              <label><span>Betreff</span><input value={editingTemplate.subject} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, subject: event.target.value } : draft)} placeholder="Beteiligung der SBV – {{fall.aktenzeichen}}" /></label>
              <label><span>Text</span><TextCommandTextarea fieldId="template-edit-body" value={editingTemplate.body} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, body: event.target.value } : draft)} placeholder="Sehr geehrte Damen und Herren, ..." /></label>
              <div className="template-form-hint">Bei Präventionsvorlagen werden die Tags <code>massnahme:prevention</code> und bei Statusbindung <code>status:...</code> automatisch gesetzt.</div>
              <div className="industrial-modal-actions">
                <button type="button" className="industrial-secondary-button" onClick={() => setEditingTemplate(null)}>Abbrechen</button>
                <button type="submit" className="industrial-button"><Save className="h-4 w-4" />Änderungen speichern</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {isTemplateHelpOpen && <TemplateHelpModal onClose={() => setIsTemplateHelpOpen(false)} />}
    </ModuleFrame>
  );
}
