import { useMemo, useState } from 'react';
import type { ElectionExecutionOverview } from '../../../domain/models/election-execution.model';
import type { ElectionPreparationOverview } from '../../../domain/models/election-workflow.model';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { CheckboxField, DateInput, FormActions, FormSection, SelectInput, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';
import type { ElectionRunner } from './ElectionPreparationSections';
import { acceptanceStatusLabels } from './electionPresentation';
import { legalToday } from '../../../domain/time/legalTime';
import { electionDocumentFeedback } from './electionDocumentFeedback';
import { MailBallotPackageDialog } from './MailBallotPackageDialog';

const today = legalToday;

type SectionProps = {
  overview: ElectionPreparationOverview;
  execution: ElectionExecutionOverview;
  run: ElectionRunner;
};

export function BallotSection({ overview, run }: Omit<SectionProps, 'execution'>) {
  const [secret, setSecret] = useState(false);
  const [urn, setUrn] = useState(false);
  const [staffing, setStaffing] = useState(false);
  const [helper, setHelper] = useState(false);
  const [countPrepared, setCountPrepared] = useState(false);
  const electionId = overview.election.id;

  const generate = (kind: 'ballot_representative' | 'ballot_deputy') => run(
    () => window.gremiaSbv.elections.generateExecutionDocument(electionId, { kind }),
    electionDocumentFeedback,
  );

  return (
    <div className="election-section-stack">
      <FormSection title="Stimmzettel" description="Vertrauensperson und Stellvertretung sind getrennte Wahlgänge. Gremia.SBV speichert keine Individualstimme.">
        <FormActions align="start" className="election-document-actions">
          <IndustrialButton variant="secondary" onClick={() => void generate('ballot_representative')}>Stimmzettel Vertrauensperson</IndustrialButton>
          <IndustrialButton variant="secondary" onClick={() => void generate('ballot_deputy')}>Stimmzettel Stellvertretung</IndustrialButton>
        </FormActions>
      </FormSection>

      <FormSection title="Wahltag-Checkpunkte" actions={<IndustrialButton onClick={() => void run(() => window.gremiaSbv.elections.recordElectionDayChecklist(electionId, { secretMarkingConfirmed: secret, ballotBoxSecured: urn, electionBodyStaffingConfirmed: staffing, helperRuleAvailable: helper, publicCountPrepared: countPrepared, recordedAt: today() }), 'Wahltag-Checkpunkte dokumentiert.')}>Checkpunkte dokumentieren</IndustrialButton>}>
        <div className="industrial-form-grid industrial-form-grid-2 election-checklist-grid">
          <CheckboxField label="Unbeobachtete Kennzeichnung gewährleistet" checked={secret} onCheckedChange={setSecret} />
          <CheckboxField label="Wahlurne gesichert" checked={urn} onCheckedChange={setUrn} />
          <CheckboxField label="Erforderliche Besetzung des Wahlorgans gewährleistet" checked={staffing} onCheckedChange={setStaffing} />
          <CheckboxField label="Hilfspersonregel verfügbar" checked={helper} onCheckedChange={setHelper} />
          <CheckboxField label="Öffentliche Auszählung vorbereitet" checked={countPrepared} onCheckedChange={setCountPrepared} />
        </div>
        <p className="industrial-meta">Unvollständige Checkpunkte blockieren den realen Wahltag nicht; sie machen nur den dokumentierten Arbeitsstand sichtbar.</p>
      </FormSection>
    </div>
  );
}

export function MailBallotSection({ overview, execution, run }: SectionProps) {
  const [voterId, setVoterId] = useState('');
  const [sentAt, setSentAt] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [late, setLate] = useState(false);
  const [declarationValid, setDeclarationValid] = useState(true);
  const [packageOpen, setPackageOpen] = useState(false);
  const eligibleVoters = overview.voters.filter((voter) => voter.listStatus === 'eligible');

  return (
    <div className="election-section-stack">
      <FormSection
        title="Briefwahltracking"
        actions={<IndustrialButton disabled={!voterId} onClick={() => void run(() => window.gremiaSbv.elections.saveMailBallot(overview.election.id, { voterId, requestedAt: today(), sentAt: sentAt || undefined, receivedAt: late ? undefined : receivedAt || undefined, lateReceivedAt: late ? receivedAt || today() : undefined, declarationValid, announcementDate: late ? today() : undefined, transferredToUrnAt: !late && receivedAt ? today() : undefined }), 'Briefwahlstatus gespeichert.')}>Briefwahlstatus speichern</IndustrialButton>}
      >
        <div className="industrial-form-grid industrial-form-grid-3 election-form-grid">
          <SelectInput label="Person der Wählerliste" value={voterId} options={[{ value: '', label: '—' }, ...eligibleVoters.map((voter) => ({ value: voter.id, label: `${voter.lastName}, ${voter.firstName}` }))]} onValueChange={setVoterId} />
          <DateInput label="Versandt am" value={sentAt} onValueChange={setSentAt} />
          <DateInput label="Eingang am" value={receivedAt} onValueChange={setReceivedAt} />
          <CheckboxField label="Erklärung gültig" checked={declarationValid} onCheckedChange={setDeclarationValid} />
          <CheckboxField label="Eingang nach Ende der Stimmabgabe" checked={late} onCheckedChange={setLate} />
        </div>
        {execution.mailBallots.length ? <ul className="election-record-list">{execution.mailBallots.map((mailBallot) => <li key={mailBallot.id}>{overview.voters.find((voter) => voter.id === mailBallot.voterId)?.lastName ?? mailBallot.voterId}{' · '}{mailBallot.lateReceivedAt ? 'verspätet' : 'im Verfahren'}{mailBallot.destroyDueAt ? ` · Vernichtung ab ${mailBallot.destroyDueAt}` : ''}</li>)}</ul> : <p className="industrial-empty-state">Noch kein Briefwahlvorgang dokumentiert.</p>}
        <FormActions><IndustrialButton variant="secondary" disabled={!eligibleVoters.length} onClick={() => setPackageOpen(true)}>Briefwahlpaket mit Merkblatt erzeugen</IndustrialButton></FormActions>
        <p className="industrial-meta">Erfasst wird der Verfahrensstatus, niemals der Inhalt des Stimmzettels.</p>
      </FormSection>
      {packageOpen ? <MailBallotPackageDialog
        overview={overview}
        initialVoterId={voterId}
        onClose={() => setPackageOpen(false)}
        onGenerate={async (mailBallotPackage) => Boolean(await run(
          () => window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'mail_ballot_package', mailBallotPackage }),
          electionDocumentFeedback,
        ))}
      /> : null}
    </div>
  );
}

export function CountResultSection({ overview, execution, run }: SectionProps) {
  const [officeType, setOfficeType] = useState<'representative' | 'deputy'>('representative');
  const [validBallots, setValidBallots] = useState(0);
  const [invalidBallots, setInvalidBallots] = useState(0);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [correctionReason, setCorrectionReason] = useState('');
  const candidates = useMemo(() => overview.candidates.filter((candidate) => candidate.officeType === officeType), [overview.candidates, officeType]);
  const officeResults = execution.results.filter((result) => result.officeType === officeType);

  return (
    <div className="election-section-stack">
      <FormSection
        title="Öffentliche Auszählung"
        actions={<IndustrialButton disabled={!candidates.length} onClick={() => void run(() => window.gremiaSbv.elections.recordTotals(overview.election.id, { officeType, validBallots, invalidBallots, publicCountConfirmed: true, candidateVotes: candidates.map((candidate) => ({ candidateId: candidate.id, votes: votes[candidate.id] ?? 0 })), correctionReason: correctionReason || undefined }), 'Auszählung gespeichert.')}>Auszählung speichern</IndustrialButton>}
      >
        <div className="industrial-form-grid industrial-form-grid-3 election-count-grid">
          <SelectInput label="Wahlgang" value={officeType} options={[{ value: 'representative', label: 'Vertrauensperson' }, { value: 'deputy', label: 'Stellvertretung' }]} onValueChange={(value) => setOfficeType(value as typeof officeType)} />
          <TextInput label="Gültige Stimmzettel" type="number" min="0" value={String(validBallots)} onValueChange={(value) => setValidBallots(Number(value))} />
          <TextInput label="Ungültige Stimmzettel" type="number" min="0" value={String(invalidBallots)} onValueChange={(value) => setInvalidBallots(Number(value))} />
          {candidates.map((candidate) => <TextInput key={candidate.id} label={candidate.personSnapshot} type="number" min="0" value={String(votes[candidate.id] ?? 0)} onValueChange={(value) => setVotes((current) => ({ ...current, [candidate.id]: Number(value) }))} />)}
        </div>
        <TextareaInput label="Begründung einer manuellen Plausibilitätskorrektur (nur falls erforderlich)" value={correctionReason} onValueChange={setCorrectionReason} wide />
        {officeResults.length ? <ul className="election-record-list">{officeResults.map((result) => <li key={result.id}><span>{overview.candidates.find((candidate) => candidate.id === result.candidateId)?.personSnapshot}{' · '}Rang {result.electedRank ?? '—'}{' · '}{result.lotRequired ? 'Losentscheid erforderlich' : acceptanceStatusLabels[result.acceptanceStatus]}</span>{result.lotRequired ? <IndustrialButton compact variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.recordLotDecision(overview.election.id, { officeType, candidateId: result.candidateId, decidedAt: today() }), 'Losentscheid des Wahlorgans dokumentiert.')}>als Gewinner des realen Losentscheids dokumentieren</IndustrialButton> : null}</li>)}</ul> : <p className="industrial-empty-state">Für diesen Wahlgang liegt noch kein Ergebnis vor.</p>}
        <FormActions><IndustrialButton variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'result_minutes' }), electionDocumentFeedback)}>Ergebnisniederschrift erzeugen</IndustrialButton></FormActions>
      </FormSection>
    </div>
  );
}

export function AcceptanceSection({ overview, execution, run }: SectionProps) {
  const elected = execution.results.filter((result) => result.electedRank !== undefined && result.acceptanceStatus !== 'replaced');

  return (
    <div className="election-section-stack">
      <FormSection title="Benachrichtigung und Annahme">
        {elected.length ? <ul className="election-record-list election-acceptance-list">{elected.map((result) => <li key={result.id}><span>{overview.candidates.find((candidate) => candidate.id === result.candidateId)?.personSnapshot}{' · '}{acceptanceStatusLabels[result.acceptanceStatus]}</span><div className="industrial-action-row"><IndustrialButton compact variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'elected_notification', resultId: result.id }), electionDocumentFeedback)}>Benachrichtigung PDF</IndustrialButton>{result.acceptanceStatus === 'pending' ? <><IndustrialButton compact variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.recordAcceptance(overview.election.id, { resultId: result.id, notifiedAt: today(), status: 'accepted_explicit', responseAt: today() }), 'Annahme dokumentiert.')}>Annahme</IndustrialButton><IndustrialButton compact variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.recordAcceptance(overview.election.id, { resultId: result.id, notifiedAt: today(), status: 'rejected', responseAt: today() }), 'Ablehnung dokumentiert; Nachrücken geprüft.')}>Ablehnung</IndustrialButton></> : null}</div></li>)}</ul> : <p className="industrial-empty-state">Noch keine gewählte Person zur Annahme dokumentiert.</p>}
      </FormSection>
    </div>
  );
}
