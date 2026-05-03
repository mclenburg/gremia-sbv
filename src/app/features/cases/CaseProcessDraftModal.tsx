import { Workflow } from 'lucide-react';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import type { CaseProcessType } from './caseWorkbenchTypes';

export type CaseProcessDraftViewModel = {
  processType: CaseProcessType;
  title: string;
  description: string;
  dueAt: string;
};

export function CaseProcessDraftModal({
  draft,
  onChange,
  onCancel,
  onCreate
}: {
  draft: CaseProcessDraftViewModel | null;
  onChange: (draft: CaseProcessDraftViewModel) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  if (!draft) return null;

  function update(patch: Partial<CaseProcessDraftViewModel>) {
    onChange({ ...draft!, ...patch });
  }

  return (
    <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
      <section className="industrial-modal">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Fallmaßnahme</p>
            <h2><Workflow className="mr-2 inline h-5 w-5" />Maßnahme anlegen</h2>
            <p>Die Maßnahme wird direkt im Fallbaum der aktuellen Fallakte ergänzt.</p>
          </div>
        </div>
        <div className="industrial-settings-form mt-5">
          <label><span>Art</span><select value={draft.processType} onChange={(event) => update({ processType: event.target.value as CaseProcessType })}><option value="prevention">Präventionsverfahren</option><option value="bem">BEM</option><option value="termination_hearing">Kündigungsanhörung</option><option value="equalization">Gleichstellung</option></select></label>
          <label><span>Titel</span><input value={draft.title} onChange={(event) => update({ title: event.target.value })} /></label>
          <label><span>Beschreibung / Anlass</span><TextCommandTextarea fieldId="case-process-description" value={draft.description} onChange={(event) => update({ description: event.target.value })} /></label>
          {(draft.processType === 'prevention' || draft.processType === 'bem') && <label><span>{draft.processType === 'bem' ? 'Reaktionsfrist optional' : 'Frist Arbeitgeberreaktion optional'}</span><input type="datetime-local" value={draft.dueAt} onChange={(event) => update({ dueAt: event.target.value })} /></label>}
          {draft.processType !== 'prevention' && draft.processType !== 'bem' && <div className="industrial-message industrial-message-warning">Das Fachmodul ist noch nicht vollständig gebaut. Gremia.SBV legt deshalb zunächst eine fallbezogene Maßnahme als vertrauliche Notiz an.</div>}
        </div>
        <div className="industrial-modal-actions">
          <button type="button" className="industrial-secondary-button" onClick={onCancel}>Abbrechen</button>
          <button type="button" className="industrial-button" onClick={onCreate}>An Fallakte hängen</button>
        </div>
      </section>
    </div>
  );
}
