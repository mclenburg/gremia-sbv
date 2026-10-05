import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAnnouncer } from '../../../shared/a11y/LiveRegionProvider';
import type { ActivityJournalPrefill } from '../../../../domain/models/activity-journal.model';
import type { SbvParticipationViolationRecord } from '../../../../domain/models/sbv-participation-violation.model';
import {
  buildViolationSummaryItems,
  summarizeViolationDraftValidation,
  validateViolationDraft,
  type SbvParticipationViolationPrefill,
} from '../sbvParticipationViolationViewLogic';
import { useViolationDraftContext, type ViolationDraftContextInput } from './useViolationDraftContext';
import { createParticipationViolationRecordActions, requireBridge, toErrorMessage } from '../participationViolationRecordActions';

type UseSbvParticipationViolationsInput = ViolationDraftContextInput & {
  pendingPrefill?: SbvParticipationViolationPrefill | null;
  onPrefillConsumed?: () => void;
  onOpenJournalPrefill?: (prefill: ActivityJournalPrefill) => void;
};

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

  const createViolation = useCallback(async (): Promise<boolean> => {
    context.setValidationAttempted(true);
    const issues = validateViolationDraft(context.form);
    if (issues.length > 0) {
      const validationMessage = summarizeViolationDraftValidation(issues);
      setError(validationMessage);
      setMessage('');
      announce(validationMessage, 'assertive');
      return false;
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
      return true;
    } catch (err) {
      const errorMessage = toErrorMessage(err, 'Beteiligungsverstoß konnte nicht gespeichert werden.');
      setError(errorMessage);
      announce(errorMessage, 'assertive');
      return false;
    } finally {
      setBusy(false);
    }
  }, [announce, context, reload]);

  const recordActions = useMemo(() => createParticipationViolationRecordActions({
    reload, announce, setBusy, setMessage, setError, setDocumentBusyId, setFollowUpBusyId, onOpenJournalPrefill,
  }), [announce, reload, onOpenJournalPrefill]);

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
    ...recordActions,
  };
}
