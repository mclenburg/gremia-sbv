import { useEffect, useState } from 'react';
import type { EqualizationProcessRecord, EqualizationStatus } from '../../core/models/equalization.model';
import type { CaseNoteRecord } from '../../core/models/case-note.model';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import { formatDateShort } from '../../shared/format/dates';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { ProcessDetailHeader, ProcessSection } from '../../shared/process/ProcessDetailHeader';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../cases/caseWorkbenchFormat';
import { equalizationStatusLabel, equalizationStatusOrder } from './equalizationShared';
import { buildEqualizationGuidance } from '@services/equalizationGuidancePolicy';

function normalizeDateTime(value: string): string | undefined {
  return value ? fromDateTimeLocalValue(value) : undefined;
}

function stripEqualizationNoteMarker(content: string): string {
  return content.replace(/^\[\[equalization:[^\]]+\]\]\s*/m, '').trim();
}

export function EqualizationProcessDetail({
  process,
  onUpdate,
  onOpenTemplates,
  secureNotes = [],
  onCreateSecureNote
}: {
  process: EqualizationProcessRecord;
  onUpdate: (id: string, input: Partial<EqualizationProcessRecord>) => Promise<void>;
  onOpenTemplates?: (process: EqualizationProcessRecord) => void;
  secureNotes?: CaseNoteRecord[];
  onCreateSecureNote?: (process: EqualizationProcessRecord, content: string) => Promise<void>;
}) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [secureNoteDraft, setSecureNoteDraft] = useState('');
  const guidance = buildEqualizationGuidance(process);

  async function saveSecureNote() {
    const content = secureNoteDraft.trim();
    if (!content || !onCreateSecureNote) return;
    await onCreateSecureNote(process, content);
    setSecureNoteDraft('');
  }

  useEffect(() => {
    let active = true;
    async function loadWarnings() {
      try {
        const bridge = await waitForBridge();
        const rows = await bridge?.equalization?.warnings(process.id);
        if (active) setWarnings((rows ?? []).map((item) => item.message));
      } catch {
        if (active) setWarnings([]);
      }
    }
    void loadWarnings();
    return () => {
      active = false;
    };
  }, [process]);

  return (
    <article className="case-detail-content">
      <div className="case-detail-inline-form">
        <ProcessDetailHeader
          title="Gleichstellung / GdB"
          description="Beratung, Antrag, Bescheid und Widerspruchsfrist sauber dokumentieren. Die SBV unterstützt, entscheidet aber nicht über Antrag oder Widerspruch."
          documentAction={onOpenTemplates ? () => onOpenTemplates(process) : undefined}
          badges={[
            { label: 'Status', value: equalizationStatusLabel(process.applicationStatus) },
            { label: 'Bescheid', value: formatDateShort(process.decisionReceivedAt) },
            { label: 'Widerspruch', value: formatDateShort(process.objectionDueAt) }
          ]}
        />

        <div className="industrial-message equalization-guidance-panel">
          <div>
            <strong>{guidance.title}</strong>
            <p>{guidance.objective}</p>
          </div>
          {guidance.suggestedNextStatus && (
            <button type="button" className="industrial-secondary-button compact" onClick={() => void onUpdate(process.id, { applicationStatus: guidance.suggestedNextStatus })}>
              Status vorschlagen: {equalizationStatusLabel(guidance.suggestedNextStatus)}
            </button>
          )}
        </div>

        {warnings.length > 0 && (
          <div className="industrial-message industrial-message-warning">
            <strong>Hinweise</strong>
            <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </div>
        )}

        <div className="prevention-status-sections bem-status-sections">
          <ProcessSection title="Status und Antrag" objective="Antragseinreichung, Geschäftszeichen und Bearbeitungsstand nachvollziehbar halten.">
            <label><span>Status</span><select value={process.applicationStatus} onChange={(event) => void onUpdate(process.id, { applicationStatus: event.target.value as EqualizationStatus })}>{equalizationStatusOrder.map((status) => <option key={status} value={status}>{equalizationStatusLabel(status)}</option>)}</select></label>
            <label><span>Geschäftszeichen / Agentur</span><input defaultValue={process.agencyReference ?? ''} onBlur={(event) => void onUpdate(process.id, { agencyReference: event.currentTarget.value })} /></label>
            <label><span>Antrag eingereicht am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.applicationSubmittedAt)} onBlur={(event) => void onUpdate(process.id, { applicationSubmittedAt: normalizeDateTime(event.currentTarget.value) })} /></label>
          </ProcessSection>

          <ProcessSection title="Bescheid und Widerspruch" objective="Bei Ablehnung ist die Widerspruchsfrist der kritische Punkt.">
            <label><span>Bescheid erhalten am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.decisionReceivedAt)} onBlur={(event) => void onUpdate(process.id, { decisionReceivedAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label><span>Widerspruchsfrist</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.objectionDueAt)} onBlur={(event) => void onUpdate(process.id, { objectionDueAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label className="case-note-content-input"><span>Ergebnis / Bescheid</span><TextCommandTextarea fieldId="equalization-outcome" defaultValue={process.outcome ?? ''} onBlur={(event) => void onUpdate(process.id, { outcome: event.currentTarget.value })} /></label>
          </ProcessSection>

          <ProcessSection title="Verschlüsselte SBV-Notizen / nächste Schritte" objective="Notizen zu Gleichstellung, GdB und Gesundheit werden als verschlüsselte Fallnotizen geführt und nicht mehr im Gleichstellungsdatensatz gespeichert.">
            {process.legacyPlaintextNotesPresent && (
              <div className="industrial-message industrial-message-warning">Es gibt Alt-Notizen aus einer früheren Version. Bitte in eine verschlüsselte Fallnotiz übertragen und danach den Altbestand bereinigen.</div>
            )}
            {secureNotes.length > 0 && (
              <div className="case-note-secure-list">
                {secureNotes.map((note) => (
                  <article key={note.id} className="case-note-secure-item">
                    <strong>{note.title}</strong>
                    <p>{stripEqualizationNoteMarker(note.content ?? '')}</p>
                  </article>
                ))}
              </div>
            )}
            <label className="case-note-content-input"><span>Neue verschlüsselte Notiz</span><TextCommandTextarea fieldId="equalization-secure-note" value={secureNoteDraft} onChange={(event) => setSecureNoteDraft(event.currentTarget.value)} onBlur={() => void saveSecureNote()} /></label>
          </ProcessSection>
        </div>
      </div>
    </article>
  );
}
