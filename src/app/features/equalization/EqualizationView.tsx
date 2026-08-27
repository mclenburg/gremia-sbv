import { useEffect, useMemo, useState } from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import { ToolbarButton, IndustrialButton } from '../../shared/components/IndustrialButton';
import { EmptyState } from '../../shared/components/WorkbenchLayout';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { EqualizationProcessRecord, EqualizationStatus } from '../../../domain/models/equalization.model';
import type { CreateEqualizationIntakeInput, EqualizationIntakeResult } from '../../../domain/models/equalization.model';
import type { ProtectedPersonRecord } from '../../../domain/models/protected-person.model';
import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { formatDateShort } from '../../shared/format/dates';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import {
  ProcessOverviewCard,
  ProcessOverviewPage,
  groupProcessOverviewRecords,
  isIsoBeforeNow,
  type ProcessOverviewCardModel
} from '../../shared/process/ProcessOverview';
import { equalizationStatusLabel, equalizationStatusOrder, isDoneEqualizationStatus } from './equalizationShared';
import { EqualizationIntakeDialog } from './EqualizationIntakeDialog';

function toCard(process: EqualizationProcessRecord, cases: CaseRecord[]): ProcessOverviewCardModel<EqualizationStatus> {
  const caseRecord = cases.find((item) => item.id === process.caseId);
  return {
    id: process.id,
    caseId: process.caseId,
    caseNumber: caseRecord?.caseNumber ?? 'unbekannte Akte',
    displayName: caseRecord?.displayName ?? 'Unbekannter Fall',
    summary: caseRecord?.summary || 'Gleichstellung / GdB-Verfahren ohne Kurzbeschreibung.',
    status: process.applicationStatus,
    statusLabel: equalizationStatusLabel(process.applicationStatus),
    riskLabel: process.agencyReference ? `Az.: ${process.agencyReference}` : undefined,
    dueLabel: formatDateShort(process.objectionDueAt),
    updatedLabel: formatDateShort(process.updatedAt),
    isOverdue: process.applicationStatus === 'abgelehnt' && isIsoBeforeNow(process.objectionDueAt)
  };
}

function EqualizationHelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <IndustrialModal
      title="Gleichstellung / GdB"
      kicker="Hilfe"
      description="Diese Übersicht zeigt Beratungs-, Antrags-, Bescheid- und Widerspruchsstände. Mit einem Klick öffnet sich die Fallakte direkt am Verfahren."
      onClose={onClose}
      actions={<IndustrialButton onClick={onClose}>Verstanden</IndustrialButton>}
    >
      <p>Wichtig sind Antragseinreichung, Geschäftszeichen, Bescheidzugang und Widerspruchsfrist.</p>
    </IndustrialModal>
  );
}

function EqualizationEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="Noch kein Gleichstellungs-/GdB-Vorgang"
      text="Die Erstanlage erzeugt sichtbar zusammengehörig Person, Fallakte und Verfahren. Aufbewahrung und Löschprüfung folgen dem Vorgang und der verknüpften Fallakte; gelöscht wird weiterhin nur manuell."
      action={(
        <IndustrialButton onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Vorgang anlegen
        </IndustrialButton>
      )}
    />
  );
}

export function EqualizationView({ cases, persons, onOpenCaseNode, onRecordsChanged }: {
  cases: CaseRecord[];
  persons: ProtectedPersonRecord[];
  onOpenCaseNode: (target: CaseNodeTarget) => void;
  onRecordsChanged: () => Promise<void>;
}) {
  const [processes, setProcesses] = useState<EqualizationProcessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const announce = useAnnouncer();

  useEffect(() => {
    let active = true;
    async function loadProcesses() {
      setLoading(true);
      setError('');
      try {
        const bridge = await waitForBridge();
        if (!bridge?.equalization) throw new Error('Gleichstellungsdienst ist nicht erreichbar.');
        const rows = await bridge.equalization.list();
        if (active) setProcesses(rows);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Gleichstellungsverfahren konnten nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProcesses();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  useEffect(() => {
    if (!loading && !error) announce(`${processes.length} Gleichstellungs- oder GdB-Verfahren geladen.`, 'polite');
  }, [loading, error, processes.length, announce]);

  const cards = useMemo(() => processes.map((process) => toCard(process, cases)), [processes, cases]);
  const groups = useMemo(() => groupProcessOverviewRecords(
    cards,
    equalizationStatusOrder,
    (card) => card.status,
    equalizationStatusLabel,
    isDoneEqualizationStatus,
    { keepNextEmptyActiveGroup: true }
  ), [cards]);

  const openCount = cards.filter((card) => !isDoneEqualizationStatus(card.status)).length;
  const objectionCount = cards.filter((card) => card.status === 'widerspruch' || card.status === 'abgelehnt').length;
  const overdueCount = cards.filter((card) => card.isOverdue).length;

  async function createIntake(input: CreateEqualizationIntakeInput): Promise<EqualizationIntakeResult> {
    const bridge = await waitForBridge();
    if (!bridge?.equalization?.createIntake) throw new Error('Geführte Gleichstellungs-/GdB-Erstanlage ist nicht erreichbar.');
    const result = await bridge.equalization.createIntake(input);
    const rows = await bridge.equalization.list();
    setProcesses(rows);
    await onRecordsChanged();
    announce('Person, Fallakte und Verfahren wurden gemeinsam angelegt.', 'polite');
    onOpenCaseNode({ caseId: result.caseRecord.id, nodeType: 'equalization', nodeId: result.process.id });
    return result;
  }

  return (
    <>
      <ProcessOverviewPage
        title="Gleichstellung / GdB"
        kicker="Antrag, Bescheid, Widerspruch"
        description="Übersicht über Gleichstellungs- und GdB-bezogene Verfahren. Die Bearbeitung erfolgt in der Fallakte."
        stats={[
          { label: 'offen', value: openCount },
          { label: 'Widerspruch / Ablehnung', value: objectionCount },
          { label: 'überfällig', value: overdueCount },
          { label: 'gesamt', value: cards.length }
        ]}
        groups={cards.length === 0 ? [] : groups}
        feedbackItems={[loading ? { id: 'equalization-loading', message: 'Gleichstellungsverfahren werden geladen …' } : null, error ? { id: 'equalization-error', tone: 'warning', message: error } : null]}
        emptyText="Keine Verfahren in diesem Status."
        helpAction={(
          <ToolbarButton onClick={() => setShowHelp(true)} aria-label="Hilfe zur Gleichstellungsübersicht öffnen">
            <HelpCircle className="h-4 w-4" />
            Hilfe
          </ToolbarButton>
        )}
        pageActions={(
          <IndustrialButton onClick={() => setShowIntake(true)}>
            <Plus className="h-4 w-4" />
            Vorgang anlegen
          </IndustrialButton>
        )}
        renderItem={(card) => (
          <ProcessOverviewCard
            key={card.id}
            item={card}
            onOpen={(selected) => onOpenCaseNode({ caseId: selected.caseId, nodeType: 'equalization', nodeId: selected.id })}
          />
        )}
      >
        {!loading && !error && cards.length === 0 && (
          <EqualizationEmptyState onCreate={() => setShowIntake(true)} />
        )}
      </ProcessOverviewPage>

      {showHelp && <EqualizationHelpDialog onClose={() => setShowHelp(false)} />}
      {showIntake && (
        <EqualizationIntakeDialog persons={persons} onClose={() => setShowIntake(false)} onCreate={createIntake} />
      )}
    </>
  );
}
