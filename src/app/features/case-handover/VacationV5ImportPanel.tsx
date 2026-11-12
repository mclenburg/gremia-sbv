import { useState, type FormEvent } from 'react';
import type { VacationV5PackageReview } from '../../../domain/transfer/vacationV5File';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormActions, PasswordInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { requireCaseHandoverBridge } from './caseHandoverBridge';

const labels: Record<string, string> = {
  case: 'Fallakten', protected_person: 'Personenbezüge', case_note: 'Fallnotizen', case_measure: 'Maßnahmen',
  case_measure_note: 'Maßnahmennotizen', case_deadline: 'Fallfristen', case_document: 'Falldokumente',
  deadline: 'Fallfreie Fristen', meeting: 'Sitzungen', meeting_agenda: 'Tagesordnungspunkte',
  recruiting: 'Stellenbesetzungen', recruiting_interview: 'Gespräche', employer_obligation: 'Arbeitgeberpflichten',
  inclusion_agreement: 'Inklusionsvereinbarungen', inclusion_topic: 'Vereinbarungsthemen',
  inclusion_officer_snapshot: 'Inklusionsbeauftragter', violation: 'Beteiligungsverstöße',
  violation_event: 'Verstoßereignisse', assembly: 'SBV-Versammlungen', generated_document: 'Amtsdokumente',
  workflow_document_link: 'Dokumentverknüpfungen', violation_document_link: 'Verstoßdokumentbezüge',
};

export function VacationV5ImportPanel({ onCompleted }: { onCompleted: () => Promise<void> }) {
  const announce = useAnnouncer();
  const [passphrase, setPassphrase] = useState('');
  const [file, setFile] = useState<{ token: string; name: string } | null>(null);
  const [review, setReview] = useState<VacationV5PackageReview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function report(value: string, failed = false) {
    setError(failed ? value : ''); setMessage(failed ? '' : value);
    announce(value, failed ? 'assertive' : 'polite');
  }

  async function selectAndReview() {
    setBusy(true); setFile(null); setReview(null); setConfirmed(false); setError(''); setMessage('');
    try {
      const bridge = await requireCaseHandoverBridge();
      const selected = await bridge.selectFile();
      if (selected.canceled) return report('Dateiauswahl abgebrochen.');
      const next = await bridge.reviewV5(selected.filePath, passphrase);
      setFile({ token: selected.filePath, name: selected.fileName }); setReview(next);
      report('Format-5-Paket geprüft. Bitte den Umfang vor dem Import bestätigen.');
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Format-5-Paket konnte nicht geprüft werden.', true); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !review || !confirmed) return report('Bitte das geprüfte Paket und seinen Umfang bestätigen.', true);
    setBusy(true); setError(''); setMessage('');
    try {
      const bridge = await requireCaseHandoverBridge();
      const result = await bridge.importV5(file.token, passphrase, review.packageId);
      setFile(null); setReview(null); setConfirmed(false); setPassphrase('');
      report(`${result.importedCount} Vorgänge als lokale Vertretungskopien übernommen.`);
      try { await onCompleted(); }
      catch { report('Das Paket wurde übernommen. Die Übersicht konnte nicht aktualisiert werden.', true); }
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Format-5-Paket konnte nicht importiert werden.', true); }
    finally { setBusy(false); }
  }

  return <IndustrialPanel kicker="Format 5" title="Erweiterte Urlaubsübergabe übernehmen"
    description="Herkunft, Zielbindung, Integrität und Umfang werden vor dem Import geprüft. Übernommene Vorgänge entstehen als lokale Vertretungskopien."
    ariaLabel="Format-5-Urlaubsübergabe prüfen und importieren">
    <form className="industrial-stack" onSubmit={(event) => void submit(event)}>
      <PasswordInput label="Transport-Passphrase" value={passphrase}
        onValueChange={(value) => { setPassphrase(value); setFile(null); setReview(null); setConfirmed(false); }} />
      <div className="industrial-action-row"><ToolbarButton type="button" onClick={() => void selectAndReview()}
        loading={busy}>Datei auswählen und Paket prüfen</ToolbarButton></div>
      {file && review ? <>
        <TextInput label="Geprüfte Datei" value={file.name} onValueChange={() => undefined} readOnly />
        <p>Abgebende Instanz: {review.senderInstanceId}</p>
        <p>Gültig bis: {new Date(review.expiresAt).toLocaleString('de-DE')}</p>
        <ul>{review.sectionCounts.map((section) => <li key={section.type}>{labels[section.type] ?? section.type}: {section.count}</li>)}</ul>
        <p>{review.documentCount} Dokumente · {new Intl.NumberFormat('de-DE').format(review.documentBytes)} Byte Dokumentinhalt.</p>
        {review.documents.length ? <ul aria-label="Dokumente im Paket">{review.documents.map((document, index) =>
          <li key={`${document.filename}-${index}`}>{document.filename} · {document.owner} · {new Intl.NumberFormat('de-DE').format(document.sizeBytes)} Byte</li>)}</ul> : null}
        <label className="industrial-checkbox-row"><input type="checkbox" className="industrial-input"
          checked={confirmed} onChange={(event) => setConfirmed(event.currentTarget.checked)} />
          <span>Ich habe den geprüften Umfang und das Vertretungsende bestätigt.</span></label>
      </> : null}
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {message ? <div className="industrial-message industrial-message-success" role="status">{message}</div> : null}
      <FormActions><IndustrialButton type="submit" loading={busy} disabled={!review || !confirmed}>
        Geprüftes Format-5-Paket importieren</IndustrialButton></FormActions>
    </form>
  </IndustrialPanel>;
}
