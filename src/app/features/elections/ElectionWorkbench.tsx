import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import {
  WorkbenchNavigation,
  WorkbenchPage,
  WorkbenchSummary,
  WorkbenchWorkspace,
} from '../../shared/components/WorkbenchLayout';
import { dispatchActivityJournalPrefill } from '../activity-journal/activityJournalEvents';
import type { HelpRegistryId } from '../../shared/help/helpRegistry';
import { IndustrialHelpButton } from '../../shared/help/IndustrialHelp';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { SelectInput } from '../../shared/components/IndustrialForm';
import {
  BodySection,
  DocumentsSection,
  NominationsSection,
  SetupSection,
  VotersSection,
} from './ElectionPreparationSections';
import {
  AcceptanceSection,
  BallotSection,
  CountResultSection,
  MailBallotSection,
} from './ElectionExecutionSections';
import { ArchiveSection } from './ElectionArchiveSection';
import { useElectionWorkbench } from './useElectionWorkbench';
import { electionKindLabels, electionProcedureLabels, electionStatusLabels } from './electionPresentation';

type Section = 'setup' | 'body' | 'voters' | 'nominations' | 'documents' | 'ballots' | 'mail' | 'counting' | 'acceptance' | 'archive';

const TABS: ReadonlyArray<readonly [Section, string, string]> = [
  ['setup', 'Einleitung', 'Wahlgrund, Schwelle und Verfahren'],
  ['body', 'Wahlorgan', 'Wahlvorstand oder Wahlleitung'],
  ['voters', 'Wählerliste', 'Snapshot und Einsprüche'],
  ['nominations', 'Vorschläge', 'Kandidaturen und Wahlvorschläge'],
  ['documents', 'Vorbereitung', 'Vorbereitende Wahlunterlagen'],
  ['ballots', 'Stimmabgabe', 'Stimmzettel und Wahltag'],
  ['mail', 'Briefwahl', 'Versand, Eingang und verspätete Briefe'],
  ['counting', 'Auszählung', 'Aggregierte Stimmen und Losentscheid'],
  ['acceptance', 'Annahme', 'Benachrichtigung und Nachrücken'],
  ['archive', 'Abschluss', 'Bekanntmachung, Wahlakte und Übergabe'],
];

const JOURNAL_ACTIVITY: Record<Section, 'preparation' | 'board_work' | 'voter_list' | 'nominations' | 'voting' | 'counting' | 'result' | 'archive'> = {
  setup: 'preparation',
  body: 'board_work',
  voters: 'voter_list',
  nominations: 'nominations',
  documents: 'preparation',
  ballots: 'voting',
  mail: 'voting',
  counting: 'counting',
  acceptance: 'result',
  archive: 'archive',
};


function ElectionSummary({ state }: { state: ReturnType<typeof useElectionWorkbench> }) {
  const overview = state.overview;
  return <div className="election-summary-block"><WorkbenchSummary ariaLabel="Wahlstatus" items={[
    { label: 'Wahlvorgänge', value: state.elections.length },
    { label: 'Wahlberechtigte Snapshot', value: overview?.election.eligibleCountSnapshot ?? 0 },
    { label: 'Mindestschwelle', value: overview?.election.minimumThresholdMet ? 'erfüllt' : 'offen', tone: overview?.election.minimumThresholdMet ? 'default' : 'warning' },
    { label: 'Verfahren', value: overview?.election.procedure ? electionProcedureLabels[overview.election.procedure] : 'offen' },
    { label: 'Status', value: overview?.election.status ? electionStatusLabels[overview.election.status] : '—' },
  ]} /></div>;
}

function ElectionSelector({ state }: { state: ReturnType<typeof useElectionWorkbench> }) {
  return (
    <div className="industrial-panel election-selector-panel">
      <SelectInput
        label="Wahlvorgang"
        value={state.selectedId}
        options={[
          { value: '', label: '—' },
          ...state.elections.map((election) => ({ value: election.id, label: `${electionKindLabels[election.kind]} · ${election.electionDate ?? election.createdAt.slice(0, 10)}` })),
        ]}
        onValueChange={(value) => void state.select(value)}
      />
    </div>
  );
}

export function ElectionWorkbench() {
  const state = useElectionWorkbench();
  const [section, setSection] = useState<Section>('setup');
  const [createOpen, setCreateOpen] = useState(false);
  const overview = state.overview;
  const execution = state.execution;

  async function journal() {
    if (!overview) return;
    const prefill = await window.gremiaSbv.elections.journalPrefill(
      overview.election.id,
      JOURNAL_ACTIVITY[section],
    );
    dispatchActivityJournalPrefill(prefill, true);
  }

  return (
    <WorkbenchPage
      title="SBV-Wahlen"
      kicker="Wahlakte"
      description="Örtliche SBV-Wahl von der Einleitung bis zur dokumentierten Amtsübergabe."
      actions={<IndustrialButton onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Wahlvorgang anlegen</IndustrialButton>}
    >
      <ModuleFeedback items={[
        state.error ? { id: 'election-error', tone: 'warning' as const, message: state.error } : null,
        state.notice ? { id: 'election-notice', tone: 'success' as const, message: state.notice } : null,
      ]} />
      <ElectionSummary state={state} />
      <ElectionSelector state={state} />
      <WorkbenchWorkspace
        ariaLabel="SBV-Wahl Arbeitsbereiche"
        navigation={(
          <WorkbenchNavigation
            items={TABS.map(([id, title, description]) => ({ id, title, description }))}
            active={section}
            onChange={setSection}
            ariaLabel="SBV-Wahl Arbeitsbereiche"
          />
        )}
      >
        <section className="industrial-panel election-workflow-panel" aria-labelledby={`election-${section}-heading`}>
          <div className="industrial-panel-header compact election-workflow-header">
            <div>
              <p className="industrial-kicker">Wahlworkflow</p>
              <h2 id={`election-${section}-heading`}>{TABS.find((tab) => tab[0] === section)?.[1]}</h2>
            </div>
            <IndustrialHelpButton
              helpId={`elections.${section}` as HelpRegistryId}
              label="Hilfe zum aktuellen Wahlbereich öffnen"
            />
          </div>
          {overview && (
            <div className="election-workflow-actions">
              <IndustrialButton variant="secondary" onClick={() => void journal()}>
                Tätigkeit erfassen
              </IndustrialButton>
            </div>
          )}

          {section === 'setup' && (
            <SetupSection overview={overview} create={state.create} configure={state.configure} run={state.run} createOpen={createOpen} onCloseCreate={() => setCreateOpen(false)} />
          )}
          {overview && section === 'body' && <BodySection overview={overview} run={state.run} />}
          {overview && section === 'voters' && <VotersSection overview={overview} run={state.run} />}
          {overview && section === 'nominations' && <NominationsSection overview={overview} run={state.run} />}
          {overview && section === 'documents' && <DocumentsSection overview={overview} run={state.run} />}
          {overview && execution && section === 'ballots' && <BallotSection overview={overview} run={state.run} />}
          {overview && execution && section === 'mail' && (
            <MailBallotSection overview={overview} execution={execution} run={state.run} />
          )}
          {overview && execution && section === 'counting' && (
            <CountResultSection overview={overview} execution={execution} run={state.run} />
          )}
          {overview && execution && section === 'acceptance' && (
            <AcceptanceSection overview={overview} execution={execution} run={state.run} />
          )}
          {overview && execution && section === 'archive' && (
            <ArchiveSection overview={overview} execution={execution} run={state.run} />
          )}
          {!overview && section !== 'setup' && (
            <p className="industrial-empty-state">Zuerst einen Wahlvorgang anlegen.</p>
          )}
        </section>
      </WorkbenchWorkspace>

    </WorkbenchPage>
  );
}
