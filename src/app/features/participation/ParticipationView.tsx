import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, FileWarning, Plus, ShieldCheck } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type {
  CreateParticipationInput,
  ParticipationDecisionStage,
  ParticipationMeasureType,
  ParticipationPersonStatus,
  ParticipationRecord,
  ParticipationRiskLevel,
  ParticipationStatus,
  UpdateParticipationInput
} from '../../core/models/participation.model';
import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import {
  IndustrialActionRow,
  IndustrialCheckboxRow,
  IndustrialField,
  IndustrialFormGrid,
  WorkbenchCreatePanel,
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
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: CreateParticipationInput = {
      caseId: String(data.get('caseId') ?? ''),
      title: String(data.get('title') ?? ''),
      measureType: String(data.get('measureType') ?? 'sonstiges') as ParticipationMeasureType,
      riskLevel: String(data.get('riskLevel') ?? 'normal') as ParticipationRiskLevel,
      personStatus: String(data.get('personStatus') ?? 'unklar') as ParticipationPersonStatus,
      decisionStage: String(data.get('decisionStage') ?? 'unklar') as ParticipationDecisionStage,
      firstKnownAt: fromDateTimeLocal(String(data.get('firstKnownAt') ?? '')),
      statementDueAt: fromDateTimeLocal(String(data.get('statementDueAt') ?? '')),
      informationComplete: data.get('informationComplete') === 'on',
      hearingBeforeDecision: data.get('hearingBeforeDecision') === 'on',
      decisionNotified: data.get('decisionNotified') === 'on',
      violationSummary: String(data.get('violationSummary') ?? ''),
      nextStep: String(data.get('nextStep') ?? ''),
      createDefaultDeadlines: true
    };

    setSaving(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.participation) throw new Error('Beteiligungsmonitor ist nicht erreichbar.');
      const created = await bridge.participation.create(input);
      await reload();
      setSelectedId(created.id);
      setCreateOpen(false);
      announce('SBV-Beteiligungsprüfung wurde angelegt.', 'polite');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Beteiligungsprüfung konnte nicht angelegt werden.');
    } finally {
      setSaving(false);
    }
  }

  async function updateSelected(input: UpdateParticipationInput) {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.participation) throw new Error('Beteiligungsmonitor ist nicht erreichbar.');
      const updated = await bridge.participation.update(selected.id, input);
      setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
      setSelectedId(updated.id);
      announce('Beteiligungsprüfung wurde aktualisiert.', 'polite');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Beteiligungsprüfung konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

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
          <button type="button" className="industrial-button industrial-button-primary" onClick={() => setCreateOpen((open) => !open)}>
            <Plus className="h-4 w-4" /> Beteiligung anlegen
          </button>
        )}
      />

      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      {loading && <div className="industrial-message">Beteiligungsprüfungen werden geladen …</div>}

      {createOpen && (
        <form onSubmit={(event) => void createRecord(event)}>
          <WorkbenchCreatePanel
            title="Neue Beteiligungsprüfung"
            description="Erfasse die Maßnahme, den Beteiligungsstand und die nächsten SBV-Schritte in einer strukturierten Form."
          >
            <IndustrialFormGrid>
              <IndustrialField label="Fallakte">
                <select name="caseId" required defaultValue={cases[0]?.id ?? ''}>
                  <option value="" disabled>Fall auswählen</option>
                  {cases.map((record) => <option key={record.id} value={record.id}>{caseLabel(record)}</option>)}
                </select>
              </IndustrialField>
              <IndustrialField label="Titel">
                <input name="title" required placeholder="z. B. Versetzung ohne vorherige SBV-Anhörung" />
              </IndustrialField>
              <IndustrialField label="Maßnahme">
                <select name="measureType" defaultValue="sonstiges">{measureOrder.map((item) => <option key={item} value={item}>{measureLabels[item]}</option>)}</select>
              </IndustrialField>
              <IndustrialField label="Risiko">
                <select name="riskLevel" defaultValue="normal">{riskOrder.map((item) => <option key={item} value={item}>{riskLabels[item]}</option>)}</select>
              </IndustrialField>
              <IndustrialField label="Personenstatus">
                <select name="personStatus" defaultValue="unklar">{personStatusOrder.map((item) => <option key={item} value={item}>{personStatusLabels[item]}</option>)}</select>
              </IndustrialField>
              <IndustrialField label="Entscheidungsstand">
                <select name="decisionStage" defaultValue="unklar">{decisionStageOrder.map((item) => <option key={item} value={item}>{decisionStageLabels[item]}</option>)}</select>
              </IndustrialField>
              <IndustrialField label="Kenntnis der SBV">
                <input name="firstKnownAt" type="datetime-local" />
              </IndustrialField>
              <IndustrialField label="Stellungnahmefrist">
                <input name="statementDueAt" type="datetime-local" />
              </IndustrialField>
            </IndustrialFormGrid>
            <IndustrialCheckboxRow>
              <label><input name="informationComplete" type="checkbox" /> Unterrichtung vollständig</label>
              <label><input name="hearingBeforeDecision" type="checkbox" /> Anhörung vor Entscheidung</label>
              <label><input name="decisionNotified" type="checkbox" /> Entscheidung mitgeteilt</label>
            </IndustrialCheckboxRow>
            <IndustrialFormGrid columns={2}>
              <IndustrialField label="Mangel / Risiko">
                <textarea name="violationSummary" rows={3} placeholder="Welche Unterlagen fehlen? Wurde bereits entschieden oder umgesetzt?" />
              </IndustrialField>
              <IndustrialField label="Nächster Schritt">
                <textarea name="nextStep" rows={3} placeholder="z. B. Unterlagen mit Frist anfordern oder Aussetzung verlangen." />
              </IndustrialField>
            </IndustrialFormGrid>
            <IndustrialActionRow>
              <button type="submit" className="industrial-button industrial-button-primary" disabled={saving}>Anlegen</button>
              <button type="button" className="industrial-button" onClick={() => setCreateOpen(false)}>Abbrechen</button>
            </IndustrialActionRow>
          </WorkbenchCreatePanel>
        </form>
      )}

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
              <div className="participation-check-matrix" aria-label="Prüfmatrix § 178 Abs. 2 SGB IX">
                <button type="button" className={selected.informationComplete ? 'check-ok' : 'check-missing'} onClick={() => void updateSelected({ informationComplete: !selected.informationComplete })}><CheckCircle2 className="h-4 w-4" /> Unterrichtung vollständig</button>
                <button type="button" className={selected.hearingBeforeDecision ? 'check-ok' : 'check-missing'} onClick={() => void updateSelected({ hearingBeforeDecision: !selected.hearingBeforeDecision })}><ShieldCheck className="h-4 w-4" /> Anhörung vor Entscheidung</button>
                <button type="button" className={selected.decisionNotified ? 'check-ok' : 'check-missing'} onClick={() => void updateSelected({ decisionNotified: !selected.decisionNotified })}><FileWarning className="h-4 w-4" /> Entscheidung mitgeteilt</button>
              </div>
              <IndustrialFormGrid columns={3}>
                <IndustrialField label="Status">
                  <select value={selected.status} onChange={(event) => void updateSelected({ status: event.target.value as ParticipationStatus })}>{statusOrder.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select>
                </IndustrialField>
                <IndustrialField label="Risiko">
                  <select value={selected.riskLevel} onChange={(event) => void updateSelected({ riskLevel: event.target.value as ParticipationRiskLevel })}>{riskOrder.map((item) => <option key={item} value={item}>{riskLabels[item]}</option>)}</select>
                </IndustrialField>
                <IndustrialField label="Entscheidungsstand">
                  <select value={selected.decisionStage} onChange={(event) => void updateSelected({ decisionStage: event.target.value as ParticipationDecisionStage })}>{decisionStageOrder.map((item) => <option key={item} value={item}>{decisionStageLabels[item]}</option>)}</select>
                </IndustrialField>
                <IndustrialField label="Stellungnahmefrist">
                  <input type="datetime-local" value={toDateTimeLocal(selected.statementDueAt)} onChange={(event) => void updateSelected({ statementDueAt: fromDateTimeLocal(event.target.value) })} />
                </IndustrialField>
                <IndustrialField label="Stellungnahme abgegeben">
                  <input type="datetime-local" value={toDateTimeLocal(selected.statementSubmittedAt)} onChange={(event) => void updateSelected({ statementSubmittedAt: fromDateTimeLocal(event.target.value), status: event.target.value ? 'stellungnahme_abgegeben' : selected.status })} />
                </IndustrialField>
                <IndustrialField label="Aussetzung verlangt">
                  <input type="datetime-local" value={toDateTimeLocal(selected.suspensionRequestedAt)} onChange={(event) => void updateSelected({ suspensionRequestedAt: fromDateTimeLocal(event.target.value), status: event.target.value ? 'aussetzung_verlangt' : selected.status })} />
                </IndustrialField>
              </IndustrialFormGrid>
              <IndustrialFormGrid columns={2}>
                <IndustrialField label="SBV-Position / Stellungnahme-Kern">
                  <textarea value={selected.sbvPosition ?? ''} rows={4} onChange={(event) => void updateSelected({ sbvPosition: event.target.value })} />
                </IndustrialField>
                <IndustrialField label="Pflichtverstoß / fehlende Unterlagen">
                  <textarea value={selected.violationSummary ?? ''} rows={4} onChange={(event) => void updateSelected({ violationSummary: event.target.value })} />
                </IndustrialField>
                <IndustrialField label="Nächster Schritt" wide>
                  <textarea value={selected.nextStep ?? ''} rows={3} onChange={(event) => void updateSelected({ nextStep: event.target.value })} />
                </IndustrialField>
              </IndustrialFormGrid>
              <div className="participation-legal-note"><strong>Prüfhinweis:</strong> Bei unterbliebener oder verspäteter Beteiligung kann die SBV nach § 178 Abs. 2 Satz 2 SGB IX verlangen, dass die Durchführung oder Vollziehung der Entscheidung ausgesetzt und die Beteiligung innerhalb von sieben Tagen nachgeholt wird.</div>
            </>
          )}
        </WorkbenchDetailPanel>
      </WorkbenchGrid>
    </ModuleFrame>
  );
}
