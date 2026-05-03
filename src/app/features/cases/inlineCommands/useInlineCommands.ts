import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CaseRecord } from '../../../core/models/case.model';
import type { ContactCategory, ContactRecord, CreateContactInput } from '../../../core/models/contact.model';
import type { ConfidentialLevel } from '../../../core/models/case-note.model';
import type { CaseLegalReferenceRecord, LegalNormRecord } from '../../../core/models/knowledge.model';
import type { CreateDeadlineInput, DeadlineSeverity } from '../../../core/models/deadline.model';
import {
  findFirstTextCommand,
  formatAnonymizationMarkerText,
  formatCaseReferenceText,
  formatConfidentialityText,
  formatLegalNormText,
  formatOpenTaskText,
  formatRiskText,
  removeCommandMarker,
  replaceCommandMarker,
  type ConfidentialCommandLevel,
  type LegalNormSuggestion,
  type RiskLevelCommand,
  type TextCommandToken
} from '@services/textCommandPolicy';
import { formatContactReference } from '../../contacts/contactDisplay';
import { defaultDeadlineTitleForCase, fromDateTimeLocalValue } from '../caseWorkbenchFormat';
import { hasAnyInlineCommandOverlay } from './inlineCommandSearch';
import { waitForBridge } from '../../../workflowViews';

export type ProtocolTextTarget = 'content' | 'nextSteps';

export type InlineDeadlineDraft = {
  target: ProtocolTextTarget;
  title: string;
  dueAt: string;
  severity: DeadlineSeverity;
  legalBasis: string;
  description: string;
  markerIndex: number | null;
};

export type InlineContactDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  query: string;
  firstName: string;
  lastName: string;
  organization: string;
  role: string;
  category: ContactCategory;
  email: string;
  phone: string;
};

export type InlineCaseLinkDraft = { target: ProtocolTextTarget; markerIndex: number; query: string };
export type InlineLegalNormDraft = { target: ProtocolTextTarget; markerIndex: number; query: string };
export type InlineRiskDraft = { target: ProtocolTextTarget; markerIndex: number; level: RiskLevelCommand; text: string };
export type InlineOpenTaskDraft = { target: ProtocolTextTarget; markerIndex: number | null; title: string; description: string; severity: DeadlineSeverity };
export type InlineConfidentialityDraft = { target: ProtocolTextTarget; markerIndex: number; level: ConfidentialCommandLevel };
export type InlineAnonymizationDraft = { target: ProtocolTextTarget; markerIndex: number; label: string };

function formatInlineDeadlineDate(value: string): string {
  if (!value) return 'offen';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function buildInlineDeadlineText(draft: InlineDeadlineDraft): string {
  const dateLabel = formatInlineDeadlineDate(draft.dueAt);
  const title = draft.title.trim() || 'Wiedervorlage';
  return `Frist bis ${dateLabel}: ${title}`;
}

function replaceRange(value: string, start: number, length: number, replacement: string): string {
  return `${value.slice(0, start)}${replacement}${value.slice(start + length)}`;
}

export function useInlineCommands({
  selectedCaseId,
  selectedCase,
  noteTitle,
  content,
  setContent,
  nextSteps,
  setNextSteps,
  confidentialLevel,
  setConfidentialLevel,
  setLinkedCaseIds,
  setCaseLegalReferences,
  setNoteInfo,
  setNoteError,
  onCreateDeadline,
  onCreateContact
}: {
  selectedCaseId: string;
  selectedCase?: CaseRecord;
  noteTitle: string;
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  nextSteps: string;
  setNextSteps: Dispatch<SetStateAction<string>>;
  confidentialLevel: ConfidentialLevel;
  setConfidentialLevel: Dispatch<SetStateAction<ConfidentialLevel>>;
  setLinkedCaseIds: Dispatch<SetStateAction<string[]>>;
  setCaseLegalReferences: Dispatch<SetStateAction<CaseLegalReferenceRecord[]>>;
  setNoteInfo: Dispatch<SetStateAction<string>>;
  setNoteError: Dispatch<SetStateAction<string>>;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>;
}) {
  const [inlineDeadlineDraft, setInlineDeadlineDraft] = useState<InlineDeadlineDraft | null>(null);
  const [inlineContactDraft, setInlineContactDraft] = useState<InlineContactDraft | null>(null);
  const [inlineCaseLinkDraft, setInlineCaseLinkDraft] = useState<InlineCaseLinkDraft | null>(null);
  const [inlineLegalNormDraft, setInlineLegalNormDraft] = useState<InlineLegalNormDraft | null>(null);
  const [inlineRiskDraft, setInlineRiskDraft] = useState<InlineRiskDraft | null>(null);
  const [inlineOpenTaskDraft, setInlineOpenTaskDraft] = useState<InlineOpenTaskDraft | null>(null);
  const [inlineConfidentialityDraft, setInlineConfidentialityDraft] = useState<InlineConfidentialityDraft | null>(null);
  const [inlineAnonymizationDraft, setInlineAnonymizationDraft] = useState<InlineAnonymizationDraft | null>(null);

  function clearInlineDrafts() {
    setInlineDeadlineDraft(null);
    setInlineContactDraft(null);
    setInlineCaseLinkDraft(null);
    setInlineLegalNormDraft(null);
    setInlineRiskDraft(null);
    setInlineOpenTaskDraft(null);
    setInlineConfidentialityDraft(null);
    setInlineAnonymizationDraft(null);
  }

  function hasOpenInlineOverlay(): boolean {
    return hasAnyInlineCommandOverlay(
      inlineDeadlineDraft,
      inlineContactDraft,
      inlineCaseLinkDraft,
      inlineLegalNormDraft,
      inlineRiskDraft,
      inlineOpenTaskDraft,
      inlineConfidentialityDraft,
      inlineAnonymizationDraft
    );
  }

  function updateProtocolTarget(target: ProtocolTextTarget, updater: (current: string) => string) {
    if (target === 'content') setContent(updater);
    else setNextSteps(updater);
  }

  function replaceInlineCommand(target: ProtocolTextTarget, markerIndex: number, token: TextCommandToken, replacement: string) {
    updateProtocolTarget(target, (current) => replaceCommandMarker(current, markerIndex, token, replacement));
  }

  function removeInlineCommand(target: ProtocolTextTarget, markerIndex: number, token: TextCommandToken) {
    updateProtocolTarget(target, (current) => removeCommandMarker(current, markerIndex, token));
  }

  function openInlineContactDraft(target: ProtocolTextTarget, markerIndex: number) {
    setInlineContactDraft({
      target,
      markerIndex,
      query: '',
      firstName: '',
      lastName: '',
      organization: '',
      role: '',
      category: 'sonstiges',
      email: '',
      phone: ''
    });
  }

  function openInlineCommand(target: ProtocolTextTarget, token: TextCommandToken, markerIndex: number) {
    if (token === '//') {
      setInlineDeadlineDraft({
        target,
        title: defaultDeadlineTitleForCase(selectedCase, noteTitle),
        dueAt: '',
        severity: 'important',
        legalBasis: '',
        description: target === 'content' ? 'Aus Protokolltext per // angelegt.' : 'Aus nächste Schritte per // angelegt.',
        markerIndex
      });
      return;
    }
    if (token === '@@') {
      openInlineContactDraft(target, markerIndex);
      return;
    }
    if (token === '##') {
      setInlineCaseLinkDraft({ target, markerIndex, query: '' });
      return;
    }
    if (token === '§§') {
      setInlineLegalNormDraft({ target, markerIndex, query: '' });
      return;
    }
    if (token === '!!') {
      setInlineRiskDraft({ target, markerIndex, level: 'high', text: '' });
      return;
    }
    if (token === '>>') {
      setInlineOpenTaskDraft({ target, markerIndex, title: '', description: '', severity: 'important' });
      return;
    }
    if (token === '^^') {
      setInlineConfidentialityDraft({ target, markerIndex, level: 'hoch_sensibel' });
      return;
    }
    if (token === '~~') {
      setInlineAnonymizationDraft({ target, markerIndex, label: 'Name' });
    }
  }

  function removeContactCommand(draft: InlineContactDraft) {
    const applyRemoval = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith('@@') ? draft.markerIndex : current.indexOf('@@');
      if (index < 0) return current;
      return replaceRange(current, index, 2, '').replace(/ {2,}/g, ' ');
    };

    if (draft.target === 'content') setContent(applyRemoval);
    else setNextSteps(applyRemoval);
  }

  function insertInlineContactText(draft: InlineContactDraft, contact: ContactRecord) {
    const replacement = formatContactReference(contact);
    const applyReplacement = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith('@@') ? draft.markerIndex : current.indexOf('@@');
      if (index < 0) return current;
      return replaceRange(current, index, 2, replacement);
    };

    if (draft.target === 'content') setContent(applyReplacement);
    else setNextSteps(applyReplacement);
  }

  async function insertExistingContactFromProtocol(contact: ContactRecord) {
    if (!inlineContactDraft) return;
    insertInlineContactText(inlineContactDraft, contact);
    setInlineContactDraft(null);
    setNoteInfo(`Kontakt eingefügt: ${formatContactReference(contact)}`);
  }

  async function createAndInsertContactFromProtocol() {
    setNoteError('');
    setNoteInfo('');
    if (!inlineContactDraft) return;
    if (!inlineContactDraft.firstName.trim() || !inlineContactDraft.lastName.trim()) {
      setNoteError('Bitte Vorname und Nachname des Kontakts erfassen.');
      return;
    }

    try {
      const created = await onCreateContact({
        firstName: inlineContactDraft.firstName,
        lastName: inlineContactDraft.lastName,
        organization: inlineContactDraft.organization || undefined,
        role: inlineContactDraft.role || undefined,
        category: inlineContactDraft.category,
        email: inlineContactDraft.email || undefined,
        phone: inlineContactDraft.phone || undefined
      });
      insertInlineContactText(inlineContactDraft, created);
      setInlineContactDraft(null);
      setNoteInfo(`Kontakt angelegt und eingefügt: ${formatContactReference(created)}`);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Kontakt konnte nicht angelegt werden.');
    }
  }

  function cancelInlineContactDraft() {
    if (inlineContactDraft) removeContactCommand(inlineContactDraft);
    setInlineContactDraft(null);
  }

  function removeSlashCommand(draft: InlineDeadlineDraft) {
    if (draft.markerIndex === null) return;
    const applyRemoval = (current: string) => {
      const index = current.slice(draft.markerIndex ?? 0).startsWith('//') ? draft.markerIndex ?? 0 : current.indexOf('//');
      if (index < 0) return current;
      return replaceRange(current, index, 2, '').replace(/ {2,}/g, ' ');
    };

    if (draft.target === 'content') setContent(applyRemoval);
    else setNextSteps(applyRemoval);
  }

  function insertInlineDeadlineText(draft: InlineDeadlineDraft) {
    if (draft.markerIndex === null) return;
    const replacement = buildInlineDeadlineText(draft);
    const applyReplacement = (current: string) => {
      const index = current.slice(draft.markerIndex ?? 0).startsWith('//') ? draft.markerIndex ?? 0 : current.indexOf('//');
      if (index < 0) return current;
      return replaceRange(current, index, 2, replacement);
    };

    if (draft.target === 'content') setContent(applyReplacement);
    else setNextSteps(applyReplacement);
  }

  function handleProtocolTextChange(target: ProtocolTextTarget, value: string) {
    setNoteInfo('');
    const previousValue = target === 'content' ? content : nextSteps;
    if (target === 'content') setContent(value);
    else setNextSteps(value);

    if (hasOpenInlineOverlay()) return;
    const command = findFirstTextCommand(value);
    if (!command) return;

    const wasAlreadyPresent = previousValue.includes(command.token);
    if (!wasAlreadyPresent) {
      openInlineCommand(target, command.token, command.index);
    }
  }

  function openCaseDeadlineDraft() {
    setNoteError('');
    setNoteInfo('');
    if (!selectedCaseId || !selectedCase) {
      setNoteError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    setInlineDeadlineDraft({
      target: 'nextSteps',
      title: defaultDeadlineTitleForCase(selectedCase, noteTitle),
      dueAt: '',
      severity: 'important',
      legalBasis: '',
      description: `Direkt aus Fallakte ${selectedCase.caseNumber} angelegt.`,
      markerIndex: null
    });
  }

  async function insertCaseReferenceFromProtocol(record: CaseRecord) {
    if (!inlineCaseLinkDraft) return;
    setLinkedCaseIds((current) => [...new Set([...current, record.id])]);
    replaceInlineCommand(inlineCaseLinkDraft.target, inlineCaseLinkDraft.markerIndex, '##', formatCaseReferenceText(record.caseNumber, record.displayName));
    setInlineCaseLinkDraft(null);
    setNoteInfo(`Fallbezug ergänzt: ${record.caseNumber}`);
  }

  function cancelInlineCaseLinkDraft() {
    if (inlineCaseLinkDraft) removeInlineCommand(inlineCaseLinkDraft.target, inlineCaseLinkDraft.markerIndex, '##');
    setInlineCaseLinkDraft(null);
  }

  async function insertLegalNormFromProtocol(norm: LegalNormSuggestion | LegalNormRecord) {
    if (!inlineLegalNormDraft) return;
    replaceInlineCommand(inlineLegalNormDraft.target, inlineLegalNormDraft.markerIndex, '§§', formatLegalNormText(norm));
    if (selectedCaseId) {
      try {
        const bridge = await waitForBridge();
        if (bridge?.knowledge) {
          await bridge.knowledge.linkNormToCase({ caseId: selectedCaseId, legalNormId: norm.id, note: 'Aus Protokoll mit §§ verknüpft.' });
          setCaseLegalReferences(await bridge.knowledge.listCaseReferences(selectedCaseId));
        }
      } catch {
        // Der Text bleibt eingefügt; der Fallbezug kann später im Wissensmodul nachgezogen werden.
      }
    }
    setInlineLegalNormDraft(null);
    setNoteInfo(`Rechtsnorm eingefügt: ${norm.paragraph}`);
  }

  function cancelInlineLegalNormDraft() {
    if (inlineLegalNormDraft) removeInlineCommand(inlineLegalNormDraft.target, inlineLegalNormDraft.markerIndex, '§§');
    setInlineLegalNormDraft(null);
  }

  async function insertRiskFromProtocol() {
    if (!inlineRiskDraft) return;
    replaceInlineCommand(inlineRiskDraft.target, inlineRiskDraft.markerIndex, '!!', formatRiskText(inlineRiskDraft.level, inlineRiskDraft.text));
    if (inlineRiskDraft.level === 'critical') setConfidentialLevel('hoch_sensibel');
    else if (inlineRiskDraft.level === 'high' && confidentialLevel === 'normal') setConfidentialLevel('sensibel');
    setInlineRiskDraft(null);
    setNoteInfo('Risiko im Protokoll markiert. Fall-Risikostufe wird mit dem Protokoll nachvollziehbar dokumentiert.');
  }

  function cancelInlineRiskDraft() {
    if (inlineRiskDraft) removeInlineCommand(inlineRiskDraft.target, inlineRiskDraft.markerIndex, '!!');
    setInlineRiskDraft(null);
  }

  async function createOpenTaskFromProtocol() {
    setNoteError('');
    setNoteInfo('');
    if (!selectedCaseId || !selectedCase) {
      setNoteError('Bitte zuerst eine Fallakte auswählen. Aufgaben werden immer mit dem aktuellen Fall verbunden.');
      return;
    }
    if (!inlineOpenTaskDraft || !inlineOpenTaskDraft.title.trim()) {
      setNoteError('Bitte einen Aufgabentitel erfassen.');
      return;
    }
    try {
      const placeholderDueAt = new Date('9999-12-31T23:59:59.000Z').toISOString();
      await onCreateDeadline({
        caseId: selectedCaseId,
        processType: 'case',
        deadlineType: 'follow_up',
        title: inlineOpenTaskDraft.title.trim(),
        confidentialTitle: `Aufgabe ${selectedCase.caseNumber}`,
        description: `${inlineOpenTaskDraft.description.trim() || 'Offene Aufgabe ohne konkretes Ablaufdatum.'} Hinweis: technisch mit Platzhalterdatum gespeichert, aber als offene Aufgabe ohne Datum gemeint.`,
        dueAt: placeholderDueAt,
        severity: inlineOpenTaskDraft.severity,
        sourceEvent: noteTitle.trim() ? `Protokoll: ${noteTitle.trim()}` : `Protokoll im Fall ${selectedCase.caseNumber}`,
        calculationMode: 'manual',
        isLegalDeadline: false,
        isUserEditable: true,
        warningThresholdHours: 999999,
        criticalThresholdHours: 999998
      });
      if (inlineOpenTaskDraft.markerIndex !== null) {
        replaceInlineCommand(inlineOpenTaskDraft.target, inlineOpenTaskDraft.markerIndex, '>>', formatOpenTaskText(inlineOpenTaskDraft.title));
      }
      setInlineOpenTaskDraft(null);
      setNoteInfo(`Offene Aufgabe wurde mit Fall ${selectedCase.caseNumber} verbunden.`);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Offene Aufgabe konnte nicht angelegt werden.');
    }
  }

  function cancelInlineOpenTaskDraft() {
    if (inlineOpenTaskDraft?.markerIndex !== null && inlineOpenTaskDraft) removeInlineCommand(inlineOpenTaskDraft.target, inlineOpenTaskDraft.markerIndex, '>>');
    setInlineOpenTaskDraft(null);
  }

  function applyConfidentialityFromProtocol() {
    if (!inlineConfidentialityDraft) return;
    setConfidentialLevel(inlineConfidentialityDraft.level);
    replaceInlineCommand(inlineConfidentialityDraft.target, inlineConfidentialityDraft.markerIndex, '^^', formatConfidentialityText(inlineConfidentialityDraft.level));
    setInlineConfidentialityDraft(null);
    setNoteInfo('Vertraulichkeitsstufe der Notiz wurde angepasst.');
  }

  function cancelInlineConfidentialityDraft() {
    if (inlineConfidentialityDraft) removeInlineCommand(inlineConfidentialityDraft.target, inlineConfidentialityDraft.markerIndex, '^^');
    setInlineConfidentialityDraft(null);
  }

  function applyAnonymizationMarkerFromProtocol() {
    if (!inlineAnonymizationDraft) return;
    replaceInlineCommand(inlineAnonymizationDraft.target, inlineAnonymizationDraft.markerIndex, '~~', formatAnonymizationMarkerText(inlineAnonymizationDraft.label));
    setInlineAnonymizationDraft(null);
    setNoteInfo('Anonymisierungsvormerkung im Protokoll gesetzt.');
  }

  function cancelInlineAnonymizationDraft() {
    if (inlineAnonymizationDraft) removeInlineCommand(inlineAnonymizationDraft.target, inlineAnonymizationDraft.markerIndex, '~~');
    setInlineAnonymizationDraft(null);
  }

  async function createInlineDeadlineFromProtocol() {
    setNoteError('');
    setNoteInfo('');

    if (!selectedCaseId || !selectedCase) {
      setNoteError('Bitte zuerst eine Fallakte auswählen. Inline-Fristen werden immer mit dem aktuellen Fall verbunden.');
      return;
    }
    if (!inlineDeadlineDraft) return;
    if (!inlineDeadlineDraft.title.trim() || !inlineDeadlineDraft.dueAt) {
      setNoteError('Bitte Titel und Ablaufdatum der Frist erfassen.');
      return;
    }

    try {
      await onCreateDeadline({
        caseId: selectedCaseId,
        processType: 'case',
        deadlineType: 'follow_up',
        title: inlineDeadlineDraft.title.trim(),
        confidentialTitle: `Frist ${selectedCase.caseNumber}`,
        description: inlineDeadlineDraft.description.trim() || `Aus Protokolltext zum Fall ${selectedCase.caseNumber} angelegt.`,
        dueAt: fromDateTimeLocalValue(inlineDeadlineDraft.dueAt),
        severity: inlineDeadlineDraft.severity,
        legalBasis: inlineDeadlineDraft.legalBasis.trim() || undefined,
        sourceEvent: noteTitle.trim() ? `Protokoll: ${noteTitle.trim()}` : `Protokoll im Fall ${selectedCase.caseNumber}`,
        calculationMode: 'manual',
        isLegalDeadline: false,
        isUserEditable: true
      });
      const shouldInsertDeadlineText = inlineDeadlineDraft.markerIndex !== null;
      insertInlineDeadlineText(inlineDeadlineDraft);
      setInlineDeadlineDraft(null);
      setNoteInfo(shouldInsertDeadlineText
        ? `Frist wurde mit Fall ${selectedCase.caseNumber} angelegt und im Protokolltext vermerkt.`
        : `Frist wurde mit Fall ${selectedCase.caseNumber} angelegt.`);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Inline-Frist konnte nicht angelegt werden.');
    }
  }

  function cancelInlineDeadlineDraft() {
    if (inlineDeadlineDraft) removeSlashCommand(inlineDeadlineDraft);
    setInlineDeadlineDraft(null);
  }

  return {
    handleProtocolTextChange,
    openCaseDeadlineDraft,
    clearInlineDrafts,
    overlayProps: {
      inlineCaseLinkDraft,
      setInlineCaseLinkDraft,
      insertCaseReferenceFromProtocol,
      cancelInlineCaseLinkDraft,
      inlineLegalNormDraft,
      setInlineLegalNormDraft,
      insertLegalNormFromProtocol,
      cancelInlineLegalNormDraft,
      inlineRiskDraft,
      setInlineRiskDraft,
      insertRiskFromProtocol,
      cancelInlineRiskDraft,
      inlineOpenTaskDraft,
      setInlineOpenTaskDraft,
      createOpenTaskFromProtocol,
      cancelInlineOpenTaskDraft,
      inlineConfidentialityDraft,
      setInlineConfidentialityDraft,
      applyConfidentialityFromProtocol,
      cancelInlineConfidentialityDraft,
      inlineAnonymizationDraft,
      setInlineAnonymizationDraft,
      applyAnonymizationMarkerFromProtocol,
      cancelInlineAnonymizationDraft,
      inlineContactDraft,
      setInlineContactDraft,
      insertExistingContactFromProtocol,
      createAndInsertContactFromProtocol,
      cancelInlineContactDraft,
      inlineDeadlineDraft,
      setInlineDeadlineDraft,
      buildInlineDeadlineText,
      createInlineDeadlineFromProtocol,
      cancelInlineDeadlineDraft
    }
  };
}
