import { useEffect, useState } from 'react';
import type { ActivityJournalSummary } from '../../../domain/models/activity-journal.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { DashboardComplianceLike } from './dashboardFocus';
import { legalCalendarDate } from '../../../domain/time/legalTime';

export function useDashboardLocalStatus() {
  const announce = useAnnouncer();
  const [compliance, setCompliance] = useState<DashboardComplianceLike | null>(null);
  const [complianceError, setComplianceError] = useState('');
  const [journalSummary, setJournalSummary] = useState<ActivityJournalSummary | null>(null);
  const [journalLastWeekEntryCount, setJournalLastWeekEntryCount] = useState(0);
  useEffect(() => {
    let active = true;
    async function loadComplianceStatus() {
      try {
        const bridge = await waitForBridge();
        if (!active || !bridge?.compliance) return;
        const [auditStatus, databaseStatus] = await Promise.all([
          bridge.compliance.auditChainStatus(),
          bridge.compliance.databaseIntegrityStatus(),
        ]);
        if (!active) return;
        const audit = auditStatus as unknown as Record<string, unknown>;
        const database = databaseStatus as unknown as Record<string, unknown>;
        const auditIssues = Number(audit.issueCount ?? audit.warningCount ?? audit.errorCount ?? 0);
        const databaseIssues = Number(database.issueCount ?? database.warningCount ?? database.errorCount ?? 0);
        setCompliance({ ok: Boolean(auditStatus.ok && databaseStatus.ok), issueCount: auditIssues + databaseIssues, repairRequired: Boolean(database.repairRequired) });
        setComplianceError('');
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Compliance-Status konnte nicht geladen werden.';
        setCompliance({ ok: false, issueCount: 1, repairRequired: false });
        setComplianceError(message);
        announce(message, 'assertive');
      }
    }
    void loadComplianceStatus();
    return () => { active = false; };
  }, [announce]);

  useEffect(() => {
    let active = true;
    async function loadJournalSummary() {
      try {
        const bridge = await waitForBridge();
        if (!active || !bridge?.activityJournal) return;
        const now = new Date();
        const lastWeekEnd = new Date(now);
        const daysSinceMonday = (now.getDay() + 6) % 7;
        lastWeekEnd.setDate(now.getDate() - daysSinceMonday);
        lastWeekEnd.setHours(0, 0, 0, 0);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 7);
        const [summary, lastWeekEntries] = await Promise.all([
          bridge.activityJournal.summary(),
          bridge.activityJournal.list({
            from: legalCalendarDate(lastWeekStart),
            to: legalCalendarDate(lastWeekEnd),
            limit: 1,
          }),
        ]);
        if (!active) return;
        setJournalSummary(summary);
        setJournalLastWeekEntryCount(lastWeekEntries.length);
      } catch {
        if (active) setJournalSummary(null);
      }
    }
    void loadJournalSummary();
    return () => { active = false; };
  }, []);


  return { compliance, complianceError, journalSummary, journalLastWeekEntryCount };
}
