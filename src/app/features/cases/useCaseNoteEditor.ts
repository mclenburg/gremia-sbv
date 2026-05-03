import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { CaseNoteRecord, CaseNoteType, ConfidentialLevel } from '../../core/models/case-note.model';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from './caseWorkbenchFormat';
import { waitForBridge } from '../../workflowViews';

export function useCaseNoteEditor({
  selectedCaseId,
  searchQuery,
  reloadSelectedCaseChildren,
  runSearch,
  setSelection
}: {
  selectedCaseId: string;
  searchQuery: string;
  reloadSelectedCaseChildren: () => Promise<void>;
  runSearch: () => Promise<void>;
  setSelection: (selection: CaseExplorerSelection) => void;
}) {
  const clearInlineDraftsRef = useRef<() => void>(() => undefined);
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
  const [noteError, setNoteError] = useState('');
  const [noteInfo, setNoteInfo] = useState('');

  function bindClearInlineDrafts(handler: () => void) {
    clearInlineDraftsRef.current = handler;
  }

  function resetNoteForm() {
    setEditingNote(null);
    setNoteTitle('');
    setNoteDate(toDateTimeLocalValue(new Date().toISOString()));
    setNoteType('gespraech');
    setParticipants('');
    setContent('');
    setNextSteps('');
    setContainsHealthData(true);
    setConfidentialLevel('sensibel');
    setLinkedCaseIds(selectedCaseId ? [selectedCaseId] : []);
    clearInlineDraftsRef.current();
    setNoteError('');
    setNoteInfo('');
  }

  function startEditNote(note: CaseNoteRecord) {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteDate(toDateTimeLocalValue(note.noteDate));
    setNoteType(note.noteType);
    setParticipants(note.participants ?? '');
    setContent(note.content);
    setNextSteps(note.nextSteps ?? '');
    setContainsHealthData(note.containsHealthData);
    setConfidentialLevel(note.confidentialLevel);
    setLinkedCaseIds(note.caseIds?.length ? note.caseIds : (selectedCaseId ? [selectedCaseId] : []));
    setSelection({ type: 'note', id: note.id });
    setIsNoteModalOpen(true);
    clearInlineDraftsRef.current();
    setNoteError('');
    setNoteInfo('');
  }

  function toggleLinkedCase(caseId: string, checked: boolean) {
    setLinkedCaseIds((current) => {
      const next = checked ? [...current, caseId] : current.filter((id) => id !== caseId);
      return [...new Set(next)];
    });
  }

  function openNewNoteModal() {
    if (!selectedCaseId) {
      setNoteError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    resetNoteForm();
    setLinkedCaseIds([selectedCaseId]);
    setIsNoteModalOpen(true);
  }

  function cancelNoteModal() {
    setIsNoteModalOpen(false);
    resetNoteForm();
  }

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
    if (!normalizedLinkedCaseIds.length) {
      setNoteError('Bitte mindestens eine Fallakte als Bezug auswählen.');
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
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
        confidentialLevel
      };
      const saved = editingNote
        ? await bridge.cases.updateNote(editingNote.id, payload)
        : await bridge.cases.createNote(payload);
      resetNoteForm();
      setIsNoteModalOpen(false);
      await reloadSelectedCaseChildren();
      setSelection({ type: 'note', id: saved.id });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Notiz konnte nicht gespeichert werden.');
    }
  }

  function ensureSelectedCaseLink() {
    if (selectedCaseId && !editingNote) {
      setLinkedCaseIds([selectedCaseId]);
    }
  }

  return {
    bindClearInlineDrafts,
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
    resetNoteForm,
    startEditNote,
    toggleLinkedCase,
    openNewNoteModal,
    cancelNoteModal,
    saveNote,
    ensureSelectedCaseLink
  };
}
