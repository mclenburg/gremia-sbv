import type { ActivityJournalPrefill } from '../../../domain/models/activity-journal.model';
import type { ParticipationViolationStatus, SbvParticipationViolationRecord } from '../../../domain/models/sbv-participation-violation.model';
import { documentGenerationOptions, documentSuccessMessage } from './sbvParticipationViolationViewLogic';

type ParticipationViolationBridge = NonNullable<Window['gremiaSbv']>['sbvParticipationViolations'];

export function requireBridge(): ParticipationViolationBridge {
  const bridge = window.gremiaSbv?.sbvParticipationViolations;
  if (!bridge) throw new Error('Beteiligungsverstoßdienst ist nicht erreichbar.');
  return bridge;
}

export function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

type ParticipationViolationRecordActionDeps = {
  reload: () => Promise<void>;
  announce: (message: string, mode?: 'polite' | 'assertive') => void;
  setBusy: (busy: boolean) => void;
  setMessage: (message: string) => void;
  setError: (error: string) => void;
  setDocumentBusyId: (id: string | null) => void;
  setFollowUpBusyId: (id: string | null) => void;
  onOpenJournalPrefill?: (prefill: ActivityJournalPrefill) => void;
};

export function createParticipationViolationRecordActions({ reload, announce, setBusy, setMessage, setError, setDocumentBusyId, setFollowUpBusyId, onOpenJournalPrefill }: ParticipationViolationRecordActionDeps) {
  async function performRecordAction(action: () => Promise<void>, fallback: string, onFinish?: () => void) {
    setError('');
    try {
      await action();
    } catch (err) {
      const errorMessage = toErrorMessage(err, fallback);
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    } finally {
      onFinish?.();
    }
  }

  async function changeStatus(record: SbvParticipationViolationRecord, status: ParticipationViolationStatus) {
    setBusy(true);
    await performRecordAction(async () => {
      await requireBridge().changeStatus(record.id, { status, note: 'Status über Verstoßprotokoll aktualisiert.' });
      const successMessage = 'Status des Beteiligungsverstoßes wurde aktualisiert.';
      setMessage(successMessage);
      announce(successMessage);
      await reload();
    }, 'Status konnte nicht geändert werden.', () => setBusy(false));
  }

  async function generateDocument(record: SbvParticipationViolationRecord) {
    setDocumentBusyId(record.id);
    await performRecordAction(async () => {
      setMessage('');
      const result = await requireBridge().generateDocument(record.id, documentGenerationOptions(record));
      const successMessage = documentSuccessMessage(result);
      setMessage(successMessage);
      if (result.previewStatus === 'unavailable' && result.previewMessage) setError(result.previewMessage);
      announce(successMessage);
      await reload();
    }, 'Dokument konnte nicht erzeugt werden.', () => setDocumentBusyId(null));
  }

  async function createFollowUp(record: SbvParticipationViolationRecord) {
    setFollowUpBusyId(record.id);
    await performRecordAction(async () => {
      setMessage('');
      const result = await requireBridge().createFollowUp(record.id);
      const successMessage = `Wiedervorlage angelegt: ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(result.dueAt))}`;
      setMessage(successMessage);
      announce(successMessage);
      await reload();
    }, 'Wiedervorlage konnte nicht angelegt werden.', () => setFollowUpBusyId(null));
  }

  async function openJournalPrefill(record: SbvParticipationViolationRecord) {
    await performRecordAction(async () => {
      const prefill = await requireBridge().buildJournalPrefill(record.id);
      onOpenJournalPrefill?.(prefill);
      announce('Journal-Vorlage aus Beteiligungsverstoß wurde geöffnet.');
    }, 'Journal-Vorlage konnte nicht erzeugt werden.');
  }

  return { changeStatus, generateDocument, createFollowUp, openJournalPrefill };
}
