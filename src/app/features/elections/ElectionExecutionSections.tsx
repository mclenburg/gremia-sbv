import { useMemo, useState } from 'react';
import type { ElectionExecutionOverview } from '../../core/models/election-execution.model';
import type { ElectionPreparationOverview } from '../../core/models/election-workflow.model';
import type { ElectionRunner } from './ElectionPreparationSections';

const today = () => new Date().toISOString().slice(0, 10);

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

  const generate = (kind: 'ballot_representative' | 'ballot_deputy' | 'election_day_checklist') =>
    run(async () => {
      const document = await window.gremiaSbv.elections.generateExecutionDocument(electionId, { kind });
      return window.gremiaSbv.elections.exportDocument(document.id, document.filename);
    }, 'Wahldokument verschlüsselt gespeichert; Dateiexport angeboten.');

  return (
    <div className="industrial-settings-form mt-4">
      <fieldset>
        <legend>Stimmzettel</legend>
        <p className="industrial-meta">
          Vertrauensperson und Stellvertretung sind getrennte Wahlgänge. Gremia.SBV speichert keine Individualstimme.
        </p>
        <div className="industrial-button-row">
          <button type="button" className="industrial-secondary-button" onClick={() => void generate('ballot_representative')}>
            Stimmzettel Vertrauensperson
          </button>
          <button type="button" className="industrial-secondary-button" onClick={() => void generate('ballot_deputy')}>
            Stimmzettel Stellvertretung
          </button>
          <button type="button" className="industrial-secondary-button" onClick={() => void generate('election_day_checklist')}>
            Checkliste als PDF
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Wahltag-Checkpunkte</legend>
        <label><input type="checkbox" checked={secret} onChange={(event) => setSecret(event.target.checked)} /> Unbeobachtete Kennzeichnung gewährleistet</label>
        <label><input type="checkbox" checked={urn} onChange={(event) => setUrn(event.target.checked)} /> Wahlurne gesichert</label>
        <label><input type="checkbox" checked={staffing} onChange={(event) => setStaffing(event.target.checked)} /> Erforderliche Besetzung des Wahlorgans gewährleistet</label>
        <label><input type="checkbox" checked={helper} onChange={(event) => setHelper(event.target.checked)} /> Hilfspersonregel verfügbar</label>
        <label><input type="checkbox" checked={countPrepared} onChange={(event) => setCountPrepared(event.target.checked)} /> Öffentliche Auszählung vorbereitet</label>
        <button
          type="button"
          className="industrial-button"
          onClick={() => void run(
            () => window.gremiaSbv.elections.recordElectionDayChecklist(electionId, {
              secretMarkingConfirmed: secret,
              ballotBoxSecured: urn,
              electionBodyStaffingConfirmed: staffing,
              helperRuleAvailable: helper,
              publicCountPrepared: countPrepared,
              recordedAt: today(),
            }),
            'Wahltag-Checkpunkte dokumentiert.',
          )}
        >
          Checkpunkte dokumentieren
        </button>
        <p className="industrial-meta">Unvollständige Checkpunkte blockieren den realen Wahltag nicht; sie machen nur den dokumentierten Arbeitsstand sichtbar.</p>
      </fieldset>
    </div>
  );
}

export function MailBallotSection({ overview, execution, run }: SectionProps) {
  const [voterId, setVoterId] = useState('');
  const [sentAt, setSentAt] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [late, setLate] = useState(false);
  const [declarationValid, setDeclarationValid] = useState(true);
  const eligibleVoters = overview.voters.filter((voter) => voter.listStatus === 'eligible');

  return (
    <div className="industrial-settings-form mt-4">
      <fieldset>
        <legend>Briefwahltracking</legend>
        <label>
          <span>Person der Wählerliste</span>
          <select className="industrial-select" value={voterId} onChange={(event) => setVoterId(event.target.value)}>
            <option value="">—</option>
            {eligibleVoters.map((voter) => (
              <option key={voter.id} value={voter.id}>{voter.lastName}, {voter.firstName}</option>
            ))}
          </select>
        </label>
        <label><span>Versandt am</span><input type="date" value={sentAt} onChange={(event) => setSentAt(event.target.value)} /></label>
        <label><span>Eingang am</span><input type="date" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} /></label>
        <label><input type="checkbox" checked={declarationValid} onChange={(event) => setDeclarationValid(event.target.checked)} /> Erklärung gültig</label>
        <label><input type="checkbox" checked={late} onChange={(event) => setLate(event.target.checked)} /> Eingang nach Ende der Stimmabgabe</label>
        <button
          type="button"
          className="industrial-button"
          disabled={!voterId}
          onClick={() => void run(
            () => window.gremiaSbv.elections.saveMailBallot(overview.election.id, {
              voterId,
              requestedAt: today(),
              sentAt: sentAt || undefined,
              receivedAt: late ? undefined : receivedAt || undefined,
              lateReceivedAt: late ? receivedAt || today() : undefined,
              declarationValid,
              announcementDate: late ? today() : undefined,
              transferredToUrnAt: !late && receivedAt ? today() : undefined,
            }),
            'Briefwahlstatus gespeichert.',
          )}
        >
          Briefwahlstatus speichern
        </button>
        <ul>
          {execution.mailBallots.map((mailBallot) => (
            <li key={mailBallot.id}>
              {overview.voters.find((voter) => voter.id === mailBallot.voterId)?.lastName ?? mailBallot.voterId}
              {' · '}{mailBallot.lateReceivedAt ? 'verspätet' : 'im Verfahren'}
              {mailBallot.destroyDueAt ? ` · Vernichtung ab ${mailBallot.destroyDueAt}` : ''}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="industrial-secondary-button"
          onClick={() => void run(
            async () => { const document = await window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'mail_ballot_package' }); return window.gremiaSbv.elections.exportDocument(document.id, document.filename); },
            'Briefwahlpaket verschlüsselt gespeichert; Dateiexport angeboten.',
          )}
        >
          Briefwahlpaket/Merkblatt erzeugen
        </button>
        <p className="industrial-meta">Erfasst wird der Verfahrensstatus, niemals der Inhalt des Stimmzettels.</p>
      </fieldset>
    </div>
  );
}

export function CountResultSection({ overview, execution, run }: SectionProps) {
  const [officeType, setOfficeType] = useState<'representative' | 'deputy'>('representative');
  const [validBallots, setValidBallots] = useState(0);
  const [invalidBallots, setInvalidBallots] = useState(0);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [correctionReason, setCorrectionReason] = useState('');
  const candidates = useMemo(
    () => overview.candidates.filter((candidate) => candidate.officeType === officeType),
    [overview.candidates, officeType],
  );
  const officeResults = execution.results.filter((result) => result.officeType === officeType);

  return (
    <div className="industrial-settings-form mt-4">
      <fieldset>
        <legend>Öffentliche Auszählung</legend>
        <label>
          <span>Wahlgang</span>
          <select className="industrial-select" value={officeType} onChange={(event) => setOfficeType(event.target.value as typeof officeType)}>
            <option value="representative">Vertrauensperson</option>
            <option value="deputy">Stellvertretung</option>
          </select>
        </label>
        <label><span>Gültige Stimmzettel</span><input type="number" min="0" value={validBallots} onChange={(event) => setValidBallots(Number(event.target.value))} /></label>
        <label><span>Ungültige Stimmzettel</span><input type="number" min="0" value={invalidBallots} onChange={(event) => setInvalidBallots(Number(event.target.value))} /></label>
        {candidates.map((candidate) => (
          <label key={candidate.id}>
            <span>{candidate.personSnapshot}</span>
            <input
              type="number"
              min="0"
              value={votes[candidate.id] ?? 0}
              onChange={(event) => setVotes((current) => ({ ...current, [candidate.id]: Number(event.target.value) }))}
            />
          </label>
        ))}
        <label>
          <span>Begründung einer manuellen Plausibilitätskorrektur (nur falls erforderlich)</span>
          <textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} />
        </label>
        <button
          type="button"
          className="industrial-button"
          disabled={!candidates.length}
          onClick={() => void run(
            () => window.gremiaSbv.elections.recordTotals(overview.election.id, {
              officeType,
              validBallots,
              invalidBallots,
              publicCountConfirmed: true,
              candidateVotes: candidates.map((candidate) => ({ candidateId: candidate.id, votes: votes[candidate.id] ?? 0 })),
              correctionReason: correctionReason || undefined,
            }),
            'Auszählung gespeichert.',
          )}
        >
          Auszählung speichern
        </button>
        <ul>
          {officeResults.map((result) => (
            <li key={result.id}>
              {overview.candidates.find((candidate) => candidate.id === result.candidateId)?.personSnapshot}
              {' · '}Rang {result.electedRank ?? '—'}{' · '}
              {result.lotRequired ? 'Losentscheid erforderlich' : result.acceptanceStatus}
              {result.lotRequired && (
                <button
                  type="button"
                  className="industrial-inline-button"
                  onClick={() => void run(
                    () => window.gremiaSbv.elections.recordLotDecision(overview.election.id, {
                      officeType,
                      candidateId: result.candidateId,
                      decidedAt: today(),
                    }),
                    'Losentscheid des Wahlorgans dokumentiert.',
                  )}
                >
                  als Gewinner des realen Losentscheids dokumentieren
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="industrial-secondary-button"
          onClick={() => void run(
            async () => { const document = await window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'result_minutes' }); return window.gremiaSbv.elections.exportDocument(document.id, document.filename); },
            'Ergebnisniederschrift verschlüsselt gespeichert; Dateiexport angeboten.',
          )}
        >
          Ergebnisniederschrift erzeugen
        </button>
      </fieldset>
    </div>
  );
}

export function AcceptanceSection({ overview, execution, run }: SectionProps) {
  const elected = execution.results.filter(
    (result) => result.electedRank !== undefined && result.acceptanceStatus !== 'replaced',
  );
  return (
    <div className="industrial-settings-form mt-4">
      <fieldset>
        <legend>Benachrichtigung und Annahme</legend>
        <ul>
          {elected.map((result) => (
            <li key={result.id}>
              {overview.candidates.find((candidate) => candidate.id === result.candidateId)?.personSnapshot}
              {' · '}{result.acceptanceStatus}
              <div className="industrial-button-row">
                <button
                  type="button"
                  className="industrial-inline-button"
                  onClick={() => void run(
                    async () => { const document = await window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'elected_notification', resultId: result.id }); return window.gremiaSbv.elections.exportDocument(document.id, document.filename); },
                    'Benachrichtigung verschlüsselt gespeichert; Dateiexport angeboten.',
                  )}
                >
                  Benachrichtigung PDF
                </button>
                {result.acceptanceStatus === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="industrial-inline-button"
                      onClick={() => void run(
                        () => window.gremiaSbv.elections.recordAcceptance(overview.election.id, {
                          resultId: result.id,
                          notifiedAt: today(),
                          status: 'accepted_explicit',
                          responseAt: today(),
                        }),
                        'Annahme dokumentiert.',
                      )}
                    >
                      Annahme
                    </button>
                    <button
                      type="button"
                      className="industrial-inline-button"
                      onClick={() => void run(
                        () => window.gremiaSbv.elections.recordAcceptance(overview.election.id, {
                          resultId: result.id,
                          notifiedAt: today(),
                          status: 'rejected',
                          responseAt: today(),
                        }),
                        'Ablehnung dokumentiert; Nachrücken geprüft.',
                      )}
                    >
                      Ablehnung
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}
