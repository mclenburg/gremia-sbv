import { useEffect, useMemo, useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { TerminationHearingRecord, TerminationHearingStatus } from '../../../domain/models/termination.model';
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
import { isDoneTerminationStatus, protectionStatusLabel, terminationStatusLabel, terminationStatusOrder, terminationTypeLabel } from './terminationShared';

function toCard(process: TerminationHearingRecord, cases: CaseRecord[]): ProcessOverviewCardModel<TerminationHearingStatus> {
  const caseRecord = cases.find((item) => item.id === process.caseId);
  return {
    id: process.id,
    caseId: process.caseId,
    caseNumber: caseRecord?.caseNumber ?? 'unbekannte Akte',
    displayName: caseRecord?.displayName ?? 'Unbekannter Fall',
    summary: process.employerReason || caseRecord?.summary || 'Kündigungsanhörung ohne Kurzbeschreibung.',
    status: process.status,
    statusLabel: terminationStatusLabel(process.status),
    riskLabel: `${terminationTypeLabel(process.terminationType)} · ${protectionStatusLabel(process.protectionStatus)}`,
    dueLabel: formatDateShort(process.sbvStatementDueAt),
    updatedLabel: formatDateShort(process.updatedAt),
    isOverdue: process.status !== 'stellungnahme_abgegeben' && process.status !== 'abgeschlossen' && isIsoBeforeNow(process.sbvStatementDueAt)
  };
}

export function TerminationView({ cases, onOpenCaseNode }: { cases: CaseRecord[]; onOpenCaseNode: (target: CaseNodeTarget) => void }) {
  const [processes, setProcesses] = useState<TerminationHearingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const announce = useAnnouncer();

  useEffect(() => {
    let active = true;
    async function loadProcesses() {
      setLoading(true);
      setError('');
      try {
        const bridge = await waitForBridge();
        if (!bridge?.termination) throw new Error('Kündigungsdienst ist nicht erreichbar.');
        const rows = await bridge.termination.list();
        if (active) setProcesses(rows);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Kündigungsanhörungen konnten nicht geladen werden.');
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
    if (!loading && !error) announce(`${processes.length} Kündigungsanhörungen geladen.`, 'polite');
  }, [loading, error, processes.length, announce]);

  const cards = useMemo(() => processes.map((process) => toCard(process, cases)), [processes, cases]);
  const groups = useMemo(() => groupProcessOverviewRecords(
    cards,
    terminationStatusOrder,
    (card) => card.status,
    terminationStatusLabel,
    isDoneTerminationStatus,
    { keepNextEmptyActiveGroup: true }
  ), [cards]);

  const openCount = cards.filter((card) => !isDoneTerminationStatus(card.status)).length;
  const overdueCount = cards.filter((card) => card.isOverdue).length;

  return (
    <>
      <ProcessOverviewPage
        title="Kündigungsanhörung"
        kicker="SBV-Fristen und Schutzprüfung"
        description="Aktive Anhörungen zuerst. Fristen, Integrationsamt und SBV-Stellungnahme stehen im Mittelpunkt."
        helpId="termination.overview"
        stats={[
          { label: 'offen', value: openCount },
          { label: 'überfällig', value: overdueCount },
          { label: 'gesamt', value: cards.length }
        ]}
        groups={groups}
        feedbackItems={[loading ? { id: 'termination-loading', message: 'Kündigungsanhörungen werden geladen …' } : null, error ? { id: 'termination-error', tone: 'warning', message: error } : null]}
        emptyText="Keine Kündigungsanhörung in diesem Status."
        renderItem={(card) => (
          <ProcessOverviewCard
            key={card.id}
            item={card}
            onOpen={(selected) => onOpenCaseNode({ caseId: selected.caseId, nodeType: 'termination_hearing', nodeId: selected.id })}
          />
        )}
      />
    </>
  );
}
