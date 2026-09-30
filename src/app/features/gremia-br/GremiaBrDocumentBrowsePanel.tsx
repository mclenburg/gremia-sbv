import { useEffect, useRef, useState } from 'react';
import type { GremiaBrDocumentDetail, GremiaBrDocumentHit } from '../../../domain/models/gremia-br.model';
import type { CaseRecord } from '../../../domain/models/case.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { SearchableSelectInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { loadRemoteDocumentDetail, openRemoteDocumentVersion, searchRemoteDocuments } from './gremiaBrWorkspaceActions';
import { GremiaBrDocumentImportSection } from './GremiaBrDocumentImportSection';

const PROTECTION_LABELS: Record<string, string> = {
  INTERNAL: 'Intern', CONFIDENTIAL: 'Vertraulich', HIGH: 'Hoch schutzbedürftig', RESTRICTED: 'Streng beschränkt',
};
const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktiv', SUPERSEDED: 'Ersetzt', WITHDRAWN: 'Zurückgezogen', DELETED: 'Gelöscht',
};
const SHARE_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Angefragt', ACTIVE: 'Aktiv', EXPIRED: 'Abgelaufen', REVOKED: 'Widerrufen',
};

function DocumentDetailSection({ detail, busy, onOpenVersion }: {
  detail: GremiaBrDocumentDetail;
  busy: boolean;
  onOpenVersion: (versionId: string) => void;
}) {
  return (
    <div className="industrial-form-section">
      <h3>{detail.title}</h3>
      {detail.description ? <p>{detail.description}</p> : null}
      <dl className="industrial-meta-grid">
        <div><dt>Status</dt><dd>{DOCUMENT_STATUS_LABELS[detail.status] ?? detail.status}</dd></div>
        <div><dt>Schutzklasse</dt><dd>{PROTECTION_LABELS[detail.protectionClass] ?? detail.protectionClass}</dd></div>
        <div><dt>Versionen</dt><dd>{detail.versions.length}</dd></div>
      </dl>
      <h4>Versionen</h4>
      {detail.versions.length ? <ul>{detail.versions.map((version) => (
        <li key={version.id}>Version {version.versionNumber}: {version.filename || 'Dateiname nicht freigegeben'} ({version.mimeType || 'Dateityp unbekannt'}){' '}
          {version.processingState === 'READY' ? <ToolbarButton disabled={busy} onClick={() => onOpenVersion(version.id)}>Version {version.versionNumber} öffnen</ToolbarButton> : null}
        </li>
      ))}</ul> : <p className="industrial-muted">Keine Versionen verfügbar.</p>}
      <h4>Freigaben</h4>
      {detail.shares.length ? <ul>{detail.shares.map((share) => (
        <li key={share.id}>{share.targetSecurityDomain}: {SHARE_STATUS_LABELS[share.status] ?? share.status}, gültig bis {new Date(share.validUntil).toLocaleDateString('de-DE')}</li>
      ))}</ul> : <p className="industrial-muted">Keine Freigaben vorhanden.</p>}
    </div>
  );
}

export function GremiaBrDocumentBrowsePanel({ cases }: { cases: CaseRecord[] }) {
  const announce = useAnnouncer();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GremiaBrDocumentHit[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<GremiaBrDocumentDetail | null>(null);
  const [busy, setBusy] = useState<'search' | 'detail' | 'preview' | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current += 1; }, []);

  async function search() {
    if (!query.trim() || busy) return;
    const request = ++sequence.current;
    setBusy('search');
    setError('');
    setStatus('');
    setHits(null);
    setSelectedId('');
    setDetail(null);
    try {
      const result = await searchRemoteDocuments(query.trim());
      if (sequence.current === request) {
        setHits(result);
        announce(`${result.length} Dokumente gefunden.`, 'polite');
      }
    } catch (cause) {
      if (sequence.current === request) {
        const message = cause instanceof Error ? cause.message : 'Dokumentensuche fehlgeschlagen. Bitte erneut versuchen.';
        setError(message);
        announce(message, 'assertive');
      }
    } finally {
      if (sequence.current === request) setBusy(null);
    }
  }

  async function loadDetail() {
    if (!selectedId || busy || !hits?.some((hit) => hit.documentId === selectedId)) return;
    const request = ++sequence.current;
    setBusy('detail');
    setError('');
    setStatus('');
    setDetail(null);
    try {
      const result = await loadRemoteDocumentDetail(selectedId);
      if (sequence.current === request) {
        setDetail(result);
        announce('Dokumentdetails wurden geladen.', 'polite');
      }
    } catch (cause) {
      if (sequence.current === request) {
        const message = cause instanceof Error ? cause.message : 'Dokumentdetails konnten nicht geladen werden. Bitte erneut versuchen.';
        setError(message);
        announce(message, 'assertive');
      }
    } finally {
      if (sequence.current === request) setBusy(null);
    }
  }

  async function openVersion(versionId: string) {
    if (!detail || busy || !detail.versions.some((version) => version.id === versionId)) return;
    const request = ++sequence.current;
    setBusy('preview');
    setError('');
    setStatus('');
    try {
      const result = await openRemoteDocumentVersion(detail.id, versionId);
      if (sequence.current === request) {
        if (!result.opened) throw new Error(result.error || 'Die Vorschau konnte nicht geöffnet werden.');
        setStatus('Die Dokumentvorschau wurde angefordert.');
        announce('Die Dokumentvorschau wurde angefordert.', 'polite');
      }
    } catch (cause) {
      if (sequence.current === request) {
        const message = cause instanceof Error ? cause.message : 'Die Dokumentversion konnte nicht geöffnet werden.';
        setError(message);
        announce(message, 'assertive');
      }
    } finally {
      if (sequence.current === request) setBusy(null);
    }
  }

  return (
    <IndustrialPanel kicker="Dokumente" title="Gremia.BR-Dokumente" ariaLabel="Gremia.BR-Dokumente">
      <div className="industrial-form-grid two-columns">
        <TextInput label="Dokument suchen" value={query} onValueChange={setQuery} maxLength={512} />
      </div>
      <div className="industrial-action-row">
        <ToolbarButton loading={busy === 'search'} disabled={busy !== null || !query.trim()} onClick={() => void search()}>Suche starten</ToolbarButton>
      </div>
      {hits ? (
        hits.length ? (
          <div className="industrial-form-section">
            <SearchableSelectInput
              label="Gefundenes Dokument auswählen"
              value={selectedId}
              options={hits.map((hit) => ({ value: hit.documentId, label: hit.title }))}
              onValueChange={(value) => { sequence.current += 1; setSelectedId(value); setDetail(null); setStatus(''); setBusy(null); }}
              placeholder="Dokumenttitel tippen …"
            />
            <ToolbarButton loading={busy === 'detail'} disabled={busy !== null || !selectedId} onClick={() => void loadDetail()}>Details abrufen</ToolbarButton>
          </div>
        ) : <p className="industrial-muted">Keine Dokumente gefunden.</p>
      ) : null}
      {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
      {status ? <p className="industrial-message industrial-message-success" role="status">{status}</p> : null}
      {detail ? <>
        <DocumentDetailSection detail={detail} busy={busy !== null} onOpenVersion={(versionId) => void openVersion(versionId)} />
        <GremiaBrDocumentImportSection key={detail.id} detail={detail} cases={cases} />
      </> : null}
    </IndustrialPanel>
  );
}
