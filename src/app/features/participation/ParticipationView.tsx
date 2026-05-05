import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type {
  ParticipationDecisionStage,
  ParticipationMeasureType,
  ParticipationPersonStatus,
  ParticipationRecord,
  ParticipationRiskLevel,
  ParticipationStatus,
} from '../../core/models/participation.model';
import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import {
  WorkbenchDetailPanel,
  WorkbenchGrid,
  WorkbenchListPanel,
  WorkbenchSummary
} from '../../shared/components/WorkbenchLayout';
import { formatDateShort } from '../../shared/format/dates';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import './participationWorkbench.css';

const measureLabels: Record<ParticipationMeasureType, string> = {
  einstellung: 'Einstellung',
  versetzung: 'Versetzung',
  arbeitszeit: 'Arbeitszeit',
  arbeitsplatzgestaltung: 'Arbeitsplatzgestaltung',
  abmahnung: 'Abmahnung',
  kuendigung: 'Kündigung',
  bem_praevention: 'BEM / Prävention',
  regelung_praxis: 'Regelung / betriebliche Praxis',
  sonstiges: 'Sonstiges'
};

const statusLabels: Record<ParticipationStatus, string> = {
  neu: 'Neu',
  unterrichtung_pruefen: 'Unterrichtung prüfen',
  anhoerung_laeuft: 'Anhörung läuft',
  stellungnahme_abgegeben: 'Stellungnahme abgegeben',
  aussetzung_verlangt: 'Aussetzung verlangt',
  nachholung_laeuft: 'Nachholung läuft',
  abgeschlossen: 'Abgeschlossen',
  pflichtverstoss_dokumentiert: 'Pflichtverstoß dokumentiert'
};

const riskLabels: Record<ParticipationRiskLevel, string> = {
  normal: 'normal',
  erhoeht: 'erhöht',
  kritisch: 'kritisch'
};

const personStatusLabels: Record<ParticipationPersonStatus, string> = {
  schwerbehindert: 'schwerbehindert',
  gleichgestellt: 'gleichgestellt',
  antrag_laeuft: 'Antrag läuft',
  moeglich_betroffen: 'möglicherweise betroffen',
  unklar: 'unklar'
};

const decisionStageLabels: Record<ParticipationDecisionStage, string> = {
  vor_entscheidung: 'vor Entscheidung',
  entscheidung_angekuendigt: 'Entscheidung angekündigt',
  entscheidung_getroffen: 'Entscheidung getroffen',
  umgesetzt: 'umgesetzt',
  unklar: 'unklar'
};

const measureOrder = Object.keys(measureLabels) as ParticipationMeasureType[];
const statusOrder = Object.keys(statusLabels) as ParticipationStatus[];
const riskOrder = Object.keys(riskLabels) as ParticipationRiskLevel[];
const personStatusOrder = Object.keys(personStatusLabels) as ParticipationPersonStatus[];
const decisionStageOrder = Object.keys(decisionStageLabels) as ParticipationDecisionStage[];

function toDateTimeLocal(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function caseLabel(record: CaseRecord | undefined): string {
  if (!record) return 'Fall nicht auflösbar';
  return `${record.caseNumber} · ${record.displayName}`;
}

function isOpenStatus(status: ParticipationStatus): boolean {
  return !['abgeschlossen', 'pflichtverstoss_dokumentiert'].includes(status);
}

function criticalCount(record: ParticipationRecord): number {
  let count = 0;
  if (!record.informationComplete) count += 1;
  if ((record.decisionStage === 'entscheidung_getroffen' || record.decisionStage === 'umgesetzt') && !record.hearingBeforeDecision) count += 1;
  if (record.suspensionDueAt && record.status === 'aussetzung_verlangt' && new Date(record.suspensionDueAt) < new Date()) count += 1;
  return count;
}

export function ParticipationView({
  cases,
  onOpenCaseNode
}: {
  cases: CaseRecord[];
  onOpenCaseNode: (target: CaseNodeTarget) => void;
}) {
  const [records, setRecords] = useState<ParticipationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const announce = useAnnouncer();

  const selected = useMemo(() => records.find((record) => record.id === selectedId) ?? records[0] ?? null, [records, selectedId]);

  async function reload() {
    setLoading(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.participation) throw new Error('Beteiligungsmonitor ist nicht erreichbar.');
      const rows = await bridge.participation.list();
      setRecords(rows);
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Beteiligungsprüfungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [cases.length]);

  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  const stats = useMemo(() => ({
    open: records.filter((record) => isOpenStatus(record.status)).length,
    critical: records.filter((record) => record.riskLevel === 'kritisch' || criticalCount(record) > 0).length,
    suspensions: records.filter((record) => record.status === 'aussetzung_verlangt').length,
    violations: records.filter((record) => record.status === 'pflichtverstoss_dokumentiert').length
  }), [records]);

  const selectedCase = selected ? cases.find((item) => item.id === selected.caseId) : undefined;

  return (
    <ModuleFrame title="SBV-Beteiligungsmonitor" kicker="§ 178 Abs. 2 SGB IX" description="Dokumentiert Unterrichtung, Anhörung, Stellungnahme, Arbeitgeberentscheidung und Aussetzungsverlangen der SBV." compact>
      <WorkbenchSummary
        ariaLabel="Beteiligungsmonitor Kennzahlen"
        items={[
          { label: 'offen', value: stats.open },
          { label: 'kritisch', value: stats.critical, tone: stats.critical > 0 ? 'danger' : 'default' },
          { label: 'Aussetzungen', value: stats.suspensions, tone: stats.suspensions > 0 ? 'warning' : 'default' },
          { label: 'Pflichtverstöße', value: stats.violations, tone: stats.violations > 0 ? 'danger' : 'default' }
        ]}
        actions={(
          <span className="industrial-meta">Anlage und Bearbeitung erfolgen in der jeweiligen Fallakte.</span>
        )}
      />

      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      {loading && <div className="industrial-message">Beteiligungsprüfungen werden geladen …</div>}

      <WorkbenchGrid>
        <WorkbenchListPanel ariaLabel="Beteiligungsprüfungen">
          {records.length === 0 && !loading && <div className="industrial-empty-state">Noch keine Beteiligungsprüfung angelegt.</div>}
          {records.map((record) => {
            const relatedCase = cases.find((item) => item.id === record.caseId);
            const critical = criticalCount(record);
            return (
              <button type="button" key={record.id} className={`participation-card ${selected?.id === record.id ? 'participation-card-active' : ''}`} onClick={() => setSelectedId(record.id)}>
                <span className="participation-card-title">{record.title}</span>
                <span>{caseLabel(relatedCase)}</span>
                <span>{measureLabels[record.measureType]} · {statusLabels[record.status]} · Risiko {riskLabels[record.riskLevel]}</span>
                <span>{record.statementDueAt ? `Stellungnahme bis ${formatDateShort(record.statementDueAt)}` : 'keine Stellungnahmefrist'}</span>
                {critical > 0 && <span className="participation-card-warning"><AlertTriangle className="h-3.5 w-3.5" /> {critical} kritische Prüfung(en)</span>}
              </button>
            );
          })}
        </WorkbenchListPanel>

        <WorkbenchDetailPanel ariaLabel="Detail Beteiligungsprüfung">
          {!selected ? <div className="industrial-empty-state">Wähle eine Beteiligungsprüfung aus.</div> : (
            <>
              <div className="participation-detail-header">
                <div><p className="industrial-kicker">{measureLabels[selected.measureType]} · {personStatusLabels[selected.personStatus]}</p><h2>{selected.title}</h2><p>{caseLabel(selectedCase)}</p></div>
                <button type="button" className="industrial-button" onClick={() => onOpenCaseNode({ caseId: selected.caseId, nodeType: 'overview' })}>Fallakte öffnen</button>
              </div>
              <div className="participation-cockpit-summary">
                <p><strong>Status:</strong> {statusLabels[selected.status]} · <strong>Risiko:</strong> {riskLabels[selected.riskLevel]} · <strong>Entscheidungsstand:</strong> {decisionStageLabels[selected.decisionStage]}</p>
                <p><strong>Stellungnahmefrist:</strong> {selected.statementDueAt ? formatDateShort(selected.statementDueAt) : 'keine Frist erfasst'}</p>
                {selected.violationSummary && <p><strong>Pflichtverstoß / fehlende Unterlagen:</strong> {selected.violationSummary}</p>}
                {selected.nextStep && <p><strong>Nächster Schritt:</strong> {selected.nextStep}</p>}
                <p className="industrial-meta">Dieses Cockpit ist nur die Übersicht. Änderungen erfolgen in der Fallakte, damit der Verlauf und die Maßnahme zusammen bleiben.</p>
              </div>
              <div className="industrial-card-actions">
                <button type="button" className="industrial-button" onClick={() => onOpenCaseNode({ caseId: selected.caseId, nodeType: 'participation', nodeId: selected.id })}><ExternalLink className="h-4 w-4" /> Maßnahme in Fallakte öffnen</button>
              </div>
            </>
          )}
        </WorkbenchDetailPanel>
      </WorkbenchGrid>
    </ModuleFrame>
  );
}
