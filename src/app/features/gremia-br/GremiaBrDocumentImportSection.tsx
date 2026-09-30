import { useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { GremiaBrDocumentDetail } from '../../../domain/models/gremia-br.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { SearchableSelectInput } from '../../shared/components/IndustrialForm';
import { CheckboxField } from '../../shared/components/IndustrialSelectionInputs';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { importRemoteDocumentVersion } from './gremiaBrWorkspaceActions';
import { caseOptions } from './gremiaBrWorkspaceModel';

export function GremiaBrDocumentImportSection({ detail, cases }: { detail: GremiaBrDocumentDetail; cases: CaseRecord[] }) {
  const announce = useAnnouncer();
  const [versionId, setVersionId] = useState(detail.currentVersionId ?? '');
  const [caseId, setCaseId] = useState('');
  const [containsHealthData, setContainsHealthData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const version = detail.versions.find((item) => item.id === versionId && item.processingState === 'READY');
  const target = cases.find((item) => item.id === caseId);

  async function submit() {
    if (!version || !target || busy) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await importRemoteDocumentVersion({ documentId: detail.id, versionId: version.id, title: detail.title, caseId: target.id, containsHealthData });
      const message = `Version ${version.versionNumber} von ${detail.title} wurde in Fallakte ${target.caseNumber} übernommen.`;
      setStatus(message);
      announce(message, 'polite');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Die Dokumentübernahme ist fehlgeschlagen. Bitte erneut versuchen.';
      setError(message);
      announce(message, 'assertive');
    } finally { setBusy(false); }
  }

  return <div className="industrial-form-section">
    <h4>In Fallakte übernehmen</h4>
    <div className="industrial-form-grid two-columns">
      <SearchableSelectInput label="Dokumentversion" value={versionId}
        options={detail.versions.filter((item) => item.processingState === 'READY').map((item) => ({ value: item.id, label: `Version ${item.versionNumber}: ${item.filename}` }))}
        onValueChange={setVersionId} placeholder="Version auswählen …" disabled={busy} />
      <SearchableSelectInput label="Zielfallakte" value={caseId} options={caseOptions(cases)}
        onValueChange={setCaseId} placeholder="Fallakte suchen …" disabled={busy} />
    </div>
    <CheckboxField label="Enthält Gesundheitsdaten" checked={containsHealthData} onCheckedChange={setContainsHealthData} disabled={busy} />
    {version && target ? <p className="industrial-muted">
      {detail.title}, Version {version.versionNumber} in Fallakte {target.caseNumber}
    </p> : null}
    <ToolbarButton loading={busy} disabled={!version || !target || busy} onClick={() => void submit()}>Dokument dauerhaft übernehmen</ToolbarButton>
    {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
    {status ? <p className="industrial-message industrial-message-success" role="status">{status}</p> : null}
  </div>;
}
