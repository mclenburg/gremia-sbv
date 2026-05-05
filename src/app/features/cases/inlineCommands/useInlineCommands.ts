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
  formatParticipationMarkerText,
  formatWorkplaceAccommodationMarkerText,
  formatRiskText,
  formatTemplateMarkerText,
  getTextCommandKind,
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
import { waitForBridge } from '../../../core/bridge/waitForBridge';

export type ProtocolTextTarget = 'content' | 'nextSteps';

export type InlineDeadlineDraft = {
  target: ProtocolTextTarget;
  token: TextCommandToken;
  title: string;
  dueAt: string;
  severity: DeadlineSeverity;
  legalBasis: string;
  description: string;
  markerIndex: number | null;
};

export type InlineContactDraft = {
  target: ProtocolTextTarget;
  token: TextCommandToken;
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

export type InlineCaseLinkDraft = { target: ProtocolTextTarget; markerIndex: number; token: TextCommandToken; query: string };
export type InlineLegalNormDraft = { target: ProtocolTextTarget; markerIndex: number; token: TextCommandToken; query: string };
export type InlineRiskDraft = { target: ProtocolTextTarget; markerIndex: number; token: TextCommandToken; level: RiskLevelCommand; text: string };
export type InlineOpenTaskDraft = { target: ProtocolTextTarget; markerIndex: number | null; token: TextCommandToken; title: string; description: string; severity: DeadlineSeverity };
export type InlineConfidentialityDraft = { target: ProtocolTextTarget; markerIndex: number; token: TextCommandToken; level: ConfidentialCommandLevel };
export type InlineAnonymizationDraft = { target: ProtocolTextTarget; markerIndex: number; token: TextCommandToken; label: string };
export type InlineParticipationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  title: string;
  employerMeasure: string;
  riskLevel: 'normal' | 'erhoeht' | 'kritisch';
  statementDueAt: string;
  nextStep: string;
};
export type InlineWorkplaceAccommodationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  title: string;
  requestedAdjustment: string;
  category: 'arbeitsplatz' | 'arbeitsumfeld' | 'arbeitsorganisation' | 'arbeitszeit' | 'arbeitsort' | 'technische_arbeitshilfe' | 'software_barrierefreiheit' | 'qualifizierung' | 'aufgabenanpassung' | 'sonstiges';
  riskLevel: 'normal' | 'erhoeht' | 'kritisch';
  implementationDueAt: string;
  nextStep: string;
};
export type InlineTemplateDraft = { target: ProtocolTextTarget; markerIndex: number; token: TextCommandToken; query: string };

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
  onCreateContact,
  onStructuredActionCreated
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
  onStructuredActionCreated?: () => Promise<void> | void;
}) {
  const [inlineDeadlineDraft, setInlineDeadlineDraft] = useState<InlineDeadlineDraft | null>(null);
  const [inlineContactDraft, setInlineContactDraft] = useState<InlineContactDraft | null>(null);
  const [inlineCaseLinkDraft, setInlineCaseLinkDraft] = useState<InlineCaseLinkDraft | null>(null);
  const [inlineLegalNormDraft, setInlineLegalNormDraft] = useState<InlineLegalNormDraft | null>(null);
  const [inlineRiskDraft, setInlineRiskDraft] = useState<InlineRiskDraft | null>(null);
  const [inlineOpenTaskDraft, setInlineOpenTaskDraft] = useState<InlineOpenTaskDraft | null>(null);
  const [inlineConfidentialityDraft, setInlineConfidentialityDraft] = useState<InlineConfidentialityDraft | null>(null);
  const [inlineAnonymizationDraft, setInlineAnonymizationDraft] = useState<InlineAnonymizationDraft | null>(null);
  const [inlineParticipationDraft, setInlineParticipationDraft] = useState<InlineParticipationDraft | null>(null);
  const [inlineWorkplaceAccommodationDraft, setInlineWorkplaceAccommodationDraft] = useState<InlineWorkplaceAccommodationDraft | null>(null);
  const [inlineTemplateDraft, setInlineTemplateDraft] = useState<InlineTemplateDraft | null>(null);

  function clearInlineDrafts() {
    setInlineDeadlineDraft(null);
    setInlineContactDraft(null);
    setInlineCaseLinkDraft(null);
    setInlineLegalNormDraft(null);
    setInlineRiskDraft(null);
    setInlineOpenTaskDraft(null);
    setInlineConfidentialityDraft(null);
    setInlineAnonymizationDraft(null);
    setInlineParticipationDraft(null);
    setInlineWorkplaceAccommodationDraft(null);
    setInlineTemplateDraft(null);
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
      inlineAnonymizationDraft,
      inlineParticipationDraft,
      inlineWorkplaceAccommodationDraft,
      inlineTemplateDraft
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

  function replaceInlineCommandWithToken(target: ProtocolTextTarget, markerIndex: number, token: TextCommandToken, replacement: string) {
    updateProtocolTarget(target, (current) => replaceCommandMarker(current, markerIndex, token, replacement));
  }

  function openInlineContactDraft(target: ProtocolTextTarget, markerIndex: number, token: TextCommandToken = '@@') {
    setInlineContactDraft({
      target,
      token,
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
    const kind = getTextCommandKind(token);
    if (kind === 'deadline' || kind === 'follow_up') {
      setInlineDeadlineDraft({
        target,
        token,
        title: kind === 'follow_up' ? 'Wiedervorlage' : defaultDeadlineTitleForCase(selectedCase, noteTitle),
        dueAt: '',
        severity: kind === 'follow_up' ? 'normal' : 'important',
        legalBasis: '',
        description: target === 'content' ? `Aus Protokolltext per ${token} angelegt.` : `Aus nächste Schritte per ${token} angelegt.`,
        markerIndex
      });
      return;
    }
    if (kind === 'contact') {
      openInlineContactDraft(target, markerIndex, token);
      return;
    }
    if (kind === 'case_reference') {
      setInlineCaseLinkDraft({ target, markerIndex, token, query: '' });
      return;
    }
    if (kind === 'legal_norm') {
      setInlineLegalNormDraft({ target, markerIndex, token, query: '' });
      return;
    }
    if (kind === 'risk') {
      setInlineRiskDraft({ target, markerIndex, token, level: 'high', text: '' });
      return;
    }
    if (kind === 'open_task') {
      setInlineOpenTaskDraft({ target, markerIndex, token, title: '', description: '', severity: 'important' });
      return;
    }
    if (kind === 'confidentiality') {
      setInlineConfidentialityDraft({ target, markerIndex, token, level: 'hoch_sensibel' });
      return;
    }
    if (kind === 'anonymization') {
      setInlineAnonymizationDraft({ target, markerIndex, token, label: 'Name' });
      return;
    }
    if (kind === 'participation') {
      setInlineParticipationDraft({
        target,
        markerIndex,
        token,
        title: 'SBV-Beteiligung prüfen',
        employerMeasure: '',
        riskLevel: 'erhoeht',
        statementDueAt: '',
        nextStep: 'Beteiligung nach § 178 Abs. 2 SGB IX in der Fallakte weiter prüfen.'
      });
      return;
    }
    if (kind === 'workplace_accommodation') {
      setInlineWorkplaceAccommodationDraft({
        target,
        markerIndex,
        token,
        title: 'Arbeitsplatzgestaltung prüfen',
        requestedAdjustment: '',
        category: 'sonstiges',
        riskLevel: 'erhoeht',
        implementationDueAt: '',
        nextStep: 'Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX in der Fallakte weiter prüfen.'
      });
      return;
    }
    if (kind === 'template') {
      setInlineTemplateDraft({ target, markerIndex, token, query: '' });
    }
  }


  function removeContactCommand(draft: InlineContactDraft) {
    const applyRemoval = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith(draft.token) ? draft.markerIndex : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, '').replace(/ {2,}/g, ' ');
    };

    if (draft.target === 'content') setContent(applyRemoval);
    else setNextSteps(applyRemoval);
  }

  function insertInlineContactText(draft: InlineContactDraft, contact: ContactRecord) {
    const replacement = formatContactReference(contact);
    const applyReplacement = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith(draft.token) ? draft.markerIndex : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, replacement);
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
      const index = current.slice(draft.markerIndex ?? 0).startsWith(draft.token) ? draft.markerIndex ?? 0 : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, '').replace(/ {2,}/g, ' ');
    };

    if (draft.target === 'content') setContent(applyRemoval);
    else setNextSteps(applyRemoval);
  }

  function insertInlineDeadlineText(draft: InlineDeadlineDraft) {
    if (draft.markerIndex === null) return;
    const replacement = buildInlineDeadlineText(draft);
    const applyReplacement = (current: string) => {
      const index = current.slice(draft.markerIndex ?? 0).startsWith(draft.token) ? draft.markerIndex ?? 0 : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, replacement);
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
      token: '//',
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
    replaceInlineCommandWithToken(inlineCaseLinkDraft.target, inlineCaseLinkDraft.markerIndex, inlineCaseLinkDraft.token, formatCaseReferenceText(record.caseNumber, record.displayName));
    setInlineCaseLinkDraft(null);
    setNoteInfo(`Fallbezug ergänzt: ${record.caseNumber}`);
  }

  function cancelInlineCaseLinkDraft() {
    if (inlineCaseLinkDraft) removeInlineCommand(inlineCaseLinkDraft.target, inlineCaseLinkDraft.markerIndex, inlineCaseLinkDraft.token);
    setInlineCaseLinkDraft(null);
  }

  async function insertLegalNormFromProtocol(norm: LegalNormSuggestion | LegalNormRecord) {
    if (!inlineLegalNormDraft) return;
    replaceInlineCommandWithToken(inlineLegalNormDraft.target, inlineLegalNormDraft.markerIndex, inlineLegalNormDraft.token, formatLegalNormText(norm));
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
    if (inlineLegalNormDraft) removeInlineCommand(inlineLegalNormDraft.target, inlineLegalNormDraft.markerIndex, inlineLegalNormDraft.token);
    setInlineLegalNormDraft(null);
  }

  async function insertRiskFromProtocol() {
    if (!inlineRiskDraft) return;
    replaceInlineCommandWithToken(inlineRiskDraft.target, inlineRiskDraft.markerIndex, inlineRiskDraft.token, formatRiskText(inlineRiskDraft.level, inlineRiskDraft.text));
    if (inlineRiskDraft.level === 'critical') setConfidentialLevel('hoch_sensibel');
    else if (inlineRiskDraft.level === 'high' && confidentialLevel === 'normal') setConfidentialLevel('sensibel');
    setInlineRiskDraft(null);
    setNoteInfo('Risiko im Protokoll markiert. Fall-Risikostufe wird mit dem Protokoll nachvollziehbar dokumentiert.');
  }

  function cancelInlineRiskDraft() {
    if (inlineRiskDraft) removeInlineCommand(inlineRiskDraft.target, inlineRiskDraft.markerIndex, inlineRiskDraft.token);
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
        replaceInlineCommandWithToken(inlineOpenTaskDraft.target, inlineOpenTaskDraft.markerIndex, inlineOpenTaskDraft.token, formatOpenTaskText(inlineOpenTaskDraft.title));
      }
      setInlineOpenTaskDraft(null);
      setNoteInfo(`Offene Aufgabe wurde mit Fall ${selectedCase.caseNumber} verbunden.`);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Offene Aufgabe konnte nicht angelegt werden.');
    }
  }

  function cancelInlineOpenTaskDraft() {
    if (inlineOpenTaskDraft?.markerIndex !== null && inlineOpenTaskDraft) removeInlineCommand(inlineOpenTaskDraft.target, inlineOpenTaskDraft.markerIndex, inlineOpenTaskDraft.token);
    setInlineOpenTaskDraft(null);
  }

  function applyConfidentialityFromProtocol() {
    if (!inlineConfidentialityDraft) return;
    setConfidentialLevel(inlineConfidentialityDraft.level);
    replaceInlineCommandWithToken(inlineConfidentialityDraft.target, inlineConfidentialityDraft.markerIndex, inlineConfidentialityDraft.token, formatConfidentialityText(inlineConfidentialityDraft.level));
    setInlineConfidentialityDraft(null);
    setNoteInfo('Vertraulichkeitsstufe der Notiz wurde angepasst.');
  }

  function cancelInlineConfidentialityDraft() {
    if (inlineConfidentialityDraft) removeInlineCommand(inlineConfidentialityDraft.target, inlineConfidentialityDraft.markerIndex, inlineConfidentialityDraft.token);
    setInlineConfidentialityDraft(null);
  }

  function applyAnonymizationMarkerFromProtocol() {
    if (!inlineAnonymizationDraft) return;
    replaceInlineCommandWithToken(inlineAnonymizationDraft.target, inlineAnonymizationDraft.markerIndex, inlineAnonymizationDraft.token, formatAnonymizationMarkerText(inlineAnonymizationDraft.label));
    setInlineAnonymizationDraft(null);
    setNoteInfo('Anonymisierungsvormerkung im Protokoll gesetzt.');
  }

  function cancelInlineAnonymizationDraft() {
    if (inlineAnonymizationDraft) removeInlineCommand(inlineAnonymizationDraft.target, inlineAnonymizationDraft.markerIndex, inlineAnonymizationDraft.token);
    setInlineAnonymizationDraft(null);
  }

  async function createParticipationFromProtocol() {
    setNoteError('');
    setNoteInfo('');
    if (!selectedCaseId || !selectedCase) {
      setNoteError('Bitte zuerst eine Fallakte auswählen. SBV-Beteiligungen werden immer als Maßnahme der aktuellen Fallakte angelegt.');
      return;
    }
    if (!inlineParticipationDraft) return;
    if (!inlineParticipationDraft.title.trim()) {
      setNoteError('Bitte einen Titel für die SBV-Beteiligung erfassen.');
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.participation) throw new Error('Beteiligungsdienst ist nicht erreichbar.');
      const created = await bridge.participation.create({
        caseId: selectedCaseId,
        title: inlineParticipationDraft.title.trim(),
        measureType: 'sonstiges',
        riskLevel: inlineParticipationDraft.riskLevel,
        personStatus: 'unklar',
        decisionStage: 'unklar',
        firstKnownAt: new Date().toISOString(),
        statementDueAt: inlineParticipationDraft.statementDueAt ? fromDateTimeLocalValue(inlineParticipationDraft.statementDueAt) : undefined,
        violationSummary: inlineParticipationDraft.employerMeasure.trim() || undefined,
        nextStep: inlineParticipationDraft.nextStep.trim() || 'Beteiligung nach § 178 Abs. 2 SGB IX in der Fallakte weiter prüfen.',
        createDefaultDeadlines: Boolean(inlineParticipationDraft.statementDueAt)
      });
      await onStructuredActionCreated?.();
      replaceInlineCommandWithToken(
        inlineParticipationDraft.target,
        inlineParticipationDraft.markerIndex,
        inlineParticipationDraft.token,
        formatParticipationMarkerText(inlineParticipationDraft.title)
      );
      setInlineParticipationDraft(null);
      setNoteInfo(`SBV-Beteiligung wurde als Maßnahme in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch im Maßnahmenbereich ergänzt werden.`);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'SBV-Beteiligung konnte nicht angelegt werden.');
    }
  }

  function cancelInlineParticipationDraft() {
    if (inlineParticipationDraft) removeInlineCommand(inlineParticipationDraft.target, inlineParticipationDraft.markerIndex, inlineParticipationDraft.token);
    setInlineParticipationDraft(null);
  }

  async function createWorkplaceAccommodationFromProtocol() {
    setNoteError('');
    setNoteInfo('');
    if (!selectedCaseId || !selectedCase) {
      setNoteError('Bitte zuerst eine Fallakte auswählen. Arbeitsplatzgestaltung wird immer als Maßnahme der aktuellen Fallakte angelegt.');
      return;
    }
    if (!inlineWorkplaceAccommodationDraft) return;
    if (!inlineWorkplaceAccommodationDraft.title.trim()) {
      setNoteError('Bitte einen Titel für die Arbeitsplatzgestaltung erfassen.');
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.workplaceAccommodation) throw new Error('Arbeitsplatzgestaltungsdienst ist nicht erreichbar.');
      await bridge.workplaceAccommodation.create({
        caseId: selectedCaseId,
        title: inlineWorkplaceAccommodationDraft.title.trim(),
        category: inlineWorkplaceAccommodationDraft.category,
        status: 'angefragt',
        riskLevel: inlineWorkplaceAccommodationDraft.riskLevel,
        requestedAdjustment: inlineWorkplaceAccommodationDraft.requestedAdjustment.trim() || inlineWorkplaceAccommodationDraft.title.trim(),
        legalBasis: '§ 164 Abs. 4 SGB IX',
        implementationDueAt: inlineWorkplaceAccommodationDraft.implementationDueAt ? fromDateTimeLocalValue(inlineWorkplaceAccommodationDraft.implementationDueAt) : undefined,
        nextStep: inlineWorkplaceAccommodationDraft.nextStep.trim() || 'Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX in der Fallakte weiter prüfen.',
        createDefaultDeadlines: Boolean(inlineWorkplaceAccommodationDraft.implementationDueAt)
      });
      await onStructuredActionCreated?.();
      replaceInlineCommandWithToken(
        inlineWorkplaceAccommodationDraft.target,
        inlineWorkplaceAccommodationDraft.markerIndex,
        inlineWorkplaceAccommodationDraft.token,
        formatWorkplaceAccommodationMarkerText(inlineWorkplaceAccommodationDraft.title)
      );
      setInlineWorkplaceAccommodationDraft(null);
      setNoteInfo(`Arbeitsplatzgestaltung wurde als Maßnahme in Fall ${selectedCase.caseNumber} angelegt. Details können nach dem Gespräch im Maßnahmenbereich ergänzt werden.`);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Arbeitsplatzgestaltung konnte nicht angelegt werden.');
    }
  }

  function cancelInlineWorkplaceAccommodationDraft() {
    if (inlineWorkplaceAccommodationDraft) removeInlineCommand(inlineWorkplaceAccommodationDraft.target, inlineWorkplaceAccommodationDraft.markerIndex, inlineWorkplaceAccommodationDraft.token);
    setInlineWorkplaceAccommodationDraft(null);
  }

  function applyTemplateMarkerFromProtocol() {
    if (!inlineTemplateDraft) return;
    replaceInlineCommandWithToken(inlineTemplateDraft.target, inlineTemplateDraft.markerIndex, inlineTemplateDraft.token, formatTemplateMarkerText(inlineTemplateDraft.query));
    setInlineTemplateDraft(null);
    setNoteInfo('Vorlagenbezug wurde im Protokoll vorgemerkt. Die konkrete Dokumenterzeugung erfolgt weiterhin im Vorlagenbereich.');
  }

  function cancelInlineTemplateDraft() {
    if (inlineTemplateDraft) removeInlineCommand(inlineTemplateDraft.target, inlineTemplateDraft.markerIndex, inlineTemplateDraft.token);
    setInlineTemplateDraft(null);
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
      inlineParticipationDraft,
      setInlineParticipationDraft,
      createParticipationFromProtocol,
      cancelInlineParticipationDraft,
      inlineWorkplaceAccommodationDraft,
      setInlineWorkplaceAccommodationDraft,
      createWorkplaceAccommodationFromProtocol,
      cancelInlineWorkplaceAccommodationDraft,
      inlineTemplateDraft,
      setInlineTemplateDraft,
      applyTemplateMarkerFromProtocol,
      cancelInlineTemplateDraft,
      inlineDeadlineDraft,
      setInlineDeadlineDraft,
      buildInlineDeadlineText,
      createInlineDeadlineFromProtocol,
      cancelInlineDeadlineDraft
    }
  };
}
