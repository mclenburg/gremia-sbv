import { useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseAnonymizationMode } from '../../../domain/models/privacy-review.model';
import type { RetentionOperationResult } from '../../../domain/models/retention.model';
import { AUDIT_LOG_RETENTION_NOTICE } from '../../core/copy/privacyNotices';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import { CaseAnonymizationModeFieldset } from '../../shared/privacy/CaseAnonymizationModeFieldset';

export function RetentionCasePrivacyActions({ cases, busy, setBusy, setError, setMessage, reloadRetention }: {
  cases: CaseRecord[]; busy: boolean; setBusy: (value: boolean) => void; setError: (value: string) => void;
  setMessage: (value: string) => void; reloadRetention: () => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [anonymizationMode, setAnonymizationMode] = useState<CaseAnonymizationMode>('marked_free_text');

  async function runCaseAction(action: 'anonymize' | 'delete') {
    if (!selectedCaseId) return setError('Bitte einen Fall auswählen.');
    if (!reason.trim()) return setError('Bitte einen Grund dokumentieren.');
    setBusy(true); setError(''); setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention) throw new Error('Löschdienst ist nicht erreichbar.');
      const result: RetentionOperationResult = action === 'anonymize'
        ? await bridge.retention.anonymizeCase(selectedCaseId, reason, confirmation, anonymizationMode)
        : await bridge.retention.deleteCase(selectedCaseId, reason, confirmation);
      if (!result.ok) return setError(result.error ?? 'Aktion konnte nicht durchgeführt werden.');
      setMessage(result.message ?? 'Aktion wurde durchgeführt.');
      setReason(''); setConfirmation(''); setAnonymizationMode('marked_free_text');
      await reloadRetention();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return <div className="industrial-subpanel industrial-danger-zone">
    <h4>Manuelle Fallaktion</h4>
    <p className="industrial-settings-note">Eine Fälligkeit löst niemals automatisch eine Löschung aus. Bitte den Vorgang zuerst prüfen, ein Backup erstellen und die Entscheidung begründen.</p>
    <p className="industrial-message industrial-message-info" data-e2e="audit-log-retention-notice">{AUDIT_LOG_RETENTION_NOTICE}</p>
    <label><span>Fall</span><select className="industrial-select" value={selectedCaseId} onChange={(event) => setSelectedCaseId(event.target.value)}>
      <option value="">Fall auswählen</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} · {item.displayName}</option>)}
    </select></label>
    <label><span>Grund / Dokumentation</span><TextCommandTextarea fieldId="retention-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    <CaseAnonymizationModeFieldset value={anonymizationMode} onChange={setAnonymizationMode} name="retention-anonymization-mode" />
    <label><span>Bestätigung</span><input className="industrial-input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="FALL ANONYMISIEREN oder FALL LÖSCHEN" /></label>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="industrial-secondary-button" disabled={busy} onClick={() => void runCaseAction('anonymize')}>Fall anonymisieren</button>
      <button type="button" className="industrial-danger-button" disabled={busy} onClick={() => void runCaseAction('delete')}>Fall löschen</button>
    </div>
  </div>;
}
