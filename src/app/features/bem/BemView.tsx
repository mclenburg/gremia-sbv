import { useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type { BemProcessRecord, BemStatus } from '../../core/models/bem.model';
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
import { BEM_OVERVIEW_STATUS_ORDER, bemStatusLabel, isDoneBemStatus } from './bemShared';

type BemOverviewCardModel = ProcessOverviewCardModel<BemStatus> & {
  responseLabel?: string;
};

function toCard(process: BemProcessRecord, cases: CaseRecord[]): BemOverviewCardModel {
  const caseRecord = cases.find((item) => item.id === process.caseId);
  return {
    id: process.id,
    caseId: process.caseId,
    caseNumber: caseRecord?.caseNumber ?? 'unbekannte Akte',
    displayName: caseRecord?.displayName ?? 'Unbekannter Fall',
    summary: process.triggerDescription || caseRecord?.summary || 'Kein Anlass dokumentiert.',
    status: process.status,
    statusLabel: bemStatusLabel(process.status),
    riskLabel: process.employeeResponse ? `Reaktion: ${process.employeeResponse.replaceAll('_', ' ')}` : undefined,
    dueLabel: formatDateShort(process.responseDueAt),
    updatedLabel: formatDateShort(process.updatedAt),
    isOverdue: process.employeeResponse === 'offen' && isIsoBeforeNow(process.responseDueAt),
    responseLabel: process.employeeResponse?.replaceAll('_', ' ')
  };
}

export function BemView({ cases, onOpenCaseNode }: { cases: CaseRecord[]; onOpenCaseNode: (target: CaseNodeTarget) => void }) {
  const [processes, setProcesses] = useState<BemProcessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const announce = useAnnouncer();

  useEffect(() => {
    let active = true;
    async function loadBem() {
      setLoading(true);
      setError('');
      try {
        const bridge = await waitForBridge();
        if (!bridge?.bem) throw new Error('BEM-Dienst ist nicht erreichbar.');
        const rows = await bridge.bem.list();
        if (active) setProcesses(rows);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'BEM-Übersicht konnte nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadBem();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  useEffect(() => {
    if (!loading && !error) announce(`${processes.length} BEM-Verfahren geladen.`, 'polite');
  }, [loading, error, processes.length, announce]);

  const cards = useMemo(() => processes.map((process) => toCard(process, cases)), [processes, cases]);
  const groups = useMemo(() => groupProcessOverviewRecords(
    cards,
    BEM_OVERVIEW_STATUS_ORDER,
    (card) => card.status,
    bemStatusLabel,
    isDoneBemStatus,
    { keepNextEmptyActiveGroup: true }
  ), [cards]);

  const openCount = cards.filter((card) => !isDoneBemStatus(card.status)).length;
  const overdueCount = cards.filter((card) => card.isOverdue).length;
  const waitingCount = cards.filter((card) => card.status === 'reaktion_abwarten' || card.responseLabel === 'offen').length;

  return (
    <>
      {loading && <div className="industrial-message">BEM-Verfahren werden geladen …</div>}
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      <ProcessOverviewPage
        title="BEM-Verfahren"
        kicker="BEM-Leitstand"
        description="Aktive Verfahren zuerst. Abgeschlossene oder abgebrochene Verfahren bleiben am Ende eingeklappt."
        stats={[
          { label: 'offen', value: openCount },
          { label: 'Reaktion offen', value: waitingCount },
          { label: 'überfällig', value: overdueCount },
          { label: 'gesamt', value: cards.length }
        ]}
        groups={groups}
        emptyText="Keine BEM-Verfahren in diesem Status."
        helpAction={(
          <button type="button" className="industrial-secondary-button compact" onClick={() => setShowHelp(true)} aria-label="Hilfe zur BEM-Übersicht öffnen">
            <HelpCircle className="h-4 w-4" />
            Hilfe
          </button>
        )}
        renderItem={(card) => (
          <ProcessOverviewCard
            key={card.id}
            item={card}
            onOpen={(selected) => onOpenCaseNode({ caseId: selected.caseId, nodeType: 'bem', nodeId: selected.id })}
          />
        )}
      >
        {!loading && !error && groups.length === 0 && <div className="industrial-empty">Noch keine BEM-Verfahren vorhanden. Lege ein BEM-Verfahren in der Fallakte über die Fußleiste an.</div>}
      </ProcessOverviewPage>

      {showHelp && (
        <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
          <section className="industrial-modal">
            <h2>BEM-Übersicht</h2>
            <p>Diese Seite ist eine reine Übersicht. Mit einem Klick auf ein BEM-Verfahren öffnet sich die Fallakte direkt an der passenden Maßnahme.</p>
            <p>Neue BEM-Verfahren werden in der Fallakte über die Fußleiste angelegt, damit der Fallbezug eindeutig bleibt.</p>
            <div className="industrial-modal-actions">
              <button type="button" className="industrial-button" onClick={() => setShowHelp(false)}>Verstanden</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
