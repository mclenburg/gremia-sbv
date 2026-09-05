import { useMemo, useState, type FormEvent } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverCockpitItem, CaseHandoverExportResult } from '../../../domain/models/case-handover.model';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { ExportAction, FileLocationNotice } from '../../shared/components/ImportExportFeedback';
import { FormActions, PasswordInput, SearchInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { EmptyState } from '../../shared/components/WorkbenchData';
import { IndustrialPanel, IndustrialRecordCard } from '../../shared/components/WorkbenchPanels';
import { CaseHandoverCasePicker } from './CaseHandoverCasePicker';
import { requireCaseHandoverBridge } from './caseHandoverBridge';
import { handoverStatusLabel } from './caseHandoverCockpitPolicy';

export function HandoverReturnPanel({ items, cases, onCompleted }: { items: CaseHandoverCockpitItem[]; cases: CaseRecord[]; onCompleted: () => Promise<void> }) {
  const returnable = items.filter((item) => item.canExportReturnDelta);
  const [query, setQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [targetRecipientToken, setTargetRecipientToken] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CaseHandoverExportResult | null>(null);
  const selectedItem = returnable.find((item) => item.id === selectedItemId);
  const availableCases = useMemo(() => selectedItem ? cases.filter((record) => selectedItem.caseIds.includes(record.id)) : [], [cases, selectedItem]);
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('de-DE');
    return normalized ? returnable.filter((item) => item.caseLabels.some((label) => label.toLocaleLowerCase('de-DE').includes(normalized))) : returnable;
  }, [query, returnable]);

  function choose(item: CaseHandoverCockpitItem) {
    setSelectedItemId(item.id); setCaseIds(item.caseIds); setError(''); setResult(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setResult(null);
    if (!selectedItem) return setError('Bitte zuerst eine übernommene Vertretung auswählen.');
    if (!caseIds.length) return setError('Bitte mindestens eine Fallakte für die Rückgabe auswählen.');
    if (!targetRecipientToken.trim()) return setError('Bitte die Empfängerkennung der ursprünglichen Instanz einfügen.');
    if (passphrase.trim().length < 10) return setError('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.');
    setBusy(true);
    try {
      const handover = await requireCaseHandoverBridge();
      const exported = await handover.exportReturnDelta({ sourcePackageId: selectedItem.packageId, caseIds, passphrase, targetRecipientToken: targetRecipientToken.trim() }, 'rueckgabe-delta.gsbvtransfer');
      if (!exported.exported) return setError('Der Export wurde abgebrochen.');
      setResult(exported);
      setPassphrase('');
      await onCompleted();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Rückgabepaket konnte nicht erstellt werden.'); }
    finally { setBusy(false); }
  }

  return <IndustrialPanel kicker="Rückübergabe" title="Änderungen aus der Vertretung zurückgeben" description="Nur seit dem Import neu angelegte oder geänderte Inhalte werden als Delta exportiert.">
    {!returnable.length ? <EmptyState title="Keine Rückgabe offen" text="Nach dem Import einer Urlaubsübergabe erscheint sie hier für die spätere Rückgabe." /> : <form className="industrial-stack" onSubmit={submit}>
      {returnable.length > 5 ? <SearchInput label="Übernommene Vertretungen filtern" value={query} onValueChange={setQuery} /> : null}
      <div className="industrial-list" aria-label="Übernommene Vertretungen">
        {visibleItems.map((item) => <IndustrialRecordCard key={item.id} selected={item.id === selectedItemId} tone={item.status === 'expired' ? 'warning' : 'default'}>
          <div className="industrial-record-card-header"><div><h3>{item.caseLabels.join(', ')}</h3><p>{handoverStatusLabel(item)}</p></div>
            <IndustrialButton variant="secondary" onClick={() => choose(item)} aria-pressed={item.id === selectedItemId}>Für Rückgabe auswählen</IndustrialButton></div>
        </IndustrialRecordCard>)}
      </div>
      {selectedItem ? <>
        <CaseHandoverCasePicker cases={availableCases} selectedIds={caseIds} onChange={setCaseIds} legend="Fallakten im Rückgabe-Delta" />
        <TextareaInput label="Empfängerkennung der ursprünglichen Instanz" value={targetRecipientToken} onValueChange={setTargetRecipientToken} rows={3} required />
        <PasswordInput label="Transport-Passphrase" value={passphrase} onValueChange={setPassphrase} minLength={10} required />
        {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
        {result?.exported ? <FileLocationNotice filePath={result.filePath} label="Rückgabepaket gespeichert" /> : null}
        <FormActions><ExportAction type="submit" loading={busy} disabled={!caseIds.length}>Rückgabe-Delta exportieren</ExportAction></FormActions>
      </> : null}
    </form>}
  </IndustrialPanel>;
}
