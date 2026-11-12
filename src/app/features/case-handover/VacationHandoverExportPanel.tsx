import { useEffect, useState, type FormEvent } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverExportResult, TransferProtectionMode } from '../../../domain/models/case-handover.model';
import type { TransferRecipientProfile } from '../../../domain/models/transfer-recipient-profile.model';
import { planVacationHandoverFormat } from '../../../domain/transfer/transferFormatPlan';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { ExportAction, FileLocationNotice } from '../../shared/components/ImportExportFeedback';
import { DateInput, FormActions, SelectInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { CaseHandoverChecklistPanel, handoverChecklistConfirmation } from './CaseHandoverChecklistPanel';
import { CaseHandoverCasePicker } from './CaseHandoverCasePicker';
import { requireCaseHandoverBridge } from './caseHandoverBridge';
import { toHandoverExpiry } from './caseHandoverCockpitPolicy';
import { requiresPassphrase, TransferProtectionFields, type TransferProtectionState } from './TransferProtectionFields';

export function VacationHandoverExportPanel({ cases, onCompleted }: { cases: CaseRecord[]; onCompleted: () => Promise<void> }) {
  const announce = useAnnouncer();
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [protection, setProtection] = useState<TransferProtectionState>({ targetRecipientToken: '', passphrase: '', protectionMode: 'passphrase_and_recipient_key' as TransferProtectionMode });
  const [acknowledgedItemIds, setAcknowledgedItemIds] = useState<string[]>([]);
  const [validUntil, setValidUntil] = useState('');
  const [formatVersion, setFormatVersion] = useState<2 | 4>(4);
  const [selectedProfile, setSelectedProfile] = useState<TransferRecipientProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CaseHandoverExportResult | null>(null);
  useEffect(() => { setCaseIds((current) => current.filter((id) => cases.some((record) => record.id === id))); }, [cases]);
  const formatPlan = planVacationHandoverFormat(selectedProfile?.capabilityStatus === 'verified' ? selectedProfile.capabilities : null);

  function selectRecipientProfile(profile: TransferRecipientProfile | null) {
    setSelectedProfile(profile);
    const suggestion = planVacationHandoverFormat(profile?.capabilityStatus === 'verified' ? profile.capabilities : null).suggested;
    if (suggestion) setFormatVersion(suggestion);
  }

  function showError(message: string) {
    setError(message);
    announce(message, 'assertive');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setResult(null);
    if (!caseIds.length) return showError('Bitte mindestens eine Fallakte für die Vertretung auswählen.');
    if (!protection.targetRecipientToken.trim()) return showError('Bitte die Empfängerkennung der Vertretungsinstanz einfügen.');
    if (!formatPlan.available.includes(formatVersion)) return showError('Die verifizierte Zielinstanz kann das gewählte Übergabeformat nicht lesen. Bitte ein gemeinsames Format wählen.');
    if (formatVersion === 2 && protection.protectionMode !== 'passphrase_and_recipient_key') return showError('Das ältere Format 2 benötigt Empfängerschlüssel und Transport-Passphrase. Bitte die Schutzart ändern.');
    if (requiresPassphrase(protection.protectionMode) && protection.passphrase.trim().length < 10) return showError('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.');
    const expiresAt = toHandoverExpiry(validUntil);
    if (!validUntil.trim() || !expiresAt) return showError('Bitte das Ende der Urlaubsvertretung angeben.');
    if (new Date(expiresAt).getTime() <= Date.now()) return showError('Das Ende der Urlaubsvertretung muss in der Zukunft liegen.');
    setBusy(true);
    try {
      const handover = await requireCaseHandoverBridge();
      const exported = await handover.export({
        caseIds,
        targetRecipientToken: protection.targetRecipientToken.trim(),
        passphrase: requiresPassphrase(protection.protectionMode) ? protection.passphrase : '',
        protectionMode: protection.protectionMode,
        formatVersion,
        checklist: handoverChecklistConfirmation(acknowledgedItemIds),
        expiresAt,
        purpose: 'Urlaubsübergabe / SBV-Vertretung',
      }, 'urlaubsvertretung.gsbvtransfer');
      if (!exported.exported) return showError('Der Export wurde abgebrochen.');
      setResult(exported);
      announce('Urlaubsübergabe wurde verschlüsselt exportiert.', 'polite');
      setProtection((current) => ({ ...current, passphrase: '' }));
      setAcknowledgedItemIds([]);
      try { await onCompleted(); }
      catch { showError('Das Übergabepaket wurde gespeichert. Die Übersicht konnte nicht aktualisiert werden; bitte den Bereich erneut öffnen.'); }
    } catch (cause) { showError(cause instanceof Error ? cause.message : 'Urlaubsübergabe konnte nicht exportiert werden.'); }
    finally { setBusy(false); }
  }

  return <IndustrialPanel ariaLabel="Urlaubsvertretung übergeben" kicker="Ausgabe" title="Urlaubsvertretung übergeben" description="Ausgewählte Fallakten werden als ein verschlüsseltes, zielgebundenes Paket übergeben." helpId="caseHandover.vacation">
    <form className="industrial-stack" onSubmit={submit}>
      <CaseHandoverCasePicker cases={cases} selectedIds={caseIds} onChange={setCaseIds} legend="Fallakten für die Vertretung" />
      <TransferProtectionFields value={protection} onChange={setProtection} onRecipientProfileChange={selectRecipientProfile}
        allowRecipientKeyOnly={formatVersion !== 2} targetLabel="Öffentliche Empfängerkennung der Vertretungsinstanz" />
      {selectedProfile?.capabilityStatus === 'verified' ? <div className="industrial-settings-note" role="status">Verifizierte Zielformate zum Lesen: {selectedProfile.capabilities?.readFormats.join(', ') || 'keine'} · Rückgabeformate zum Schreiben: {selectedProfile.capabilities?.writeFormats.join(', ') || 'keine'}</div>
        : <div className="industrial-settings-note" role="status">Übergabefähigkeiten der Zielinstanz unbekannt. Bitte das tatsächlich unterstützte Format unabhängig prüfen.</div>}
      {formatPlan.available.length ? <SelectInput label="Zielformat der Vertretungsinstanz" value={String(formatVersion)} options={formatPlan.available.map((format) => ({
        value: String(format), label: format === 4 ? 'Format 4 – aktuelle Fallübergabe' : 'Format 2 – ältere Zielinstanz',
      }))} onValueChange={(value) => { const next = value === '2' ? 2 : 4; setFormatVersion(next);
        if (next === 2) setProtection((current) => ({ ...current, protectionMode: 'passphrase_and_recipient_key' })); }}
      helpText="Format 2 benötigt eine Transport-Passphrase. Die tatsächliche Rückgabefähigkeit einer älteren Zielinstanz ist gesondert zu prüfen." wide />
        : <div className="industrial-message industrial-message-warning" role="alert">Dieses verifizierte Empfängerprofil kann keines der derzeit schreibbaren Urlaubsübergabeformate lesen.</div>}
      <DateInput label="Vertretung endet am" value={validUntil} onValueChange={setValidUntil} required />
      <CaseHandoverChecklistPanel packageType="vacation_handover" caseIds={caseIds} expiresAt={toHandoverExpiry(validUntil)} acknowledgements={acknowledgedItemIds} onAcknowledgementsChange={setAcknowledgedItemIds} />
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {result?.exported ? <FileLocationNotice filePath={result.filePath} label="Übergabepaket gespeichert" /> : null}
      <FormActions><ExportAction type="submit" loading={busy} disabled={!caseIds.length || !formatPlan.available.includes(formatVersion)}>Urlaubsübergabe exportieren</ExportAction></FormActions>
    </form>
  </IndustrialPanel>;
}
