import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { RetentionDashboard } from '../../../domain/models/retention.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';

export function RetentionDashboardCard({ onOpen }: { onOpen: () => void }) {
  const [dashboard, setDashboard] = useState<RetentionDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const bridge = await waitForBridge();
        if (!active || !bridge?.retention) return;
        setDashboard(await bridge.retention.dashboard());
        setError('');
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Lösch- und Datenschutzprüfungen konnten nicht geladen werden.');
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (!dashboard && !error) return null;
  const hasCandidates = Boolean(dashboard && dashboard.counts.total > 0);
  const hasCriticalCandidates = Boolean(dashboard && dashboard.counts.critical > 0);

  return (
    <button type="button" className="industrial-card dashboard-focus-card" onClick={onOpen}>
      <span className={`dashboard-focus-marker dashboard-focus-marker-${hasCriticalCandidates ? 'warning' : hasCandidates ? 'attention' : 'ok'}`}>
        {hasCriticalCandidates ? 'Handlungsbedarf' : hasCandidates ? 'Prüfen' : 'OK'}
      </span>
      {!hasCandidates ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5" aria-hidden="true" />}
      <strong>Lösch- und Datenschutzprüfung</strong>
      <span>{dashboard ? `${dashboard.counts.total} manuelle Prüfaufträge · ${dashboard.counts.critical} kritisch` : 'Prüfstatus nicht verfügbar.'}</span>
      {error && <small>{error}</small>}
    </button>
  );
}
