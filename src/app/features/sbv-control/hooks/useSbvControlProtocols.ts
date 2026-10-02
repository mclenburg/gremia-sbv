import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { SbvControlProtocolRecord } from '../../../../domain/models/sbv-control-protocol.model';
import { useAnnouncer } from '../../../shared/a11y/LiveRegionProvider';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import type { TextCommandTextareaChange } from '../../../shared/textCommands/TextCommandTextarea';
import type { ControlSectionId } from '../sbvControlSections';
import {
  filterProtocolsForQuery,
  initialProtocolForm,
  isProtocolTitleMissing,
  protocolFormFromRecord,
  protocolOperationAnnouncement,
  protocolOperationNotice,
  updateProtocolFormValue,
  applyProtocolFollowUpTextCommand,
  type ProtocolFormState,
  type ProtocolTextTarget,
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
    if (!bridge?.sbvControlProtocols) throw new Error('SBV-Protokoll-Dienst ist nicht erreichbar.');
    setProtocols(await bridge.sbvControlProtocols.list());
  }, []);

  function updateProtocolForm<K extends keyof ProtocolFormState>(key: K, value: ProtocolFormState[K]) {
    setProtocolForm((current) => updateProtocolFormValue(current, key, value));
  }


  function updateProtocolTextTarget(target: ProtocolTextTarget, value: string) {
    updateProtocolForm(target, value as ProtocolFormState[typeof target]);
  }

  function handleProtocolTextCommand(target: ProtocolTextTarget, command: TextCommandTextareaChange) {
    const applied = applyProtocolFollowUpTextCommand(target, command.value, command.index, command.token);
    if (!applied) return;
    setProtocolForm((current) => ({
      ...current,
      [target]: applied.value,
      followUpDueAt: applied.followUpDueAt,
      status: current.status === 'documented' ? 'follow_up_open' : current.status,
    }));
    announce(applied.message, 'polite');
  }

  const editProtocol = useCallback((record: SbvControlProtocolRecord) => {
    setEditingProtocolId(record.id);
    setProtocolForm(protocolFormFromRecord(record));
    setProtocolFormSubmitted(false);
    setProtocolTitleTouched(false);
  }, []);

  function resetProtocolForm() {
    setEditingProtocolId(null);
    setProtocolForm(initialProtocolForm);
    setProtocolFormSubmitted(false);
    setProtocolTitleTouched(false);
  }

  async function saveProtocol() {
    setProtocolFormSubmitted(true);
    if (isProtocolTitleMissing(protocolForm)) {
      announce('Titel ist für das Protokoll erforderlich.', 'assertive');
      return { ok: false as const, message: 'Bitte einen Titel für das Protokoll angeben.' };
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.sbvControlProtocols) throw new Error('SBV-Protokoll-Bridge ist nicht verfügbar.');

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
      const message = error instanceof Error ? error.message : 'Protokoll konnte nicht gespeichert werden.';
      announce(message, 'assertive');
      return { ok: false as const, message };
    }
  }

  async function deleteProtocol(id: string) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.sbvControlProtocols) throw new Error('SBV-Protokoll-Bridge ist nicht verfügbar.');
      await bridge.sbvControlProtocols.delete(id);
      if (editingProtocolId === id) resetProtocolForm();
      announce(protocolOperationAnnouncement('delete'), 'polite');
      await loadProtocols();
      return { ok: true as const, message: protocolOperationNotice('delete') };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Protokoll konnte nicht gelöscht werden.';
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
    updateProtocolTextTarget,
    handleProtocolTextCommand,
    editProtocol,
    resetProtocolForm,
    setProtocolTitleTouched,
    saveProtocol,
    deleteProtocol,
    protocolTitleError:
      (protocolTitleTouched || protocolFormSubmitted) && isProtocolTitleMissing(protocolForm)
        ? 'Titel ist für das Protokoll erforderlich.'
        : undefined,
    openProtocolFollowUps: protocols.filter((item) => item.status === 'draft' || item.status === 'follow_up_open').length,
  };
}

export type UseSbvControlProtocolsValue = ReturnType<typeof useSbvControlProtocols>;

export function useSbvControlProtocolTarget({ targetProtocolId, onTargetConsumed, protocolsLoaded, protocolsState, setActiveSection, setError }: {
  targetProtocolId?: string;
  onTargetConsumed?: () => void;
  protocolsLoaded: boolean;
  protocolsState: UseSbvControlProtocolsValue;
  setActiveSection: Dispatch<SetStateAction<ControlSectionId>>;
  setError: Dispatch<SetStateAction<string>>;
}) {
  const onTargetConsumedRef = useRef(onTargetConsumed);
  const { protocols, editProtocol, setProtocolQuery } = protocolsState;
  useEffect(() => { onTargetConsumedRef.current = onTargetConsumed; }, [onTargetConsumed]);
  useEffect(() => {
    if (!targetProtocolId) return;
    setActiveSection('protocols');
    if (!protocolsLoaded) return;
    const record = protocols.find((item) => item.id === targetProtocolId);
    if (record) {
      setProtocolQuery('');
      editProtocol(record);
      setError('');
    } else {
      setError('Das verknüpfte SBV-Protokoll ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.');
    }
    onTargetConsumedRef.current?.();
  }, [editProtocol, protocols, protocolsLoaded, setActiveSection, setError, setProtocolQuery, targetProtocolId]);
}
