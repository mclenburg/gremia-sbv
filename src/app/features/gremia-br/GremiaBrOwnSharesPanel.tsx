import { useEffect, useState } from 'react';
import type { GremiaBrManagedDocument, GremiaBrOwnShare, GremiaBrWorkspaceActionRecord } from '../../../domain/models/gremia-br.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { DateInput, SearchableSelectInput, TextInput } from '../../shared/components/IndustrialForm';
import { CheckboxField } from '../../shared/components/IndustrialSelectionInputs';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { createOwnDocumentShare, listManagedRemoteDocuments, listOwnDocumentShares, revokeOwnDocumentShare } from './gremiaBrWorkspaceActions';
import { GremiaBrClassificationSection } from './GremiaBrClassificationSection';

const SHARE_STATUS: Record<string, string> = { REQUESTED: 'Angefragt', ACTIVE: 'Aktiv', EXPIRED: 'Abgelaufen', REVOKED: 'Widerrufen' };
const REQUIREMENT: Record<string, string> = { NONE: 'Keine weitere Prüfung', APPROVAL: 'Zweite Freigabe erforderlich', STEP_UP: 'Zusätzliche Authentisierung erforderlich', APPROVAL_AND_STEP_UP: 'Zweite Freigabe und zusätzliche Authentisierung erforderlich' };

export function GremiaBrOwnSharesPanel({ actions }: { actions: GremiaBrWorkspaceActionRecord[] }) {
  const announce = useAnnouncer();
  const [documents, setDocuments] = useState<GremiaBrManagedDocument[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [shares, setShares] = useState<GremiaBrOwnShare[] | null>(null);
  const [targetSecurityDomain, setTargetSecurityDomain] = useState('');
  const [purpose, setPurpose] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [soloJustification, setSoloJustification] = useState('');
  const [soloRelease, setSoloRelease] = useState(false);
  const [shareId, setShareId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const selectedDocument = documents.find((document) => document.remoteDocumentId === documentId);
  const selectedShare = shares?.find((share) => share.id === shareId);

  useEffect(() => {
    let active = true;
    void listManagedRemoteDocuments().then((items) => { if (active) setDocuments(items); })
      .catch(() => { if (active) setError('Die lokalen übertragenen Dokumente konnten nicht geladen werden.'); });
    return () => { active = false; };
  }, [actions]);

  async function execute(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setStatus('');
    try { await action(); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Die Freigabeaktion ist fehlgeschlagen. Bitte erneut prüfen.';
      setError(message);
      announce(message, 'assertive');
    } finally { setBusy(false); }
  }

  function success(message: string) { setStatus(message); announce(message, 'polite'); }

  return <IndustrialPanel kicker="Dokumente" title="Eigene Freigaben" ariaLabel="Eigene Gremia.BR-Dokumentfreigaben">
    {documents.length ? <>
      <SearchableSelectInput label="Selbst übertragenes Dokument" value={documentId}
        options={documents.map((document) => ({ value: document.remoteDocumentId, label: document.title }))}
        onValueChange={(value) => { setDocumentId(value); setShares(null); setShareId(''); setError(''); setStatus(''); }}
        placeholder="Dokument suchen …" disabled={busy} />
      {selectedDocument ? <>
        <GremiaBrClassificationSection key={documentId} documentId={documentId} title={selectedDocument.title} />
        <ToolbarButton loading={busy} disabled={busy} onClick={() => void execute(async () => {
          const result = await listOwnDocumentShares(documentId);
          setShares(result); setShareId(''); success(`${result.length} Freigaben geladen.`);
        })}>Freigaben abrufen</ToolbarButton>
        {shares ? <div className="industrial-form-section">
          <h4>Vorhandene Freigaben</h4>
          {shares.length ? <ul>{shares.map((share) => <li key={share.id}>
            <details><summary>{share.targetSecurityDomain}: {SHARE_STATUS[share.status] ?? share.status}, gültig bis {new Date(share.validUntil).toLocaleDateString('de-DE')}</summary>
              <p>{REQUIREMENT[share.requirement] ?? 'Sicherheitsprüfung durch Gremia.BR'}{share.purpose ? ` · Zweck: ${share.purpose}` : ''}</p>
            </details>
          </li>)}</ul> : <p className="industrial-muted">Keine Freigaben vorhanden.</p>}
          {shares.some((share) => ['ACTIVE', 'REQUESTED'].includes(share.status)) ? <>
            <SearchableSelectInput label="Freigabe zum Widerruf" value={shareId}
              options={shares.filter((share) => ['ACTIVE', 'REQUESTED'].includes(share.status)).map((share) => ({ value: share.id, label: `${share.targetSecurityDomain}, bis ${new Date(share.validUntil).toLocaleDateString('de-DE')}` }))}
              onValueChange={setShareId} placeholder="Freigabe auswählen …" disabled={busy} />
            {selectedShare ? <>
              <TextInput label="Grund für den Widerruf" value={reason} onValueChange={setReason} maxLength={1024} disabled={busy} required />
              <ToolbarButton loading={busy} disabled={busy || !reason.trim()} onClick={() => void execute(async () => {
                await revokeOwnDocumentShare({ documentId, shareId, reason });
                setShares(null); setShareId(''); setReason(''); success('Freigabe widerrufen. Für den aktuellen Stand Freigaben erneut abrufen.');
              })}>Freigabe widerrufen</ToolbarButton>
            </> : null}
          </> : null}
        </div> : null}
        <div className="industrial-form-section">
          <h4>Weitere Freigabe</h4>
          <div className="industrial-form-grid two-columns">
            <TextInput label="Ziel-Sicherheitsbereich" value={targetSecurityDomain} onValueChange={setTargetSecurityDomain} disabled={busy} required />
            <DateInput label="Gültig bis" value={validUntil} onValueChange={setValidUntil} disabled={busy} required />
          </div>
          <TextInput label="Freigabezweck" value={purpose} onValueChange={setPurpose} maxLength={1024} disabled={busy} required />
          <CheckboxField label="Alleinfreigabe erforderlich" checked={soloRelease} onCheckedChange={setSoloRelease} disabled={busy} />
          {soloRelease ? <TextInput label="Begründung für Alleinfreigabe" value={soloJustification} onValueChange={setSoloJustification} maxLength={1024} disabled={busy} required /> : null}
          {targetSecurityDomain && purpose && validUntil ? <p className="industrial-muted">
            {selectedDocument.title} an {targetSecurityDomain} bis {new Date(`${validUntil}T23:59:59`).toLocaleDateString('de-DE')}
          </p> : null}
          <ToolbarButton loading={busy} disabled={busy || !targetSecurityDomain.trim() || !purpose.trim() || !validUntil || (soloRelease && !soloJustification.trim())}
            onClick={() => void execute(async () => {
              await createOwnDocumentShare({ documentId, targetSecurityDomain, purpose, validUntil: new Date(`${validUntil}T23:59:59`).toISOString(), ...(soloRelease ? { soloJustification } : {}) });
              setShares(null); setPurpose(''); setSoloJustification(''); setSoloRelease(false); success('Freigabe an Gremia.BR übermittelt. Für den aktuellen Stand Freigaben abrufen.');
            })}>Freigabe anlegen</ToolbarButton>
        </div>
      </> : null}
    </> : <p className="industrial-muted">Noch keine selbst übertragenen Dokumente vorhanden.</p>}
    {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
    {status ? <p className="industrial-message industrial-message-success" role="status">{status}</p> : null}
  </IndustrialPanel>;
}
