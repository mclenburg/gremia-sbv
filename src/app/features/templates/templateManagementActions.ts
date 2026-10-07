import type { FormEvent } from 'react';
import type { CreateTemplateInput, TemplateCategory, TemplateRecord } from '../../../domain/models/template.model';
import type { PreventionStatus } from '../../../domain/models/prevention.model';
import type { ConfirmDialogRequest } from '../../shared/dialogs/ConfirmDialogProvider';
import { waitForBridge } from '../../core/bridge/waitForBridge';

type TemplateService = NonNullable<Window['gremiaSbv']>['templates'];

async function requireTemplateService(): Promise<TemplateService> {
  const bridge = await waitForBridge();
  if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
  return bridge.templates;
}

export const EMPTY_TEMPLATE: CreateTemplateInput = {
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

type TemplateCatalogActionDeps = {
  query: string;
  category: TemplateCategory | '';
  selectedTemplateId: string;
  setTemplates: (rows: TemplateRecord[]) => void;
  setSelectedTemplateId: (id: string) => void;
  setCurrentPage: (page: number) => void;
  setInfo: (message: string) => void;
  setError: (error: string) => void;
  confirmDialog: (request: ConfirmDialogRequest) => Promise<boolean>;
};

export function createTemplateCatalogActions({ query, category, selectedTemplateId, setTemplates, setSelectedTemplateId, setCurrentPage, setInfo, setError, confirmDialog }: TemplateCatalogActionDeps) {
  async function loadTemplates(nextQuery = query, nextCategory = category) {
    const service = await requireTemplateService();
    const rows = await service.list({ query: nextQuery, category: nextCategory || undefined, limit: 300 });
    setTemplates(rows);
    if (!selectedTemplateId && rows[0]) setSelectedTemplateId(rows[0].id);
  }

  async function applyFilters(event?: Pick<FormEvent, 'preventDefault'>) {
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
      const service = await requireTemplateService();
      if (!service.delete) throw new Error('Vorlagenlöschung wird von der Datenbrücke noch nicht unterstützt.');
      await service.delete(template.id);
      if (selectedTemplateId === template.id) setSelectedTemplateId('');
      await loadTemplates(query, category);
      setInfo('Vorlage wurde gelöscht.');
    } catch (deleteError) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : 'Vorlage konnte nicht gelöscht werden.';
      setError(errorMessage);
    }
  }

  return { loadTemplates, applyFilters, deleteTemplate };
}

type TemplateEditorActionDeps = {
  query: string;
  category: TemplateCategory | '';
  newTemplate: CreateTemplateInput;
  newTemplateProcessStatus: PreventionStatus | '';
  editingTemplate: TemplateRecord | null;
  editTemplateProcessStatus: PreventionStatus | '';
  setNewTemplate: (draft: CreateTemplateInput) => void;
  setNewTemplateProcessStatus: (status: PreventionStatus | '') => void;
  setIsCreateTemplateModalOpen: (open: boolean) => void;
  setEditingTemplate: (draft: TemplateRecord | null) => void;
  setEditTemplateProcessStatus: (status: PreventionStatus | '') => void;
  setSelectedTemplateId: (id: string) => void;
  setInfo: (message: string) => void;
  setError: (error: string) => void;
  loadTemplates: (query: string, category: TemplateCategory | '') => Promise<void>;
};

export function createTemplateEditorActions({
  query, category, newTemplate, newTemplateProcessStatus, editingTemplate, editTemplateProcessStatus,
  setNewTemplate, setNewTemplateProcessStatus, setIsCreateTemplateModalOpen, setEditingTemplate, setEditTemplateProcessStatus,
  setSelectedTemplateId, setInfo, setError, loadTemplates,
}: TemplateEditorActionDeps) {
  async function saveTemplate(operation: (service: TemplateService) => Promise<string>, resetDraft: () => void, successMessage: string, fallback: string) {
    setError('');
    setInfo('');
    try {
      const service = await requireTemplateService();
      const templateId = await operation(service);
      resetDraft();
      await loadTemplates(query, category);
      setSelectedTemplateId(templateId);
      setInfo(successMessage);
    } catch (error) {
      setError(error instanceof Error ? error.message : fallback);
    }
  }

  async function createOwnTemplate(event: Pick<FormEvent, 'preventDefault'>) {
    event.preventDefault();
    await saveTemplate(async (service) => {
      const created = await service.create({
        ...newTemplate,
        legalBasis: uniqueCsvValues(newTemplate.legalBasis),
        tags: [...uniqueCsvValues(newTemplate.tags), ...preventionTags(newTemplate.category, newTemplateProcessStatus)]
          .filter((entry, index, all) => all.indexOf(entry) === index),
      });
      return created.id;
    }, () => {
      setNewTemplate({ ...EMPTY_TEMPLATE });
      setNewTemplateProcessStatus('');
      setIsCreateTemplateModalOpen(false);
    }, 'Eigene Vorlage wurde gespeichert.', 'Vorlage konnte nicht gespeichert werden.');
  }

  function openEditTemplate(template: TemplateRecord) {
    setEditingTemplate({ ...template, legalBasis: [...template.legalBasis], tags: [...template.tags] });
    const statusTag = template.tags.find((tag) => tag.startsWith('status:'));
    setEditTemplateProcessStatus(statusTag ? statusTag.replace('status:', '') as PreventionStatus : '');
    setError('');
    setInfo('');
  }

  async function saveEditedTemplate(event: Pick<FormEvent, 'preventDefault'>) {
    event.preventDefault();
    if (!editingTemplate) return;
    await saveTemplate(async (service) => {
      if (!service.update) throw new Error('Vorlagenänderung wird von der Datenbrücke noch nicht unterstützt.');
      const baseTags = uniqueCsvValues(editingTemplate.tags).filter((entry) => !entry.startsWith('status:') && entry !== 'massnahme:prevention');
      await service.update(editingTemplate.id, {
        title: editingTemplate.title,
        category: editingTemplate.category,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        description: editingTemplate.description,
        legalBasis: uniqueCsvValues(editingTemplate.legalBasis),
        tags: [...baseTags, ...preventionTags(editingTemplate.category, editTemplateProcessStatus)],
      });
      return editingTemplate.id;
    }, () => setEditingTemplate(null), 'Vorlage wurde aktualisiert.', 'Vorlage konnte nicht aktualisiert werden.');
  }

  return { createOwnTemplate, openEditTemplate, saveEditedTemplate };
}
