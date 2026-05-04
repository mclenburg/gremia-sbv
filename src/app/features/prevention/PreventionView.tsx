import { useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type { PreventionProcessRecord, PreventionStatus } from '../../core/models/prevention.model';
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
import { PREVENTION_OVERVIEW_STATUS_ORDER, isDonePreventionStatus, statusLabel } from './preventionShared';

function StepTooltip({ text }: { text: string }) {
  return (
    <span className="industrial-help-dot" title={text} aria-label={text}>
      <HelpCircle className="h-3.5 w-3.5" />
    </span>
  );
}

export function PreventionView({
  cases,
  onOpenCaseNode
}: {
  cases: CaseRecord[];
  onOpenCaseNode: (target: CaseNodeTarget) => void;
}) {
  const [processes, setProcesses] = useState<PreventionProcessRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const announce = useAnnouncer();

  async function reload() {
    setLoading(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.prevention) throw new Error('Präventionsdienst ist nicht erreichbar.');
      const rows = await bridge.prevention.list();
      setProcesses(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Präventionsverfahren konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [cases.length]);

  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  useEffect(() => {
    if (!loading && !error) announce(`${processes.length} Präventionsverfahren geladen.`, 'polite');
  }, [loading, error, processes.length, announce]);

  const cards = useMemo<ProcessOverviewCardModel<PreventionStatus>[]>(() => processes.map((process) => {
    const record = cases.find((item) => item.id === process.caseId);
    return {
      id: process.id,
      caseId: process.caseId,
      caseNumber: record?.caseNumber ?? 'Fall nicht auflösbar',
      displayName: record?.displayName ?? 'unbekannte Fallakte',
      summary: process.hazardDescription || record?.summary || 'Keine Kurzbeschreibung hinterlegt.',
      status: process.status,
      statusLabel: statusLabel(process.status),
      riskLabel: process.riskType.replaceAll('_', ' '),
      dueLabel: formatDateShort(process.employerResponseDueAt),
      updatedLabel: formatDateShort(process.updatedAt),
      isOverdue: !isDonePreventionStatus(process.status) && isIsoBeforeNow(process.employerResponseDueAt)
    };
  }), [processes, cases]);

  const groups = useMemo(() => groupProcessOverviewRecords(
    cards,
    PREVENTION_OVERVIEW_STATUS_ORDER,
    (item) => item.status,
    statusLabel,
    isDonePreventionStatus,
    { keepNextEmptyActiveGroup: true }
  ), [cards]);

  const openCount = cards.filter((item) => !isDonePreventionStatus(item.status)).length;
  const doneCount = cards.filter((item) => isDonePreventionStatus(item.status)).length;
  const overdueCount = cards.filter((item) => item.isOverdue).length;
  const highRiskCount = processes.filter((process) => ['kuendigung', 'chronifizierung', 'eskalation'].includes(process.riskType)).length;

  return (
    <>
      {loading && <div className="industrial-message">Präventionsverfahren werden geladen …</div>}
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      <ProcessOverviewPage
        title="Präventionsverfahren"
        kicker="§ 167 Abs. 1 SGB IX"
        description="Übersicht über fallbezogene Präventionsverfahren. Die Bearbeitung erfolgt ausschließlich in der Fallakte."
        stats={[
          { label: 'offen', value: openCount },
          { label: 'überfällig', value: overdueCount },
          { label: 'hohes Risiko', value: highRiskCount },
          { label: 'erledigt', value: doneCount }
        ]}
        groups={groups}
        emptyText="Keine Verfahren in diesem Status."
        helpAction={<StepTooltip text="Klick auf eine Karte öffnet die Fallakte direkt am Präventionsverfahren." />}
        renderItem={(item) => (
          <ProcessOverviewCard
            key={item.id}
            item={item}
            onOpen={(target) => onOpenCaseNode({ caseId: target.caseId, nodeType: 'prevention', nodeId: target.id })}
          />
        )}
      />
    </>
  );
}
