import { FileText } from 'lucide-react';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import type { BemProcessRecord, BemResponse, BemStatus, BemTriggerType, UpdateBemProcessInput } from '../../core/models/bem.model';
import type { CaseProcessType } from '../cases/caseWorkbenchTypes';
import { formatDateShort } from '../../workflowViews';
import { fromDateTimeLocalValue, processTypeLabel, toDateTimeLocalValue } from '../cases/caseWorkbenchFormat';
import { bemStatusLabel, bemStatusOrder, bemStatusReached } from './bemShared';

const triggerOptions: { value: BemTriggerType; label: string }[] = [
  { value: 'sechs_wochen_au', label: 'mehr als 6 Wochen AU' },
  { value: 'wiederholt_au', label: 'wiederholt arbeitsunfähig' },
  { value: 'praeventiv', label: 'präventiver Anlass' },
  { value: 'arbeitgeberangebot', label: 'Arbeitgeberangebot' },
  { value: 'sbv_anregung', label: 'SBV-Anregung' },
  { value: 'sonstiges', label: 'sonstiges' }
];

const responseOptions: { value: BemResponse; label: string }[] = [
  { value: 'offen', label: 'offen' },
  { value: 'angenommen', label: 'angenommen' },
  { value: 'abgelehnt', label: 'abgelehnt' },
  { value: 'keine_reaktion', label: 'keine Reaktion' }
];

function normalizeDateTime(value: string): string | undefined {
  return value ? fromDateTimeLocalValue(value) : undefined;
}

export function BemProcessDetail({
  processType,
  process,
  onUpdate,
  onOpenTemplates
}: {
  processType: CaseProcessType;
  process?: BemProcessRecord;
  onUpdate: (id: string, input: UpdateBemProcessInput) => Promise<void>;
  onOpenTemplates?: (process: BemProcessRecord) => void;
}) {
  if (!process || processType !== 'bem') {
    return (
      <div className="case-detail-content">
        <h2>{processTypeLabel(processType)}</h2>
        <p>Dieses Verfahren ist noch nicht ausgewählt oder konnte nicht geladen werden.</p>
      </div>
    );
  }

  const showOfferSection = bemStatusReached(process.status, 'angebot_vorzubereiten');
  const showResponseSection = bemStatusReached(process.status, 'reaktion_abwarten') || process.employeeResponse !== 'offen';
  const showMeetingSection = process.employeeResponse === 'angenommen' || bemStatusReached(process.status, 'gespraech_geplant');
  const showMeasuresSection = bemStatusReached(process.status, 'massnahmen_in_klaerung');
  const showCompletionSection = process.status === 'abgeschlossen' || process.status === 'abgebrochen' || process.status === 'abgelehnt';

  return (
    <article className="case-detail-content">
      <div className="case-detail-inline-form">
        <div className="case-process-header">
          <div className="case-process-header-main">
            <div className="case-process-title-row">
              <span className="industrial-badge">Maßnahme</span>
              {onOpenTemplates && (
                <button type="button" className="case-process-document-link" onClick={() => onOpenTemplates(process)}>
                  <FileText className="h-3.5 w-3.5" />
                  Dokumente
                </button>
              )}
            </div>
            <h2>BEM-Verfahren</h2>
          </div>
          <div className="case-process-badges" aria-label="Statusübersicht">
            <span className="case-process-badge"><strong>Status</strong>{bemStatusLabel(process.status)}</span>
            <span className="case-process-badge"><strong>Reaktion</strong>{process.employeeResponse.replaceAll('_', ' ')}</span>
            <span className="case-process-badge"><strong>Frist</strong>{formatDateShort(process.responseDueAt) || '—'}</span>
          </div>
        </div>
        <p className="industrial-meta">BEM ist freiwillig, vertraulich und prozesshaft. Dokumentiere nur, was für die SBV-Arbeit wirklich erforderlich ist.</p>
        <div className="prevention-status-sections bem-status-sections">
          <section>
          <h3>BEM-Auslöser</h3>
          <label><span>Status</span><select value={process.status} onChange={(event) => void onUpdate(process.id, { status: event.target.value as BemStatus })}>{bemStatusOrder.map((status) => <option key={status} value={status}>{bemStatusLabel(status)}</option>)}</select></label>
          <label><span>Titel</span><input value={process.title} onChange={(event) => void onUpdate(process.id, { title: event.target.value })} /></label>
          <label><span>Auslöser</span><select value={process.triggerType} onChange={(event) => void onUpdate(process.id, { triggerType: event.target.value as BemTriggerType })}>{triggerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span>AU-Tage in 12 Monaten</span><input type="number" min="0" defaultValue={process.sicknessDaysTwelveMonths ?? ''} onBlur={(event) => void onUpdate(process.id, { sicknessDaysTwelveMonths: event.currentTarget.value ? Number(event.currentTarget.value) : undefined })} /></label>
          <label className="case-note-content-input"><span>Anlass / Ausgangslage</span><TextCommandTextarea fieldId="bem-trigger-description" defaultValue={process.triggerDescription ?? ''} onBlur={(event) => void onUpdate(process.id, { triggerDescription: event.currentTarget.value })} /></label>
        </section>

        {showOfferSection && (
          <section>
            <h3>BEM-Angebot</h3>
            <label><span>Angebot versendet am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.bemOfferedAt)} onBlur={(event) => void onUpdate(process.id, { bemOfferedAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label><span>Reaktionsfrist</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.responseDueAt)} onBlur={(event) => void onUpdate(process.id, { responseDueAt: normalizeDateTime(event.currentTarget.value) })} /></label>
          </section>
        )}

        {showResponseSection && (
          <section>
            <h3>Reaktion der betroffenen Person</h3>
            <label><span>Reaktion</span><select value={process.employeeResponse} onChange={(event) => void onUpdate(process.id, { employeeResponse: event.target.value as BemResponse })}>{responseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span>Reaktion am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.employeeResponseAt)} onBlur={(event) => void onUpdate(process.id, { employeeResponseAt: normalizeDateTime(event.currentTarget.value) })} /></label>
          </section>
        )}

        {showMeetingSection && (
          <section>
            <h3>Erstgespräch / Beteiligte</h3>
            <label><span>Erstgespräch</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.firstMeetingAt)} onBlur={(event) => void onUpdate(process.id, { firstMeetingAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label><span>Beteiligte</span><input defaultValue={process.participants ?? ''} onBlur={(event) => void onUpdate(process.id, { participants: event.currentTarget.value })} /></label>
          </section>
        )}

        {showMeasuresSection && (
          <section>
            <h3>Maßnahmen und Wirksamkeit</h3>
            <label className="case-note-content-input"><span>Maßnahmen</span><TextCommandTextarea fieldId="bem-measures" defaultValue={process.measures ?? ''} onBlur={(event) => void onUpdate(process.id, { measures: event.currentTarget.value })} /></label>
            <label><span>Nächste Wirksamkeitsprüfung</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.nextReviewAt)} onBlur={(event) => void onUpdate(process.id, { nextReviewAt: normalizeDateTime(event.currentTarget.value) })} /></label>
          </section>
        )}

        {showCompletionSection && (
          <section>
            <h3>Abschluss</h3>
            <label className="case-note-content-input"><span>Ergebnis</span><TextCommandTextarea fieldId="bem-result" defaultValue={process.result ?? ''} onBlur={(event) => void onUpdate(process.id, { result: event.currentTarget.value })} /></label>
          </section>
        )}

        <section>
          <h3>Vertrauliche SBV-Notiz</h3>
          <label className="case-note-content-input"><span>Nur intern / hochsensibel</span><TextCommandTextarea fieldId="bem-confidential-notes" defaultValue={process.confidentialNotes ?? ''} onBlur={(event) => void onUpdate(process.id, { confidentialNotes: event.currentTarget.value })} /></label>
        </section>
        </div>
      </div>
    </article>
  );
}
