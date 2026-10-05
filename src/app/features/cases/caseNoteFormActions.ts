import type { Dispatch, SetStateAction } from 'react';
import type { CaseNoteRecord, CaseNoteType, ConfidentialLevel } from '../../../domain/models/case-note.model';
import type { CreateCaseNoteLinkInput } from '../../../domain/models/case-note-link.model';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { toDateTimeLocalValue } from './caseWorkbenchFormat';

type CaseNoteFormActionDeps = {
  selectedCaseId: string;
  setSelection: (selection: CaseExplorerSelection) => void;
  clearInlineDrafts: () => void;
  setters: {
    setIsNoteModalOpen: Dispatch<SetStateAction<boolean>>;
    setEditingNote: Dispatch<SetStateAction<CaseNoteRecord | null>>;
    setNoteTitle: Dispatch<SetStateAction<string>>;
    setNoteDate: Dispatch<SetStateAction<string>>;
    setNoteType: Dispatch<SetStateAction<CaseNoteType>>;
    setParticipants: Dispatch<SetStateAction<string>>;
    setContent: Dispatch<SetStateAction<string>>;
    setNextSteps: Dispatch<SetStateAction<string>>;
    setContainsHealthData: Dispatch<SetStateAction<boolean>>;
    setConfidentialLevel: Dispatch<SetStateAction<ConfidentialLevel>>;
    setLinkedCaseIds: Dispatch<SetStateAction<string[]>>;
    setEntityLinks: Dispatch<SetStateAction<CreateCaseNoteLinkInput[]>>;
    setNoteError: Dispatch<SetStateAction<string>>;
    setNoteInfo: Dispatch<SetStateAction<string>>;
  };
};

export function createCaseNoteFormActions({ selectedCaseId, setSelection, clearInlineDrafts, setters }: CaseNoteFormActionDeps) {
  const {
    setIsNoteModalOpen, setEditingNote, setNoteTitle, setNoteDate,
    setNoteType, setParticipants, setContent, setNextSteps,
    setContainsHealthData, setConfidentialLevel, setLinkedCaseIds,
    setEntityLinks, setNoteError, setNoteInfo,
  } = setters;
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
    setEntityLinks([]);
    clearInlineDrafts();
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
    setEntityLinks((note.links ?? []).map((link) => ({
      targetType: link.targetType,
      targetId: link.targetId,
      caseId: link.caseId,
      label: link.label,
      accessibleLabel: link.accessibleLabel,
      textStart: link.textStart,
      textEnd: link.textEnd,
    })));
    setSelection({ type: 'note', id: note.id });
    setIsNoteModalOpen(true);
    clearInlineDrafts();
    setNoteError('');
    setNoteInfo('');
  }
  function toggleLinkedCase(caseId: string, checked: boolean) {
    setLinkedCaseIds((current) => {
      const next = checked ? [...current, caseId] : current.filter((id) => id !== caseId);
      return [...new Set(next)];
    });
  }

  function addEntityLink(link: CreateCaseNoteLinkInput) {
    setEntityLinks((current) => {
      const withoutDuplicate = current.filter(
        (item) => !(item.targetType === link.targetType && item.targetId === link.targetId),
      );
      return [...withoutDuplicate, link];
    });
  }

  function openNewNoteModal() {
    if (!selectedCaseId) {
      setNoteError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    resetNoteForm();
    setIsNoteModalOpen(true);
  }

  function cancelNoteModal() {
    setIsNoteModalOpen(false);
    resetNoteForm();
  }

  return { resetNoteForm, startEditNote, toggleLinkedCase, addEntityLink, openNewNoteModal, cancelNoteModal };
}
