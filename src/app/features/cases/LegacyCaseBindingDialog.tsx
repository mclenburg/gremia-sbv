import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link2 } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type { ProtectedPersonRecord } from '../../core/models/protected-person.model';

function personLabel(person: ProtectedPersonRecord): string {
  return person.pseudonymLabel || [person.lastName, person.firstName].filter(Boolean).join(', ') || person.id;
}

export function LegacyCaseBindingDialog({ open, legacyCase, persons, error, onClose, onAssign }: {
  open: boolean;
  legacyCase?: CaseRecord;
  persons: ProtectedPersonRecord[];
  error?: string;
  onClose: () => void;
  onAssign: (personId: string, reason: string) => Promise<void>;
}) {
  const [personId, setPersonId] = useState('');
  const [reason, setReason] = useState('');
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPersonId('');
    setReason('');
    return () => returnFocusRef.current?.focus();
  }, [open, legacyCase?.id]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !legacyCase) return null;
  const descriptionIds = error ? 'legacy-binding-description legacy-binding-error' : 'legacy-binding-description';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAssign(personId, reason);
  }

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section className="industrial-modal case-create-modal-responsive" role="dialog" aria-modal="true" aria-labelledby="legacy-binding-title" aria-describedby={descriptionIds} data-e2e="legacy-case-binding-dialog">
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon"><Link2 className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <p className="industrial-kicker">Legacy-Zuordnung</p>
            <h2 id="legacy-binding-title">Altfall einer Person zuordnen</h2>
            <p id="legacy-binding-description">{legacyCase.caseNumber} ist ein Altfall ohne sicheren führenden Personenbezug. Wählen Sie bewusst eine Person und dokumentieren Sie den Prüfgrund.</p>
          </div>
        </div>
        <form onSubmit={(event) => void submit(event)} className="industrial-form case-create-form">
          <label className="industrial-modal-wide"><span>Person</span><select value={personId} onChange={(event) => setPersonId(event.target.value)} autoFocus aria-describedby={descriptionIds}><option value="">Person auswählen …</option>{persons.map((person) => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}</select></label>
          <label className="industrial-modal-wide"><span>Prüfgrund</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="z. B. Zuordnung nach Aktenprüfung / Gespräch / vorhandener aktiver Altverknüpfung" aria-describedby={descriptionIds} /></label>
          {error && <div id="legacy-binding-error" className="industrial-message industrial-message-warning industrial-modal-wide" role="alert">{error}</div>}
          <div className="industrial-modal-actions industrial-modal-wide">
            <button type="button" className="industrial-secondary-button" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="industrial-button">Zuordnung speichern</button>
          </div>
        </form>
      </section>
    </div>
  );
}
