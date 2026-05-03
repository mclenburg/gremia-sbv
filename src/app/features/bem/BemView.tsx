import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
  summary: string;
  status: BemStatus;
  statusLabel: string;
  responseLabel?: string;
  dueLabel?: string;
  updatedLabel?: string;
  isOverdue?: boolean;
};

type BemOverviewGroup = {
  status: BemStatus;
  label: string;
  records: BemOverviewCard[];
  collapsedByDefault: boolean;
};

function isIsoBeforeNow(iso?: string): boolean {
  if (!iso) return false;
  const timestamp = new Date(iso).getTime();
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function toCard(process: BemProcessRecord, cases: CaseRecord[]): BemOverviewCard {
  const caseRecord = cases.find((item) => item.id === process.caseId);
  return {
    id: process.id,
    caseId: process.caseId,
    caseNumber: caseRecord?.caseNumber ?? 'unbekannte Akte',
    displayName: caseRecord?.displayName ?? 'Unbekannter Fall',
    title: process.title || 'BEM-Verfahren',
    summary: process.triggerDescription || caseRecord?.summary || 'Kein Anlass dokumentiert.',
    status: process.status,
    statusLabel: bemStatusLabel(process.status),
    responseLabel: process.employeeResponse ? process.employeeResponse.replaceAll('_', ' ') : undefined,
    dueLabel: formatDateShort(process.responseDueAt),
    updatedLabel: formatDateShort(process.updatedAt),
    isOverdue: process.employeeResponse === 'offen' && isIsoBeforeNow(process.responseDueAt)
  };
}

function BemOverviewCardButton({
  card,
  onOpen
}: {
  card: BemOverviewCard;
  onOpen: (card: BemOverviewCard) => void;
}) {
  return (
    <button type="button" className={`process-overview-card ${card.isOverdue ? 'is-critical' : ''}`} onClick={() => onOpen(card)}>
      <div>
        <strong>{card.caseNumber} · {card.title}</strong>
        <span>{card.displayName}</span>
        <p>{card.summary}</p>
      </div>
      <div className="process-overview-card-meta">
        <span className="process-overview-badge">{card.statusLabel}</span>
        <span className="process-overview-badge muted">Reaktion: {card.responseLabel ?? '—'}</span>
        {card.dueLabel && <span className={`process-overview-badge ${card.isOverdue ? 'warning' : 'muted'}`}>Frist: {card.dueLabel}</span>}
        {card.updatedLabel && <small>geändert: {card.updatedLabel}</small>}
      </div>
    </button>
  );
}

function BemOverviewGroupSection({
  group,
  emptyText,
  children
}: {
  group: BemOverviewGroup;
  emptyText: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!group.collapsedByDefault);
  return (
    <section className={`process-overview-group ${group.records.length === 0 ? 'is-empty' : ''}`}>
      <button type="button" className="process-overview-group-header" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span>{open ? '▾' : '▸'}</span>
        <strong>{group.label}</strong>
        <em>{group.records.length}</em>
      </button>
      {open && (
        <div className="process-overview-group-body">
          {group.records.length > 0 ? children : <div className="industrial-empty compact">{emptyText}</div>}
        </div>
      )}
    </section>
  );
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
  const groups = useMemo<BemOverviewGroup[]>(() => {
    const grouped = BEM_OVERVIEW_STATUS_ORDER.map((status) => {
      const records = cards.filter((card) => card.status === status);
      return {
        status,
        label: bemStatusLabel(status),
        records,
        collapsedByDefault: isDoneBemStatus(status) || records.length === 0
      };
    });

    const activeGroups = grouped.filter((group) => !isDoneBemStatus(group.status) && group.records.length > 0);
    const doneGroups = grouped.filter((group) => isDoneBemStatus(group.status) && group.records.length > 0);
    const nextEmptyGroup = grouped.find((group) => !isDoneBemStatus(group.status) && group.records.length === 0);

    return [...activeGroups, ...(nextEmptyGroup ? [nextEmptyGroup] : []), ...doneGroups];
  }, [cards]);

  const openCount = cards.filter((card) => !isDoneBemStatus(card.status)).length;
  const overdueCount = cards.filter((card) => card.isOverdue).length;
  const waitingCount = cards.filter((card) => card.status === 'reaktion_abwarten' || card.responseLabel === 'offen').length;

  return (
    <ModuleFrame title="BEM" kicker="Übersicht" description="Überblick über BEM-Verfahren. Die Bearbeitung erfolgt in der Fallakte.">
      <section className="industrial-panel process-overview-panel bem-overview-panel">
        <div className="process-overview-topline">
          <div>
            <p className="industrial-kicker">BEM-Leitstand</p>
            <h2>BEM-Verfahren</h2>
            <p>Aktive Verfahren zuerst. Abgeschlossene oder abgebrochene Verfahren bleiben am Ende eingeklappt.</p>
          </div>
          <button type="button" className="industrial-secondary-button compact" onClick={() => setShowHelp(true)} aria-label="Hilfe zur BEM-Übersicht öffnen">
            <HelpCircle className="h-4 w-4" />
            Hilfe
          </button>
        </div>

        <div className="process-overview-stats" aria-label="Kennzahlen">
          <div className="process-overview-stat"><span>offen</span><strong>{openCount}</strong></div>
          <div className="process-overview-stat"><span>Reaktion offen</span><strong>{waitingCount}</strong></div>
          <div className="process-overview-stat"><span>überfällig</span><strong>{overdueCount}</strong></div>
          <div className="process-overview-stat"><span>gesamt</span><strong>{cards.length}</strong></div>
        </div>

        {loading && <div className="industrial-message">BEM-Verfahren werden geladen …</div>}
        {error && <div className="industrial-message industrial-message-warning">{error}</div>}

        <div className="process-overview-groups">
          {groups.map((group) => (
            <BemOverviewGroupSection key={group.status} group={group} emptyText="Keine BEM-Verfahren in diesem Status.">
              {group.records.map((card) => (
                <BemOverviewCardButton
                  key={card.id}
                  card={card}
                  onOpen={(selected) => onOpenCaseNode({ caseId: selected.caseId, nodeType: 'bem', nodeId: selected.id })}
                />
              ))}
            </BemOverviewGroupSection>
          ))}
          {!loading && !error && groups.length === 0 && <div className="industrial-empty">Noch keine BEM-Verfahren vorhanden. Lege ein BEM-Verfahren in der Fallakte über die Fußleiste an.</div>}
        </div>
      </section>

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
    </ModuleFrame>
  );
}
