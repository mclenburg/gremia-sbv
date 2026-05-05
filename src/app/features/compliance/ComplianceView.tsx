import { useEffect, useMemo, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type {
  ComplianceDocument,
  ComplianceDocumentType,
  ComplianceStatusItem,
  ComplianceStatusLevel,
  ComplianceStatusOverview,
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

function levelLabel(level: ComplianceStatusLevel): string {
  switch (level) {
    case 'green': return 'Grün';
    case 'yellow': return 'Gelb';
    case 'red': return 'Rot';
  }
}

function buildOverallLevel(items: ComplianceStatusItem[]): ComplianceStatusLevel {
  if (items.some((item) => item.level === 'red')) return 'red';
  if (items.some((item) => item.level === 'yellow')) return 'yellow';
  return 'green';
}

function buildFallbackStatus(): ComplianceStatusOverview {
  const items: ComplianceStatusItem[] = [
    {
      id: 'runtime-status',
      label: 'Laufzeitstatus',
      level: 'yellow',
      summary: 'Status konnte noch nicht vollständig geladen werden.',
      detail: 'Das Compliance Center lädt Sicherheits- und Temp-Dateistatus nach dem Öffnen nach.',
    },
    {
      id: 'organizational-approval',
      label: 'Organisatorische Freigaben',
      level: 'yellow',
      summary: 'DSB-/IT-Security-Freigaben müssen organisatorisch dokumentiert werden.',
    },
  ];
  return {
    generatedAt: new Date().toISOString(),
    overallLevel: buildOverallLevel(items),
    items,
    nextActions: ['Datenschutzstatus aktualisieren', 'TOMs, VVT und DSFA vor Produktivnutzung prüfen'],
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

  const items: ComplianceStatusItem[] = [
    {
      id: 'vault',
      label: 'Verschlüsselter Tresor',
      level: securityStatus.initialized && securityStatus.databaseProtected !== false ? 'green' : 'red',
      summary: securityStatus.initialized
        ? 'Tresor ist eingerichtet.'
        : 'Tresor ist noch nicht eingerichtet.',
      detail: securityStatus.databaseProtected === false
        ? 'Die Datenbank wird als nicht geschützt gemeldet.'
        : undefined,
    },
    {
      id: 'unlocked-state',
      label: 'Aktueller Schutzstatus',
      level: securityStatus.unlocked ? 'green' : 'yellow',
      summary: securityStatus.unlocked
        ? 'Tresor ist aktuell entsperrt; Auto-Lock und manuelle Sperre bleiben maßgeblich.'
        : 'Tresor ist aktuell gesperrt oder nicht verfügbar.',
    },
    {
      id: 'auto-lock',
      label: 'Auto-Lock',
      level: 'green',
      summary: 'Automatische Sperre ist in der App-Basis vorgesehen.',
      detail: 'Vor Produktivnutzung sollte der Sperrzeitraum praktisch getestet werden.',
    },
    {
      id: 'temp-files',
      label: 'Temporäre Arbeitskopien',
      level: tempStatus.remaining > 0 ? 'yellow' : 'green',
      summary: tempStatus.remaining > 0
        ? `${tempStatus.remaining} temporäre Datei(en) im Arbeitsbereich.`
        : 'Keine temporären Arbeitskopien gefunden.',
      detail: tempStatus.remaining > 0
        ? 'Temporäre PDF-/Dokumentkopien sollten nach Nutzung bereinigt werden.'
        : undefined,
    },
    {
      id: 'audit-chain',
      label: 'Audit-Hash-Chain',
      level: 'yellow',
      summary: 'Manipulationserkennung ist technisch vorhanden; Prüfung erfolgt im System- und Integritätsbericht.',
    },
    {
      id: 'backup',
      label: 'Backup / Restore',
      level: 'yellow',
      summary: 'Verschlüsselte Backups sind vorgesehen; ein Restore-Test muss organisatorisch nachgewiesen werden.',
    },
    {
      id: 'compliance-documents',
      label: 'TOMs, VVT, DSFA',
      level: 'yellow',
      summary: 'Dokumente können erzeugt werden; fachliche Freigabe durch DSB/IT-Security bleibt erforderlich.',
    },
  ];

  const nextActions = items
    .filter((item) => item.level !== 'green')
    .map((item) => item.label);

  return {
    generatedAt: new Date().toISOString(),
    overallLevel: buildOverallLevel(items),
    items,
    nextActions: nextActions.length ? nextActions : ['Keine offenen Statuspunkte aus der automatischen Prüfung. Organisatorische Freigabe dokumentieren.'],
  };
}

function ComplianceStatusPanel({ overview, onRefresh }: { overview: ComplianceStatusOverview; onRefresh: () => void }) {
  return (
    <section className={`compliance-status-panel status-${overview.overallLevel}`} aria-label="Datenschutzstatus">
      <div className="compliance-status-header">
        <div>
          <p className="industrial-kicker">Datenschutzstatus</p>
          <h2>1.0-Vorbereitung</h2>
          <p>Technische Signale und organisatorische Prüfpunkte vor produktiver Nutzung.</p>
        </div>
        <div className="compliance-status-badge" aria-label={`Gesamtstatus ${levelLabel(overview.overallLevel)}`}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          {levelLabel(overview.overallLevel)}
        </div>
      </div>
      <div className="compliance-status-grid">
        {overview.items.map((item) => (
          <article key={item.id} className={`compliance-status-card status-${item.level}`}>
            <div className="compliance-status-card-header">
              <h3>{item.label}</h3>
              <span aria-label={`Status ${levelLabel(item.level)}`}>{levelLabel(item.level)}</span>
            </div>
            <p>{item.summary}</p>
            {item.detail && <small>{item.detail}</small>}
          </article>
        ))}
      </div>
      <div className="compliance-next-actions">
        <strong>Nächste Prüfpunkte:</strong>
        <span>{overview.nextActions.join(' · ')}</span>
      </div>
      <button type="button" className="industrial-secondary-button" onClick={onRefresh}>
        Status aktualisieren
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
      announce('Datenschutzstatus wurde aktualisiert.', 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Datenschutzstatus konnte nicht geladen werden.';
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
      description="TOMs, VVT, DSFA, Datenschutzstatus, Release-Checklisten, Löschkonzept, Betroffenenrechte und Freigabeunterlagen."
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
