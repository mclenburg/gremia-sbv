import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import type { CreateProtectedPersonInput, ProtectionStatus } from '../../core/models/protected-person.model';
import { protectionStatusLabels } from '../../core/models/protected-person.model';

const statusOptions: ProtectionStatus[] = ['severely_disabled', 'equivalent', 'application_pending', 'unclear', 'expired', 'inactive'];

export function PersonForm({
  onCreate,
  onCreated,
  onError
}: {
  onCreate: (input: CreateProtectedPersonInput) => Promise<void>;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [status, setStatus] = useState<ProtectionStatus>('equivalent');
  const [statusValidUntil, setStatusValidUntil] = useState('');
  const [leftCompanyAt, setLeftCompanyAt] = useState('');

  async function submitPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const input: CreateProtectedPersonInput = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        protectionStatus: status,
        statusValidUntil: statusValidUntil || undefined,
        employmentState: leftCompanyAt ? 'left_company' : 'active_employee',
        leftCompanyAt: leftCompanyAt || undefined,
        statusSource: 'manual'
      };
      await onCreate(input);
      setFirstName('');
      setLastName('');
      setStatusValidUntil('');
      setLeftCompanyAt('');
      onCreated('Person wurde angelegt.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Person konnte nicht gespeichert werden.');
    }
  }

  return (
    <form className="industrial-panel person-form" onSubmit={submitPerson} aria-labelledby="person-create-heading">
      <p className="industrial-kicker">Anlage</p>
      <h2 id="person-create-heading">Person anlegen</h2>
      <div className="industrial-settings-form">
        <label><span>Vorname</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
        <label><span>Nachname</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
        <label>
          <span>Schutzstatus</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as ProtectionStatus)}>
            {statusOptions.map((option) => <option key={option} value={option}>{protectionStatusLabels[option]}</option>)}
          </select>
        </label>
        <label><span>Status gültig bis</span><input type="date" value={statusValidUntil} onChange={(event) => setStatusValidUntil(event.target.value)} /></label>
        <label><span>Beschäftigungsende</span><input type="date" value={leftCompanyAt} onChange={(event) => setLeftCompanyAt(event.target.value)} /></label>
      </div>
      <button type="submit" className="industrial-button"><Plus className="h-4 w-4" aria-hidden="true" /> Person anlegen</button>
    </form>
  );
}
