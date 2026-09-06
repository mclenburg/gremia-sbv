import { useEffect, useMemo, useState } from 'react';
import type { TransferProtectionMode } from '../../../domain/models/case-handover.model';
import type { TransferRecipientProfile } from '../../../domain/models/transfer-recipient-profile.model';
import { PasswordInput, SelectInput, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';

const MANUAL_PROFILE = '__manual__';
const RECIPIENT_TOKEN_INSTANCE_ID_PATTERN = /^GSBV1\.([A-HJ-NP-Z2-9]{5})\./;

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

function extractInstanceId(recipientToken: string): string {
  return recipientToken.trim().match(RECIPIENT_TOKEN_INSTANCE_ID_PATTERN)?.[1] ?? '';
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

  const selectedProfile = profiles.find((entry) => entry.id === selectedProfileId);
  const targetInstanceId = selectedProfile?.instanceId ?? extractInstanceId(value.targetRecipientToken);
  const keyFingerprint = selectedProfile?.keyFingerprint ?? '';
  const manualEntry = selectedProfileId === MANUAL_PROFILE;

  return <>
    <SelectInput
      label="Empfängerprofil"
      value={selectedProfileId}
      options={options}
      onValueChange={selectProfile}
      helpId="caseHandover.recipientProfile"
      wide
    />
    <div className="industrial-form-grid industrial-form-grid-2">
      <TextInput
        label="Zielinstanz-ID"
        value={targetInstanceId || '—'}
        onValueChange={() => undefined}
        readOnly
        className="transfer-instance-id-input"
        helpId="caseHandover.targetInstanceId"
      />
      <TextInput
        label="Schlüssel-Fingerprint"
        value={keyFingerprint ? keyFingerprint.slice(0, 16) : targetInstanceId ? 'aus Empfängerkennung' : '—'}
        onValueChange={() => undefined}
        readOnly
      />
    </div>
    {manualEntry ? (
      <TextareaInput
        label={targetLabel}
        value={value.targetRecipientToken}
        onValueChange={(targetRecipientToken) => {
          setSelectedProfileId(MANUAL_PROFILE);
          update({ targetRecipientToken });
        }}
        rows={2}
        required
        wide
        className="transfer-recipient-token-input"
        helpId="caseHandover.recipientToken"
        placeholder="GSBV1.<ID>.<Fingerprint>.<öffentlicher Schlüssel>"
      />
    ) : null}
    <SelectInput
      label="Schutzart"
      value={value.protectionMode}
      options={[
        { value: 'passphrase_and_recipient_key', label: 'Empfängerschlüssel + Passphrase' },
        { value: 'recipient_key_only', label: 'Nur Empfängerschlüssel' },
      ]}
      onValueChange={(protectionMode) => update({ protectionMode: protectionMode as TransferProtectionMode })}
      helpId="caseHandover.protectionMode"
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
