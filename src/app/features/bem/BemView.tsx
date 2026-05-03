import { useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import type { CaseRecord } from '../../core/models/case.model';
import type { BemProcessRecord, BemStatus } from '../../core/models/bem.model';
import type { CaseNodeTarget } from '../../workflowViews';
import { formatDateShort, waitForBridge } from '../../workflowViews';
import { BEM_OVERVIEW_STATUS_ORDER, bemStatusLabel, isDoneBemStatus } from './bemShared';

type BemOverviewCard = {
  id: string;
  caseId: string;
  caseNumber: string;
  displayName: string;
  title: string;
  status: BemStatus;
  statusLabel: string;
  responseLabel?: string;
  dueLabel?: string;
  updatedLabel?: string;
  isOverdue?: boolean;
};

function toCard(process: BemProcessRecord, cases: CaseRecord[]): BemOverviewCard {
  const caseRecord = cases.find((item) => item.id === process.caseId);
  const dueDate = process.responseDueAt ? new Date(process.responseDueAt) : undefined;
  return {
    id: process.id,
    caseId: process.caseId,
    caseNumber: caseRecord?.caseNumber ?? 'unbekannte Akte',
    displayName: caseRecord?.displayName ?? 'Unbekannter Fall',
    title: process.title || 'BEM-Verfahren',
    status: process.status,
    statusLabel: bemStatusLabel(process.status),
    responseLabel: process.employeeResponse ? process.employeeResponse.replaceAll('_', ' ') : undefined,
    dueLabel: formatDateShort(process.responseDueAt),
    updatedLabel: formatDateShort(process.updatedAt),
    isOverdue: !!dueDate && process.employeeResponse === 'offen' && dueDate.getTime() < Date.now()
  };
}

export function BemView({ cases, onOpenCaseNode }: { cases: CaseRecord[]; onOpenCaseNode: (target: CaseNodeTarget) => void }) {
  const [processes, setProcesses] = useState<BemProcessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

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

  const cards = useMemo(() => processes.map((process) => toCard(process, cases)), [processes, cases]);
  const groups = BEM_OVERVIEW_STATUS_ORDER.map((status) => ({
    status,
    label: bemStatusLabel(status),
    collapsedByDefault: isDoneBemStatus(status),
    records: cards.filter((card) => card.status === status)
  })).filter((group) => group.records.length > 0 || !isDoneBemStatus(group.status));

  return (
    <ModuleFrame title="BEM" kicker="Übersicht" description="Überblick über BEM-Verfahren. Die Bearbeitung erfolgt in der Fallakte.">
      <div className="process-overview-toolbar">
        <button type="button" className="industrial-secondary-button" onClick={() => setShowHelp(true)}>
          <HelpCircle className="h-4 w-4" />
          Hilfe
        </button>
      </div>

      {loading && <div className="industrial-message">BEM-Verfahren werden geladen …</div>}
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}

      <div className="process-overview-list">
        {groups.map((group) => (
          <details key={group.status} open={!group.collapsedByDefault}>
            <summary>
              <span>{group.label}</span>
              <strong>{group.records.length}</strong>
            </summary>
            <div className="process-overview-grid">
              {group.records.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`process-overview-card ${card.isOverdue ? 'is-critical' : ''}`}
                  onClick={() => onOpenCaseNode({ caseId: card.caseId, nodeType: 'bem', nodeId: card.id })}
                >
                  <span className="industrial-badge">{card.statusLabel}</span>
                  <h3>{card.caseNumber} · {card.title}</h3>
                  <p>{card.displayName}</p>
                  <dl>
                    <div><dt>Reaktion</dt><dd>{card.responseLabel ?? '—'}</dd></div>
                    <div><dt>Frist</dt><dd>{card.dueLabel ?? '—'}</dd></div>
                    <div><dt>Aktualisiert</dt><dd>{card.updatedLabel ?? '—'}</dd></div>
                  </dl>
                </button>
              ))}
              {!group.records.length && <div className="industrial-message">Keine BEM-Verfahren in diesem Status.</div>}
            </div>
          </details>
        ))}
      </div>

      {showHelp && (
        <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
          <section className="industrial-modal">
            <h2>BEM-Übersicht</h2>
            <p>Diese Seite ist eine Übersicht. Mit einem Klick auf ein BEM-Verfahren öffnet sich die Fallakte direkt an der passenden Maßnahme.</p>
            <p>Neue BEM-Verfahren werden in der Fallakte über die Fußleiste angelegt, damit der Fallbezug eindeutig bleibt.</p>
            <div className="industrial-modal-actions">
              <button type="button" className="industrial-button" onClick={() => setShowHelp(false)}>Verstanden</button>
            </div>
          </section>
        </div>
      )}
    </ModuleFrame>
  );
}
