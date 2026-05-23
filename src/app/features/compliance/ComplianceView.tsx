import { useEffect, useMemo, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type {
  ComplianceAuditChainStatus,
  ComplianceDatabaseIntegrityStatus,
  ComplianceDocument,
  ComplianceDocumentType,
  ComplianceStatusOverview,
  ComplianceTechnicalStatusItem,
  ComplianceTechnicalStatusLevel,
  DataSubjectAccessRequestInput,
} from '../../core/models/compliance.model';
import { buildComplianceReportInput, defaultDsarInput, listComplianceDocuments, renderComplianceDocument, renderDsarResponseDocument } from '@services/complianceCenterService';

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
    detail: 'Kritische Tabellen und Spalten für Fallakten-, Personen-, Datenschutz- und Auditfunktionen sind vorhanden.',
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
  if (!bridge?.security) {
    return buildFallbackStatus();
  }

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
      summary: securityStatus.initialized
        ? 'Tresor ist eingerichtet.'
        : 'Tresor ist noch nicht eingerichtet.',
      detail: securityStatus.databaseProtected === false
        ? 'Die Datenbank wird als nicht geschützt gemeldet.'
        : undefined,
    },
    {
      id: 'temp-files',
      label: 'Temporäre Arbeitskopien',
      level: tempStatus.remaining > 0 ? 'warning' : 'ok',
      summary: tempStatus.remaining > 0
        ? `${tempStatus.remaining} temporäre Datei(en) im Arbeitsbereich.`
        : 'Keine temporären Arbeitskopien gefunden.',
      detail: tempStatus.remaining > 0
        ? 'Temporäre PDF-/Dokumentkopien sollten nach Nutzung bereinigt werden.'
        : undefined,
    },
    databaseIntegrityStatusItem(databaseIntegrityStatus),
    auditChainStatusItem(auditStatus),
  ];

  const nextTechnicalActions = technicalItems
    .filter((item) => item.level === 'warning' || item.level === 'problem')
    .map((item) => item.label);

  return {
    generatedAt: new Date().toISOString(),
    technicalItems,
    manualItems: [],
    nextTechnicalActions,
    manualCheckSummary: '',
  };
}

function ComplianceStatusPanel({ overview, onRefresh }: { overview: ComplianceStatusOverview; onRefresh: () => void }) {
  return (
    <section className="compliance-status-panel" aria-label="Technischer Datenschutz- und Integritätsstatus">
      <div className="compliance-status-header">
        <div>
          <p className="industrial-kicker">Technischer Status</p>
          <h2>Datenschutz- und Integritätsstatus</h2>
          <p>Gezeigt werden nur automatisch prüfbare technische Zustände. Organisatorische Freigaben stehen unten bei den Dokumenten.</p>
        </div>
        <div className="compliance-status-badge" aria-label="Keine Gesamtbewertung der Datenschutzkonformität">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Technische Prüfung
        </div>
      </div>

      <div className="compliance-status-grid">
        {overview.technicalItems.map((item) => (
          <article key={item.id} className={`compliance-status-card tech-${item.level}`}>
            <div className="compliance-status-card-header">
              <h3>{item.label}</h3>
              <span aria-label={`Technischer Status ${technicalLevelLabel(item.level)}`}>{technicalLevelLabel(item.level)}</span>
            </div>
            <p>{item.summary}</p>
            {item.detail && <small>{item.detail}</small>}
          </article>
        ))}
      </div>

      {overview.nextTechnicalActions.length > 0 && (
        <div className="compliance-next-actions">
          <strong>Technische Hinweise:</strong>
          <span>{overview.nextTechnicalActions.join(' · ')}</span>
        </div>
      )}

      <button type="button" className="industrial-secondary-button" onClick={onRefresh}>
        Technischen Status aktualisieren
      </button>
    </section>
  );
}

export function ComplianceView() {
  const descriptors = useMemo(() => listComplianceDocuments(), []);
  const [selectedType, setSelectedType] = useState<ComplianceDocumentType>('toms');
  const [document, setDocument] = useState<ComplianceDocument>(() => renderComplianceDocument('toms'));
  const [message, setMessage] = useState('');
  const [dsarInput, setDsarInput] = useState<DataSubjectAccessRequestInput>(() => defaultDsarInput());
  const [statusOverview, setStatusOverview] = useState<ComplianceStatusOverview>(() => buildFallbackStatus());
  const announce = useAnnouncer();

  async function refreshStatus() {
    try {
      const next = await loadComplianceStatus();
      setStatusOverview(next);
      announce('Technischer Datenschutzstatus wurde aktualisiert.', 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Technischer Datenschutzstatus konnte nicht geladen werden.';
      setStatusOverview(buildFallbackStatus());
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  useEffect(() => {
    void refreshStatus();
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
      const count = prefill.persons.length + prefill.cases.length + prefill.deadlines.length + prefill.measures.length + prefill.importRuns.length + prefill.lifecycleEvents.length;
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
      if (openAfterExport) {
        await bridge.reports.openExportFolder(result.filePath);
      }
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

  return (
    <ModuleFrame
      title="Compliance Center"
      description="Technischer Datenschutzstatus, organisatorische Prüflisten, TOMs, VVT, DSFA, Löschkonzept, Betroffenenrechte und Freigabeunterlagen."
    >
      <ModuleFeedback items={[message ? { id: 'compliance-message', message } : null]} />
      <div className="compliance-layout">
        <ComplianceStatusPanel overview={statusOverview} onRefresh={() => void refreshStatus()} />

        <section className="compliance-actions" aria-label="Compliance-Dokumente">
          {descriptors.map((item) => (
            <article key={item.type} className={`compliance-card ${selectedType === item.type ? 'active' : ''}`}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <button type="button" className="industrial-button" onClick={() => item.type === 'dsar_response' ? renderDsar() : render(item.type)}>
                {item.buttonLabel}
              </button>
            </article>
          ))}
        </section>

        <section className="compliance-dsar-form" aria-label="DSGVO-Auskunftsersuchen">
          <p className="industrial-kicker">Art. 15 DSGVO</p>
          <h2>Auskunftsersuchen beantworten</h2>
          <p>Diese Eingaben werden nur in das erzeugte Markdown-Dokument übernommen.</p>
          <div className="compliance-form-grid">
            <label>
              <span>Name der anfragenden Person</span>
              <input value={dsarInput.requesterName} onChange={(event) => updateDsarInput('requesterName', event.currentTarget.value)} />
            </label>
            <label>
              <span>Fall-/Aktenbezug</span>
              <input value={dsarInput.caseReference} onChange={(event) => updateDsarInput('caseReference', event.currentTarget.value)} />
            </label>
            <label>
              <span>Eingang</span>
              <input type="date" value={dsarInput.requestReceivedAt} onChange={(event) => updateDsarInput('requestReceivedAt', event.currentTarget.value)} />
            </label>
            <label>
              <span>Antwortfrist</span>
              <input type="date" value={dsarInput.responseDueAt} onChange={(event) => updateDsarInput('responseDueAt', event.currentTarget.value)} />
            </label>
            <label>
              <span>Bearbeitet durch</span>
              <input value={dsarInput.preparedBy} onChange={(event) => updateDsarInput('preparedBy', event.currentTarget.value)} />
            </label>
            <label className="compliance-checkbox">
              <input type="checkbox" checked={dsarInput.identityVerified} onChange={(event) => updateDsarInput('identityVerified', event.currentTarget.checked)} />
              <span>Identität geprüft</span>
            </label>
            <label className="compliance-wide">
              <span>Umfang des Ersuchens</span>
              <textarea value={dsarInput.requestScope} onChange={(event) => updateDsarInput('requestScope', event.currentTarget.value)} />
            </label>
          </div>
          <div className="compliance-dsar-prefill-actions">
            <button type="button" className="industrial-secondary-button" onClick={() => void prefillDsar()}>
              Daten aus Gremia.SBV vorbefüllen
            </button>
            <button type="button" className="industrial-button" onClick={renderDsar}>
              Auskunftsantwort erzeugen
            </button>
          </div>
          {dsarInput.prefill && (
            <p className="compliance-dsar-prefill-summary" aria-live="polite">
              Vorbefüllt: {dsarInput.prefill.persons.length} Personen, {dsarInput.prefill.cases.length} Fallakten, {dsarInput.prefill.deadlines.length} Fristen, {dsarInput.prefill.measures.length} Maßnahmen, {dsarInput.prefill.importRuns.length} Importe, {dsarInput.prefill.lifecycleEvents.length} Lifecycle-Ereignisse.
            </p>
          )}
        </section>

        <section className="compliance-preview" aria-label="Dokumentvorschau">
          <div className="compliance-preview-header">
            <div>
              <p className="industrial-kicker">Vorschau</p>
              <h2>{document.title}</h2>
              <p>{document.description}</p>
            </div>
            <div className="compliance-export-actions">
              <button type="button" className="industrial-secondary-button" onClick={downloadCurrent}>
                <Download className="h-4 w-4" />
                Markdown exportieren
              </button>
              <button type="button" className="industrial-secondary-button" onClick={() => void exportPdfCurrent(false)}>
                PDF erzeugen
              </button>
              <button type="button" className="industrial-button" onClick={() => void exportPdfCurrent(true)}>
                PDF abrufen
              </button>
            </div>
          </div>
          <textarea className="industrial-output-area compliance-output" value={document.body} readOnly aria-label={`${document.title} Vorschau`} />
        </section>
      </div>
    </ModuleFrame>
  );
}
