import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import type { RetentionCandidate, RetentionDashboard, RetentionRiskLevel } from '../../../domain/models/retention.model';
import type { ViewId } from '../../core/navigation/modules';
import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { formatDateShort } from '../../shared/format/dates';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { SearchInput, SelectInput } from '../../shared/components/IndustrialForm';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

type RiskFilter = 'all' | RetentionRiskLevel;
const riskLabels: Record<RetentionRiskLevel, string> = { critical: 'Kritisch', warning: 'Prüfen', info: 'Hinweis' };
const actionLabels: Record<RetentionCandidate['recommendedAction'], string> = {
  pruefen: 'Prüfen', anonymisieren: 'Anonymisieren', loeschen: 'Löschen', archivieren: 'Archivieren',
};

export function retentionCandidateTarget(candidate: RetentionCandidate): ViewId | null {
  switch (candidate.entityType) {
    case 'case': case 'case_file': case 'bem': case 'prevention': case 'sbv_participation':
    case 'workplace_accommodation': case 'equalization_gdb': return 'cases';
    case 'protected_person': return 'persons';
    case 'contact': return 'contacts';
    case 'deadline': return 'deadlines';
    case 'activity_journal': case 'activity_journal_entry': return 'activity_journal';
    case 'sbv_participation_violation': return 'participation_violations';
    case 'recruiting': return 'recruiting_participations';
    case 'termination_hearing': return 'termination_hearing';
    case 'election': return 'elections';
    case 'meeting': case 'assembly': case 'inclusion_agreement': case 'employer_obligation_review': return 'sbv_control';
    case 'compliance_incident': case 'document': case 'file': case 'system': return 'compliance';
    default: return null;
  }
}

export function retentionCandidateCaseTarget(candidate: RetentionCandidate): CaseNodeTarget | null {
  return candidate.entityType === 'case' && candidate.entityId
    ? { caseId: candidate.entityId, nodeType: 'overview' }
    : null;
}

export function PrivacyReviewCockpit({ onNavigate, onOpenCaseNode }: { onNavigate: (view: ViewId) => void; onOpenCaseNode: (target: CaseNodeTarget) => void }) {
  const announce = useAnnouncer();
  const [dashboard, setDashboard] = useState<RetentionDashboard | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  async function reloadRetention() {
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention) throw new Error('Lösch- und Datenschutzprüfung ist nicht erreichbar.');
      setDashboard(await bridge.retention.dashboard());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Prüfaufträge konnten nicht geladen werden.');
    }
  }
  useEffect(() => { void reloadRetention(); }, []);
  useEffect(() => { if (error) announce(error, 'assertive'); }, [announce, error]);

  const candidates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('de-DE');
    return (dashboard?.candidates ?? []).filter((candidate) => {
      if (riskFilter !== 'all' && candidate.riskLevel !== riskFilter) return false;
      if (!normalizedQuery) return true;
      return [candidate.title, candidate.reference, candidate.description, candidate.legalBasis]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase('de-DE').includes(normalizedQuery));
    });
  }, [dashboard, query, riskFilter]);

  return <section className="industrial-card no-card-hover" aria-labelledby="privacy-review-title" data-e2e="privacy-review-cockpit">
    <div className="industrial-card-header">
      <div><p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">Datenschutz-Cockpit</p><h3 id="privacy-review-title">Lösch- und Datenschutzprüfung</h3>
        <p>Alle fälligen Prüfaufträge. Die Entscheidung und jede Löschung bleiben ausdrücklich manuell.</p></div>
      <IndustrialButton variant="secondary" onClick={() => void reloadRetention()}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Aktualisieren</IndustrialButton>
    </div>
    {dashboard && <div className="grid gap-4 md:grid-cols-4 mt-4" aria-label="Zusammenfassung der Prüfaufträge">
      <div className="industrial-subpanel"><h4>Gesamt</h4><strong className="text-2xl">{dashboard.counts.total}</strong></div>
      <div className="industrial-subpanel"><h4>Kritisch</h4><strong className="text-2xl text-red-300">{dashboard.counts.critical}</strong></div>
      <div className="industrial-subpanel"><h4>Prüfen</h4><strong className="text-2xl text-yellow-300">{dashboard.counts.warning}</strong></div>
      <div className="industrial-subpanel"><h4>Hinweis</h4><strong className="text-2xl">{dashboard.counts.info}</strong></div>
    </div>}
    <div className="industrial-form-grid industrial-form-grid-2 mt-4">
      <SelectInput label="Risiko filtern" value={riskFilter} onValueChange={(value) => setRiskFilter(value as RiskFilter)} options={[
        { value: 'all', label: 'Alle Risikostufen' }, { value: 'critical', label: 'Kritisch' },
        { value: 'warning', label: 'Prüfen' }, { value: 'info', label: 'Hinweis' },
      ]} />
      <SearchInput label="Prüfaufträge durchsuchen" value={query} onValueChange={setQuery} />
    </div>
    <div className="industrial-table-shell mt-4"><table className="industrial-table">
      <caption className="sr-only">Fällige Lösch- und Datenschutzprüfungen</caption>
      <thead><tr><th>Risiko</th><th>Prüfauftrag</th><th>Fällig seit</th><th>Empfehlung</th><th>Rechtsgrundlage</th><th>Vorgang</th></tr></thead>
      <tbody>{candidates.map((candidate) => { const view = retentionCandidateTarget(candidate); const caseTarget = retentionCandidateCaseTarget(candidate); return <tr key={candidate.id}>
        <td>{candidate.riskLevel === 'critical' ? <AlertTriangle className="h-4 w-4 inline" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4 inline" aria-hidden="true" />} {riskLabels[candidate.riskLevel]}</td>
        <td><strong>{candidate.title}</strong><br /><span>{candidate.reference ?? 'Ohne Referenz'}</span><br /><small>{candidate.description}</small></td>
        <td>{formatDateShort(candidate.dueSince ?? candidate.createdAt)}</td>
        <td>{actionLabels[candidate.recommendedAction]}{candidate.privacyReviewRequired ? ' · Datenschutzprüfung erforderlich' : ''}</td>
        <td>{candidate.legalBasis ?? '—'}</td>
        <td>{caseTarget
          ? <IndustrialButton variant="secondary" onClick={() => onOpenCaseNode(caseTarget)}>Fallakte öffnen</IndustrialButton>
          : view ? <IndustrialButton variant="secondary" onClick={() => onNavigate(view)}>Vorgang öffnen</IndustrialButton> : '—'}</td>
      </tr>; })}
      {!candidates.length && <tr><td colSpan={6}>{dashboard ? 'Keine passenden Prüfaufträge offen.' : 'Prüfaufträge werden geladen …'}</td></tr>}</tbody>
    </table></div>
    {error && <div className="industrial-message industrial-message-warning mt-4" role="alert">{error}</div>}
  </section>;
}
