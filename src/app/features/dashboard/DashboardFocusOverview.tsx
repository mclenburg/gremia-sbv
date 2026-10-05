import { useMemo } from 'react';
import { AlertTriangle, BriefcaseBusiness, Clock3, ShieldCheck, TimerReset } from 'lucide-react';
import type { CaseMeasureRecord, CaseRecord, DeadlineDashboardItem, DeadlineRecord } from '../../appTypes';
import { DeadlineDashboardPanel } from '../deadlines/DeadlineDashboardPanel';
import { buildDashboardFocusSummary, resolveActivityJournalWeekReviewMarker, RetentionDashboardCard, SbvAssemblyDashboardAlert, type ViewId } from './dashboardFocus';
import { IndustrialButton } from '../../shared/components/IndustrialButton';

import { useDashboardLocalStatus } from './useDashboardLocalStatus';
import { useGremiaBrDashboard } from './useGremiaBrDashboard';
import { GremiaBrDashboardTile, GremiaBrMeetingAgenda } from './GremiaBrDashboardPanels';

type DashboardFocusOverviewProps = {
  cases: CaseRecord[]; measures: CaseMeasureRecord[]; deadlines: DeadlineRecord[]; dashboardItems: DeadlineDashboardItem[];
  onNavigate: (view: ViewId) => void;
  onEditDeadline: (deadline: DeadlineDashboardItem) => void; onExtendDeadline: (deadline: DeadlineDashboardItem) => void;
  onOpenDeadlineContext: (deadline: DeadlineDashboardItem) => void;
  onCompleteDeadline: (deadline: DeadlineDashboardItem) => void;
};

function markerClass(marker: string): string {
  if (marker === 'warning') return 'dashboard-focus-marker dashboard-focus-marker-warning';
  if (marker === 'attention') return 'dashboard-focus-marker dashboard-focus-marker-attention';
  if (marker === 'ok') return 'dashboard-focus-marker dashboard-focus-marker-ok';
  return 'dashboard-focus-marker';
}

function markerText(marker: string): string {
  if (marker === 'warning') return 'Handlungsbedarf';
  if (marker === 'attention') return 'Beachten';
  if (marker === 'ok') return 'OK';
  return 'Info';
}

export function DashboardFocusOverview({ cases, measures, deadlines, dashboardItems, onNavigate, onEditDeadline, onExtendDeadline, onOpenDeadlineContext, onCompleteDeadline }: DashboardFocusOverviewProps) {
  const { compliance, complianceError, journalSummary, journalLastWeekEntryCount } = useDashboardLocalStatus();
  const gremiaBr = useGremiaBrDashboard();

  const deadlinesForSummary = dashboardItems.length ? dashboardItems : deadlines;
  const summary = useMemo(() => buildDashboardFocusSummary({ cases, deadlines: deadlinesForSummary, compliance }), [cases, compliance, deadlinesForSummary]);
  const journalWeekReview = resolveActivityJournalWeekReviewMarker({
    hasJournalHistory: Boolean(journalSummary && journalSummary.totalEntries > 0),
    lastWeekEntryCount: journalLastWeekEntryCount,
    hasDashboardActivity: dashboardItems.length > 0 || deadlinesForSummary.length > 0 || summary.cases.open > 0,
    hasHigherPriorityCriticalMarker: summary.deadlines.marker === 'warning' || summary.compliance.marker === 'warning',
  });

  return (
    <section className="dashboard-focus" aria-labelledby="dashboard-focus-title">
      <div className="industrial-card-header">
        <div>
          <p className="industrial-kicker">Arbeitsübersicht</p>
          <h3 id="dashboard-focus-title">Wesentliches auf einen Blick</h3>
        </div>
      </div>
      <div className="dashboard-focus-grid">
        <button type="button" className="industrial-card dashboard-focus-card" onClick={() => onNavigate('cases')}>
          <span className={markerClass(summary.cases.marker)}>{markerText(summary.cases.marker)}</span>
          <BriefcaseBusiness className="industrial-icon-md" aria-hidden="true" />
          <strong>Fälle</strong>
          <span>{summary.cases.open} offen · {summary.cases.total} gesamt</span>
        </button>

        <button type="button" className="industrial-card dashboard-focus-card" onClick={() => onNavigate('deadlines')}>
          <span className={markerClass(summary.deadlines.marker)}>{markerText(summary.deadlines.marker)}</span>
          {summary.deadlines.marker === 'warning' ? <AlertTriangle className="industrial-icon-md" aria-hidden="true" /> : <TimerReset className="industrial-icon-md" aria-hidden="true" />}
          <strong>Fristen</strong>
          <span>{summary.deadlines.totalOpen} offen · {summary.deadlines.dueSoon} anstehend · {summary.deadlines.overdue} überschritten</span>
        </button>

        <button type="button" className="industrial-card dashboard-focus-card" onClick={() => onNavigate('compliance')}>
          <span className={markerClass(summary.compliance.marker)}>{markerText(summary.compliance.marker)}</span>
          {summary.compliance.ok ? <ShieldCheck className="industrial-icon-md" aria-hidden="true" /> : <AlertTriangle className="industrial-icon-md" aria-hidden="true" />}
          <strong>Compliance-Center</strong>
          <span>{summary.compliance.ok ? 'Auditkette und Datenbankintegrität ohne Warnung.' : `${summary.compliance.warnings || 1} Warnung(en) prüfen.`}</span>
          {complianceError && <small>{complianceError}</small>}
        </button><SbvAssemblyDashboardAlert onOpen={() => onNavigate('sbv_control')} />
        <RetentionDashboardCard onOpen={() => onNavigate('privacy_review')} />
        {journalSummary && journalSummary.totalEntries > 0 && (
          <IndustrialButton variant="ghost" className="industrial-card dashboard-focus-card" onClick={() => onNavigate('activity_journal')}>
            <span className={markerClass(journalSummary.openFollowUps.length > 0 ? 'attention' : journalWeekReview.visible ? journalWeekReview.marker : 'neutral')}>{journalSummary.openFollowUps.length > 0 ? 'Nachhalten' : journalWeekReview.visible ? 'Prüfen' : 'Info'}</span>
            <Clock3 className="industrial-icon-md" aria-hidden="true" />
            <strong>{journalWeekReview.visible ? journalWeekReview.title : 'Tätigkeitsjournal'}</strong>
            <span>{journalWeekReview.visible ? journalWeekReview.description : `${journalSummary.totalEntries} Einträge · diese Woche ${Math.floor(journalSummary.weekMinutes / 60)} h ${String(journalSummary.weekMinutes % 60).padStart(2, '0')} min`}</span>
            {journalSummary.openFollowUps.length > 0 && <small>{journalSummary.openFollowUps.length} Journal-Wiedervorlage(n) offen.</small>}
          </IndustrialButton>
        )}

        <GremiaBrDashboardTile {...gremiaBr} />
      </div>

      <div className="dashboard-support-grid">
        <GremiaBrMeetingAgenda {...gremiaBr} />

        <DeadlineDashboardPanel items={dashboardItems} cases={cases} measures={measures}
          onEdit={onEditDeadline} onExtend={onExtendDeadline} onOpenContext={onOpenDeadlineContext} onComplete={onCompleteDeadline} />
      </div>
    </section>
  );
}
