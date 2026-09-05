import { useEffect, useState, type FormEvent } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverExportResult } from '../../../domain/models/case-handover.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { ExportAction, FileLocationNotice } from '../../shared/components/ImportExportFeedback';
import { DateInput, FormActions, PasswordInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { CaseHandoverCasePicker } from './CaseHandoverCasePicker';
import { requireCaseHandoverBridge } from './caseHandoverBridge';
import { toHandoverExpiry } from './caseHandoverCockpitPolicy';

export function VacationHandoverExportPanel({ cases, onCompleted }: { cases: CaseRecord[]; onCompleted: () => Promise<void> }) {
  const announce = useAnnouncer();
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [targetRecipientToken, setTargetRecipientToken] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [validUntil, setValidUntil] = useState('');
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
    if (passphrase.trim().length < 10) return showError('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.');
    const expiresAt = toHandoverExpiry(validUntil);
    if (!validUntil.trim() || !expiresAt) return showError('Bitte das Ende der Urlaubsvertretung angeben.');
    if (new Date(expiresAt).getTime() <= Date.now()) return showError('Das Ende der Urlaubsvertretung muss in der Zukunft liegen.');
    setBusy(true);
    try {
      const handover = await requireCaseHandoverBridge();
      const exported = await handover.export({ caseIds, targetRecipientToken: targetRecipientToken.trim(), passphrase, expiresAt, purpose: 'Urlaubsübergabe / SBV-Vertretung' }, 'urlaubsvertretung.gsbvtransfer');
      if (!exported.exported) return showError('Der Export wurde abgebrochen.');
      setResult(exported);
      announce('Urlaubsübergabe wurde verschlüsselt exportiert.', 'polite');
      setPassphrase('');
      await onCompleted();
    } catch (cause) { showError(cause instanceof Error ? cause.message : 'Urlaubsübergabe konnte nicht exportiert werden.'); }
    finally { setBusy(false); }
  }

  return <IndustrialPanel kicker="Ausgabe" title="Urlaubsvertretung übergeben" description="Ausgewählte Fallakten werden als ein verschlüsseltes, zielgebundenes Paket übergeben.">
    <form className="industrial-stack" onSubmit={submit}>
      <CaseHandoverCasePicker cases={cases} selectedIds={caseIds} onChange={setCaseIds} legend="Fallakten für die Vertretung" />
      <TextareaInput label="Empfängerkennung der Vertretungsinstanz" value={targetRecipientToken} onValueChange={setTargetRecipientToken} rows={3} required placeholder="GSBV1.… aus den Einstellungen der Zielinstanz" />
      <PasswordInput label="Transport-Passphrase" value={passphrase} onValueChange={setPassphrase} minLength={10} required />
      <DateInput label="Vertretung endet am" value={validUntil} onValueChange={setValidUntil} required />
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {result?.exported ? <FileLocationNotice filePath={result.filePath} label="Übergabepaket gespeichert" /> : null}
      <FormActions><ExportAction type="submit" loading={busy} disabled={!caseIds.length}>Urlaubsübergabe exportieren</ExportAction></FormActions>
    </form>
  </IndustrialPanel>;
}
