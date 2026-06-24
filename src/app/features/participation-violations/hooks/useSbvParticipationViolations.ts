import { useCallback, useMemo, useState } from 'react';
import type { CaseRecord } from '../../../core/models/case.model';
import type { ActivityJournalPrefill } from '../../../core/models/activity-journal.model';
import type {
  CreateSbvParticipationViolationInput,
  ParticipationViolationStatus,
  SbvParticipationViolationRecord,
} from '../../../core/models/sbv-participation-violation.model';
import {
  applyViolationCaseContext,
  buildViolationCaseOptions,
  buildViolationSummaryItems,
  createInitialViolationForm,
  needsEscalationHint,
} from '../sbvParticipationViolationViewLogic';

type ParticipationViolationBridge = NonNullable<Window['gremiaSbv']>['sbvParticipationViolations'];

type UseSbvParticipationViolationsInput = {
  cases: CaseRecord[];
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

export function useSbvParticipationViolations({ cases, onOpenJournalPrefill }: UseSbvParticipationViolationsInput) {
  const [items, setItems] = useState<SbvParticipationViolationRecord[]>([]);
  const [form, setForm] = useState<CreateSbvParticipationViolationInput>(() => createInitialViolationForm(cases));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [documentBusyId, setDocumentBusyId] = useState<string | null>(null);
  const [followUpBusyId, setFollowUpBusyId] = useState<string | null>(null);

  const caseOptions = useMemo(() => buildViolationCaseOptions(cases), [cases]);
  const summaryItems = useMemo(() => buildViolationSummaryItems(items), [items]);

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
  }, []);

  const updateForm = useCallback((patch: Partial<CreateSbvParticipationViolationInput>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const createViolation = useCallback(async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await requireBridge().create(form);
      setMessage('Beteiligungsverstoß wurde protokolliert.');
      setForm(createInitialViolationForm(cases));
      await reload();
    } catch (err) {
      setError(toErrorMessage(err, 'Beteiligungsverstoß konnte nicht gespeichert werden.'));
    } finally {
      setBusy(false);
    }
  }, [cases, form, reload]);

  const changeStatus = useCallback(async (record: SbvParticipationViolationRecord, status: ParticipationViolationStatus) => {
    setBusy(true);
    setError('');
    try {
      await requireBridge().changeStatus(record.id, { status, note: 'Status über Verstoßprotokoll aktualisiert.' });
      await reload();
    } catch (err) {
      setError(toErrorMessage(err, 'Status konnte nicht geändert werden.'));
    } finally {
      setBusy(false);
    }
  }, [reload]);

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
      setMessage(`DOCX wurde verschlüsselt abgelegt: ${result.filename}`);
      await reload();
    } catch (err) {
      setError(toErrorMessage(err, 'Dokument konnte nicht erzeugt werden.'));
    } finally {
      setDocumentBusyId(null);
    }
  }, [reload]);

  const createFollowUp = useCallback(async (record: SbvParticipationViolationRecord) => {
    setFollowUpBusyId(record.id);
    setError('');
    setMessage('');
    try {
      const result = await requireBridge().createFollowUp(record.id);
      setMessage(`Wiedervorlage angelegt: ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(result.dueAt))}`);
      await reload();
    } catch (err) {
      setError(toErrorMessage(err, 'Wiedervorlage konnte nicht angelegt werden.'));
    } finally {
      setFollowUpBusyId(null);
    }
  }, [reload]);

  const openJournalPrefill = useCallback(async (record: SbvParticipationViolationRecord) => {
    setError('');
    try {
      const prefill = await requireBridge().buildJournalPrefill(record.id);
      onOpenJournalPrefill?.(prefill);
    } catch (err) {
      setError(toErrorMessage(err, 'Journal-Vorlage konnte nicht erzeugt werden.'));
    }
  }, [onOpenJournalPrefill]);

  return {
    items,
    form,
    updateForm,
    busy,
    message,
    error,
    documentBusyId,
    followUpBusyId,
    caseOptions,
    summaryItems,
    loadInitial,
    updateCaseContext,
    createViolation,
    changeStatus,
    generateDocument,
    createFollowUp,
    openJournalPrefill,
  };
}
