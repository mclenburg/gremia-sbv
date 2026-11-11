import { useEffect, useRef, useState } from 'react';
import { Download, Pencil, Power, Save, Trash2, Upload } from 'lucide-react';
import type { TransferRecipientProfile } from '../../../domain/models/transfer-recipient-profile.model';
import type { TransferCapabilityDocument } from '../../../domain/models/transfer-capability.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { ButtonGroup, IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { TextareaInput, TextInput } from '../../shared/components/IndustrialForm';

const EMPTY_DRAFT = { label: '', recipientToken: '' };

export function TransferRecipientProfilesSettings() {
  const announce = useAnnouncer();
  const confirm = useConfirmDialog();
  const [profiles, setProfiles] = useState<TransferRecipientProfile[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<{ profileId: string; fileToken: string; fileName: string; document: TransferCapabilityDocument } | null>(null);
  const capabilityReviewHeading = useRef<HTMLHeadingElement>(null);

  async function reload() {
    setProfiles(await window.gremiaSbv.transferIdentity.listRecipientProfiles());
  }

  useEffect(() => {
    void reload().catch((cause) => setError(cause instanceof Error ? cause.message : 'Empfängerprofile konnten nicht geladen werden.'));
  }, []);
  useEffect(() => { if (message) announce(message, 'polite'); }, [announce, message]);
  useEffect(() => { if (error) announce(error, 'assertive'); }, [announce, error]);
  useEffect(() => { if (selectedCapability) capabilityReviewHeading.current?.focus(); }, [selectedCapability]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Empfängerprofil konnte nicht verarbeitet werden.');
    } finally {
      setBusy(false);
    }
  }

  function edit(profile: TransferRecipientProfile) {
    setDraft({ label: profile.label, recipientToken: profile.recipientToken });
  }

  return (
    <section className="industrial-settings-form settings-section-full" aria-labelledby="transfer-recipient-profiles-title">
      <div>
        <h3 id="transfer-recipient-profiles-title">Empfängerprofile</h3>
        <p className="industrial-settings-note">
          Wiederkehrende Übergabeziele können mit ihrer öffentlichen Empfängerkennung gespeichert werden. Passphrasen und private Schlüssel werden nicht übernommen.
        </p>
      </div>

      <div className="industrial-form-grid industrial-form-grid-2">
        <TextInput label="Bezeichnung" value={draft.label} maxLength={120} required onValueChange={(label) => setDraft((current) => ({ ...current, label }))} />
        <TextareaInput label="Öffentliche Empfängerkennung" value={draft.recipientToken} rows={4} required wide onValueChange={(recipientToken) => setDraft((current) => ({ ...current, recipientToken }))} />
      </div>
      <ButtonGroup ariaLabel="Empfängerprofil bearbeiten">
        <IndustrialButton loading={busy} disabled={!draft.label.trim() || !draft.recipientToken.trim()} onClick={() => void run(async () => {
          const saved = await window.gremiaSbv.transferIdentity.saveRecipientProfile(draft);
          setDraft(EMPTY_DRAFT);
          setMessage(`Empfängerprofil „${saved.label}“ wurde gespeichert.`);
        })}>
          <Save className="industrial-icon" aria-hidden="true" /> Profil speichern
        </IndustrialButton>
        {(draft.label || draft.recipientToken) ? <IndustrialButton variant="secondary" disabled={busy} onClick={() => setDraft(EMPTY_DRAFT)}>Eingabe leeren</IndustrialButton> : null}
      </ButtonGroup>

      <div className="industrial-list" role="list" aria-label="Gespeicherte Empfängerprofile">
        {profiles.length === 0 ? <div className="industrial-empty-state" role="listitem">Noch kein Empfängerprofil gespeichert.</div> : profiles.map((profile) => (
          <div className="industrial-list-row" role="listitem" key={profile.id}>
            <div>
              <strong>{profile.label}</strong>
              <div className="industrial-settings-note">Instanz {profile.instanceId} · Fingerprint {profile.keyFingerprint.slice(0, 16)} · {profile.active ? 'aktiv' : 'deaktiviert'}</div>
              <div className="industrial-settings-note">Übergabefähigkeiten: {profile.capabilityStatus === 'verified' && profile.capabilities
                ? `verifiziert am ${new Date(profile.capabilityConfirmedAt ?? '').toLocaleString('de-DE')} · Lesen ${profile.capabilities.readFormats.join(', ')} · Schreiben ${profile.capabilities.writeFormats.join(', ')}`
                : 'unbekannt'}</div>
            </div>
            <ButtonGroup ariaLabel={`Aktionen für ${profile.label}`}>
              <ToolbarButton disabled={busy || !profile.active} onClick={() => void run(async () => {
                const result = await window.gremiaSbv.transferIdentity.exportCapability(profile.id);
                if (result.exported) setMessage(`Fähigkeitsdatei für „${profile.label}“ wurde gespeichert.`);
              })}><Download className="industrial-icon" aria-hidden="true" /> Fähigkeiten bereitstellen</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => void run(async () => {
                const result = await window.gremiaSbv.transferIdentity.selectCapability(profile.id);
                if (!result.canceled) setSelectedCapability({ profileId: profile.id, ...result });
              })}><Upload className="industrial-icon" aria-hidden="true" /> Übergabefähigkeiten aktualisieren</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => edit(profile)}><Pencil className="industrial-icon" aria-hidden="true" /> Bearbeiten</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => void run(async () => {
                const updated = await window.gremiaSbv.transferIdentity.setRecipientProfileActive(profile.id, !profile.active);
                setMessage(`Empfängerprofil „${updated.label}“ wurde ${updated.active ? 'aktiviert' : 'deaktiviert'}.`);
              })}><Power className="industrial-icon" aria-hidden="true" /> {profile.active ? 'Deaktivieren' : 'Aktivieren'}</ToolbarButton>
              <IndustrialButton variant="danger" compact disabled={busy} onClick={() => void (async () => {
                const confirmed = await confirm({ title: 'Empfängerprofil löschen?', message: `Das Profil „${profile.label}“ wird lokal gelöscht. Bereits erzeugte Übergabepakete bleiben unverändert.`, confirmLabel: 'Profil löschen', variant: 'danger' });
                if (!confirmed) return;
                await run(async () => {
                  await window.gremiaSbv.transferIdentity.deleteRecipientProfile(profile.id);
                  setMessage(`Empfängerprofil „${profile.label}“ wurde gelöscht.`);
                });
              })()}><Trash2 className="industrial-icon" aria-hidden="true" /> Löschen</IndustrialButton>
            </ButtonGroup>
          </div>
        ))}
      </div>

      {selectedCapability ? <section className="industrial-settings-form" aria-label="Geprüfte Übergabefähigkeiten">
        <h4 ref={capabilityReviewHeading} tabIndex={-1}>Fähigkeitsdatei prüfen</h4>
        <p className="industrial-settings-note">{selectedCapability.fileName} · Instanz {selectedCapability.document.origin.instanceId} · Fingerprint {selectedCapability.document.origin.keyFingerprint}</p>
        <p className="industrial-settings-note">Lesen: {selectedCapability.document.capabilities.readFormats.join(', ')} · Schreiben: {selectedCapability.document.capabilities.writeFormats.join(', ')} · Merkmale: {selectedCapability.document.capabilities.features.join(', ') || 'keine'} · Stand: {selectedCapability.document.capabilities.revision}</p>
        <ButtonGroup ariaLabel="Fähigkeitsdatei übernehmen">
          <IndustrialButton loading={busy} onClick={() => void run(async () => {
            const profile = await window.gremiaSbv.transferIdentity.importCapability(selectedCapability.profileId, selectedCapability.fileToken);
            setSelectedCapability(null);
            setMessage(`Übergabefähigkeiten für „${profile.label}“ wurden verifiziert übernommen.`);
          })}>Fähigkeiten übernehmen</IndustrialButton>
          <IndustrialButton variant="secondary" disabled={busy} onClick={() => setSelectedCapability(null)}>Abbrechen</IndustrialButton>
        </ButtonGroup>
      </section> : null}

      {message ? <div className="industrial-message industrial-message-ok" role="status">{message}</div> : null}
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
    </section>
  );
}
