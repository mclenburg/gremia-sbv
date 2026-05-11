import { useEffect, useMemo, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type {
  ComplianceAuditChainStatus,
  ComplianceDocument,
  ComplianceDocumentType,
  ComplianceManualCheckItem,
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

function buildManualChecks(): ComplianceManualCheckItem[] {
  return [
    {
      id: 'toms',
      label: 'TOMs',
      summary: 'Technische und organisatorische Maßnahmen müssen fachlich geprüft und freigegeben werden.',
      detail: 'Die App kann den TOM-Entwurf erzeugen, aber nicht entscheiden, ob er organisatorisch ausreicht.',
    },
    {
      id: 'vvt',
      label: 'VVT',
      summary: 'Das Verzeichnis von Verarbeitungstätigkeiten ist organisatorisch zu prüfen.',
      detail: 'Die App kann einen Entwurf erstellen. Vollständigkeit und Verantwortlichkeit bleiben manuell zu bewerten.',
    },
    {
      id: 'dsfa',
      label: 'DSFA',
      summary: 'Ob eine Datenschutz-Folgenabschätzung erforderlich und ausreichend ist, ist manuell zu bewerten.',
    },
    {
      id: 'approvals',
      label: 'DSB-/IT-Security-Freigaben',
      summary: 'Freigaben sind menschliche Entscheidungen und werden hier nur als Prüfpunkte erinnert.',
    },
    {
      id: 'restore-proof',
      label: 'Restore organisatorisch nachweisen',
      summary: 'Die Software kann technische Backup-Funktionen bereitstellen; der tatsächliche Restore-Test ist zu dokumentieren.',
    },
  ];
}

function buildFallbackStatus(): ComplianceStatusOverview {
  return {
    generatedAt: new Date().toISOString(),
    technicalItems: [
      {
        id: 'runtime-status',
        label: 'Laufzeitstatus',
        level: 'info',
        summary: 'Technischer Status konnte noch nicht vollständig geladen werden.',
        detail: 'Das Compliance Center lädt Sicherheits- und Temp-Dateistatus nach dem Öffnen nach.',
      },
    ],
    manualItems: buildManualChecks(),
    nextTechnicalActions: ['Technischen Status aktualisieren'],
    manualCheckSummary: 'Organisatorische Prüfpunkte werden nicht durch die Software bewertet.',
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
    level: 'info',
    summary: 'Noch keine Audit-Einträge vorhanden.',
    detail: `Algorithmus ${status.algorithm}, Chain-Version ${status.chainVersion}.`
  };
  return {
    id: 'audit-chain',
    label: 'Audit-Hash-Chain',
    level: status.ok ? 'ok' : 'problem',
    summary: status.ok ? `Hash-Kette intakt (${status.checked} Einträge geprüft).` : `Hash-Kette auffällig (${status.issueCount} Befund(e)).`,
    detail: status.ok
      ? `Sequenzen ${status.firstSequence ?? '—'} bis ${status.lastSequence ?? '—'}, letzter Hash ${status.latestHash.slice(0, 12)}…`
      : `Erste auffällige Sequenz: ${status.firstBrokenSequence ?? 'unbekannt'}. ${status.issues[0]?.message ?? 'Integritätsprüfung fehlgeschlagen.'}`
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
      id: 'lock-state',
      label: 'Tresorstatus',
      level: 'info',
      summary: securityStatus.unlocked
        ? 'Tresor ist aktuell entsperrt.'
        : 'Tresor ist aktuell gesperrt oder nicht verfügbar.',
      detail: 'Dies ist ein technischer Laufzeitstatus, keine Datenschutzbewertung.',
    },
    {
      id: 'auto-lock',
      label: 'Auto-Lock',
      level: 'ok',
      summary: 'Automatische Sperre ist technisch in der App-Basis vorgesehen.',
      detail: 'Die konkrete organisatorische Vorgabe zum Sperrzeitraum ist separat festzulegen.',
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
    auditChainStatusItem(auditStatus),
    {
      id: 'backup-function',
      label: 'Backup-Funktion',
      level: 'info',
      summary: 'Verschlüsselte Backups sind technisch vorgesehen.',
      detail: 'Ob ein Restore organisatorisch durchgeführt und dokumentiert wurde, kann die Software nicht selbst bewerten.',
    },
    {
      id: 'compliance-documents',
      label: 'Compliance-Dokumente',
      level: 'info',
      summary: 'TOMs, VVT, DSFA und Freigabeunterlagen können als Entwürfe erzeugt werden.',
      detail: 'Inhaltliche Vollständigkeit und Freigaben bleiben manuell zu prüfen.',
    },
  ];

  const nextTechnicalActions = technicalItems
    .filter((item) => item.level === 'warning' || item.level === 'problem')
    .map((item) => item.label);

  return {
    generatedAt: new Date().toISOString(),
    technicalItems,
    manualItems: buildManualChecks(),
    nextTechnicalActions: nextTechnicalActions.length ? nextTechnicalActions : ['Keine technischen Handlungsbedarfe aus automatischer Prüfung.'],
    manualCheckSummary: 'Organisatorische Entscheidungen wie DSB-/IT-Freigaben, DSFA-Bewertung und TOM-Vollständigkeit werden nur erinnert, nicht bewertet.',
  };
}

function ComplianceStatusPanel({ overview, onRefresh }: { overview: ComplianceStatusOverview; onRefresh: () => void }) {
  return (
    <section className="compliance-status-panel" aria-label="Technischer Datenschutz- und Integritätsstatus">
      <div className="compliance-status-header">
        <div>
          <p className="industrial-kicker">Technischer Status</p>
          <h2>Datenschutz- und Integritätsstatus</h2>
          <p>Automatisch geprüft werden nur technische Zustände, die die Software selbst feststellen kann.</p>
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

      <div className="compliance-next-actions">
        <strong>Technische Hinweise:</strong>
        <span>{overview.nextTechnicalActions.join(' · ')}</span>
      </div>

      <section className="compliance-manual-checks" aria-label="Organisatorische Datenschutz-Prüfpunkte">
        <div className="compliance-manual-checks-header">
          <div>
            <p className="industrial-kicker">Manuelle Prüfung</p>
            <h3>Organisatorische Datenschutz-Prüfpunkte</h3>
          </div>
          <span>Nicht durch Software bewertbar</span>
        </div>
        <p>{overview.manualCheckSummary}</p>
        <div className="compliance-manual-grid">
          {overview.manualItems.map((item) => (
            <article key={item.id} className="compliance-manual-card">
              <h4>{item.label}</h4>
              <p>{item.summary}</p>
              {item.detail && <small>{item.detail}</small>}
            </article>
          ))}
        </div>
      </section>

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
    setDsarInput((current) => ({ ...current, [key]: value }));
  }

  function renderDsar() {
    const next = renderDsarResponseDocument(dsarInput);
    setSelectedType('dsar_response');
    setDocument(next);
    const info = 'Antwort auf DSGVO-Auskunftsersuchen wurde erzeugt.';
    setMessage(info);
    announce(info, 'polite');
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
          <button type="button" className="industrial-button" onClick={renderDsar}>
            Auskunftsantwort erzeugen
          </button>
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
          {message && <div className="industrial-message">{message}</div>}
          <textarea className="industrial-output-area compliance-output" value={document.body} readOnly aria-label={`${document.title} Vorschau`} />
        </section>
      </div>
    </ModuleFrame>
  );
}
