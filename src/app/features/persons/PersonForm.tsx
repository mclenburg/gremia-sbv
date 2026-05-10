import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, UserRoundPlus } from 'lucide-react';
import type { CreateProtectedPersonInput, ProtectionStatus } from '../../core/models/protected-person.model';
import { protectionStatusLabels } from '../../core/models/protected-person.model';

const statusOptions: ProtectionStatus[] = ['severely_disabled', 'equivalent', 'application_pending', 'unclear', 'expired', 'inactive'];

function isPastOrToday(value: string): boolean {
  return Boolean(value) && value <= new Date().toISOString().slice(0, 10);
}

export function PersonForm({
  open,
  onClose,
  onCreate,
  onCreated,
  onError
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateProtectedPersonInput) => Promise<void>;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [status, setStatus] = useState<ProtectionStatus>('equivalent');
  const [statusValidUntil, setStatusValidUntil] = useState('');
  const [leftCompanyAt, setLeftCompanyAt] = useState('');

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setFirstName('');
    setLastName('');
    setStatus('equivalent');
    setStatusValidUntil('');
    setLeftCompanyAt('');
  }, [open]);

  if (!open) return null;

  async function submitPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const input: CreateProtectedPersonInput = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        protectionStatus: status,
        statusValidUntil: statusValidUntil || undefined,
        employmentState: isPastOrToday(leftCompanyAt) ? 'left_company' : 'active_employee',
        leftCompanyAt: leftCompanyAt || undefined,
        statusSource: 'manual'
      };
      await onCreate(input);
      onCreated('Person wurde angelegt.');
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Person konnte nicht gespeichert werden.');
    }
  }

  return (
    <div className="industrial-modal-backdrop" role="presentation" data-e2e="person-create-dialog">
      <section className="industrial-modal person-create-dialog" role="dialog" aria-modal="true" aria-labelledby="person-create-heading" aria-describedby="person-create-description">
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon"><UserRoundPlus className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <p className="industrial-kicker">Personenverzeichnis</p>
            <h2 id="person-create-heading">Person anlegen</h2>
            <p id="person-create-description">Neue Personen werden als führender Datensatz angelegt. Fallakten entstehen anschließend aus der ausgewählten Person oder als anonyme Anfrage.</p>
          </div>
        </div>
        <form className="industrial-form person-create-form" onSubmit={(event) => void submitPerson(event)}>
          <label><span>Vorname</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} required autoFocus /></label>
          <label><span>Nachname</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
          <label>
            <span>Schutzstatus</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as ProtectionStatus)}>
              {statusOptions.map((option) => <option key={option} value={option}>{protectionStatusLabels[option]}</option>)}
            </select>
          </label>
          <label><span>Status gültig bis</span><input type="date" value={statusValidUntil} onChange={(event) => setStatusValidUntil(event.target.value)} /></label>
          <label><span>Beschäftigungsende</span><input type="date" value={leftCompanyAt} onChange={(event) => setLeftCompanyAt(event.target.value)} /></label>
          <div className="industrial-modal-actions industrial-modal-wide">
            <button type="button" className="industrial-secondary-button" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="industrial-button"><Plus className="h-4 w-4" aria-hidden="true" />Person anlegen</button>
          </div>
        </form>
      </section>
    </div>
  );
}
