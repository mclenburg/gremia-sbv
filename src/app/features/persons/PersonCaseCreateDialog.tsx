import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import type { CaseCategory } from '../../core/models/case.model';

const categoryOptions: Array<{ value: CaseCategory; label: string }> = [
  { value: 'bem', label: 'BEM' },
  { value: 'praevention', label: 'Prävention' },
  { value: 'kuendigung', label: 'Kündigung' },
  { value: 'gleichstellung', label: 'Gleichstellung' },
  { value: 'arbeitsplatzgestaltung', label: 'Arbeitsplatzgestaltung' },
  { value: 'sonstiges', label: 'Sonstiges' }
];

export function PersonCaseCreateDialog({
  open,
  personLabel,
  onClose,
  onSubmit,
  onError
}: {
  open: boolean;
  personLabel: string;
  onClose: () => void;
  onSubmit: (input: { caseNumber: string; displayName: string; category: CaseCategory; summary?: string }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const caseNumberRef = useRef<HTMLInputElement | null>(null);
  const [caseNumber, setCaseNumber] = useState('');
  const [caseCategory, setCaseCategory] = useState<CaseCategory>('bem');
  const [caseSummary, setCaseSummary] = useState('');

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => caseNumberRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setCaseNumber('');
    setCaseCategory('bem');
    setCaseSummary('');
  }, [open]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseNumber.trim()) {
      onError('Bitte ein Aktenzeichen für die Fallakte aus Person erfassen.');
      return;
    }
    await onSubmit({ caseNumber: caseNumber.trim(), displayName: personLabel, category: caseCategory, summary: caseSummary.trim() || undefined });
    onClose();
  }

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section className="industrial-modal case-create-modal-responsive" role="dialog" aria-modal="true" aria-labelledby="person-case-create-title" aria-describedby="person-case-create-description">
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon"><FolderKanban className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <p className="industrial-kicker">Personengebundene Fallakte</p>
            <h2 id="person-case-create-title">Fallakte aus Person anlegen</h2>
            <p id="person-case-create-description">Die Fallakte wird direkt mit {personLabel} verknüpft. Für anonyme Erstberatung nutzen Sie den gesonderten anonymen Anfragepfad.</p>
          </div>
        </div>
        <form className="industrial-form case-create-form" aria-label="Fallakte aus Person anlegen" onSubmit={(event) => void submit(event)}>
          <label><span>Aktenzeichen</span><input value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} placeholder="z. B. BEM-2026-004" ref={caseNumberRef} /></label>
          <label><span>Kategorie</span><select value={caseCategory} onChange={(event) => setCaseCategory(event.target.value as CaseCategory)}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="industrial-modal-wide"><span>Kurzbeschreibung</span><input value={caseSummary} onChange={(event) => setCaseSummary(event.target.value)} placeholder="knappe Sachebene" /></label>
          <div className="industrial-modal-actions industrial-modal-wide">
            <button type="button" className="industrial-secondary-button" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="industrial-button"><Plus className="h-4 w-4" aria-hidden="true" />Fallakte aus Person anlegen</button>
          </div>
        </form>
      </section>
    </div>
  );
}
