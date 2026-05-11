import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import type { EmploymentState, ProtectedPersonRecord, ProtectedPersonStatusSource, ProtectionStatus, UpdateProtectedPersonInput } from '../../core/models/protected-person.model';
import { employmentStateLabels, protectionStatusLabels } from '../../core/models/protected-person.model';
import { toInputDate } from './personImportUi';

const statusOptions: ProtectionStatus[] = ['severely_disabled', 'equivalent', 'application_pending', 'unclear', 'expired', 'inactive'];
const employmentOptions: EmploymentState[] = ['active_employee', 'left_company', 'unknown'];
const sourceOptions: ProtectedPersonStatusSource[] = ['manual', 'employer_list', 'self_disclosure', 'document_presented', 'unknown'];

function sourceLabel(value: ProtectedPersonStatusSource): string {
  switch (value) {
    case 'manual': return 'Manuell';
    case 'employer_list': return 'Arbeitgeberliste';
    case 'self_disclosure': return 'Selbstauskunft';
    case 'document_presented': return 'Nachweis vorgelegt';
    case 'unknown': return 'Unbekannt';
  }
}

function asOptional(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

export function PersonEditDialog({
  open,
  person,
  onClose,
  onUpdate,
  onUpdated,
  onError
}: {
  open: boolean;
  person: ProtectedPersonRecord | null;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateProtectedPersonInput) => Promise<void>;
  onUpdated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', pseudonymLabel: '', personnelNumber: '', workEmail: '', organizationalUnit: '', location: '', protectionStatus: 'unclear' as ProtectionStatus, statusValidFrom: '', statusValidUntil: '', evidenceCheckedAt: '', statusSource: 'manual' as ProtectedPersonStatusSource, employmentState: 'active_employee' as EmploymentState, leftCompanyAt: '', notes: '' });
  const title = useMemo(() => person?.recordKind === 'pseudonymous_request' ? person.pseudonymLabel || 'Anonyme Anfrage' : [person?.lastName, person?.firstName].filter(Boolean).join(', '), [person]);

  useEffect(() => {
    if (!open || !person) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setForm({
      firstName: person.firstName ?? '',
      lastName: person.lastName ?? '',
      pseudonymLabel: person.pseudonymLabel ?? '',
      personnelNumber: person.personnelNumber ?? '',
      workEmail: person.workEmail ?? '',
      organizationalUnit: person.organizationalUnit ?? '',
      location: person.location ?? '',
      protectionStatus: person.protectionStatus,
      statusValidFrom: toInputDate(person.statusValidFrom),
      statusValidUntil: toInputDate(person.statusValidUntil),
      evidenceCheckedAt: toInputDate(person.evidenceCheckedAt),
      statusSource: person.statusSource,
      employmentState: person.employmentState,
      leftCompanyAt: toInputDate(person.leftCompanyAt),
      notes: person.notes ?? ''
    });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, person, onClose]);

  if (!open || !person) return null;

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!person) return;
    const personId = person.id;
    try {
      await onUpdate(personId, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        pseudonymLabel: asOptional(form.pseudonymLabel),
        personnelNumber: asOptional(form.personnelNumber),
        workEmail: asOptional(form.workEmail),
        organizationalUnit: asOptional(form.organizationalUnit),
        location: asOptional(form.location),
        protectionStatus: form.protectionStatus,
        statusValidFrom: form.statusValidFrom || undefined,
        statusValidUntil: form.statusValidUntil || undefined,
        evidenceCheckedAt: form.evidenceCheckedAt || undefined,
        statusSource: form.statusSource,
        employmentState: form.employmentState,
        leftCompanyAt: form.leftCompanyAt || undefined,
        notes: asOptional(form.notes)
      });
      onUpdated('Personendaten wurden aktualisiert.');
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Personendaten konnten nicht gespeichert werden.');
    }
  }

  return (
    <div className="industrial-modal-backdrop" role="presentation" data-e2e="person-edit-dialog">
      <section className="industrial-modal person-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="person-edit-heading" aria-describedby="person-edit-description">
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon"><Pencil className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <p className="industrial-kicker">Personenverzeichnis</p>
            <h2 id="person-edit-heading">Person bearbeiten</h2>
            <p id="person-edit-description">Alle strukturierten Personendaten können manuell korrigiert werden. Änderungen werden lokal gespeichert und auditierbar protokolliert.</p>
          </div>
        </div>
        <form className="person-edit-form" onSubmit={(event) => void submit(event)}>
          <label><span>Vorname</span><input value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} /></label>
          <label><span>Nachname</span><input value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} /></label>
          <label><span>Pseudonym/Label</span><input value={form.pseudonymLabel} onChange={(event) => updateField('pseudonymLabel', event.target.value)} placeholder={title || '—'} /></label>
          <label><span>Personalnummer</span><input value={form.personnelNumber} onChange={(event) => updateField('personnelNumber', event.target.value)} /></label>
          <label><span>Dienstliche E-Mail</span><input type="email" value={form.workEmail} onChange={(event) => updateField('workEmail', event.target.value)} /></label>
          <label><span>Organisationseinheit</span><input value={form.organizationalUnit} onChange={(event) => updateField('organizationalUnit', event.target.value)} /></label>
          <label><span>Standort</span><input value={form.location} onChange={(event) => updateField('location', event.target.value)} /></label>
          <label><span>Schutzstatus</span><select value={form.protectionStatus} onChange={(event) => updateField('protectionStatus', event.target.value as ProtectionStatus)}>{statusOptions.map((option) => <option key={option} value={option}>{protectionStatusLabels[option]}</option>)}</select></label>
          <label><span>Status gültig von</span><input type="date" value={form.statusValidFrom} onChange={(event) => updateField('statusValidFrom', event.target.value)} /></label>
          <label><span>Status gültig bis</span><input type="date" value={form.statusValidUntil} onChange={(event) => updateField('statusValidUntil', event.target.value)} /></label>
          <label><span>Nachweis geprüft am</span><input type="date" value={form.evidenceCheckedAt} onChange={(event) => updateField('evidenceCheckedAt', event.target.value)} /></label>
          <label><span>Statusquelle</span><select value={form.statusSource} onChange={(event) => updateField('statusSource', event.target.value as ProtectedPersonStatusSource)}>{sourceOptions.map((option) => <option key={option} value={option}>{sourceLabel(option)}</option>)}</select></label>
          <label><span>Beschäftigungsstatus</span><select value={form.employmentState} onChange={(event) => updateField('employmentState', event.target.value as EmploymentState)}>{employmentOptions.map((option) => <option key={option} value={option}>{employmentStateLabels[option]}</option>)}</select></label>
          <label><span>Beschäftigungsende</span><input type="date" value={form.leftCompanyAt} onChange={(event) => updateField('leftCompanyAt', event.target.value)} /></label>
          <label className="span-2"><span>Notiz</span><textarea rows={4} value={form.notes} onChange={(event) => updateField('notes', event.target.value)} /></label>
          <div className="industrial-modal-actions industrial-modal-wide">
            <button type="button" className="industrial-secondary-button" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="industrial-button">Person speichern</button>
          </div>
        </form>
      </section>
    </div>
  );
}
