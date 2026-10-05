import { useCallback, useState, type FormEvent } from 'react';
import type { CaseNoteRecord, CaseNoteType, ConfidentialLevel } from '../../../domain/models/case-note.model';
import type { CreateCaseNoteLinkInput } from '../../../domain/models/case-note-link.model';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from './caseWorkbenchFormat';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useCaseNoteInlineActionBindings } from './useCaseNoteInlineActionBindings';
import { createCaseNoteFormActions } from './caseNoteFormActions';

export function useCaseNoteEditor({ selectedCaseId, searchQuery, reloadSelectedCaseChildren, reloadWorkData, runSearch, setSelection }: {
  selectedCaseId: string; searchQuery: string;
  reloadSelectedCaseChildren: () => Promise<void>; reloadWorkData: () => Promise<void>;
  runSearch: () => Promise<void>; setSelection: (selection: CaseExplorerSelection) => void;
}) {
  const inlineActionBindings = useCaseNoteInlineActionBindings();
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CaseNoteRecord | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDate, setNoteDate] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [noteType, setNoteType] = useState<CaseNoteType>('gespraech');
  const [participants, setParticipants] = useState('');
  const [content, setContent] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [containsHealthData, setContainsHealthData] = useState(true);
  const [confidentialLevel, setConfidentialLevel] = useState<ConfidentialLevel>('sensibel');
  const [linkedCaseIds, setLinkedCaseIds] = useState<string[]>([]);
  const [entityLinks, setEntityLinks] = useState<CreateCaseNoteLinkInput[]>([]);
  const [noteError, setNoteError] = useState('');
  const [noteInfo, setNoteInfo] = useState('');

  const formActions = createCaseNoteFormActions({
    selectedCaseId, setSelection, clearInlineDrafts: () => inlineActionBindings.clearDrafts.current(),
    setters: {
      setIsNoteModalOpen, setEditingNote, setNoteTitle, setNoteDate,
      setNoteType, setParticipants, setContent, setNextSteps,
      setContainsHealthData, setConfidentialLevel, setLinkedCaseIds,
      setEntityLinks, setNoteError, setNoteInfo,
    },
  });

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNoteError('');
    setNoteInfo('');
    if (!selectedCaseId) {
      setNoteError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    if (!noteTitle.trim() || !content.trim()) {
      setNoteError('Bitte Titel und Inhalt erfassen.');
      return;
    }
    const normalizedLinkedCaseIds = [...new Set([selectedCaseId, ...linkedCaseIds].filter(Boolean))];

    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      const inlineActions = inlineActionBindings.getPending.current();
      const payload = {
        caseId: selectedCaseId,
        caseIds: normalizedLinkedCaseIds,
        title: noteTitle.trim(),
        noteDate: fromDateTimeLocalValue(noteDate),
        noteType,
        participants: participants.trim() || undefined,
        content: content.trim(),
        nextSteps: nextSteps.trim() || undefined,
        containsHealthData,
        confidentialLevel,
        links: entityLinks,
        inlineActions,
      };
      const saved = editingNote
        ? await bridge.cases.updateNote(editingNote.id, payload)
        : await bridge.cases.createNote(payload);
      formActions.resetNoteForm();
      setIsNoteModalOpen(false);
      await reloadSelectedCaseChildren();
      if (inlineActions.length) await reloadWorkData();
      setSelection({ type: 'note', id: saved.id });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Notiz konnte nicht gespeichert werden.');
    }
  }

  const ensureSelectedCaseLink = useCallback(() => {
    if (selectedCaseId && !editingNote) {
      setLinkedCaseIds((current) => (
        current.length === 1 && current[0] === selectedCaseId
          ? current
          : [selectedCaseId]
      ));
    }
  }, [editingNote, selectedCaseId]);

  return {
    bindClearInlineDrafts: inlineActionBindings.bindClearDrafts,
    bindGetPendingInlineActions: inlineActionBindings.bindGetPending,
    isNoteModalOpen,
    editingNote,
    noteTitle,
    setNoteTitle,
    noteDate,
    setNoteDate,
    noteType,
    setNoteType,
    participants,
    setParticipants,
    content,
    setContent,
    nextSteps,
    setNextSteps,
    containsHealthData,
    setContainsHealthData,
    confidentialLevel,
    setConfidentialLevel,
    linkedCaseIds,
    setLinkedCaseIds,
    noteError,
    setNoteError,
    noteInfo,
    setNoteInfo,
    ...formActions,
    saveNote,
    ensureSelectedCaseLink
  };
}
