import { useEffect, useState, type FormEvent } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverExportResult, TransferProtectionMode } from '../../../domain/models/case-handover.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { ExportAction, FileLocationNotice } from '../../shared/components/ImportExportFeedback';
import { FormActions } from '../../shared/components/IndustrialForm';
import { CaseHandoverChecklistPanel, handoverChecklistConfirmation } from './CaseHandoverChecklistPanel';
import { CaseHandoverCasePicker } from './CaseHandoverCasePicker';
import { requireCaseHandoverBridge } from './caseHandoverBridge';

export function VacationHandoverExportPanel({ cases, onCompleted, targetRecipientToken, expiresAt,
  passphrase, protectionMode, formatVersion }: { cases: CaseRecord[]; onCompleted: () => Promise<void>;
  targetRecipientToken: string; expiresAt?: string; passphrase: string;
  protectionMode: TransferProtectionMode; formatVersion: 2 | 4 }) {
  const announce = useAnnouncer();
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [acknowledgedItemIds, setAcknowledgedItemIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CaseHandoverExportResult | null>(null);
  useEffect(() => { setCaseIds((current) => current.filter((id) => cases.some((record) => record.id === id))); }, [cases]);
  function showError(message: string) {
    setError(message);
    announce(message, 'assertive');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setResult(null);
    if (!caseIds.length) return showError('Bitte mindestens eine Fallakte für die Vertretung auswählen.');
    if (!targetRecipientToken.trim()) return showError('Bitte die Empfängerkennung der Vertretungsinstanz einfügen.');
    if (formatVersion === 2 && protectionMode !== 'passphrase_and_recipient_key') return showError('Das ältere Format 2 benötigt Empfängerschlüssel und Transport-Passphrase. Bitte die Schutzart ändern.');
    if (protectionMode === 'passphrase_and_recipient_key' && passphrase.trim().length < 10) return showError('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.');
    if (!expiresAt) return showError('Bitte das Ende der Urlaubsvertretung angeben.');
    if (new Date(expiresAt).getTime() <= Date.now()) return showError('Das Ende der Urlaubsvertretung muss in der Zukunft liegen.');
    setBusy(true);
    try {
      const handover = await requireCaseHandoverBridge();
      const exported = await handover.export({
        caseIds,
        targetRecipientToken: targetRecipientToken.trim(),
        passphrase: protectionMode === 'passphrase_and_recipient_key' ? passphrase : '',
        protectionMode,
        formatVersion,
        checklist: handoverChecklistConfirmation(acknowledgedItemIds),
        expiresAt,
        purpose: 'Urlaubsübergabe / SBV-Vertretung',
      }, 'urlaubsvertretung.gsbvtransfer');
      if (!exported.exported) return showError('Der Export wurde abgebrochen.');
      setResult(exported);
      announce('Urlaubsübergabe wurde verschlüsselt exportiert.', 'polite');
      setAcknowledgedItemIds([]);
      try { await onCompleted(); }
      catch { showError('Das Übergabepaket wurde gespeichert. Die Übersicht konnte nicht aktualisiert werden; bitte den Bereich erneut öffnen.'); }
    } catch (cause) { showError(cause instanceof Error ? cause.message : 'Urlaubsübergabe konnte nicht exportiert werden.'); }
    finally { setBusy(false); }
  }

  return <form className="industrial-stack" onSubmit={submit} aria-label={`Format-${formatVersion}-Fallübergabe`}>
      <CaseHandoverCasePicker cases={cases} selectedIds={caseIds} onChange={setCaseIds} legend="Fallakten für die Vertretung" />
      <CaseHandoverChecklistPanel packageType="vacation_handover" caseIds={caseIds} expiresAt={expiresAt ?? undefined} acknowledgements={acknowledgedItemIds} onAcknowledgementsChange={setAcknowledgedItemIds} />
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {result?.exported ? <FileLocationNotice filePath={result.filePath} label="Übergabepaket gespeichert" /> : null}
      <FormActions><ExportAction type="submit" loading={busy} disabled={!caseIds.length}>Urlaubsübergabe exportieren</ExportAction></FormActions>
    </form>;
}
