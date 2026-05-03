import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import type { BemProcessRecord, BemResponse, BemStatus, BemTriggerType, UpdateBemProcessInput } from '../../core/models/bem.model';
import type { CaseProcessType } from '../cases/caseWorkbenchTypes';
import { formatDateShort } from '../../shared/format/dates';
import { fromDateTimeLocalValue, processTypeLabel, toDateTimeLocalValue } from '../cases/caseWorkbenchFormat';
import { bemStatusLabel, bemStatusOrder, bemStatusReached } from './bemShared';
import { ProcessDetailHeader, ProcessSection } from '../../shared/process/ProcessDetailHeader';
import { buildBemStatusGuidance } from '@services/bemGuidancePolicy';

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
  const guidance = buildBemStatusGuidance(process);

  return (
    <article className="case-detail-content">
      <div className="case-detail-inline-form">
        <ProcessDetailHeader
          title="BEM-Verfahren"
          description="BEM ist freiwillig, vertraulich und prozesshaft. Dokumentiere nur, was für die SBV-Arbeit wirklich erforderlich ist."
          documentAction={onOpenTemplates ? () => onOpenTemplates(process) : undefined}
          badges={[
            { label: 'Status', value: bemStatusLabel(process.status) },
            { label: 'Reaktion', value: process.employeeResponse.replaceAll('_', ' ') },
            { label: 'Frist', value: formatDateShort(process.responseDueAt) || '—' }
          ]}
        />
        <div className="industrial-message bem-guidance-panel">
          <div>
            <strong>{guidance.title}</strong>
            <p>{guidance.objective}</p>
          </div>
          {guidance.suggestedNextStatus && (
            <button type="button" className="industrial-secondary-button compact" onClick={() => void onUpdate(process.id, { status: guidance.suggestedNextStatus as BemStatus })}>
              Status vorschlagen: {bemStatusLabel(guidance.suggestedNextStatus)}
            </button>
          )}
          {guidance.required.length > 0 && (
            <ul>
              {guidance.required.map((item) => (
                <li key={item.id} className={`bem-guidance-${item.level}`}>{item.text}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="prevention-status-sections bem-status-sections">
          <ProcessSection title="BEM-Auslöser" objective="Dokumentiert wird der Anlass, nicht eine Diagnose.">
          <label><span>Status</span><select value={process.status} onChange={(event) => void onUpdate(process.id, { status: event.target.value as BemStatus })}>{bemStatusOrder.map((status) => <option key={status} value={status}>{bemStatusLabel(status)}</option>)}</select></label>
          <label><span>Titel</span><input value={process.title} onChange={(event) => void onUpdate(process.id, { title: event.target.value })} /></label>
          <label><span>Auslöser</span><select value={process.triggerType} onChange={(event) => void onUpdate(process.id, { triggerType: event.target.value as BemTriggerType })}>{triggerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span>AU-Tage in 12 Monaten</span><input type="number" min="0" defaultValue={process.sicknessDaysTwelveMonths ?? ''} onBlur={(event) => void onUpdate(process.id, { sicknessDaysTwelveMonths: event.currentTarget.value ? Number(event.currentTarget.value) : undefined })} /></label>
          <label className="case-note-content-input"><span>Anlass / Ausgangslage</span><TextCommandTextarea fieldId="bem-trigger-description" defaultValue={process.triggerDescription ?? ''} onBlur={(event) => void onUpdate(process.id, { triggerDescription: event.currentTarget.value })} /></label>
        </ProcessSection>

        {showOfferSection && (
          <ProcessSection title="BEM-Angebot" objective="Das Angebot muss freiwillig, verständlich und datenschutzklar erfolgen.">
            <label><span>Angebot versendet am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.bemOfferedAt)} onBlur={(event) => void onUpdate(process.id, { bemOfferedAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label><span>Reaktionsfrist</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.responseDueAt)} onBlur={(event) => void onUpdate(process.id, { responseDueAt: normalizeDateTime(event.currentTarget.value) })} /></label>
          </ProcessSection>
        )}


        {showOfferSection && (
          <ProcessSection title="Datenschutz und Einwilligung" objective="BEM-Daten sind besonders sensibel. Reichweite, Freiwilligkeit und Widerruf müssen nachvollziehbar sein.">
            <label><span>Datenschutzhinweis erteilt am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.privacyNoticeAt)} onBlur={(event) => void onUpdate(process.id, { privacyNoticeAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label className="case-note-content-input"><span>Einwilligungsumfang / Beteiligte</span><TextCommandTextarea fieldId="bem-consent-scope" defaultValue={process.consentScope ?? ''} onBlur={(event) => void onUpdate(process.id, { consentScope: event.currentTarget.value })} /></label>
            <label><span>Widerruf am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.consentWithdrawnAt)} onBlur={(event) => void onUpdate(process.id, { consentWithdrawnAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label className="case-note-content-input"><span>Aufbewahrung / Löschhinweis</span><TextCommandTextarea fieldId="bem-data-retention-note" defaultValue={process.dataRetentionNote ?? ''} onBlur={(event) => void onUpdate(process.id, { dataRetentionNote: event.currentTarget.value })} /></label>
          </ProcessSection>
        )}

        {showResponseSection && (
          <ProcessSection title="Reaktion der betroffenen Person" objective="Ablehnung und Widerruf dürfen nicht zulasten der betroffenen Person als Pflichtverletzung dokumentiert werden.">
            <label><span>Reaktion</span><select value={process.employeeResponse} onChange={(event) => void onUpdate(process.id, { employeeResponse: event.target.value as BemResponse })}>{responseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span>Reaktion am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.employeeResponseAt)} onBlur={(event) => void onUpdate(process.id, { employeeResponseAt: normalizeDateTime(event.currentTarget.value) })} /></label>
          </ProcessSection>
        )}

        {showMeetingSection && (
          <ProcessSection title="Erstgespräch / Beteiligte" objective="Nur die von der betroffenen Person gewünschten oder erforderlichen Beteiligten aufnehmen.">
            <label><span>Erstgespräch</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.firstMeetingAt)} onBlur={(event) => void onUpdate(process.id, { firstMeetingAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label><span>Beteiligte</span><input defaultValue={process.participants ?? ''} onBlur={(event) => void onUpdate(process.id, { participants: event.currentTarget.value })} /></label>
          </ProcessSection>
        )}

        {showMeasuresSection && (
          <ProcessSection title="Maßnahmenplan und Wirksamkeit" objective="Maßnahmen brauchen Verantwortliche, Termin und Wirksamkeitsprüfung.">
            <label className="case-note-content-input"><span>Maßnahmenplan</span><TextCommandTextarea fieldId="bem-measures" defaultValue={process.measures ?? ''} onBlur={(event) => void onUpdate(process.id, { measures: event.currentTarget.value })} /></label>
            <label><span>Verantwortliche / Umsetzung</span><input defaultValue={process.measureOwners ?? ''} onBlur={(event) => void onUpdate(process.id, { measureOwners: event.currentTarget.value })} /></label>
            <label><span>Nächste Wirksamkeitsprüfung</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.nextReviewAt)} onBlur={(event) => void onUpdate(process.id, { nextReviewAt: normalizeDateTime(event.currentTarget.value) })} /></label>
          </ProcessSection>
        )}

        {showCompletionSection && (
          <ProcessSection title="Abschluss" objective="Abschlussgrund, Ergebnis und offene Punkte gehören getrennt dokumentiert.">
            <label><span>Abschlussgrund</span><input defaultValue={process.completionReason ?? ''} onBlur={(event) => void onUpdate(process.id, { completionReason: event.currentTarget.value })} /></label>
            <label className="case-note-content-input"><span>Ergebnis</span><TextCommandTextarea fieldId="bem-result" defaultValue={process.result ?? ''} onBlur={(event) => void onUpdate(process.id, { result: event.currentTarget.value })} /></label>
          </ProcessSection>
        )}

        <ProcessSection title="Vertrauliche SBV-Notiz" objective="Dieses Feld ist für interne SBV-Abwägungen gedacht und beim Export besonders zu prüfen.">
          <label className="case-note-content-input"><span>Nur intern / hochsensibel</span><TextCommandTextarea fieldId="bem-confidential-notes" defaultValue={process.confidentialNotes ?? ''} onBlur={(event) => void onUpdate(process.id, { confidentialNotes: event.currentTarget.value })} /></label>
        </ProcessSection>
        </div>
      </div>
    </article>
  );
}
