import { useEffect, useMemo, useState } from 'react';
import type { TransferProtectionMode } from '../../../domain/models/case-handover.model';
import type { TransferRecipientProfile } from '../../../domain/models/transfer-recipient-profile.model';
import { PasswordInput, SelectInput, TextareaInput } from '../../shared/components/IndustrialForm';

const MANUAL_PROFILE = '__manual__';

export type TransferProtectionState = {
  targetRecipientToken: string;
  passphrase: string;
  protectionMode: TransferProtectionMode;
};

export function requiresPassphrase(mode: TransferProtectionMode): boolean {
  return mode === 'passphrase_and_recipient_key';
}

function profileLabel(profile: TransferRecipientProfile): string {
  return `${profile.label} · ${profile.instanceId} · ${profile.keyFingerprint}`;
}

export function TransferProtectionFields({
  value,
  onChange,
  targetLabel = 'Empfängerkennung der Zielinstanz',
  passphraseLabel = 'Transport-Passphrase',
}: {
  value: TransferProtectionState;
  onChange: (value: TransferProtectionState) => void;
  targetLabel?: string;
  passphraseLabel?: string;
}) {
  const [profiles, setProfiles] = useState<TransferRecipientProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(MANUAL_PROFILE);

  useEffect(() => {
    let cancelled = false;
    void window.gremiaSbv.transferIdentity.listRecipientProfiles()
      .then((items) => {
        if (!cancelled) setProfiles(items.filter((profile) => profile.active));
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      });
    return () => { cancelled = true; };
  }, []);

  const options = useMemo(() => [
    { value: MANUAL_PROFILE, label: 'Empfängerkennung manuell einfügen' },
    ...profiles.map((profile) => ({ value: profile.id, label: profileLabel(profile) })),
  ], [profiles]);

  function update(partial: Partial<TransferProtectionState>) {
    onChange({ ...value, ...partial });
  }

  function selectProfile(profileId: string) {
    setSelectedProfileId(profileId);
    const profile = profiles.find((entry) => entry.id === profileId);
    if (profile) update({ targetRecipientToken: profile.recipientToken });
  }

  return <>
    <SelectInput
      label="Empfängerprofil"
      value={selectedProfileId}
      options={options}
      onValueChange={selectProfile}
      helpText="Gespeicherte Empfängerprofile vermeiden Kopierfehler. Bei mehr als fünf Profilen ist die Auswahl filterbar."
      wide
    />
    <TextareaInput
      label={targetLabel}
      value={value.targetRecipientToken}
      onValueChange={(targetRecipientToken) => {
        setSelectedProfileId(MANUAL_PROFILE);
        update({ targetRecipientToken });
      }}
      rows={3}
      required
      wide
      placeholder="GSBV1.… aus den Einstellungen der Zielinstanz"
    />
    <SelectInput
      label="Schutzart"
      value={value.protectionMode}
      options={[
        { value: 'passphrase_and_recipient_key', label: 'Empfängerschlüssel + Passphrase' },
        { value: 'recipient_key_only', label: 'Nur Empfängerschlüssel' },
      ]}
      onValueChange={(protectionMode) => update({ protectionMode: protectionMode as TransferProtectionMode })}
      helpText="Schlüssel-only ist nur für eindeutig erkannte Zielinstanzen gedacht. Die Datei ist weiterhin zielgebunden verschlüsselt; eine geteilte Passphrase entfällt."
      wide
    />
    {requiresPassphrase(value.protectionMode) ? <PasswordInput
      label={passphraseLabel}
      value={value.passphrase}
      onValueChange={(passphrase) => update({ passphrase })}
      minLength={10}
      required
      wide
    /> : <div className="industrial-message industrial-modal-wide" role="note">Diese Übergabe nutzt nur den öffentlichen Empfängerschlüssel der Zielinstanz. Eine Transport-Passphrase wird nicht abgefragt.</div>}
  </>;
}
