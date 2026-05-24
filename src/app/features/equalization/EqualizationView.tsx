import { useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { ToolbarButton, IndustrialButton } from '../../shared/components/IndustrialButton';
import { EmptyState } from '../../shared/components/WorkbenchLayout';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import type { CaseRecord } from '../../core/models/case.model';
import type { EqualizationProcessRecord, EqualizationStatus } from '../../core/models/equalization.model';
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

export function EqualizationView({ cases, onOpenCaseNode }: { cases: CaseRecord[]; onOpenCaseNode: (target: CaseNodeTarget) => void }) {
  const [processes, setProcesses] = useState<EqualizationProcessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
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
        groups={groups}
        feedbackItems={[loading ? { id: 'equalization-loading', message: 'Gleichstellungsverfahren werden geladen …' } : null, error ? { id: 'equalization-error', tone: 'warning', message: error } : null]}
        emptyText="Keine Verfahren in diesem Status."
        helpAction={(
          <ToolbarButton onClick={() => setShowHelp(true)} aria-label="Hilfe zur Gleichstellungsübersicht öffnen">
            <HelpCircle className="h-4 w-4" />
            Hilfe
          </ToolbarButton>
        )}
        renderItem={(card) => (
          <ProcessOverviewCard
            key={card.id}
            item={card}
            onOpen={(selected) => onOpenCaseNode({ caseId: selected.caseId, nodeType: 'equalization', nodeId: selected.id })}
          />
        )}
      >
        {!loading && !error && groups.length === 0 && (
          <EmptyState
            title="Keine Verfahren"
            text="Noch keine Gleichstellungs- oder GdB-Verfahren vorhanden. Lege das Verfahren in der Fallakte über die Fußleiste an."
          />
        )}
      </ProcessOverviewPage>

      {showHelp && (
        <IndustrialModal
          title="Gleichstellung / GdB"
          kicker="Hilfe"
          description="Diese Übersicht zeigt Beratungs-, Antrags-, Bescheid- und Widerspruchsstände. Mit einem Klick öffnet sich die Fallakte direkt am Verfahren."
          onClose={() => setShowHelp(false)}
          actions={<IndustrialButton onClick={() => setShowHelp(false)}>Verstanden</IndustrialButton>}
        >
          <p>Wichtig sind Antragseinreichung, Geschäftszeichen, Bescheidzugang und Widerspruchsfrist.</p>
        </IndustrialModal>
      )}
    </>
  );
}
