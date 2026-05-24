import { useEffect, useMemo, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { IndustrialPanelHeader, WorkbenchNavigation, WorkbenchWorkspace } from '../../shared/components/WorkbenchLayout';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type {
  ComplianceAuditChainStatus,
  ComplianceDatabaseIntegrityStatus,
  ComplianceDocument,
  ComplianceDocumentType,
  ComplianceIncidentCategory,
  ComplianceIncidentRecord,
  ComplianceIncidentRiskLevel,
  ComplianceIncidentStatus,
  ComplianceSelfCheckResult,
  ComplianceTechnicalStatusItem,
  ComplianceTechnicalStatusLevel,
  ComplianceStatusOverview,
  CreateComplianceIncidentInput,
  DataSubjectAccessRequestInput,
  UpdateComplianceIncidentInput,
} from '../../core/models/compliance.model';
import { buildComplianceReportInput, defaultDsarInput, listComplianceDocuments, renderComplianceDocument, renderDsarResponseDocument } from '@services/complianceCenterService';

type ComplianceWorkspace = 'system' | 'self_check' | 'incidents' | 'documents' | 'dsar';

const WORKSPACES: Array<{ id: ComplianceWorkspace; title: string; description: string }> = [
  { id: 'system', title: 'Systemzustand', description: 'Tresor, temporäre Dateien, Schema und Audit-Hash-Chain.' },
  { id: 'self_check', title: 'Selbstcheck', description: 'Prüfbarer Sicherheits- und Datenschutzstatus mit Handlungsliste.' },
  { id: 'incidents', title: 'Datenschutzvorfälle', description: 'Sicherheitsereignisse dokumentieren und abschließen.' },
  { id: 'documents', title: 'Unterlagen', description: 'TOMs, VVT, DSFA, Löschkonzept und Freigaben.' },
  { id: 'dsar', title: 'Art. 15', description: 'Auskunftsersuchen vorbereiten und vorbefüllen.' },
];

const INCIDENT_CATEGORIES: Array<{ value: ComplianceIncidentCategory; label: string }> = [
  { value: 'wrong_export', label: 'Falscher Export' },
  { value: 'lost_backup', label: 'Backup/Datenträger verloren' },
  { value: 'unauthorized_access_suspected', label: 'Unberechtigter Zugriff vermutet' },
  { value: 'wrong_recipient', label: 'Falscher Empfänger' },
  { value: 'vault_integrity', label: 'Tresor-/Integritätsproblem' },
  { value: 'temporary_file', label: 'Temporäre Klartextdatei' },
  { value: 'other', label: 'Sonstiges Ereignis' },
];

const RISK_LEVELS: Array<{ value: ComplianceIncidentRiskLevel; label: string }> = [
  { value: 'low', label: 'niedrig' },
  { value: 'medium', label: 'mittel' },
  { value: 'high', label: 'hoch' },
];

const INCIDENT_STATUSES: Array<{ value: ComplianceIncidentStatus; label: string }> = [
  { value: 'open', label: 'offen' },
  { value: 'in_review', label: 'in Prüfung' },
  { value: 'reported', label: 'gemeldet' },
  { value: 'closed', label: 'abgeschlossen' },
];

function downloadTextFile(document: ComplianceDocument) {
  const blob = new Blob([document.body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function technicalLevelLabel(level: ComplianceTechnicalStatusLevel): string {
  switch (level) {
    case 'ok': return 'OK';
    case 'warning': return 'Prüfen';
    case 'problem': return 'Problem';
    case 'info': return 'Info';
  }
}

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function toDateTimeLocalValue(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function buildFallbackStatus(): ComplianceStatusOverview {
  return {
    generatedAt: new Date().toISOString(),
    technicalItems: [
      {
        id: 'runtime-status',
        label: 'Laufzeitstatus',
        level: 'warning',
        summary: 'Technischer Status konnte noch nicht vollständig geladen werden.',
        detail: 'Das Compliance Center lädt Sicherheits- und Temp-Dateistatus nach dem Öffnen nach.',
      },
    ],
    manualItems: [],
    nextTechnicalActions: ['Technischen Status aktualisieren'],
    manualCheckSummary: '',
  };
}

function buildFallbackSelfCheck(): ComplianceSelfCheckResult {
  return {
    generatedAt: new Date().toISOString(),
    score: 0,
    status: 'warning',
    items: [{ id: 'self-check-loading', label: 'Selbstcheck', status: 'warning', summary: 'Selbstcheck wurde noch nicht geladen.', action: 'Selbstcheck aktualisieren.' }],
    nextActions: ['Selbstcheck aktualisieren.'],
  };
}

function auditChainStatusItem(status?: ComplianceAuditChainStatus): ComplianceTechnicalStatusItem {
  if (!status) return {
    id: 'audit-chain',
    label: 'Audit-Hash-Chain',
    level: 'warning',
    summary: 'Audit-Hash-Chain konnte nicht geprüft werden.',
    detail: 'Bitte technischen Status erneut laden oder System-/Integritätsbericht prüfen.'
  };
  if (!status.checked) return {
    id: 'audit-chain',
    label: 'Audit-Hash-Chain',
    level: 'ok',
    summary: 'Keine Audit-Einträge vorhanden.',
  };
  return {
    id: 'audit-chain',
    label: 'Audit-Hash-Chain',
    level: status.ok ? 'ok' : 'problem',
    summary: status.ok ? `Hash-Kette intakt (${status.checked} Einträge geprüft).` : `Hash-Kette auffällig (${status.issues.length} Befund(e)).`,
    detail: status.ok
      ? `Sequenzen ${status.firstSequence ?? '—'} bis ${status.lastSequence ?? '—'}, letzter Hash ${status.latestHash.slice(0, 12)}…`
      : `Erste auffällige Sequenz: ${status.firstBrokenSequence ?? 'unbekannt'}. ${status.issues[0]?.message ?? 'Integritätsprüfung fehlgeschlagen.'}`
  };
}

function databaseIntegrityStatusItem(status?: ComplianceDatabaseIntegrityStatus): ComplianceTechnicalStatusItem {
  if (!status) return {
    id: 'database-integrity',
    label: 'Datenbankschema',
    level: 'warning',
    summary: 'Datenbankschema konnte nicht geprüft werden.',
    detail: 'Bitte technischen Status erneut laden oder Migrationsstatus prüfen.',
  };

  if (status.ok) return {
    id: 'database-integrity',
    label: 'Datenbankschema',
    level: 'ok',
    summary: `Schema ${status.appliedSchemaVersion ?? status.schemaVersion} vollständig.`,
    detail: 'Kritische Tabellen und Spalten für Fallakten-, Personen-, Datenschutz-, Audit- und Vorfallfunktionen sind vorhanden.',
  };

  return {
    id: 'database-integrity',
    label: 'Datenbankschema',
    level: status.repairRequired ? 'problem' : 'warning',
    summary: `${status.issueCount} Schema-Befund(e).`,
    detail: status.issues.slice(0, 3).join(' · '),
  };
}

async function loadComplianceStatus(): Promise<ComplianceStatusOverview> {
  const bridge = await waitForBridge();
  if (!bridge?.security) return buildFallbackStatus();

  const security = bridge.security;
  const securityStatus = await security.status();
  const tempStatus = await security.temporaryFileStatus();
  const auditStatus = await bridge.compliance?.auditChainStatus().catch(() => undefined);
  const databaseIntegrityStatus = await bridge.compliance?.databaseIntegrityStatus().catch(() => undefined);

  const technicalItems: ComplianceTechnicalStatusItem[] = [
    {
      id: 'vault',
      label: 'Verschlüsselter Tresor',
      level: securityStatus.initialized && securityStatus.databaseProtected !== false ? 'ok' : 'problem',
      summary: securityStatus.initialized ? 'Tresor ist eingerichtet.' : 'Tresor ist noch nicht eingerichtet.',
      detail: securityStatus.databaseProtected === false ? 'Die Datenbank wird als nicht geschützt gemeldet.' : undefined,
    },
    {
      id: 'temp-files',
      label: 'Temporäre Arbeitskopien',
      level: tempStatus.remaining > 0 ? 'warning' : 'ok',
      summary: tempStatus.remaining > 0 ? `${tempStatus.remaining} temporäre Datei(en) im Arbeitsbereich.` : 'Keine temporären Arbeitskopien gefunden.',
      detail: tempStatus.remaining > 0 ? 'Temporäre PDF-/Dokumentkopien sollten nach Nutzung bereinigt werden.' : undefined,
    },
    databaseIntegrityStatusItem(databaseIntegrityStatus),
    auditChainStatusItem(auditStatus),
  ];

  return {
    generatedAt: new Date().toISOString(),
    technicalItems,
    manualItems: [],
    nextTechnicalActions: technicalItems.filter((item) => item.level === 'warning' || item.level === 'problem').map((item) => item.label),
    manualCheckSummary: '',
  };
}

function ComplianceWorkspaceNav({ active, onChange }: { active: ComplianceWorkspace; onChange: (id: ComplianceWorkspace) => void }) {
  return <WorkbenchNavigation items={WORKSPACES} active={active} onChange={onChange} ariaLabel="Compliance-Arbeitsbereiche" />;
}

function ComplianceStatusPanel({ overview, onRefresh }: { overview: ComplianceStatusOverview; onRefresh: () => void }) {
  return (
    <section className="industrial-panel" aria-label="Technischer Datenschutz- und Integritätsstatus">
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Systemzustand</p>
          <h2>Datenschutz- und Integritätsstatus</h2>
          <p>Automatisch prüfbare Zustände: Tresor, temporäre Dateien, Datenbankschema und Audit-Hash-Chain.</p>
        </div>
        <div className="industrial-tag industrial-tag-warning" aria-label="Keine Gesamtbewertung der Datenschutzkonformität">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Technische Prüfung
        </div>
      </div>

      <div className="industrial-status-grid">
        {overview.technicalItems.map((item) => (
          <article key={item.id} className={`industrial-status-card industrial-status-${item.level}`}>
            <div className="industrial-status-card-header">
              <h3>{item.label}</h3>
              <span className={`industrial-tag industrial-tag-${item.level === 'problem' ? 'danger' : item.level}`} aria-label={`Technischer Status ${technicalLevelLabel(item.level)}`}>{technicalLevelLabel(item.level)}</span>
            </div>
            <p>{item.summary}</p>
            {item.detail && <small>{item.detail}</small>}
          </article>
        ))}
      </div>

      {overview.nextTechnicalActions.length > 0 && (
        <div className="industrial-action-note">
          <strong>Technische Hinweise:</strong>
          <span>{overview.nextTechnicalActions.join(' · ')}</span>
        </div>
      )}

      <button type="button" className="industrial-secondary-button" onClick={onRefresh}>
        Systemzustand aktualisieren
      </button>
    </section>
  );
}

function ComplianceSelfCheckPanel({ result, onRefresh }: { result: ComplianceSelfCheckResult; onRefresh: () => void }) {
  return (
    <section className="industrial-panel" aria-label="SBV-Sicherheits- und Datenschutz-Selbstcheck">
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Selbstcheck</p>
          <h2>Sicherheits- und Datenschutzprüfung</h2>
          <p>Der Selbstcheck bündelt technische Integrität, Datenschutzprüfungen, Übergabedaten, Vorfälle und Exportnachweise.</p>
        </div>
        <div className={`industrial-tag industrial-tag-${result.status === 'problem' ? 'danger' : result.status === 'warning' ? 'warning' : 'ok'}`}>{result.score} %</div>
      </div>
      <div className="industrial-status-grid">
        {result.items.map((entry) => (
          <article key={entry.id} className={`industrial-status-card industrial-status-${entry.status === 'ok' ? 'ok' : entry.status === 'problem' ? 'problem' : 'warning'}`}>
            <div className="industrial-status-card-header">
              <h3>{entry.label}</h3>
              <span className={`industrial-tag industrial-tag-${entry.status === 'problem' ? 'danger' : entry.status === 'warning' ? 'warning' : 'ok'}`}>{entry.status === 'ok' ? 'OK' : entry.status === 'problem' ? 'Problem' : 'Prüfen'}</span>
            </div>
            <p>{entry.summary}</p>
            {entry.action && <small>{entry.action}</small>}
          </article>
        ))}
      </div>
      {result.nextActions.length > 0 && (
        <div className="industrial-action-note">
          <strong>Nächste Schritte:</strong>
          <span>{result.nextActions.join(' · ')}</span>
        </div>
      )}
      <button type="button" className="industrial-secondary-button" onClick={onRefresh}>Selbstcheck aktualisieren</button>
    </section>
  );
}

function ComplianceIncidentsPanel({ incidents, onCreate, onUpdate }: {
  incidents: ComplianceIncidentRecord[];
  onCreate: (input: CreateComplianceIncidentInput) => void;
  onUpdate: (id: string, input: UpdateComplianceIncidentInput) => void;
}) {
  const [input, setInput] = useState<CreateComplianceIncidentInput>(() => ({
    occurredAt: new Date().toISOString(),
    discoveredAt: new Date().toISOString(),
    category: 'wrong_export',
    riskLevel: 'medium',
    summary: '',
    affectedDataCategories: '',
    immediateMeasures: '',
  }));

  function update<K extends keyof CreateComplianceIncidentInput>(key: K, value: CreateComplianceIncidentInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    onCreate(input);
    setInput({
      occurredAt: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      category: 'wrong_export',
      riskLevel: 'medium',
      summary: '',
      affectedDataCategories: '',
      immediateMeasures: '',
    });
  }

  return (
    <section className="industrial-split-grid compliance-incident-workspace" aria-label="Datenschutzvorfälle und Sicherheitsereignisse">
      <div className="industrial-panel">
        <IndustrialPanelHeader kicker="Vorfall erfassen" title="Datenschutz- oder Sicherheitsereignis dokumentieren" description="Hier werden keine Falldaten ausgewertet. Die Auditierung speichert nur technische Vorgangsdaten." />
        <div className="industrial-form-grid">
          <label className="industrial-field">
            <span>Vorfallzeitpunkt</span>
            <input type="datetime-local" value={toDateTimeLocalValue(input.occurredAt)} onChange={(event) => update('occurredAt', fromDateTimeLocalValue(event.currentTarget.value))} />
          </label>
          <label className="industrial-field">
            <span>Kenntnis der SBV</span>
            <input type="datetime-local" value={toDateTimeLocalValue(input.discoveredAt)} onChange={(event) => update('discoveredAt', fromDateTimeLocalValue(event.currentTarget.value))} />
          </label>
          <label className="industrial-field">
            <span>Art</span>
            <select value={input.category} onChange={(event) => update('category', event.currentTarget.value as ComplianceIncidentCategory)}>
              {INCIDENT_CATEGORIES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </label>
          <label className="industrial-field">
            <span>Risiko</span>
            <select value={input.riskLevel} onChange={(event) => update('riskLevel', event.currentTarget.value as ComplianceIncidentRiskLevel)}>
              {RISK_LEVELS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </label>
          <label className="industrial-field industrial-field-wide">
            <span>Kurzbeschreibung</span>
            <input value={input.summary} onChange={(event) => update('summary', event.currentTarget.value)} />
          </label>
          <label className="industrial-field industrial-field-wide">
            <span>Betroffene Datenkategorien</span>
            <textarea value={input.affectedDataCategories ?? ''} onChange={(event) => update('affectedDataCategories', event.currentTarget.value)} />
          </label>
          <label className="industrial-field industrial-field-wide">
            <span>Sofortmaßnahmen</span>
            <textarea value={input.immediateMeasures ?? ''} onChange={(event) => update('immediateMeasures', event.currentTarget.value)} />
          </label>
        </div>
        <button type="button" className="industrial-button" onClick={submit}>Vorfall speichern</button>
      </div>

      <div className="industrial-panel">
        <IndustrialPanelHeader kicker="Vorfallliste" title="Offene und abgeschlossene Ereignisse" />
        {incidents.length === 0 ? <p className="industrial-empty-state">Keine Datenschutzvorfälle dokumentiert.</p> : incidents.map((incident) => (
          <article key={incident.id} className={`industrial-record-card industrial-status-${incident.riskLevel === 'high' ? 'problem' : incident.riskLevel === 'medium' ? 'warning' : 'ok'}`}>
            <div className="industrial-record-card-header">
              <div>
                <h3>{incident.summary}</h3>
                <p>{INCIDENT_CATEGORIES.find((entry) => entry.value === incident.category)?.label ?? incident.category} · Kenntnis: {formatDateTime(incident.discoveredAt)}</p>
              </div>
              <span className={`industrial-tag industrial-tag-${incident.riskLevel === 'high' ? 'danger' : incident.riskLevel === 'medium' ? 'warning' : 'ok'}`}>{RISK_LEVELS.find((entry) => entry.value === incident.riskLevel)?.label ?? incident.riskLevel}</span>
            </div>
            <div className="industrial-record-meta">
              <label className="industrial-field">
                <span>Status</span>
                <select value={incident.status} onChange={(event) => onUpdate(incident.id, { status: event.currentTarget.value as ComplianceIncidentStatus, closedAt: event.currentTarget.value === 'closed' ? new Date().toISOString() : incident.closedAt })}>
                  {INCIDENT_STATUSES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                </select>
              </label>
              <label className="industrial-field industrial-checkbox-row">
                <input type="checkbox" checked={incident.authorityNotificationChecked} onChange={(event) => onUpdate(incident.id, { authorityNotificationChecked: event.currentTarget.checked })} />
                <span>Meldung an Aufsicht geprüft</span>
              </label>
            </div>
            {incident.immediateMeasures && <small>Sofortmaßnahmen: {incident.immediateMeasures}</small>}
          </article>
        ))}
      </div>
    </section>
  );
}

export function ComplianceView() {
  const descriptors = useMemo(() => listComplianceDocuments(), []);
  const [workspace, setWorkspace] = useState<ComplianceWorkspace>('system');
  const [selectedType, setSelectedType] = useState<ComplianceDocumentType>('toms');
  const [document, setDocument] = useState<ComplianceDocument>(() => renderComplianceDocument('toms'));
  const [message, setMessage] = useState('');
  const [dsarInput, setDsarInput] = useState<DataSubjectAccessRequestInput>(() => defaultDsarInput());
  const [statusOverview, setStatusOverview] = useState<ComplianceStatusOverview>(() => buildFallbackStatus());
  const [selfCheck, setSelfCheck] = useState<ComplianceSelfCheckResult>(() => buildFallbackSelfCheck());
  const [incidents, setIncidents] = useState<ComplianceIncidentRecord[]>([]);
  const announce = useAnnouncer();

  async function refreshStatus() {
    try {
      const next = await loadComplianceStatus();
      setStatusOverview(next);
      announce('Systemzustand wurde aktualisiert.', 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Systemzustand konnte nicht geladen werden.';
      setStatusOverview(buildFallbackStatus());
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  async function refreshSelfCheck() {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.selfCheck) throw new Error('Compliance-Selbstcheck ist nicht erreichbar.');
      const next = await bridge.compliance.selfCheck();
      setSelfCheck(next);
      announce('Compliance-Selbstcheck wurde aktualisiert.', 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Compliance-Selbstcheck konnte nicht geladen werden.';
      setSelfCheck(buildFallbackSelfCheck());
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  async function refreshIncidents() {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.listIncidents) throw new Error('Vorfallliste ist nicht erreichbar.');
      setIncidents(await bridge.compliance.listIncidents());
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Vorfallliste konnte nicht geladen werden.';
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  useEffect(() => {
    void refreshStatus();
    void refreshSelfCheck();
    void refreshIncidents();
  }, []);

  function render(type: ComplianceDocumentType) {
    const next = renderComplianceDocument(type);
    setSelectedType(type);
    setDocument(next);
    const info = `${next.title} wurde erzeugt.`;
    setMessage(info);
    announce(info, 'polite');
  }

  function updateDsarInput<K extends keyof DataSubjectAccessRequestInput>(key: K, value: DataSubjectAccessRequestInput[K]) {
    const clearsPrefill = key === 'requesterName' || key === 'caseReference';
    setDsarInput((current) => ({ ...current, [key]: value, ...(clearsPrefill ? { prefill: undefined } : {}) }));
  }

  function renderDsar() {
    const next = renderDsarResponseDocument(dsarInput);
    setSelectedType('dsar_response');
    setDocument(next);
    setWorkspace('documents');
    const info = 'Antwort auf DSGVO-Auskunftsersuchen wurde erzeugt.';
    setMessage(info);
    announce(info, 'polite');
  }

  async function prefillDsar() {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.prefillDsar) throw new Error('DSGVO-Vorbefüllung ist nicht erreichbar.');
      const prefill = await bridge.compliance.prefillDsar(dsarInput);
      const nextInput = { ...dsarInput, prefill };
      setDsarInput(nextInput);
      const next = renderDsarResponseDocument(nextInput);
      setSelectedType('dsar_response');
      setDocument(next);
      const count = prefill.persons.length + prefill.cases.length + prefill.deadlines.length + prefill.measures.length + prefill.importRuns.length + prefill.lifecycleEvents.length + prefill.freeTextMatches.length;
      const info = count > 0
        ? `Art.-15-Auskunft wurde mit ${count} strukturierten Datensatzbezug/Datensatzbezügen aus Gremia.SBV vorbefüllt.`
        : 'Art.-15-Vorbefüllung ausgeführt; es wurden keine passenden Datensatzbezüge gefunden.';
      setMessage(info);
      announce(info, 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'DSGVO-Vorbefüllung konnte nicht ausgeführt werden.';
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  function downloadCurrent() {
    downloadTextFile(document);
    const info = `${document.title} wurde als Markdown exportiert.`;
    setMessage(info);
    announce(info, 'polite');
  }

  async function exportPdfCurrent(openAfterExport = false) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
      const result = await bridge.reports.generate(buildComplianceReportInput(document));
      if (!result.ok) throw new Error(result.error ?? 'PDF-Dokument konnte nicht erzeugt werden.');
      if (openAfterExport) await bridge.reports.openExportFolder(result.filePath);
      const info = openAfterExport
        ? `${document.title} wurde als PDF erzeugt und geöffnet: ${result.fileName}`
        : `${document.title} wurde als verschlüsselter PDF-Report erzeugt: ${result.fileName}`;
      setMessage(info);
      announce(info, 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'PDF-Dokument konnte nicht erzeugt werden.';
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  async function createIncident(input: CreateComplianceIncidentInput) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.createIncident) throw new Error('Vorfallservice ist nicht erreichbar.');
      await bridge.compliance.createIncident(input);
      await refreshIncidents();
      await refreshSelfCheck();
      const info = 'Datenschutzvorfall wurde gespeichert.';
      setMessage(info);
      announce(info, 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Datenschutzvorfall konnte nicht gespeichert werden.';
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  async function updateIncident(id: string, input: UpdateComplianceIncidentInput) {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.updateIncident) throw new Error('Vorfallservice ist nicht erreichbar.');
      await bridge.compliance.updateIncident(id, input);
      await refreshIncidents();
      await refreshSelfCheck();
      announce('Datenschutzvorfall wurde aktualisiert.', 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Datenschutzvorfall konnte nicht aktualisiert werden.';
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  return (
    <ModuleFrame
      title="Compliance Center"
      description="Datenschutz, Sicherheit, Integrität, Audit, Systemzustand, Vorfälle, Betroffenenrechte und Freigabeunterlagen."
    >
      <ModuleFeedback items={[message ? { id: 'compliance-message', message } : null]} />
      <WorkbenchWorkspace
        ariaLabel="Compliance-Arbeitsbereiche"
        navigation={<ComplianceWorkspaceNav active={workspace} onChange={setWorkspace} />}
      >
        <>
          {workspace === 'system' && <ComplianceStatusPanel overview={statusOverview} onRefresh={() => void refreshStatus()} />}
          {workspace === 'self_check' && <ComplianceSelfCheckPanel result={selfCheck} onRefresh={() => void refreshSelfCheck()} />}
          {workspace === 'incidents' && <ComplianceIncidentsPanel incidents={incidents} onCreate={(input) => void createIncident(input)} onUpdate={(id, input) => void updateIncident(id, input)} />}
          {workspace === 'documents' && (
            <div className="compliance-layout">
              <section className="compliance-actions" aria-label="Compliance-Dokumente">
                {descriptors.filter((item) => item.type !== 'dsar_response').map((item) => (
                  <article key={item.type} className={`industrial-selection-card ${selectedType === item.type ? 'is-active' : ''}`}>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <button type="button" className="industrial-button" onClick={() => render(item.type)}>{item.buttonLabel}</button>
                  </article>
                ))}
              </section>
              <ComplianceDocumentPreview document={document} onDownload={downloadCurrent} onExportPdf={(open) => void exportPdfCurrent(open)} />
            </div>
          )}
          {workspace === 'dsar' && (
            <div className="compliance-layout">
              <section className="industrial-panel compliance-dsar-form" aria-label="DSGVO-Auskunftsersuchen">
                <p className="industrial-kicker">Art. 15 DSGVO</p>
                <h2>Auskunftsersuchen beantworten</h2>
                <p>Die Vorbefüllung durchsucht strukturierte Daten und relevante Freitextbezüge; die Antwort bleibt vor Versand manuell zu prüfen.</p>
                <div className="industrial-form-grid">
                  <label className="industrial-field"><span>Name der anfragenden Person</span><input value={dsarInput.requesterName} onChange={(event) => updateDsarInput('requesterName', event.currentTarget.value)} /></label>
                  <label className="industrial-field"><span>Fall-/Aktenbezug</span><input value={dsarInput.caseReference} onChange={(event) => updateDsarInput('caseReference', event.currentTarget.value)} /></label>
                  <label className="industrial-field"><span>Eingang</span><input type="date" value={dsarInput.requestReceivedAt} onChange={(event) => updateDsarInput('requestReceivedAt', event.currentTarget.value)} /></label>
                  <label className="industrial-field"><span>Antwortfrist</span><input type="date" value={dsarInput.responseDueAt} onChange={(event) => updateDsarInput('responseDueAt', event.currentTarget.value)} /></label>
                  <label className="industrial-field"><span>Bearbeitet durch</span><input value={dsarInput.preparedBy} onChange={(event) => updateDsarInput('preparedBy', event.currentTarget.value)} /></label>
                  <label className="industrial-field industrial-checkbox-row"><input type="checkbox" checked={dsarInput.identityVerified} onChange={(event) => updateDsarInput('identityVerified', event.currentTarget.checked)} /><span>Identität geprüft</span></label>
                  <label className="industrial-field industrial-field-wide"><span>Umfang des Ersuchens</span><textarea value={dsarInput.requestScope} onChange={(event) => updateDsarInput('requestScope', event.currentTarget.value)} /></label>
                </div>
                <div className="industrial-action-row">
                  <button type="button" className="industrial-secondary-button" onClick={() => void prefillDsar()}>Daten aus Gremia.SBV vorbefüllen</button>
                  <button type="button" className="industrial-button" onClick={renderDsar}>Auskunftsantwort erzeugen</button>
                </div>
                {dsarInput.prefill && (
                  <p className="compliance-dsar-prefill-summary" aria-live="polite">
                    Vorbefüllt: {dsarInput.prefill.persons.length} Personen, {dsarInput.prefill.cases.length} Fallakten, {dsarInput.prefill.deadlines.length} Fristen, {dsarInput.prefill.measures.length} Maßnahmen, {dsarInput.prefill.importRuns.length} Importe, {dsarInput.prefill.lifecycleEvents.length} Lifecycle-Ereignisse, {dsarInput.prefill.freeTextMatches.length} Freitexttreffer.
                  </p>
                )}
              </section>
              <ComplianceDocumentPreview document={document} onDownload={downloadCurrent} onExportPdf={(open) => void exportPdfCurrent(open)} />
            </div>
          )}
        </>
      </WorkbenchWorkspace>
    </ModuleFrame>
  );
}

function ComplianceDocumentPreview({ document, onDownload, onExportPdf }: { document: ComplianceDocument; onDownload: () => void; onExportPdf: (open: boolean) => void }) {
  return (
    <section className="industrial-panel compliance-preview" aria-label="Dokumentvorschau">
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Vorschau</p>
          <h2>{document.title}</h2>
          <p>{document.description}</p>
        </div>
        <div className="industrial-action-row compliance-export-actions">
          <button type="button" className="industrial-secondary-button" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Markdown exportieren
          </button>
          <button type="button" className="industrial-secondary-button" onClick={() => onExportPdf(false)}>PDF erzeugen</button>
          <button type="button" className="industrial-button" onClick={() => onExportPdf(true)}>PDF abrufen</button>
        </div>
      </div>
      <textarea className="industrial-output-area compliance-output" value={document.body} readOnly aria-label={`${document.title} Vorschau`} />
    </section>
  );
}
