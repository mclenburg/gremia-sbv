import { useMemo, useState, type FormEvent } from 'react';
import type { VacationV5ReturnChoice, VacationV5ReturnReview } from '../../../domain/transfer/vacationV5ReturnReview';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormActions, PasswordInput, SearchInput } from '../../shared/components/IndustrialForm';
import { requireCaseHandoverBridge } from './caseHandoverBridge';
import { VacationV5ReturnDecisionList } from './VacationV5ReturnDecisionList';
import type { SelectedHandoverFile } from './HandoverImportTab';

export function VacationV5ReturnImportPanel({ onCompleted, file }: {
  onCompleted: () => Promise<void>; file: SelectedHandoverFile;
}) {
  const announce = useAnnouncer();
  const [passphrase, setPassphrase] = useState('');
  const [review, setReview] = useState<VacationV5ReturnReview | null>(null);
  const [choices, setChoices] = useState<Record<string, VacationV5ReturnChoice['action'] | ''>>({});
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const visible = useMemo(() => review?.items.filter((item) => {
    const value = query.trim().toLocaleLowerCase('de-DE');
    return !value || JSON.stringify([item.kind, item.originData, item.deputyData])
      .toLocaleLowerCase('de-DE').includes(value);
  }) ?? [], [review, query]);

  function report(message: string, isError = false) {
    if (isError) { setError(message); setStatus(''); announce(message, 'assertive'); }
    else { setStatus(message); setError(''); announce(message, 'polite'); }
  }

  async function selectAndReview() {
    setError(''); setStatus(''); setReview(null); setChoices({});
    setBusy(true);
    try {
      const bridge = await requireCaseHandoverBridge();
      const result = await bridge.reviewV5Return(file.token, passphrase);
      setReview(result);
      report(`${result.items.length} Rückgabeänderungen geprüft. Bitte jede Änderung einzeln entscheiden.`);
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Rückgabe konnte nicht geprüft werden.', true); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setStatus('');
    if (!review) return report('Bitte zuerst eine Format-5-Rückgabe auswählen und prüfen.', true);
    if (review.items.some((item) => !choices[item.ref])) return report('Bitte jede Rückgabeänderung einzeln entscheiden.', true);
    const confirmed: VacationV5ReturnChoice[] = review.items.map((item) => ({
      ref: item.ref, action: choices[item.ref] as VacationV5ReturnChoice['action'],
      expectedOriginSha256: item.expectedOriginSha256,
    }));
    setBusy(true);
    try {
      const bridge = await requireCaseHandoverBridge();
      const result = await bridge.importV5Return({ filePath: file.token, passphrase, choices: confirmed });
      setReview(null); setChoices({}); setPassphrase('');
      report(`${result.acceptedCount} Änderungen übernommen, ${result.reviewedCount} zur Prüfung belassen.`);
      try { await onCompleted(); }
      catch { report('Die Rückgabe wurde übernommen. Die Übersicht konnte nicht aktualisiert werden; bitte den Bereich erneut öffnen.', true); }
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Rückgabe konnte nicht übernommen werden.', true); }
    finally { setBusy(false); }
  }

  return <form className="industrial-stack" onSubmit={(event) => void submit(event)}
    aria-label="Format-5-Rückgabe prüfen und übernehmen">
      <PasswordInput label="Transport-Passphrase" value={passphrase}
        onValueChange={(value) => { setPassphrase(value); setReview(null); }} />
      <div className="industrial-action-row"><ToolbarButton type="button" onClick={() => void selectAndReview()}
        loading={busy}>Rückgabe prüfen</ToolbarButton></div>
      {review ? <>
        <p>Abgebende Instanz: {review.senderInstanceId}</p>
        <p>Gültig bis: {new Date(review.expiresAt).toLocaleString('de-DE')}</p>
        {review.items.length > 5 ? <SearchInput label="Rückgabeänderungen filtern" value={query}
          onValueChange={setQuery} /> : null}
        <p role="status">{visible.length} von {review.items.length} Änderungen sichtbar.</p>
        <VacationV5ReturnDecisionList items={visible} choices={choices}
          onChange={(ref, action) => setChoices((current) => ({ ...current, [ref]: action }))} />
      </> : null}
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {status ? <div className="industrial-message industrial-message-success" role="status">{status}</div> : null}
      <FormActions><IndustrialButton type="submit" loading={busy} disabled={!review}>
        Entscheidungen bestätigen und Rückgabe übernehmen</IndustrialButton></FormActions>
    </form>;
}
