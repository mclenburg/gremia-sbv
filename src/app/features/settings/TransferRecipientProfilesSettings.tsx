import { useEffect, useState } from 'react';
import { Pencil, Power, Save, Trash2 } from 'lucide-react';
import type { TransferRecipientProfile } from '../../../domain/models/transfer-recipient-profile.model';
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

  async function reload() {
    setProfiles(await window.gremiaSbv.transferIdentity.listRecipientProfiles());
  }

  useEffect(() => {
    void reload().catch((cause) => setError(cause instanceof Error ? cause.message : 'Empfängerprofile konnten nicht geladen werden.'));
  }, []);
  useEffect(() => { if (message) announce(message, 'polite'); }, [announce, message]);
  useEffect(() => { if (error) announce(error, 'assertive'); }, [announce, error]);

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
    <section className="industrial-settings-form xl:col-span-2" aria-labelledby="transfer-recipient-profiles-title">
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
          <Save className="h-4 w-4" aria-hidden="true" /> Profil speichern
        </IndustrialButton>
        {(draft.label || draft.recipientToken) ? <IndustrialButton variant="secondary" disabled={busy} onClick={() => setDraft(EMPTY_DRAFT)}>Eingabe leeren</IndustrialButton> : null}
      </ButtonGroup>

      <div className="industrial-list" role="list" aria-label="Gespeicherte Empfängerprofile">
        {profiles.length === 0 ? <div className="industrial-empty-state">Noch kein Empfängerprofil gespeichert.</div> : profiles.map((profile) => (
          <div className="industrial-list-row" role="listitem" key={profile.id}>
            <div>
              <strong>{profile.label}</strong>
              <div className="industrial-settings-note">Instanz {profile.instanceId} · Fingerprint {profile.keyFingerprint.slice(0, 16)} · {profile.active ? 'aktiv' : 'deaktiviert'}</div>
            </div>
            <ButtonGroup ariaLabel={`Aktionen für ${profile.label}`}>
              <ToolbarButton disabled={busy} onClick={() => edit(profile)}><Pencil className="h-4 w-4" aria-hidden="true" /> Bearbeiten</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => void run(async () => {
                const updated = await window.gremiaSbv.transferIdentity.setRecipientProfileActive(profile.id, !profile.active);
                setMessage(`Empfängerprofil „${updated.label}“ wurde ${updated.active ? 'aktiviert' : 'deaktiviert'}.`);
              })}><Power className="h-4 w-4" aria-hidden="true" /> {profile.active ? 'Deaktivieren' : 'Aktivieren'}</ToolbarButton>
              <IndustrialButton variant="danger" compact disabled={busy} onClick={() => void (async () => {
                const confirmed = await confirm({ title: 'Empfängerprofil löschen?', message: `Das Profil „${profile.label}“ wird lokal gelöscht. Bereits erzeugte Übergabepakete bleiben unverändert.`, confirmLabel: 'Profil löschen', variant: 'danger' });
                if (!confirmed) return;
                await run(async () => {
                  await window.gremiaSbv.transferIdentity.deleteRecipientProfile(profile.id);
                  setMessage(`Empfängerprofil „${profile.label}“ wurde gelöscht.`);
                });
              })()}><Trash2 className="h-4 w-4" aria-hidden="true" /> Löschen</IndustrialButton>
            </ButtonGroup>
          </div>
        ))}
      </div>

      {message ? <div className="industrial-message industrial-message-ok" role="status">{message}</div> : null}
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
    </section>
  );
}
