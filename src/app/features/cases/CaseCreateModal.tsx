import type { FormEvent } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import type { CaseCategory } from '../../core/models/case.model';

export function CaseCreateModal({
  open,
  caseNumber,
  displayName,
  category,
  summary,
  error,
  onCaseNumberChange,
  onDisplayNameChange,
  onCategoryChange,
  onSummaryChange,
  onCancel,
  onSubmit
}: {
  open: boolean;
  caseNumber: string;
  displayName: string;
  category: CaseCategory;
  summary: string;
  error?: string;
  onCaseNumberChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onCategoryChange: (value: CaseCategory) => void;
  onSummaryChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section className="industrial-modal case-create-modal-responsive" role="dialog" aria-modal="true" aria-labelledby="case-create-title">
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon"><FolderKanban className="h-5 w-5" /></div>
          <div>
            <p className="industrial-kicker">Fallakte</p>
            <h2 id="case-create-title">Neue Fallakte anlegen</h2>
            <p>Die Fallakte ist der führende Arbeitsraum. Fristen, Notizen, Dokumente und Maßnahmen hängen später daran.</p>
          </div>
        </div>
        <form onSubmit={(event) => void onSubmit(event)} className="industrial-form case-create-form">
          <label><span>Aktenzeichen</span><input value={caseNumber} onChange={(event) => onCaseNumberChange(event.target.value)} placeholder="z. B. BEM-2026-004" autoFocus /></label>
          <label><span>Name / Pseudonym</span><input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} placeholder="Name oder Pseudonym" /></label>
          <label><span>Kategorie</span><select value={category} onChange={(event) => onCategoryChange(event.target.value as CaseCategory)}><option value="bem">BEM</option><option value="praevention">Prävention</option><option value="kuendigung">Kündigung</option><option value="gleichstellung">Gleichstellung</option><option value="gdb">GdB</option><option value="nachteilsausgleich">Nachteilsausgleich</option><option value="arbeitsplatzgestaltung">Arbeitsplatzgestaltung</option><option value="diskriminierung">Diskriminierung</option><option value="sonstiges">Sonstiges</option></select></label>
          <label className="industrial-modal-wide"><span>Kurzbeschreibung</span><input value={summary} onChange={(event) => onSummaryChange(event.target.value)} placeholder="knappe Sachebene" /></label>
          {error && <div className="industrial-message industrial-message-warning industrial-modal-wide">{error}</div>}
          <div className="industrial-modal-actions industrial-modal-wide">
            <button type="button" className="industrial-secondary-button" onClick={onCancel}>Abbrechen</button>
            <button type="submit" className="industrial-button"><Plus className="h-4 w-4" />Fall anlegen</button>
          </div>
        </form>
      </section>
    </div>
  );
}
