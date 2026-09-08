import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverCockpit } from '../../../domain/models/case-handover.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { WorkbenchNavigation, WorkbenchPage, WorkbenchSummary, WorkbenchWorkspace } from '../../shared/components/WorkbenchLayout';
import { HandoverImportTab } from './HandoverImportTab';
import { HandoverOfficeTab } from './HandoverOfficeTab';
import { HandoverOverviewTab } from './HandoverOverviewTab';
import { HandoverProtocolTab } from './HandoverProtocolTab';
import { HandoverReturnTab } from './HandoverReturnTab';
import { HandoverVacationTab } from './HandoverVacationTab';
import { CASE_HANDOVER_TABS, type CaseHandoverTabId } from './caseHandoverTabs';
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
  const [activeTab, setActiveTab] = useState<CaseHandoverTabId>('overview');
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

  return <WorkbenchPage title="Übergaben & Vertretung" kicker="SBV-Arbeit" description="Zeitlich begrenzte Vertretungen und dauerhafte Amtswechsel zielgebunden, nachvollziehbar und ohne Doppelerfassung durchführen." helpId="caseHandover.overview" actions={<IndustrialButton variant="secondary" onClick={() => void reload()} loading={loading}><RefreshCw className="industrial-icon" aria-hidden="true" />Aktualisieren</IndustrialButton>}>
    <WorkbenchSummary ariaLabel="Status der Übergaben" items={[
      { label: 'Aktive Vertretungen', value: cockpit.activeVacationCount },
      { label: 'Rückgabe möglich', value: cockpit.returnableCount, tone: cockpit.returnableCount ? 'warning' : 'default' },
      { label: 'Abgelaufen', value: cockpit.expiredVacationCount, tone: cockpit.expiredVacationCount ? 'danger' : 'default' },
      { label: 'Amtsübergaben', value: cockpit.officeHandoverCount },
    ]} />
    {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
    <WorkbenchWorkspace
      ariaLabel="Übergabe-Arbeitsbereiche"
      ariaLive="polite"
      navigation={
        <WorkbenchNavigation
          items={CASE_HANDOVER_TABS}
          active={activeTab}
          onChange={setActiveTab}
          ariaLabel="Übergabe-Arbeitsbereiche Navigation"
        />
      }
    >
      {activeTab === 'overview' ? <HandoverOverviewTab cockpit={cockpit} onSelectTab={setActiveTab} /> : null}
      {activeTab === 'vacation' ? <HandoverVacationTab cases={cases} onCompleted={complete} /> : null}
      {activeTab === 'return' ? <HandoverReturnTab items={cockpit.incoming} cases={cases} onCompleted={complete} /> : null}
      {activeTab === 'office' ? <HandoverOfficeTab cases={cases} inventory={cockpit.officeInventory} onCompleted={complete} /> : null}
      {activeTab === 'import' ? <HandoverImportTab onCompleted={complete} /> : null}
      {activeTab === 'protocol' ? <HandoverProtocolTab outgoing={cockpit.outgoing} incoming={cockpit.incoming} /> : null}
    </WorkbenchWorkspace>
  </WorkbenchPage>;
}
