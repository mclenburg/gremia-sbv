import { useEffect, useState, type FormEvent } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverExportResult, OfficeHandoverScope, TransferProtectionMode } from '../../../domain/models/case-handover.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { ExportAction, FileLocationNotice } from '../../shared/components/ImportExportFeedback';
import { FormActions } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { CaseHandoverChecklistPanel, handoverChecklistConfirmation } from './CaseHandoverChecklistPanel';
import { CaseHandoverCasePicker } from './CaseHandoverCasePicker';
import { requireCaseHandoverBridge } from './caseHandoverBridge';
import { requiresPassphrase, TransferProtectionFields, type TransferProtectionState } from './TransferProtectionFields';

export function OfficeHandoverExportPanel({
  cases,
  inventory,
  onCompleted,
}: {
  cases: CaseRecord[];
  inventory: OfficeHandoverScope;
  onCompleted: () => Promise<void>;
}) {
  const announce = useAnnouncer();
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [protection, setProtection] = useState<TransferProtectionState>({ targetRecipientToken: '', passphrase: '', protectionMode: 'passphrase_and_recipient_key' as TransferProtectionMode });
  const [acknowledgedItemIds, setAcknowledgedItemIds] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CaseHandoverExportResult | null>(null);
  useEffect(() => { setCaseIds((current) => current.filter((id) => cases.some((record) => record.id === id))); }, [cases]);

  function fail(message: string) {
    setError(message);
    announce(message, 'assertive');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setResult(null);
    if (!caseIds.length) return fail('Bitte mindestens eine erforderliche Fallakte für die Amtsübergabe auswählen.');
    if (!protection.targetRecipientToken.trim()) return fail('Bitte die Empfängerkennung der Nachfolgeinstanz einfügen.');
    if (requiresPassphrase(protection.protectionMode) && protection.passphrase.trim().length < 10) return fail('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.');
    if (!confirmed) return fail('Bitte den geprüften Umfang der Amtsübergabe bestätigen.');
    setBusy(true);
    try {
      const handover = await requireCaseHandoverBridge();
      const exported = await handover.export({
        packageType: 'office_handover',
        caseIds,
        targetRecipientToken: protection.targetRecipientToken.trim(),
        passphrase: requiresPassphrase(protection.protectionMode) ? protection.passphrase : '',
        protectionMode: protection.protectionMode,
        checklist: handoverChecklistConfirmation(acknowledgedItemIds),
        purpose: 'Amtsübergabe an die gewählte Nachfolge',
      }, 'amtsuebergabe.gsbvtransfer');
      if (!exported.exported) return fail('Der Export wurde abgebrochen.');
      setResult(exported);
      setProtection((current) => ({ ...current, passphrase: '' }));
      setAcknowledgedItemIds([]);
      announce('Amtsübergabe wurde verschlüsselt und zielgebunden exportiert.', 'polite');
      await onCompleted();
    } catch (cause) { fail(cause instanceof Error ? cause.message : 'Amtsübergabe konnte nicht exportiert werden.'); }
    finally { setBusy(false); }
  }

  return <IndustrialPanel ariaLabel="Amtsübergabe erstellen" kicker="Amtswechsel" title="Amtsübergabe erstellen" description="Erforderlichen Amtsbestand dauerhaft und zielgebunden an die gewählte Nachfolge übergeben." helpId="caseHandover.office">
    <form className="industrial-stack" onSubmit={submit}>
      <div className="industrial-message" role="note">
        <strong>Enthaltener Amtsbestand</strong>
        <p>{inventory.templateCount} individuelle Vorlage(n), {inventory.deadlineTemplateCount} Fristenregel(n), {inventory.electionCount} Wahlakte(n) mit {inventory.electionDocumentCount} Dokument(en) und {inventory.privacyReviewCount} offene Datenschutzprüfung(en).</p>
        <p>Das persönliche Tätigkeitsjournal wird nicht übergeben. Bereits erzeugte anonymisierte Berichte können als Dokument Bestandteil einer ausgewählten Fallakte sein.</p>
      </div>
      <CaseHandoverCasePicker cases={cases} selectedIds={caseIds} onChange={setCaseIds} legend="Erforderliche Fallakten für die Amtsübergabe" />
      <TransferProtectionFields value={protection} onChange={setProtection} targetLabel="Öffentliche Empfängerkennung der Nachfolgeinstanz" />
      <CaseHandoverChecklistPanel packageType="office_handover" caseIds={caseIds} acknowledgements={acknowledgedItemIds} onAcknowledgementsChange={setAcknowledgedItemIds} />
      <label className="industrial-checkbox-row">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.currentTarget.checked)} required />
        <span>Ich habe Fallauswahl, Wahlakten, Vorlagen, Fristenregeln und Datenschutzstatus geprüft.</span>
      </label>
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {result?.exported ? <FileLocationNotice filePath={result.filePath} label="Amtsübergabepaket gespeichert" /> : null}
      <FormActions><ExportAction type="submit" loading={busy} disabled={!caseIds.length}>Amtsübergabe exportieren</ExportAction></FormActions>
    </form>
  </IndustrialPanel>;
}
