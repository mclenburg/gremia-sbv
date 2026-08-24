import { useCallback, useEffect, useState } from 'react';
import { useAnnouncer } from '../../../shared/a11y/LiveRegionProvider';
import type { ActivityJournalPrefill } from '../../../../domain/models/activity-journal.model';
import type {
  ParticipationViolationStatus,
  SbvParticipationViolationRecord,
} from '../../../../domain/models/sbv-participation-violation.model';
import {
  buildViolationSummaryItems,
  needsEscalationHint,
  summarizeViolationDraftValidation,
  validateViolationDraft,
  type SbvParticipationViolationPrefill,
} from '../sbvParticipationViolationViewLogic';
import { useViolationDraftContext, type ViolationDraftContextInput } from './useViolationDraftContext';

type ParticipationViolationBridge = NonNullable<Window['gremiaSbv']>['sbvParticipationViolations'];

type UseSbvParticipationViolationsInput = ViolationDraftContextInput & {
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

export function useSbvParticipationViolations({ cases, measures, pendingPrefill, onPrefillConsumed, onOpenJournalPrefill }: UseSbvParticipationViolationsInput) {
  const [items, setItems] = useState<SbvParticipationViolationRecord[]>([]);
  const context = useViolationDraftContext({ cases, measures });
  const { applyPrefill } = context;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [documentBusyId, setDocumentBusyId] = useState<string | null>(null);
  const [followUpBusyId, setFollowUpBusyId] = useState<string | null>(null);
  const announce = useAnnouncer();

  useEffect(() => {
    if (!pendingPrefill) return;
    applyPrefill(pendingPrefill);
    const prefillMessage = 'Entwurf aus SBV-Beteiligungsmaßnahme übernommen. Bitte prüfen und bewusst speichern.';
    setMessage(prefillMessage);
    setError('');
    announce(prefillMessage);
    onPrefillConsumed?.();
  }, [announce, applyPrefill, onPrefillConsumed, pendingPrefill]);

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

  const createViolation = useCallback(async () => {
    context.setValidationAttempted(true);
    const issues = validateViolationDraft(context.form);
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
      await requireBridge().create(context.form);
      const successMessage = 'Beteiligungsverstoß wurde protokolliert.';
      setMessage(successMessage);
      announce(successMessage);
      context.reset();
      await reload();
    } catch (err) {
      const errorMessage = toErrorMessage(err, 'Beteiligungsverstoß konnte nicht gespeichert werden.');
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    } finally {
      setBusy(false);
    }
  }, [announce, context, reload]);

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
    ...context,
    busy,
    message,
    error,
    documentBusyId,
    followUpBusyId,
    summaryItems: buildViolationSummaryItems(items),
    loadInitial,
    createViolation,
    changeStatus,
    generateDocument,
    createFollowUp,
    openJournalPrefill,
  };
}
