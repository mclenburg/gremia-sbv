import { useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type { TerminationHearingRecord, TerminationHearingStatus } from '../../core/models/termination.model';
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
  const [showHelp, setShowHelp] = useState(false);
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
      {loading && <div className="industrial-message">Kündigungsanhörungen werden geladen …</div>}
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      <ProcessOverviewPage
        title="Kündigungsanhörung"
        kicker="SBV-Fristen und Schutzprüfung"
        description="Aktive Anhörungen zuerst. Fristen, Integrationsamt und SBV-Stellungnahme stehen im Mittelpunkt."
        stats={[
          { label: 'offen', value: openCount },
          { label: 'überfällig', value: overdueCount },
          { label: 'gesamt', value: cards.length }
        ]}
        groups={groups}
        emptyText="Keine Kündigungsanhörung in diesem Status."
        helpAction={(
          <button type="button" className="industrial-secondary-button compact" onClick={() => setShowHelp(true)} aria-label="Hilfe zur Kündigungsanhörung öffnen">
            <HelpCircle className="h-4 w-4" />
            Hilfe
          </button>
        )}
        renderItem={(card) => (
          <ProcessOverviewCard
            key={card.id}
            item={card}
            onOpen={(selected) => onOpenCaseNode({ caseId: selected.caseId, nodeType: 'termination_hearing', nodeId: selected.id })}
          />
        )}
      />

      {showHelp && (
        <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
          <section className="industrial-modal">
            <h2>Kündigungsanhörung</h2>
            <p>Das Modul führt durch Eingang, Unterlagenprüfung, SBV-Anhörung, Integrationsamt und Stellungnahme.</p>
            <p>Besonders kritisch sind Eingangsdatum, Frist, Schutzstatus und die Frage, ob das Integrationsamt beteiligt werden muss.</p>
            <div className="industrial-modal-actions">
              <button type="button" className="industrial-button" onClick={() => setShowHelp(false)}>Verstanden</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
