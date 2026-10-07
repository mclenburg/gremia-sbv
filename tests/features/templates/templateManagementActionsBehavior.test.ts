import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTemplateCatalogActions, createTemplateEditorActions } from '../../../src/app/features/templates/templateManagementActions';
import type { CreateTemplateInput, TemplateRecord } from '../../../src/domain/models/template.model';

const template: TemplateRecord = {
  id: 'template-1', key: 'own-template', title: 'Eigene Vorlage', category: 'praevention', subject: 'Betreff',
  body: 'Unicode: Ärztliche Anhörung', legalBasis: ['§ 178'], tags: ['Beteiligung', 'status:angefordert', 'massnahme:prevention'],
  isSystem: false, createdAt: '2024-01-01', updatedAt: '2024-01-01',
};
const draft: CreateTemplateInput = {
  title: 'Neue Vorlage', category: 'praevention', subject: 'Unterrichtung', body: 'Unicode: Überprüfung',
  legalBasis: [' § 178, § 167 ', '§ 178'], tags: [' Beteiligung, Frist ', 'Frist'],
};

function setup(editingTemplate: TemplateRecord | null = template) {
  const service = {
    list: vi.fn().mockResolvedValue([template]), create: vi.fn().mockResolvedValue({ ...template, id: 'created-1' }),
    update: vi.fn().mockResolvedValue(template), delete: vi.fn().mockResolvedValue({ deleted: true }),
  };
  vi.stubGlobal('window', { gremiaSbv: { security: {}, templates: service } });
  const setters = {
    setTemplates: vi.fn(), setSelectedTemplateId: vi.fn(), setCurrentPage: vi.fn(), setInfo: vi.fn(), setError: vi.fn(),
    setNewTemplate: vi.fn(), setNewTemplateProcessStatus: vi.fn(), setIsCreateTemplateModalOpen: vi.fn(),
    setEditingTemplate: vi.fn(), setEditTemplateProcessStatus: vi.fn(),
  };
  const confirmDialog = vi.fn().mockResolvedValue(true);
  const catalog = createTemplateCatalogActions({
    query: 'Anhörung', category: 'praevention', selectedTemplateId: template.id, confirmDialog, ...setters,
  });
  const loadTemplates = vi.fn().mockResolvedValue(undefined);
  const editor = createTemplateEditorActions({
    query: 'Anhörung', category: 'praevention', newTemplate: draft, newTemplateProcessStatus: 'massnahmen_vereinbart',
    editingTemplate, editTemplateProcessStatus: 'abgeschlossen', loadTemplates, ...setters,
  });
  const event = { preventDefault: vi.fn() };
  return { service, setters, confirmDialog, catalog, editor, loadTemplates, event };
}

describe('template management workflows', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads filtered catalog entries and resets pagination for a submitted search', async () => {
    const state = setup();
    await state.catalog.applyFilters(state.event);
    expect(state.service.list).toHaveBeenCalledExactlyOnceWith({ query: 'Anhörung', category: 'praevention', limit: 300 });
    expect(state.setters.setTemplates).toHaveBeenCalledExactlyOnceWith([template]);
    expect(state.setters.setCurrentPage).toHaveBeenCalledExactlyOnceWith(1);
    expect(state.setters.setSelectedTemplateId).not.toHaveBeenCalled();
    expect(state.event.preventDefault).toHaveBeenCalledOnce();
  });

  it('normalizes comma separated inputs and adds prevention context before persisting a new draft', async () => {
    const state = setup();
    await state.editor.createOwnTemplate(state.event);
    expect(state.service.create).toHaveBeenCalledExactlyOnceWith({
      ...draft, legalBasis: ['§ 178', '§ 167'], tags: ['Beteiligung', 'Frist', 'massnahme:prevention', 'status:massnahmen_vereinbart'],
    });
    expect(state.setters.setNewTemplate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: '', category: 'sonstiges', legalBasis: [], tags: [] }));
    expect(state.setters.setIsCreateTemplateModalOpen).toHaveBeenCalledExactlyOnceWith(false);
    expect(state.setters.setNewTemplateProcessStatus).toHaveBeenCalledExactlyOnceWith('');
    expect(state.loadTemplates).toHaveBeenCalledExactlyOnceWith('Anhörung', 'praevention');
    expect(state.setters.setSelectedTemplateId).toHaveBeenCalledExactlyOnceWith('created-1');
    expect(state.setters.setInfo).toHaveBeenLastCalledWith('Eigene Vorlage wurde gespeichert.');
  });

  it('waits for confirmed creation before resetting or closing the draft', async () => {
    const state = setup();
    let resolve!: (record: TemplateRecord) => void;
    state.service.create.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = state.editor.createOwnTemplate(state.event);
    await vi.waitFor(() => expect(state.service.create).toHaveBeenCalledOnce());
    expect(state.setters.setNewTemplate).not.toHaveBeenCalled();
    expect(state.setters.setIsCreateTemplateModalOpen).not.toHaveBeenCalled();
    expect(state.loadTemplates).not.toHaveBeenCalled();
    resolve(template);
    await pending;
    expect(state.setters.setIsCreateTemplateModalOpen).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('opens an independent editable copy and restores the prevention status', () => {
    const state = setup();
    state.editor.openEditTemplate(template);
    const editable = state.setters.setEditingTemplate.mock.lastCall![0] as TemplateRecord;
    editable.tags.push('Nur im Entwurf');
    editable.legalBasis.push('Weitere Norm');
    expect(template.tags).not.toContain('Nur im Entwurf');
    expect(template.legalBasis).not.toContain('Weitere Norm');
    expect(state.setters.setEditTemplateProcessStatus).toHaveBeenCalledExactlyOnceWith('angefordert');
  });

  it('replaces previous prevention metadata when saving a changed process status', async () => {
    const state = setup();
    await state.editor.saveEditedTemplate(state.event);
    expect(state.service.update).toHaveBeenCalledExactlyOnceWith(template.id, {
      title: template.title, category: template.category, subject: template.subject, body: template.body,
      description: template.description, legalBasis: template.legalBasis,
      tags: ['Beteiligung', 'massnahme:prevention', 'status:abgeschlossen'],
    });
    expect(state.setters.setEditingTemplate).toHaveBeenCalledExactlyOnceWith(null);
    expect(state.setters.setSelectedTemplateId).toHaveBeenCalledExactlyOnceWith(template.id);
    expect(state.loadTemplates).toHaveBeenCalledOnce();
  });

  it('removes prevention metadata when the edited template changes category', async () => {
    const state = setup({ ...template, category: 'sonstiges' });
    await state.editor.saveEditedTemplate(state.event);
    expect(state.service.update).toHaveBeenCalledExactlyOnceWith(template.id, expect.objectContaining({ category: 'sonstiges', tags: ['Beteiligung'] }));
  });

  it.each(['createOwnTemplate', 'saveEditedTemplate'] as const)('retains the draft after rejected %s', async (action) => {
    const state = setup();
    state.service.create.mockRejectedValue(new Error('Vorlage konnte nicht gespeichert werden'));
    state.service.update.mockRejectedValue(new Error('Vorlage konnte nicht gespeichert werden'));
    await state.editor[action](state.event);
    expect(state.setters.setError).toHaveBeenLastCalledWith('Vorlage konnte nicht gespeichert werden');
    expect(state.setters.setNewTemplate).not.toHaveBeenCalled();
    expect(state.setters.setEditingTemplate).not.toHaveBeenCalled();
    expect(state.setters.setIsCreateTemplateModalOpen).not.toHaveBeenCalled();
    expect(state.loadTemplates).not.toHaveBeenCalled();
  });

  it('does not save when no edit draft is active', async () => {
    const state = setup(null);
    await state.editor.saveEditedTemplate(state.event);
    expect(state.event.preventDefault).toHaveBeenCalledOnce();
    expect(state.service.update).not.toHaveBeenCalled();
    expect(state.setters.setError).not.toHaveBeenCalled();
  });

  it('leaves the catalog unchanged when deletion is cancelled', async () => {
    const state = setup();
    state.confirmDialog.mockResolvedValue(false);
    await state.catalog.deleteTemplate(template);
    expect(state.confirmDialog).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ variant: 'danger', confirmLabel: 'Vorlage löschen', cancelLabel: 'Abbrechen' }));
    expect(state.service.delete).not.toHaveBeenCalled();
    expect(state.service.list).not.toHaveBeenCalled();
    expect(state.setters.setSelectedTemplateId).not.toHaveBeenCalled();
    expect(state.setters.setInfo).not.toHaveBeenCalled();
  });

  it('deletes only the confirmed template and clears its selection before reloading', async () => {
    const state = setup();
    await state.catalog.deleteTemplate(template);
    expect(state.service.delete).toHaveBeenCalledExactlyOnceWith(template.id);
    expect(state.setters.setSelectedTemplateId).toHaveBeenCalledExactlyOnceWith('');
    expect(state.service.list).toHaveBeenCalledOnce();
    expect(state.setters.setInfo).toHaveBeenLastCalledWith('Vorlage wurde gelöscht.');
  });

  it('preserves selection and catalog entries when confirmed deletion fails', async () => {
    const state = setup();
    state.service.delete.mockRejectedValue(new Error('Systemvorlage ist geschützt'));
    await state.catalog.deleteTemplate(template);
    expect(state.setters.setError).toHaveBeenLastCalledWith('Systemvorlage ist geschützt');
    expect(state.setters.setSelectedTemplateId).not.toHaveBeenCalled();
    expect(state.service.list).not.toHaveBeenCalled();
  });
});
