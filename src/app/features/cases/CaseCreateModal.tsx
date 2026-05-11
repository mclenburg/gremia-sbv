import { useEffect, useRef, type FormEvent } from 'react';
import { FolderKanban, UserRoundSearch } from 'lucide-react';
import type { CaseCategory } from '../../core/models/case.model';
import type { ProtectedPersonRecord } from '../../core/models/protected-person.model';

export function CaseCreateModal({
  open,
  caseNumber,
  displayName,
  category,
  summary,
  selectedProtectedPersonId,
  protectedPersons,
  error,
  onCaseNumberChange,
  onDisplayNameChange,
  onCategoryChange,
  onSummaryChange,
  onProtectedPersonChange,
  onCancel,
  onSubmit,
  onAnonymousSubmit
}: {
  open: boolean;
  caseNumber: string;
  displayName: string;
  category: CaseCategory;
  summary: string;
  selectedProtectedPersonId: string;
  protectedPersons: ProtectedPersonRecord[];
  error?: string;
  onCaseNumberChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onCategoryChange: (value: CaseCategory) => void;
  onSummaryChange: (value: string) => void;
  onProtectedPersonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onAnonymousSubmit: () => void | Promise<void>;
}) {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => returnFocusRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const descriptionIds = error ? 'case-create-description case-create-error' : 'case-create-description';

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section className="industrial-modal case-create-modal-responsive" role="dialog" aria-modal="true" aria-labelledby="case-create-title" aria-describedby={descriptionIds}>
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon"><FolderKanban className="h-5 w-5" /></div>
          <div>
            <p className="industrial-kicker">Fallakte</p>
            <h2 id="case-create-title">Neue Fallakte anlegen</h2>
            <p id="case-create-description">Neue reguläre Fallakten benötigen eine Person aus dem Personenverzeichnis. Für anonyme Beratungsgespräche ohne Namensnennung: Fallakte ohne Personenbezug anlegen.</p>
          </div>
        </div>
        <form onSubmit={(event) => void onSubmit(event)} className="industrial-form case-create-form">
          <label><span>Aktenzeichen</span><input value={caseNumber} onChange={(event) => onCaseNumberChange(event.target.value)} placeholder="z. B. BEM-2026-004" autoFocus aria-describedby={error ? 'case-create-error' : undefined} /></label>
          <label><span>Person aus Verzeichnis wählen</span><select value={selectedProtectedPersonId} onChange={(event) => onProtectedPersonChange(event.target.value)} aria-describedby={descriptionIds}><option value="">Person auswählen …</option>{protectedPersons.map((person) => <option key={person.id} value={person.id}>{person.pseudonymLabel || `${person.lastName}, ${person.firstName}`}</option>)}</select></label>
          <label><span>Anzeigename / Pseudonym</span><input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} placeholder="leer lassen für Personenname oder anonymes Gespräch" /></label>
          <label><span>Kategorie</span><select value={category} onChange={(event) => onCategoryChange(event.target.value as CaseCategory)}><option value="bem">BEM</option><option value="praevention">Prävention</option><option value="kuendigung">Kündigung</option><option value="gleichstellung">Gleichstellung</option><option value="gdb">GdB</option><option value="nachteilsausgleich">Nachteilsausgleich</option><option value="arbeitsplatzgestaltung">Arbeitsplatzgestaltung</option><option value="diskriminierung">Diskriminierung</option><option value="sonstiges">Sonstiges</option></select></label>
          <label className="industrial-modal-wide"><span>Kurzbeschreibung</span><input value={summary} onChange={(event) => onSummaryChange(event.target.value)} placeholder="knappe Sachebene" /></label>
          {error && <div id="case-create-error" className="industrial-message industrial-message-warning industrial-modal-wide" role="alert">{error}</div>}
          <div className="case-create-path-actions industrial-modal-wide" aria-label="Anlegewege">
            <button type="submit" className="industrial-button"><UserRoundSearch className="h-4 w-4" />Person auswählen →</button>
            <button type="button" className="industrial-secondary-button" onClick={() => void onAnonymousSubmit()} data-e2e="anonymous-request-path">Ohne Personenbezug dokumentieren →</button>
          </div>
          <div className="industrial-modal-actions industrial-modal-wide">
            <button type="button" className="industrial-secondary-button" onClick={onCancel}>Abbrechen</button>
          </div>
        </form>
      </section>
    </div>
  );
}
