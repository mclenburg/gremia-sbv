import { useEffect, useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { TransferProtectionMode } from '../../../domain/models/case-handover.model';
import type { TransferRecipientProfile } from '../../../domain/models/transfer-recipient-profile.model';
import { planVacationHandoverFormat } from '../../../domain/transfer/transferFormatPlan';
import { DateInput, PasswordInput, SelectInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { VacationHandoverExportPanel } from './VacationHandoverExportPanel';
import { VacationV5ExportPanel } from './VacationV5ExportPanel';
import { toHandoverExpiry } from './caseHandoverCockpitPolicy';

type ExportFormat = 2 | 4 | 5;
const MANUAL = '__manual__';
const FORMAT_LABEL: Record<ExportFormat, string> = {
  5: 'Format 5 · erweiterte Vertretung', 4: 'Format 4 · Fallübergabe',
  2: 'Format 2 · ältere Fallübergabe',
};

export function HandoverVacationTab({ cases, initialCaseId, onCompleted }: {
  cases: CaseRecord[]; initialCaseId?: string; onCompleted: () => Promise<void>;
}) {
  const [profiles, setProfiles] = useState<TransferRecipientProfile[]>([]);
  const [profileId, setProfileId] = useState(MANUAL);
  const [manualToken, setManualToken] = useState('');
  const [format, setFormat] = useState<ExportFormat | null>(2);
  const [validUntil, setValidUntil] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [protectionMode, setProtectionMode] = useState<TransferProtectionMode>('passphrase_and_recipient_key');
  const [loadError, setLoadError] = useState('');
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

  function chooseProfile(id: string) {
    const next = profiles.find((item) => item.id === id);
    const nextPlan = planVacationHandoverFormat(next?.capabilityStatus === 'verified' ? next.capabilities : null);
    setProfileId(id); setFormat(nextPlan.suggested);
    setProtectionMode('passphrase_and_recipient_key'); setPassphrase('');
  }

  function chooseFormat(value: string) {
    const next = Number(value) as ExportFormat;
    if (!plan.available.includes(next)) return;
    setFormat(next); setPassphrase('');
    if (next !== 4) setProtectionMode('passphrase_and_recipient_key');
  }

  async function completeExport() {
    setPassphrase('');
    await onCompleted();
  }

  return <IndustrialPanel kicker="Ausgabe" title="Urlaubsvertretung übergeben"
    description="Ziel und Umfang bestimmen das Paketformat. Es wird nur der Ablauf für das gewählte Format angezeigt."
    ariaLabel="Urlaubsvertretung übergeben" helpId="caseHandover.vacation">
    <div className="industrial-stack">
      <SelectInput label="Empfängerprofil" value={profileId} wide options={[
        { value: MANUAL, label: 'Empfängerkennung manuell einfügen' },
        ...profiles.map((item) => ({ value: item.id, label: `${item.label} · ${item.instanceId} · ${item.keyFingerprint.slice(0, 16)}` })),
      ]} onValueChange={chooseProfile} />
      {profile ? <p className="industrial-meta" role="status">Zielinstanz {profile.instanceId} · {plan.verified
        ? `Lesefähigkeit verifiziert: ${profile.capabilities?.readFormats.join(', ')}`
        : 'Lesefähigkeit unbekannt'}</p>
        : <TextareaInput label="Öffentliche Empfängerkennung der Vertretungsinstanz" value={manualToken}
          onValueChange={setManualToken} rows={2} required wide />}
      {loadError ? <div className="industrial-message industrial-message-warning" role="alert">{loadError}</div> : null}
      {plan.available.length ? <SelectInput label="Zielformat der Vertretungsinstanz" value={format ? String(format) : ''}
        options={plan.available.map((item) => ({ value: String(item), label: FORMAT_LABEL[item] }))}
        onValueChange={chooseFormat} wide />
        : <div className="industrial-message industrial-message-warning" role="alert">
          Für dieses verifizierte Profil ist kein gemeinsames Übergabeformat verfügbar.</div>}
      {!plan.verified ? <p className="industrial-settings-note" role="status">
        Die Lesefähigkeit ist nicht bestätigt. Format 2 wird vorsichtig vorgeschlagen; Format 4 bleibt wählbar.
        Die tatsächliche Unterstützung muss über den Fähigkeitsaustausch oder die Zielinstanz geklärt werden.</p> : null}
      {format && format !== 5 ? <p className="industrial-meta">Format {format} enthält ausschließlich ausgewählte Fallakten.
        Fallfreie Fristen und Amtsvorgänge können damit nicht übertragen werden.</p> : null}
      <DateInput label="Vertretung endet am" value={validUntil} onValueChange={setValidUntil} required />
      {format === 4 ? <SelectInput label="Schutzart" value={protectionMode} wide options={[
        { value: 'passphrase_and_recipient_key', label: 'Empfängerschlüssel + Passphrase' },
        { value: 'recipient_key_only', label: 'Nur Empfängerschlüssel' },
      ]} onValueChange={(value) => setProtectionMode(value as TransferProtectionMode)} /> : null}
      {protectionMode === 'passphrase_and_recipient_key' ? <PasswordInput label="Transport-Passphrase"
        value={passphrase} onValueChange={setPassphrase} minLength={10} required /> : null}
      {format === 5 && profile && expiresAt ? <VacationV5ExportPanel
        key={`5:${profile.id}:${expiresAt}`} profileId={profile.id} expiresAt={expiresAt}
        passphrase={passphrase} initialCaseId={initialCaseId} onCompleted={completeExport} /> : null}
      {format === 5 && !expiresAt ? <p className="industrial-settings-note">Bitte ein gültiges Vertretungsende wählen.</p> : null}
      {(format === 2 || format === 4) ? <VacationHandoverExportPanel
        key={`${format}:${recipientToken}:${expiresAt ?? ''}`} cases={cases} onCompleted={completeExport}
        initialCaseId={initialCaseId}
        targetRecipientToken={recipientToken} expiresAt={expiresAt} passphrase={passphrase}
        protectionMode={protectionMode} formatVersion={format} /> : null}
    </div>
  </IndustrialPanel>;
}
