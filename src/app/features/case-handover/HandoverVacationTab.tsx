import { useCallback, useEffect, useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { TransferProtectionMode } from '../../../domain/models/case-handover.model';
import type { TransferRecipientProfile } from '../../../domain/models/transfer-recipient-profile.model';
import { planVacationHandoverFormat } from '../../../domain/transfer/transferFormatPlan';
import { DateInput, PasswordInput, SelectInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { VacationHandoverExportPanel } from './VacationHandoverExportPanel';
import { VacationV5ExportPanel } from './VacationV5ExportPanel';
import { toHandoverExpiry } from './caseHandoverCockpitPolicy';

type ExportFormat = 2 | 4 | 5;
const MANUAL = '__manual__';
const FORMAT_LABEL: Record<ExportFormat, string> = {
  5: 'Erweiterter Umfang · Format 5', 4: 'Nur Fallakten · Format 4',
  2: 'Nur Fallakten für ältere Instanzen · Format 2',
};

export function HandoverVacationTab({ cases, initialCaseId, onCompleted }: {
  cases: CaseRecord[]; initialCaseId?: string; onCompleted: () => Promise<void>;
}) {
  const confirm = useConfirmDialog();
  const [profiles, setProfiles] = useState<TransferRecipientProfile[]>([]);
  const [profileId, setProfileId] = useState(MANUAL);
  const [manualToken, setManualToken] = useState('');
  const [format, setFormat] = useState<ExportFormat | null>(2);
  const [validUntil, setValidUntil] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [protectionMode, setProtectionMode] = useState<TransferProtectionMode>('passphrase_and_recipient_key');
  const [loadError, setLoadError] = useState('');
  const [v5Scope, setV5Scope] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    void window.gremiaSbv.transferIdentity.listRecipientProfiles()
      .then((items) => { if (active) setProfiles(items.filter((item) => item.active)); })
      .catch(() => { if (active) setLoadError('Empfängerprofile konnten nicht geladen werden. Bitte erneut öffnen.'); });
    return () => { active = false; };
  }, []);

  const profile = profiles.find((item) => item.id === profileId);
  const plan = planVacationHandoverFormat(profile?.capabilityStatus === 'verified' ? profile.capabilities : null);
  const expiresAt = toHandoverExpiry(validUntil);
  const recipientToken = profile?.recipientToken ?? manualToken;

  const trackV5Scope = useCallback((labels: string[]) => setV5Scope(labels), []);
  async function confirmScopeReset(): Promise<boolean> {
    if (format !== 5 || !v5Scope.length) return true;
    return confirm({ title: 'Bisherige Auswahl verwerfen?',
      message: `Die bisher gewählten Bereiche (${v5Scope.join(', ')}) werden beim Wechsel verworfen. Das neue Paket enthält nur den danach ausgewählten Umfang.`,
      confirmLabel: 'Auswahl verwerfen' });
  }

  async function chooseProfile(id: string) {
    if (id === profileId || !await confirmScopeReset()) return;
    const next = profiles.find((item) => item.id === id);
    const nextPlan = planVacationHandoverFormat(next?.capabilityStatus === 'verified' ? next.capabilities : null);
    setProfileId(id); setFormat(nextPlan.suggested);
    setProtectionMode('passphrase_and_recipient_key'); setPassphrase(''); setV5Scope([]);
  }

  async function chooseFormat(value: string) {
    const next = Number(value) as ExportFormat;
    if (!plan.available.includes(next) || next === format || !await confirmScopeReset()) return;
    setFormat(next); setPassphrase(''); setV5Scope([]);
    if (next !== 4) setProtectionMode('passphrase_and_recipient_key');
  }

  async function completeExport() {
    setPassphrase('');
    await onCompleted();
  }

  return <IndustrialPanel kicker="Ausgabe" title="Urlaubsvertretung übergeben"
    description="Ziel, Format und Umfang der Vertretung wählen."
    ariaLabel="Urlaubsvertretung übergeben" helpId="caseHandover.vacation">
    <div className="industrial-stack">
      <SelectInput label="Empfängerprofil" value={profileId} wide options={[
        { value: MANUAL, label: 'Empfängerkennung manuell einfügen' },
        ...profiles.map((item) => ({ value: item.id, label: `${item.label} · ${item.instanceId} · ${item.keyFingerprint.slice(0, 16)}` })),
      ]} onValueChange={(value) => void chooseProfile(value)} />
      {profile ? <p className="industrial-meta" role="status">Zielinstanz {profile.instanceId} · {plan.verified
        ? plan.available.includes(5) ? 'Kann erweiterten Umfang lesen' : plan.available.length ? 'Nur Fallakten möglich' : 'Kein gemeinsames Format'
        : 'Lesefähigkeit unbekannt'}</p>
        : <TextareaInput label="Öffentliche Empfängerkennung der Vertretungsinstanz" value={manualToken}
          onValueChange={setManualToken} rows={2} required wide />}
      {loadError ? <div className="industrial-message industrial-message-warning" role="alert">{loadError}</div> : null}
      {plan.available.length ? <SelectInput label="Zielformat der Vertretungsinstanz" value={format ? String(format) : ''}
        options={plan.available.map((item) => ({ value: String(item), label: FORMAT_LABEL[item] }))}
        onValueChange={(value) => void chooseFormat(value)} wide helpId="caseHandover.vacation" />
        : <div className="industrial-message industrial-message-warning" role="alert">
          Für dieses verifizierte Profil ist kein gemeinsames Übergabeformat verfügbar.</div>}
      {!plan.verified ? <p className="industrial-meta" role="status">Lesefähigkeit unbekannt · Vorschlag: Format 2</p> : null}
      <DateInput label="Vertretung endet am" value={validUntil} onValueChange={setValidUntil} required />
      {format === 4 ? <SelectInput label="Schutzart" value={protectionMode} wide options={[
        { value: 'passphrase_and_recipient_key', label: 'Empfängerschlüssel + Passphrase' },
        { value: 'recipient_key_only', label: 'Nur Empfängerschlüssel' },
      ]} onValueChange={(value) => setProtectionMode(value as TransferProtectionMode)} /> : null}
      {protectionMode === 'passphrase_and_recipient_key' ? <PasswordInput label="Transport-Passphrase"
        value={passphrase} onValueChange={setPassphrase} minLength={10} required /> : null}
      {format === 5 && profile && expiresAt ? <VacationV5ExportPanel
        key={`5:${profile.id}:${expiresAt}`} profileId={profile.id} expiresAt={expiresAt}
        passphrase={passphrase} initialCaseId={initialCaseId} onScopeChange={trackV5Scope}
        onCompleted={completeExport} /> : null}
      {format === 5 && !expiresAt ? <p className="industrial-settings-note">Bitte ein gültiges Vertretungsende wählen.</p> : null}
      {(format === 2 || format === 4) ? <VacationHandoverExportPanel
        key={`${format}:${recipientToken}:${expiresAt ?? ''}`} cases={cases} onCompleted={completeExport}
        initialCaseId={initialCaseId}
        targetRecipientToken={recipientToken} expiresAt={expiresAt} passphrase={passphrase}
        protectionMode={protectionMode} formatVersion={format} /> : null}
    </div>
  </IndustrialPanel>;
}
