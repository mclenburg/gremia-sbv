import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAnnouncer } from '../../../shared/a11y/LiveRegionProvider';
import type { CaseRecord } from '../../../core/models/case.model';
import type { ActivityJournalPrefill } from '../../../core/models/activity-journal.model';
import type {
  CreateSbvParticipationViolationInput,
  ParticipationViolationSourceContextType,
  ParticipationViolationStatus,
  SbvParticipationViolationRecord,
} from '../../../core/models/sbv-participation-violation.model';
import {
  applyViolationCaseContext,
  applyViolationSourceContextType,
  buildViolationFieldErrors,
  buildViolationCaseOptions,
  buildViolationSummaryItems,
  createInitialViolationForm,
  needsEscalationHint,
  summarizeViolationDraftValidation,
  validateViolationDraft,
  type SbvParticipationViolationPrefill,
} from '../sbvParticipationViolationViewLogic';

type ParticipationViolationBridge = NonNullable<Window['gremiaSbv']>['sbvParticipationViolations'];

type UseSbvParticipationViolationsInput = {
  cases: CaseRecord[];
  pendingPrefill?: SbvParticipationViolationPrefill | null;
  onPrefillConsumed?: () => void;
  onOpenJournalPrefill?: (prefill: ActivityJournalPrefill) => void;
};

function requireBridge(): ParticipationViolationBridge {
  const bridge = window.gremiaSbv?.sbvParticipationViolations;
  if (!bridge) throw new Error('Beteiligungsverstoßdienst ist nicht erreichbar.');
  return bridge;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useSbvParticipationViolations({ cases, pendingPrefill, onPrefillConsumed, onOpenJournalPrefill }: UseSbvParticipationViolationsInput) {
  const [items, setItems] = useState<SbvParticipationViolationRecord[]>([]);
  const [form, setForm] = useState<CreateSbvParticipationViolationInput>(() => createInitialViolationForm(cases));
  const [contextNotice, setContextNotice] = useState<{ sourceLabel: string; privacyNotice: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [documentBusyId, setDocumentBusyId] = useState<string | null>(null);
  const [followUpBusyId, setFollowUpBusyId] = useState<string | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const announce = useAnnouncer();

  const caseOptions = useMemo(() => buildViolationCaseOptions(cases), [cases]);
  const summaryItems = useMemo(() => buildViolationSummaryItems(items), [items]);
  const validationIssues = useMemo(() => validationAttempted ? validateViolationDraft(form) : [], [form, validationAttempted]);
  const fieldErrors = useMemo(() => buildViolationFieldErrors(validationIssues), [validationIssues]);

  useEffect(() => {
    if (!pendingPrefill) return;
    setForm(pendingPrefill.form);
    setContextNotice({ sourceLabel: pendingPrefill.sourceLabel, privacyNotice: pendingPrefill.privacyNotice });
    const prefillMessage = 'Entwurf aus SBV-Beteiligungsmaßnahme übernommen. Bitte prüfen und bewusst speichern.';
    setMessage(prefillMessage);
    setError('');
    setValidationAttempted(false);
    announce(prefillMessage);
    onPrefillConsumed?.();
  }, [announce, onPrefillConsumed, pendingPrefill]);

  const reload = useCallback(async () => {
    setItems(await requireBridge().list());
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      await reload();
    } catch (err) {
      setError(toErrorMessage(err, 'Beteiligungsverstöße konnten nicht geladen werden.'));
    }
  }, [reload]);

  const updateCaseContext = useCallback((caseId: string) => {
    setForm((current) => applyViolationCaseContext(current, caseId));
    setValidationAttempted(false);
    setContextNotice(caseId ? {
      sourceLabel: 'Quelle: bewusst gewählter Fallkontext',
      privacyNotice: 'Der Fallkontext ist allgemein. Für den Standardfall sollte der Verstoß aus der konkreten SBV-Beteiligungsmaßnahme heraus angelegt werden.',
    } : null);
  }, []);

  const updateSourceContextType = useCallback((sourceContextType: ParticipationViolationSourceContextType) => {
    setForm((current) => applyViolationSourceContextType(current, sourceContextType));
    setValidationAttempted(false);
    setContextNotice(sourceContextType === 'case_measure_participation' ? {
      sourceLabel: 'Quelle: SBV-Beteiligungsmaßnahme',
      privacyNotice: 'Bitte die konkrete Maßnahme in der Fallakte öffnen und dort „Beteiligungsverstoß dokumentieren“ nutzen oder die Maßnahmen-ID bewusst eintragen.',
    } : {
      sourceLabel: 'Quelle: bewusst gewählter Sonderkontext',
      privacyNotice: 'Sonderkontexte speichern nur nach ausdrücklicher Bestätigung. Kein Kontext wird automatisch geraten.',
    });
  }, []);

  const updateForm = useCallback((patch: Partial<CreateSbvParticipationViolationInput>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const createViolation = useCallback(async () => {
    setValidationAttempted(true);
    const issues = validateViolationDraft(form);
    if (issues.length > 0) {
      const validationMessage = summarizeViolationDraftValidation(issues);
      setError(validationMessage);
      setMessage('');
      announce(validationMessage, 'assertive');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await requireBridge().create(form);
      const successMessage = 'Beteiligungsverstoß wurde protokolliert.';
      setMessage(successMessage);
      announce(successMessage);
      setForm(createInitialViolationForm(cases));
      setContextNotice(null);
      setValidationAttempted(false);
      await reload();
    } catch (err) {
      const errorMessage = toErrorMessage(err, 'Beteiligungsverstoß konnte nicht gespeichert werden.');
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    } finally {
      setBusy(false);
    }
  }, [announce, cases, form, reload]);

  const changeStatus = useCallback(async (record: SbvParticipationViolationRecord, status: ParticipationViolationStatus) => {
    setBusy(true);
    setError('');
    try {
      await requireBridge().changeStatus(record.id, { status, note: 'Status über Verstoßprotokoll aktualisiert.' });
      const successMessage = 'Status des Beteiligungsverstoßes wurde aktualisiert.';
      setMessage(successMessage);
      announce(successMessage);
      await reload();
    } catch (err) {
      const errorMessage = toErrorMessage(err, 'Status konnte nicht geändert werden.');
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    } finally {
      setBusy(false);
    }
  }, [announce, reload]);

  const generateDocument = useCallback(async (record: SbvParticipationViolationRecord) => {
    setDocumentBusyId(record.id);
    setError('');
    setMessage('');
    try {
      const result = await requireBridge().generateDocument(record.id, {
        privacyMode: 'case_reference',
        includeLegalReviewHint: needsEscalationHint(record.stage),
        includeOwiHint: record.stage === 'owi_preparation',
      });
      const successMessage = `DOCX wurde verschlüsselt abgelegt: ${result.filename}`;
      setMessage(successMessage);
      announce(successMessage);
      await reload();
    } catch (err) {
      const errorMessage = toErrorMessage(err, 'Dokument konnte nicht erzeugt werden.');
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    } finally {
      setDocumentBusyId(null);
    }
  }, [announce, reload]);

  const createFollowUp = useCallback(async (record: SbvParticipationViolationRecord) => {
    setFollowUpBusyId(record.id);
    setError('');
    setMessage('');
    try {
      const result = await requireBridge().createFollowUp(record.id);
      const successMessage = `Wiedervorlage angelegt: ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(result.dueAt))}`;
      setMessage(successMessage);
      announce(successMessage);
      await reload();
    } catch (err) {
      const errorMessage = toErrorMessage(err, 'Wiedervorlage konnte nicht angelegt werden.');
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    } finally {
      setFollowUpBusyId(null);
    }
  }, [announce, reload]);

  const openJournalPrefill = useCallback(async (record: SbvParticipationViolationRecord) => {
    setError('');
    try {
      const prefill = await requireBridge().buildJournalPrefill(record.id);
      onOpenJournalPrefill?.(prefill);
      announce('Journal-Vorlage aus Beteiligungsverstoß wurde geöffnet.');
    } catch (err) {
      const errorMessage = toErrorMessage(err, 'Journal-Vorlage konnte nicht erzeugt werden.');
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    }
  }, [announce, onOpenJournalPrefill]);

  return {
    items,
    form,
    updateForm,
    contextNotice,
    busy,
    message,
    error,
    documentBusyId,
    followUpBusyId,
    validationAttempted,
    validationIssues,
    fieldErrors,
    caseOptions,
    summaryItems,
    loadInitial,
    updateCaseContext,
    updateSourceContextType,
    createViolation,
    changeStatus,
    generateDocument,
    createFollowUp,
    openJournalPrefill,
  };
}
