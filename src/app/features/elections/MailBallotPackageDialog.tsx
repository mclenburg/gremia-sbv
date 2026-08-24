import { useMemo, useState, type FormEvent } from 'react';
import type { GenerateElectionExecutionDocumentInput } from '../../../domain/models/election-execution.model';
import type { ElectionPreparationOverview } from '../../../domain/models/election-workflow.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { DateTimeInput, SearchableSelectInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';

type MailBallotPackageInput = NonNullable<GenerateElectionExecutionDocumentInput['mailBallotPackage']>;

export function MailBallotPackageDialog({
  overview,
  initialVoterId,
  onClose,
  onGenerate,
}: {
  overview: ElectionPreparationOverview;
  initialVoterId: string;
  onClose: () => void;
  onGenerate: (input: MailBallotPackageInput) => Promise<boolean>;
}) {
  const eligibleVoters = useMemo(
    () => overview.voters.filter((voter) => voter.listStatus === 'eligible'),
    [overview.voters],
  );
  const [voterId, setVoterId] = useState(initialVoterId);
  const [voterPostalAddress, setVoterPostalAddress] = useState('');
  const [electionBoardPostalAddress, setElectionBoardPostalAddress] = useState('');
  const [votingEndsAt, setVotingEndsAt] = useState('');
  const [generating, setGenerating] = useState(false);
  const voterOptions = eligibleVoters.map((voter) => ({
    value: voter.id,
    label: `${voter.lastName}, ${voter.firstName}`,
  }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerating(true);
    try {
      const generated = await onGenerate({
        voterId,
        voterPostalAddress: voterPostalAddress.trim(),
        electionBoardPostalAddress: electionBoardPostalAddress.trim(),
        votingEndsAt,
      });
      if (generated) onClose();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <IndustrialModal
      title="Briefwahlpaket mit Merkblatt erzeugen"
      kicker="Schriftliche Stimmabgabe"
      description="Gremia.SBV erstellt Stimmzettel, persönliche Erklärung, Umschlagbeschriftungen und ein Merkblatt als zusammenhängendes PDF. Das aktuelle Wahlausschreiben und die passenden Papierumschläge müssen dem Paket zusätzlich beigefügt werden."
      onClose={generating ? undefined : onClose}
      closeOnEscape={!generating}
      wide
      actions={<>
        <ToolbarButton onClick={onClose} disabled={generating}>Abbrechen</ToolbarButton>
        <IndustrialButton type="submit" form="mail-ballot-package-form" loading={generating} disabled={!eligibleVoters.length}>
          Briefwahlpaket erzeugen
        </IndustrialButton>
      </>}
    >
      <form id="mail-ballot-package-form" className="industrial-modal-form" onSubmit={(event) => void submit(event)}>
        <div className="industrial-message" role="note">
          <strong>Vor dem Aushändigen prüfen</strong>
          <p>Das gültige Wahlausschreiben, ein Wahlumschlag und ein ausreichend frankierter größerer Rückumschlag gehören ebenfalls in das reale Briefwahlpaket.</p>
        </div>
        <div className="industrial-form-grid industrial-form-grid-2">
          <SearchableSelectInput
            label="Wahlberechtigte Person"
            value={voterId}
            options={voterOptions}
            onValueChange={setVoterId}
            required
            wide
          />
          <DateTimeInput
            label="Ende der Stimmabgabe"
            value={votingEndsAt}
            onValueChange={setVotingEndsAt}
            required
          />
          <TextareaInput
            label="Postanschrift der wahlberechtigten Person"
            value={voterPostalAddress}
            onValueChange={setVoterPostalAddress}
            rows={4}
            required
          />
          <TextareaInput
            label="Postanschrift des Wahlvorstands"
            value={electionBoardPostalAddress}
            onValueChange={setElectionBoardPostalAddress}
            rows={4}
            required
          />
        </div>
      </form>
    </IndustrialModal>
  );
}
