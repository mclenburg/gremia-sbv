import { useEffect, useState } from 'react';
import { IndustrialButton } from '../../../shared/components/IndustrialButton';
import { DateInput, SelectInput, TextareaInput, TextInput } from '../../../shared/components/IndustrialForm';
import { IndustrialHelpButton } from '../../../shared/help/IndustrialHelp';
import { EMPLOYER_OBLIGATION_LABELS, type EmployerObligationReviewRecord, type InclusionOfficerSnapshotRecord, type SaveEmployerObligationReviewInput, type SaveInclusionOfficerSnapshotInput } from '../../../core/models/sbv-office-workflow.model';
import { SbvControlPanel } from './SbvControlPanel';

export function ObligationsWorkspace({ reviews, officers, onEnsure, onSaveReview, onSaveOfficer, onAttachEvidence }: {
  reviews: EmployerObligationReviewRecord[];
  officers: InclusionOfficerSnapshotRecord[];
  onEnsure: (year: number) => Promise<void>;
  onSaveReview: (input: SaveEmployerObligationReviewInput) => Promise<void>;
  onSaveOfficer: (input: SaveInclusionOfficerSnapshotInput) => Promise<void>;
  onAttachEvidence: (reviewId: string) => Promise<void>;
}) {
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear() - 1);
  const latest = officers[0];
  const [selectedId, setSelectedId] = useState('');
  const review = reviews.find((item) => item.id === selectedId);
  const [finding, setFinding] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [officerName, setOfficerName] = useState(latest?.name ?? '');
  const [officerFunction, setOfficerFunction] = useState(latest?.function ?? '');
  const [appointedAt, setAppointedAt] = useState(latest?.appointedAt?.slice(0, 10) ?? '');

  useEffect(() => {
    setFinding(review?.finding ?? '');
    setNextAction(review?.nextAction ?? '');
    setFollowUp(review?.followUpDueAt?.slice(0, 10) ?? '');
  }, [review]);
  useEffect(() => {
    setOfficerName(latest?.name ?? '');
    setOfficerFunction(latest?.function ?? '');
    setAppointedAt(latest?.appointedAt?.slice(0, 10) ?? '');
  }, [latest]);

  return (
    <SbvControlPanel
      kicker="Arbeitgeberpflichten"
      title="Periodische Prüfvorgänge"
      actions={<IndustrialHelpButton helpId="sbvOffice.obligations" label="Hilfe zu Arbeitgeberpflichten öffnen" />}
    >
      <section className="sbv-control-section" aria-labelledby="obligation-overview-heading">
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="obligation-overview-heading">Jahresprüfung und Übersicht</h3>
            <p>Prüfvorgänge für das Berichtsjahr erzeugen und ihren Bearbeitungsstand überblicken.</p>
          </div>
          <div className="industrial-action-row"><IndustrialButton onClick={() => void onEnsure(periodYear)}>Jahresprüfung {periodYear} anlegen</IndustrialButton></div>
        </div>
        <div className="industrial-form-grid industrial-form-grid-2">
          <TextInput label="Prüf-/Berichtsjahr" type="number" min="2000" max="2100" value={String(periodYear)} onValueChange={(value) => setPeriodYear(Number(value))} />
        </div>
        <div className="industrial-table-wrap"><table className="industrial-table"><thead><tr><th>Pflicht</th><th>Zeitraum</th><th>Status</th><th>Fällig</th></tr></thead><tbody>{reviews.map((item) => <tr key={item.id}><td>{EMPLOYER_OBLIGATION_LABELS[item.obligationKey]}</td><td>{item.periodYear}</td><td>{item.status}</td><td>{item.dueAt ? new Date(item.dueAt).toLocaleDateString('de-DE') : '—'}</td></tr>)}</tbody></table></div>
      </section>

      <section className="sbv-control-section" aria-labelledby="obligation-review-heading">
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="obligation-review-heading">Prüfvorgang bearbeiten</h3>
            <p>Unterlagen, Feststellung und notwendige Folgeaktion dokumentieren.</p>
          </div>
          {review ? <div className="industrial-action-row">
            <IndustrialButton variant="secondary" onClick={() => void onAttachEvidence(review.id)}>Nachweis anhängen</IndustrialButton>
            <IndustrialButton onClick={() => void onSaveReview({ ...review, finding, nextAction, followUpDueAt: followUp || undefined, status: finding.trim() ? 'follow_up' : review.status })}>Prüfvorgang speichern</IndustrialButton>
          </div> : null}
        </div>
        <SelectInput label="Prüfvorgang" value={selectedId} onValueChange={setSelectedId} options={[{ value: '', label: 'Auswählen …' }, ...reviews.map((item) => ({ value: item.id, label: `${item.periodYear} · ${EMPLOYER_OBLIGATION_LABELS[item.obligationKey]}` }))]} />
        {review ? <>
          <div className="industrial-action-row sbv-control-status-actions">
            <IndustrialButton variant="secondary" onClick={() => void onSaveReview({ ...review, requestedAt: new Date().toISOString(), status: 'requested' })}>Unterlagen angefordert</IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void onSaveReview({ ...review, receivedAt: new Date().toISOString(), status: 'received' })}>Eingang dokumentieren</IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void onSaveReview({ ...review, reviewedAt: new Date().toISOString(), status: 'reviewing' })}>Prüfung dokumentieren</IndustrialButton>
          </div>
          <TextareaInput label="Feststellung" value={finding} onValueChange={setFinding} wide />
          <div className="industrial-form-grid industrial-form-grid-2">
            <TextInput label="Folgeaktion" value={nextAction} onValueChange={setNextAction} />
            <DateInput label="Wiedervorlage" value={followUp} onValueChange={setFollowUp} />
          </div>
        </> : <p className="industrial-meta">Wähle einen Prüfvorgang für die Detailbearbeitung aus.</p>}
      </section>

      <section className="sbv-control-section" aria-labelledby="inclusion-officer-heading">
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="inclusion-officer-heading">Inklusionsbeauftragter</h3>
            <p>{latest?.status === 'not_appointed' ? 'Offener Befund: nicht bestellt' : latest?.name ?? 'Noch kein Status dokumentiert'}</p>
          </div>
          <div className="industrial-action-row">
          <IndustrialButton variant="secondary" onClick={() => void onSaveOfficer({ status: 'not_appointed', verifiedAt: new Date().toISOString() })}>Nicht bestellt dokumentieren</IndustrialButton>
          <IndustrialButton variant="secondary" disabled={!officerName.trim()} onClick={() => void onSaveOfficer({ status: 'appointed', name: officerName, function: officerFunction || undefined, appointedAt: appointedAt || undefined, verifiedAt: new Date().toISOString() })}>Bestellung dokumentieren</IndustrialButton>
          <IndustrialButton variant="secondary" disabled={latest?.status !== 'appointed'} onClick={() => void onSaveOfficer({ ...latest, notificationAgencyAt: new Date().toISOString(), verifiedAt: new Date().toISOString() })}>Benennung BA dokumentieren</IndustrialButton>
          <IndustrialButton variant="secondary" disabled={latest?.status !== 'appointed'} onClick={() => void onSaveOfficer({ ...latest, notificationIntegrationOfficeAt: new Date().toISOString(), verifiedAt: new Date().toISOString() })}>Benennung Inklusionsamt dokumentieren</IndustrialButton>
          </div>
        </div>
        <div className="industrial-form-grid industrial-form-grid-3">
          <TextInput label="Name" value={officerName} onValueChange={setOfficerName} />
          <TextInput label="Funktion" value={officerFunction} onValueChange={setOfficerFunction} />
          <DateInput label="Bestelldatum" value={appointedAt} onValueChange={setAppointedAt} />
        </div>
      </section>
    </SbvControlPanel>
  );
}
