import { useCallback, useState } from 'react';
import type { SbvResourceRecord } from '../../../core/models/sbv-resource.model';
import { useAnnouncer } from '../../../shared/a11y/LiveRegionProvider';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import {
  filterResourcesForQuery,
  initialResourceForm,
  isResourceTitleMissing,
  resourceOperationAnnouncement,
  resourceOperationNotice,
  resourceFormFromRecord,
  updateResourceFormValue,
  type ResourceFormState,
} from '../sbvControlLogic';

export function useSbvResources() {
  const announce = useAnnouncer();
  const [resources, setResources] = useState<SbvResourceRecord[]>([]);
  const [resourceQuery, setResourceQuery] = useState('');
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(initialResourceForm);
  const [resourceFormSubmitted, setResourceFormSubmitted] = useState(false);
  const [resourceTitleTouched, setResourceTitleTouched] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  const loadResources = useCallback(async () => {
    const bridge = await waitForBridge();
    if (bridge?.sbvResources) setResources(await bridge.sbvResources.list());
  }, []);

  function updateResourceForm<K extends keyof ResourceFormState>(key: K, value: ResourceFormState[K]) {
    setResourceForm((current) => updateResourceFormValue(current, key, value));
  }

  function editResource(record: SbvResourceRecord) {
    setEditingResourceId(record.id);
    setResourceForm(resourceFormFromRecord(record));
    setResourceFormSubmitted(false);
    setResourceTitleTouched(false);
  }

  function resetResourceForm() {
    setEditingResourceId(null);
    setResourceForm(initialResourceForm);
    setResourceFormSubmitted(false);
    setResourceTitleTouched(false);
  }

  async function saveResource() {
    setResourceFormSubmitted(true);
    if (isResourceTitleMissing(resourceForm)) {
      announce('Titel ist für den Nachweis erforderlich.', 'assertive');
      return { ok: false as const, message: 'Bitte einen Titel für den Nachweis angeben.' };
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.sbvResources) throw new Error('SBV-Ressourcen-Bridge ist nicht verfügbar.');

      if (editingResourceId) {
        await bridge.sbvResources.update(editingResourceId, resourceForm);
        announce(resourceOperationAnnouncement('update'), 'polite');
      } else {
        await bridge.sbvResources.create(resourceForm);
        announce(resourceOperationAnnouncement('create'), 'polite');
      }

      resetResourceForm();
      await loadResources();
      return {
        ok: true as const,
        message: resourceOperationNotice(editingResourceId ? 'update' : 'create')
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nachweis konnte nicht gespeichert werden.';
      announce(message, 'assertive');
      return { ok: false as const, message };
    }
  }

  async function deleteResource(id: string) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.sbvResources) throw new Error('SBV-Ressourcen-Bridge ist nicht verfügbar.');
      await bridge.sbvResources.delete(id);
      if (editingResourceId === id) resetResourceForm();
      announce(resourceOperationAnnouncement('delete'), 'polite');
      await loadResources();
      return { ok: true as const, message: resourceOperationNotice('delete') };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nachweis konnte nicht gelöscht werden.';
      announce(message, 'assertive');
      return { ok: false as const, message };
    }
  }

  return {
    resources,
    setResources,
    resourceQuery,
    setResourceQuery,
    visibleResources: filterResourcesForQuery(resources, resourceQuery),
    resourceForm,
    resourceFormSubmitted,
    resourceTitleTouched,
    editingResourceId,
    loadResources,
    updateResourceForm,
    editResource,
    resetResourceForm,
    setResourceTitleTouched,
    saveResource,
    deleteResource,
    resourceTitleError:
      (resourceTitleTouched || resourceFormSubmitted) && isResourceTitleMissing(resourceForm)
        ? 'Titel ist für den Nachweis erforderlich.'
        : undefined,
    openResourceRequests: resources.filter((item) => item.status === 'planned' || item.status === 'requested').length,
  };
}

export type UseSbvResourcesValue = ReturnType<typeof useSbvResources>;
