import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverCockpit } from '../../../domain/models/case-handover.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { WorkbenchPage, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';
import { HandoverHistoryPanel } from './HandoverHistoryPanel';
import { HandoverImportPanel } from './HandoverImportPanel';
import { HandoverReturnPanel } from './HandoverReturnPanel';
import { VacationHandoverExportPanel } from './VacationHandoverExportPanel';
import { OfficeHandoverExportPanel } from './OfficeHandoverExportPanel';
import { requireCaseHandoverBridge } from './caseHandoverBridge';

const EMPTY_COCKPIT: CaseHandoverCockpit = {
  activeVacationCount: 0,
  expiredVacationCount: 0,
  returnableCount: 0,
  officeHandoverCount: 0,
  officeInventory: { templateCount: 0, deadlineTemplateCount: 0, electionCount: 0, electionDocumentCount: 0, privacyReviewCount: 0, activityJournalIncluded: false },
  outgoing: [],
  incoming: [],
};

export function CaseHandoverCockpitView({ cases, onRecordsChanged }: { cases: CaseRecord[]; onRecordsChanged: () => Promise<void> }) {
  const announce = useAnnouncer();
  const [cockpit, setCockpit] = useState<CaseHandoverCockpit>(EMPTY_COCKPIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const handover = await requireCaseHandoverBridge();
      setCockpit(await handover.cockpit());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Übergabe-Cockpit konnte nicht geladen werden.';
      setError(message); announce(message, 'assertive');
    } finally { setLoading(false); }
  }, [announce]);

  useEffect(() => { void reload(); }, [reload]);
  const complete = useCallback(async () => { await onRecordsChanged(); await reload(); }, [onRecordsChanged, reload]);

  return <WorkbenchPage title="Übergaben & Vertretung" kicker="SBV-Arbeit" description="Zeitlich begrenzte Vertretungen und dauerhafte Amtswechsel zielgebunden, nachvollziehbar und ohne Doppelerfassung durchführen." actions={<IndustrialButton variant="secondary" onClick={() => void reload()} loading={loading}><RefreshCw className="h-4 w-4" aria-hidden="true" />Aktualisieren</IndustrialButton>}>
    <WorkbenchSummary ariaLabel="Status der Übergaben" items={[
      { label: 'Aktive Vertretungen', value: cockpit.activeVacationCount },
      { label: 'Rückgabe möglich', value: cockpit.returnableCount, tone: cockpit.returnableCount ? 'warning' : 'default' },
      { label: 'Abgelaufen', value: cockpit.expiredVacationCount, tone: cockpit.expiredVacationCount ? 'danger' : 'default' },
      { label: 'Amtsübergaben', value: cockpit.officeHandoverCount },
    ]} />
    {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
    <div className="industrial-grid-two">
      <VacationHandoverExportPanel cases={cases} onCompleted={complete} />
      <OfficeHandoverExportPanel cases={cases} inventory={cockpit.officeInventory} onCompleted={complete} />
    </div>
    <HandoverImportPanel onCompleted={complete} />
    <HandoverReturnPanel items={cockpit.incoming} cases={cases} onCompleted={complete} />
    <HandoverHistoryPanel outgoing={cockpit.outgoing} incoming={cockpit.incoming} />
  </WorkbenchPage>;
}
