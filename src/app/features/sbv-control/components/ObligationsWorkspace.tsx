import { useEffect, useState } from 'react';
import { IndustrialButton } from '../../../shared/components/IndustrialButton';
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
        <div className="sbv-control-section-heading">
          <h3 id="obligation-overview-heading">Jahresprüfung und Übersicht</h3>
          <p>Prüfvorgänge für das Berichtsjahr erzeugen und ihren Bearbeitungsstand überblicken.</p>
        </div>
        <div className="industrial-form-grid sbv-control-inline-action-grid">
          <label><span>Prüf-/Berichtsjahr</span><input className="industrial-input" type="number" min="2000" max="2100" value={periodYear} onChange={(event) => setPeriodYear(Number(event.target.value))} /></label>
          <IndustrialButton onClick={() => void onEnsure(periodYear)}>Jahresprüfung {periodYear} anlegen</IndustrialButton>
        </div>
        <div className="industrial-table-wrap"><table className="industrial-table"><thead><tr><th>Pflicht</th><th>Zeitraum</th><th>Status</th><th>Fällig</th></tr></thead><tbody>{reviews.map((item) => <tr key={item.id}><td>{EMPLOYER_OBLIGATION_LABELS[item.obligationKey]}</td><td>{item.periodYear}</td><td>{item.status}</td><td>{item.dueAt ? new Date(item.dueAt).toLocaleDateString('de-DE') : '—'}</td></tr>)}</tbody></table></div>
      </section>

      <section className="sbv-control-section" aria-labelledby="obligation-review-heading">
        <div className="sbv-control-section-heading">
          <h3 id="obligation-review-heading">Prüfvorgang bearbeiten</h3>
          <p>Unterlagen, Feststellung und notwendige Folgeaktion dokumentieren.</p>
        </div>
        <label><span>Prüfvorgang</span><select className="industrial-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Auswählen …</option>{reviews.map((item) => <option key={item.id} value={item.id}>{item.periodYear} · {EMPLOYER_OBLIGATION_LABELS[item.obligationKey]}</option>)}</select></label>
        {review ? <>
          <div className="industrial-action-row sbv-control-action-row">
            <IndustrialButton variant="secondary" onClick={() => void onSaveReview({ ...review, requestedAt: new Date().toISOString(), status: 'requested' })}>Unterlagen angefordert</IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void onSaveReview({ ...review, receivedAt: new Date().toISOString(), status: 'received' })}>Eingang dokumentieren</IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void onSaveReview({ ...review, reviewedAt: new Date().toISOString(), status: 'reviewing' })}>Prüfung dokumentieren</IndustrialButton>
          </div>
          <label><span>Feststellung</span><textarea className="industrial-textarea" value={finding} onChange={(event) => setFinding(event.target.value)} /></label>
          <div className="industrial-form-grid">
            <label><span>Folgeaktion</span><input className="industrial-input" value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label>
            <label><span>Wiedervorlage</span><input className="industrial-input" type="date" value={followUp} onChange={(event) => setFollowUp(event.target.value)} /></label>
          </div>
          <div className="industrial-action-row sbv-control-action-row">
            <IndustrialButton variant="secondary" onClick={() => void onAttachEvidence(review.id)}>Nachweis anhängen</IndustrialButton>
            <IndustrialButton onClick={() => void onSaveReview({ ...review, finding, nextAction, followUpDueAt: followUp || undefined, status: finding.trim() ? 'follow_up' : review.status })}>Prüfvorgang speichern</IndustrialButton>
          </div>
        </> : <p className="industrial-meta">Wähle einen Prüfvorgang für die Detailbearbeitung aus.</p>}
      </section>

      <section className="sbv-control-section" aria-labelledby="inclusion-officer-heading">
        <div className="sbv-control-section-heading">
          <h3 id="inclusion-officer-heading">Inklusionsbeauftragter</h3>
          <p>{latest?.status === 'not_appointed' ? 'Offener Befund: nicht bestellt' : latest?.name ?? 'Noch kein Status dokumentiert'}</p>
        </div>
        <div className="industrial-form-grid">
          <label><span>Name</span><input className="industrial-input" value={officerName} onChange={(event) => setOfficerName(event.target.value)} /></label>
          <label><span>Funktion</span><input className="industrial-input" value={officerFunction} onChange={(event) => setOfficerFunction(event.target.value)} /></label>
          <label><span>Bestelldatum</span><input className="industrial-input" type="date" value={appointedAt} onChange={(event) => setAppointedAt(event.target.value)} /></label>
        </div>
        <div className="industrial-action-row sbv-control-action-row">
          <IndustrialButton variant="secondary" onClick={() => void onSaveOfficer({ status: 'not_appointed', verifiedAt: new Date().toISOString() })}>Nicht bestellt dokumentieren</IndustrialButton>
          <IndustrialButton variant="secondary" disabled={!officerName.trim()} onClick={() => void onSaveOfficer({ status: 'appointed', name: officerName, function: officerFunction || undefined, appointedAt: appointedAt || undefined, verifiedAt: new Date().toISOString() })}>Bestellung dokumentieren</IndustrialButton>
          <IndustrialButton variant="secondary" disabled={latest?.status !== 'appointed'} onClick={() => void onSaveOfficer({ ...latest, notificationAgencyAt: new Date().toISOString(), verifiedAt: new Date().toISOString() })}>Benennung BA dokumentieren</IndustrialButton>
          <IndustrialButton variant="secondary" disabled={latest?.status !== 'appointed'} onClick={() => void onSaveOfficer({ ...latest, notificationIntegrationOfficeAt: new Date().toISOString(), verifiedAt: new Date().toISOString() })}>Benennung Inklusionsamt dokumentieren</IndustrialButton>
        </div>
      </section>
    </SbvControlPanel>
  );
}
