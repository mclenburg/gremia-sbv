import { useEffect, useRef, useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { GremiaBrCaseCreationRecord, GremiaBrProcedureTypeOption, GremiaBrPublicSettings } from '../../../domain/models/gremia-br.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { SearchableSelectInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { createRemoteCase, getPendingRemoteCaseCreation, listRemoteProcedureTypes, resumeRemoteCaseCreation } from './gremiaBrWorkspaceActions';

function resultMessage(record: GremiaBrCaseCreationRecord): string {
  switch (record.status) {
    case 'completed': return `Fall ${record.remoteCaseReference ?? ''} und Verfahren angelegt und lokal verknüpft. Gremia.BR bitte aktualisieren.`;
    case 'case_created': return `Fall ${record.remoteCaseReference ?? ''} ist angelegt. Die Verfahrensanlage wurde abgelehnt und kann bewusst fortgesetzt werden.`;
    case 'procedure_created': return 'Das Verfahren ist angelegt. Die lokale Verknüpfung kann erneut versucht werden.';
    default: return 'Der Remote-Stand ist unklar. Bitte in Gremia.BR prüfen; eine erneute Anlage ist gesperrt.';
  }
}

export function GremiaBrCaseCreationPanel({ cases, settings }: { cases: CaseRecord[]; settings: GremiaBrPublicSettings }) {
  const announce = useAnnouncer();
  const [caseId, setCaseId] = useState('');
  const [subject, setSubject] = useState('');
  const [types, setTypes] = useState<GremiaBrProcedureTypeOption[]>([]);
  const [procedureType, setProcedureType] = useState('');
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState<GremiaBrCaseCreationRecord | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const sequence = useRef(0);
  const selectedCase = cases.find((item) => item.id === caseId);
  const selectedType = types.find((item) => item.id === procedureType);

  useEffect(() => {
    const request = ++sequence.current;
    setPending(null);
    setPreview(false);
    setPendingLoading(Boolean(caseId));
    if (!caseId) return;
    void getPendingRemoteCaseCreation(caseId).then((result) => {
      if (sequence.current === request) { setPending(result); setPendingLoading(false); }
    }).catch(() => {
      if (sequence.current === request) { setError('Offene Anlagevorgänge konnten nicht geprüft werden.'); setPendingLoading(false); }
    });
    return () => { sequence.current += 1; };
  }, [caseId]);

  async function execute(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setStatus('');
    try { await action(); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Die Gremia.BR-Aktion ist fehlgeschlagen.';
      setError(message);
      announce(message, 'assertive');
    } finally { setBusy(false); }
  }

  function showResult(result: GremiaBrCaseCreationRecord) {
    setPending(result.status === 'completed' ? null : result);
    setPreview(false);
    if (result.status === 'completed') setSubject('');
    const message = resultMessage(result);
    setStatus(message);
    announce(message, result.status === 'needs_review' ? 'assertive' : 'polite');
  }

  return <IndustrialPanel kicker="Verfahren" title="Neuen Gremia.BR-Fall anlegen" ariaLabel="Gremia.BR-Fallanlage">
    <div className="industrial-form-grid two-columns">
      <SearchableSelectInput label="Lokale Fallakte" value={caseId}
        options={cases.map((item) => ({ value: item.id, label: `${item.caseNumber} · ${item.displayName}` }))}
        onValueChange={(value) => { setCaseId(value); setError(''); setStatus(''); }} placeholder="Fallakte auswählen …" />
      <TextInput label="Sachverhalt für Gremia.BR" value={subject} maxLength={512}
        onValueChange={(value) => { setSubject(value); setPreview(false); }} />
    </div>
    <div className="industrial-action-row">
      <ToolbarButton loading={busy} disabled={busy || !settings.selectedOrganizationId || !settings.selectedSecurityDomain}
        onClick={() => void execute(async () => { setTypes(await listRemoteProcedureTypes()); setProcedureType(''); setPreview(false); })}>SBV-Verfahrensarten abrufen</ToolbarButton>
    </div>
    {types.length ? <SearchableSelectInput label="SBV-Verfahrensart" value={procedureType}
      options={types.map((item) => ({ value: item.id, label: item.title }))}
      onValueChange={(value) => { setProcedureType(value); setPreview(false); }} placeholder="Verfahrensart auswählen …" /> : null}
    {pending ? <div className="industrial-form-section">
      <p className="industrial-message industrial-message-warning" role="status">{resultMessage(pending)}</p>
      {pending.status === 'case_created' || pending.status === 'procedure_created' ? <ToolbarButton loading={busy} disabled={busy}
        onClick={() => void execute(async () => showResult(await resumeRemoteCaseCreation(pending.id)))}>Anlage fortsetzen</ToolbarButton> : null}
    </div> : null}
    {!pending && !pendingLoading && !error && selectedCase && selectedType && subject.trim() ? <div className="industrial-action-row">
      <ToolbarButton disabled={busy || !settings.selectedOrganizationId || !settings.selectedSecurityDomain}
        onClick={() => setPreview(true)}>Übertragung prüfen</ToolbarButton>
    </div> : null}
    {preview && !pending && selectedCase && selectedType ? <div className="industrial-form-section">
      <h3>Übertragung nach Gremia.BR</h3>
      <dl className="industrial-meta-grid">
        <div><dt>Lokale Fallakte</dt><dd>{selectedCase.caseNumber}</dd></div>
        <div><dt>Organisation</dt><dd>{settings.selectedOrganizationId}</dd></div>
        <div><dt>Sicherheitsbereich</dt><dd>{settings.selectedSecurityDomain}</dd></div>
        <div><dt>Sachverhalt</dt><dd>{subject.trim()}</dd></div>
        <div><dt>Verfahrensart</dt><dd>{selectedType.title}</dd></div>
      </dl>
      <p className="industrial-muted">Weitere Fallakteninhalte oder Dokumente werden nicht übertragen.</p>
      <ToolbarButton loading={busy} disabled={busy} onClick={() => void execute(async () => {
        showResult(await createRemoteCase({ localCaseId: caseId, subject: subject.trim(), procedureType }));
      })}>Fall und Verfahren verbindlich anlegen</ToolbarButton>
    </div> : null}
    {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
    {status ? <p className="industrial-message industrial-message-success" role="status">{status}</p> : null}
  </IndustrialPanel>;
}
