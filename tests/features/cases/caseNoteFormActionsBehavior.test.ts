import type { Dispatch, SetStateAction } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCaseNoteFormActions } from '../../../src/app/features/cases/caseNoteFormActions';
import type { CaseNoteRecord, CaseNoteType, ConfidentialLevel } from '../../../src/domain/models/case-note.model';
import type { CreateCaseNoteLinkInput } from '../../../src/domain/models/case-note-link.model';

const note: CaseNoteRecord = {
  id: 'note-1', caseId: 'case-1', caseIds: ['case-1', 'case-2'], caseNumbers: ['SBV-42', 'SBV-43'],
  title: 'Gespräch', noteDate: '2024-01-01T12:00:00Z', noteType: 'gespraech', participants: 'SBV', content: 'Anlass',
  nextSteps: 'Unterlagen prüfen', containsHealthData: false, confidentialLevel: 'normal',
  createdAt: '2024-01-01T12:00:00Z', updatedAt: '2024-01-01T12:00:00Z',
  links: [{ id: 'link-1', caseNoteId: 'note-1', targetType: 'bem', targetId: 'bem-1', caseId: 'case-1',
    label: 'BEM', accessibleLabel: 'BEM-Verfahren öffnen', textStart: 0, textEnd: 3, createdAt: '2024-01-01T12:00:00Z' }],
};

function setup(selectedCaseId = 'case-1') {
  const form = {
    isNoteModalOpen: false, editingNote: note as CaseNoteRecord | null, noteTitle: 'Alter Titel', noteDate: '',
    noteType: 'telefonat' as CaseNoteType, participants: 'Alt', content: 'Alt', nextSteps: 'Alt',
    containsHealthData: false, confidentialLevel: 'normal' as ConfidentialLevel,
    linkedCaseIds: ['old-case'], entityLinks: [] as CreateCaseNoteLinkInput[], noteError: 'Alter Fehler', noteInfo: 'Alte Meldung',
  };
  const setter = <Key extends keyof typeof form>(key: Key): Dispatch<SetStateAction<(typeof form)[Key]>> => (next) => {
    form[key] = typeof next === 'function' ? next(form[key]) : next;
  };
  const clearInlineDrafts = vi.fn();
  const setSelection = vi.fn();
  const actions = createCaseNoteFormActions({ selectedCaseId, clearInlineDrafts, setSelection, setters: {
    setIsNoteModalOpen: setter('isNoteModalOpen'), setEditingNote: setter('editingNote'), setNoteTitle: setter('noteTitle'),
    setNoteDate: setter('noteDate'), setNoteType: setter('noteType'), setParticipants: setter('participants'),
    setContent: setter('content'), setNextSteps: setter('nextSteps'), setContainsHealthData: setter('containsHealthData'),
    setConfidentialLevel: setter('confidentialLevel'), setLinkedCaseIds: setter('linkedCaseIds'),
    setEntityLinks: setter('entityLinks'), setNoteError: setter('noteError'), setNoteInfo: setter('noteInfo'),
  } });
  return { form, actions, clearInlineDrafts, setSelection };
}

describe('case note form workflows', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-06-01T12:00:00Z')); });
  afterEach(() => vi.useRealTimers());

  it('opens a fresh note with safe privacy defaults and only the current case linked', () => {
    const { actions, form, clearInlineDrafts } = setup();
    actions.openNewNoteModal();
    expect(form).toMatchObject({ isNoteModalOpen: true, editingNote: null, noteTitle: '', content: '', participants: '',
      nextSteps: '', noteType: 'gespraech', containsHealthData: true, confidentialLevel: 'sensibel',
      linkedCaseIds: ['case-1'], entityLinks: [], noteError: '', noteInfo: '' });
    expect(new Date(form.noteDate).getTime()).toBe(Date.now());
    expect(clearInlineDrafts).toHaveBeenCalledOnce();
  });

  it('rejects opening a note without a case without discarding its existing data', () => {
    const { actions, form, clearInlineDrafts } = setup('');
    actions.openNewNoteModal();
    expect(form.isNoteModalOpen).toBe(false);
    expect(form.content).toBe('Alt');
    expect(form.noteError).toBeTruthy();
    expect(clearInlineDrafts).not.toHaveBeenCalled();
  });

  it('loads the stored note, linked cases and accessible entity link without changing privacy choices', () => {
    const { actions, form, setSelection, clearInlineDrafts } = setup();
    actions.startEditNote(note);
    expect(form).toMatchObject({ isNoteModalOpen: true, editingNote: note, noteTitle: note.title, content: note.content,
      participants: 'SBV', nextSteps: note.nextSteps, containsHealthData: false, confidentialLevel: 'normal',
      linkedCaseIds: ['case-1', 'case-2'], noteError: '', noteInfo: '' });
    expect(form.entityLinks).toEqual([{ targetType: 'bem', targetId: 'bem-1', caseId: 'case-1', label: 'BEM',
      accessibleLabel: 'BEM-Verfahren öffnen', textStart: 0, textEnd: 3 }]);
    expect(new Date(form.noteDate).toISOString()).toBe('2024-01-01T12:00:00.000Z');
    expect(setSelection).toHaveBeenCalledExactlyOnceWith({ type: 'note', id: note.id });
    expect(clearInlineDrafts).toHaveBeenCalledOnce();
  });

  it.each(['case-1', ''])('uses the available case context when a legacy note has no stored links (%s)', (caseId) => {
    const { actions, form } = setup(caseId);
    actions.startEditNote({ ...note, caseIds: [], links: undefined, participants: undefined, nextSteps: undefined });
    expect(form.linkedCaseIds).toEqual(caseId ? [caseId] : []);
    expect(form.entityLinks).toEqual([]);
    expect(form.participants).toBe('');
    expect(form.nextSteps).toBe('');
  });

  it('closes and clears a cancelled note without changing the explorer selection', () => {
    const { actions, form, clearInlineDrafts, setSelection } = setup();
    actions.openNewNoteModal();
    form.content = 'Vertraulicher Entwurf';
    actions.cancelNoteModal();
    expect(form).toMatchObject({ isNoteModalOpen: false, content: '', editingNote: null, containsHealthData: true, confidentialLevel: 'sensibel' });
    expect(clearInlineDrafts).toHaveBeenCalledTimes(2);
    expect(setSelection).not.toHaveBeenCalled();
  });

  it('adds a linked case once and removes it while preserving other links', () => {
    const { actions, form } = setup();
    actions.resetNoteForm();
    actions.toggleLinkedCase('case-2', true);
    actions.toggleLinkedCase('case-2', true);
    expect(form.linkedCaseIds).toEqual(['case-1', 'case-2']);
    actions.toggleLinkedCase('case-2', false);
    expect(form.linkedCaseIds).toEqual(['case-1']);
  });

  it('updates one entity link without duplicating it or dropping unrelated targets', () => {
    const { actions, form } = setup();
    const bemLink: CreateCaseNoteLinkInput = { targetType: 'bem', targetId: 'bem-1', caseId: 'case-1', label: 'BEM', textStart: 0, textEnd: 3 };
    const deadline: CreateCaseNoteLinkInput = { ...bemLink, targetType: 'deadline', targetId: 'deadline-1', label: 'Frist' };
    actions.addEntityLink(bemLink);
    actions.addEntityLink(deadline);
    actions.addEntityLink({ ...bemLink, label: 'BEM-Verfahren', accessibleLabel: 'Maßnahme öffnen', textEnd: 13 });
    expect(form.entityLinks).toEqual([deadline, { ...bemLink, label: 'BEM-Verfahren', accessibleLabel: 'Maßnahme öffnen', textEnd: 13 }]);
  });
});
