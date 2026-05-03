import type { FormEvent } from 'react';
import { MessageSquare, Save } from 'lucide-react';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseNoteRecord, CaseNoteType, ConfidentialLevel } from '../../core/models/case-note.model';

type ProtocolTextTarget = 'content' | 'nextSteps';

export function CaseNoteModal({
  open,
  editingNote,
  noteTitle,
  noteDate,
  noteType,
  participants,
  content,
  nextSteps,
  cases,
  linkedCaseIds,
  selectedCaseId,
  confidentialLevel,
  containsHealthData,
  noteError,
  noteInfo,
  onTitleChange,
  onDateChange,
  onNoteTypeChange,
  onParticipantsChange,
  onProtocolTextChange,
  onToggleLinkedCase,
  onConfidentialLevelChange,
  onContainsHealthDataChange,
  onCancel,
  onSubmit
}: {
  open: boolean;
  editingNote: CaseNoteRecord | null;
  noteTitle: string;
  noteDate: string;
  noteType: CaseNoteType;
  participants: string;
  content: string;
  nextSteps: string;
  cases: CaseRecord[];
  linkedCaseIds: string[];
  selectedCaseId: string;
  confidentialLevel: ConfidentialLevel;
  containsHealthData: boolean;
  noteError: string;
  noteInfo: string;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onNoteTypeChange: (value: CaseNoteType) => void;
  onParticipantsChange: (value: string) => void;
  onProtocolTextChange: (target: ProtocolTextTarget, value: string) => void;
  onToggleLinkedCase: (caseId: string, checked: boolean) => void;
  onConfidentialLevelChange: (value: ConfidentialLevel) => void;
  onContainsHealthDataChange: (value: boolean) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section className="industrial-modal industrial-modal-wide" role="dialog" aria-modal="true" aria-labelledby="case-note-title">
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon"><MessageSquare className="h-5 w-5" /></div>
          <div>
            <p className="industrial-kicker">Fallbaum</p>
            <h2 id="case-note-title">{editingNote ? 'Notiz / Protokoll bearbeiten' : 'Neue Gesprächsnotiz / neues Protokoll'}</h2>
            <p>Diese Maske gehört zur ausgewählten Fallakte. Weitere Fallbezüge können direkt hier ergänzt werden.</p>
          </div>
        </div>
        <form onSubmit={(event) => void onSubmit(event)} className="industrial-form case-note-form">
          <label><span>Titel</span><input value={noteTitle} onChange={(event) => onTitleChange(event.target.value)} placeholder="z. B. Erstgespräch" autoFocus /></label>
          <label><span>Datum</span><input type="datetime-local" value={noteDate} onChange={(event) => onDateChange(event.target.value)} /></label>
          <label><span>Typ</span><select value={noteType} onChange={(event) => onNoteTypeChange(event.target.value as CaseNoteType)}><option value="gespraech">Gespräch</option><option value="protokoll">Protokoll</option><option value="telefonat">Telefonat</option><option value="videocall">Videocall</option><option value="email">E-Mail</option><option value="bem">BEM</option><option value="anhoerung">Anhörung</option><option value="interne_notiz">Interne Notiz</option><option value="sonstiges">Sonstiges</option></select></label>
          <label><span>Beteiligte</span><input value={participants} onChange={(event) => onParticipantsChange(event.target.value)} placeholder="optional" /></label>
          <label className="case-note-content-input"><span>Inhalt</span><TextCommandTextarea fieldId="case-note-content" value={content} onChange={(event) => onProtocolTextChange('content', event.target.value)} placeholder="Gesprächsinhalt / Protokoll …" /></label>
          <label className="case-note-content-input"><span>Nächste Schritte</span><TextCommandTextarea fieldId="case-note-next-steps" value={nextSteps} onChange={(event) => onProtocolTextChange('nextSteps', event.target.value)} placeholder="optional" /></label>
          <div className="case-note-link-panel">
            <span>Fallbezüge</span>
            <p className="industrial-meta">Eine Notiz kann mehreren Fallakten zugeordnet werden. Der aktuell ausgewählte Fall bleibt automatisch Bezug.</p>
            <div className="case-note-link-grid">
              {cases.map((record) => (
                <label key={record.id} className="industrial-checkbox-row compact">
                  <input type="checkbox" checked={linkedCaseIds.includes(record.id) || record.id === selectedCaseId} disabled={record.id === selectedCaseId} onChange={(event) => onToggleLinkedCase(record.id, event.target.checked)} />
                  <span>{record.caseNumber} · {record.displayName}</span>
                </label>
              ))}
            </div>
          </div>
          <label><span>Vertraulichkeit</span><select value={confidentialLevel} onChange={(event) => onConfidentialLevelChange(event.target.value as ConfidentialLevel)}><option value="normal">normal</option><option value="sensibel">sensibel</option><option value="hoch_sensibel">hoch sensibel</option></select></label>
          <label className="industrial-checkbox-row"><input type="checkbox" checked={containsHealthData} onChange={(event) => onContainsHealthDataChange(event.target.checked)} /><span>enthält Gesundheits-/Behinderungsbezug</span></label>
          {noteError && <div className="industrial-message industrial-message-warning industrial-modal-wide">{noteError}</div>}
          {noteInfo && <div className="industrial-message industrial-message-ok industrial-modal-wide">{noteInfo}</div>}
          <div className="industrial-modal-actions industrial-modal-wide"><button type="button" className="industrial-secondary-button" onClick={onCancel}>Abbrechen</button><button type="submit" className="industrial-button"><Save className="h-4 w-4" />Speichern</button></div>
        </form>
      </section>
    </div>
  );
}
