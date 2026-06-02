import { useCallback, useState } from 'react';
import type { SbvControlProtocolRecord } from '../../../core/models/sbv-control-protocol.model';
import { useAnnouncer } from '../../../shared/a11y/LiveRegionProvider';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import {
  filterProtocolsForQuery,
  initialProtocolForm,
  isProtocolTitleMissing,
  protocolFormFromRecord,
  protocolOperationAnnouncement,
  protocolOperationNotice,
  updateProtocolFormValue,
  type ProtocolFormState,
} from '../sbvControlLogic';

export function useSbvControlProtocols() {
  const announce = useAnnouncer();
  const [protocols, setProtocols] = useState<SbvControlProtocolRecord[]>([]);
  const [protocolQuery, setProtocolQuery] = useState('');
  const [protocolForm, setProtocolForm] = useState<ProtocolFormState>(initialProtocolForm);
  const [protocolFormSubmitted, setProtocolFormSubmitted] = useState(false);
  const [protocolTitleTouched, setProtocolTitleTouched] = useState(false);
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);

  const loadProtocols = useCallback(async () => {
    const bridge = await waitForBridge();
    if (bridge?.sbvControlProtocols) setProtocols(await bridge.sbvControlProtocols.list());
  }, []);

  function updateProtocolForm<K extends keyof ProtocolFormState>(key: K, value: ProtocolFormState[K]) {
    setProtocolForm((current) => updateProtocolFormValue(current, key, value));
  }

  function editProtocol(record: SbvControlProtocolRecord) {
    setEditingProtocolId(record.id);
    setProtocolForm(protocolFormFromRecord(record));
    setProtocolFormSubmitted(false);
    setProtocolTitleTouched(false);
  }

  function resetProtocolForm() {
    setEditingProtocolId(null);
    setProtocolForm(initialProtocolForm);
    setProtocolFormSubmitted(false);
    setProtocolTitleTouched(false);
  }

  async function saveProtocol() {
    setProtocolFormSubmitted(true);
    if (isProtocolTitleMissing(protocolForm)) {
      announce('Titel ist für das Steuerungsprotokoll erforderlich.', 'assertive');
      return { ok: false as const, message: 'Bitte einen Titel für das Steuerungsprotokoll angeben.' };
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.sbvControlProtocols) throw new Error('SBV-Steuerungsprotokoll-Bridge ist nicht verfügbar.');

      if (editingProtocolId) {
        await bridge.sbvControlProtocols.update(editingProtocolId, protocolForm);
        announce(protocolOperationAnnouncement('update'), 'polite');
      } else {
        await bridge.sbvControlProtocols.create(protocolForm);
        announce(protocolOperationAnnouncement('create'), 'polite');
      }

      resetProtocolForm();
      await loadProtocols();
      return { ok: true as const, message: protocolOperationNotice(editingProtocolId ? 'update' : 'create') };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Steuerungsprotokoll konnte nicht gespeichert werden.';
      announce(message, 'assertive');
      return { ok: false as const, message };
    }
  }

  async function deleteProtocol(id: string) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.sbvControlProtocols) throw new Error('SBV-Steuerungsprotokoll-Bridge ist nicht verfügbar.');
      await bridge.sbvControlProtocols.delete(id);
      if (editingProtocolId === id) resetProtocolForm();
      announce(protocolOperationAnnouncement('delete'), 'polite');
      await loadProtocols();
      return { ok: true as const, message: protocolOperationNotice('delete') };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Steuerungsprotokoll konnte nicht gelöscht werden.';
      announce(message, 'assertive');
      return { ok: false as const, message };
    }
  }

  return {
    protocols,
    protocolQuery,
    setProtocolQuery,
    visibleProtocols: filterProtocolsForQuery(protocols, protocolQuery),
    protocolForm,
    protocolFormSubmitted,
    protocolTitleTouched,
    editingProtocolId,
    loadProtocols,
    updateProtocolForm,
    editProtocol,
    resetProtocolForm,
    setProtocolTitleTouched,
    saveProtocol,
    deleteProtocol,
    protocolTitleError:
      (protocolTitleTouched || protocolFormSubmitted) && isProtocolTitleMissing(protocolForm)
        ? 'Titel ist für das Steuerungsprotokoll erforderlich.'
        : undefined,
    openProtocolFollowUps: protocols.filter((item) => item.status === 'draft' || item.status === 'follow_up_open').length,
  };
}

export type UseSbvControlProtocolsValue = ReturnType<typeof useSbvControlProtocols>;
