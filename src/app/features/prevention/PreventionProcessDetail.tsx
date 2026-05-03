import { FileText } from 'lucide-react';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import type {
  PreventionDifficultyType,
  PreventionProcessRecord,
  PreventionRiskType,
  PreventionStatus,
  UpdatePreventionProcessInput
} from '../../core/models/prevention.model';
import type { CaseProcessType } from '../cases/caseWorkbenchTypes';
import { fromDateTimeLocalValue, processTypeLabel, toDateTimeLocalValue } from '../cases/caseWorkbenchFormat';
import { preventionStatusOrder, statusLabel } from './preventionShared';

const preventionDifficultyOptions: { value: PreventionDifficultyType; label: string }[] = [
  { value: 'personenbedingt', label: 'personenbedingt' },
  { value: 'verhaltensbedingt', label: 'verhaltensbedingt' },
  { value: 'betriebsbedingt', label: 'betriebsbedingt' },
  { value: 'organisatorisch', label: 'organisatorisch' },
  { value: 'gesundheitlich_arbeitsplatzbezogen', label: 'gesundheitlich / arbeitsplatzbezogen' },
  { value: 'konflikt_fuehrung', label: 'Konflikt / Führung' },
  { value: 'sonstiges', label: 'sonstiges' }
];

const preventionRiskOptions: { value: PreventionRiskType; label: string }[] = [
  { value: 'abmahnung', label: 'Abmahnung' },
  { value: 'kuendigung', label: 'Kündigung' },
  { value: 'umsetzung', label: 'Umsetzung' },
  { value: 'arbeitsunfaehigkeit', label: 'Arbeitsunfähigkeit' },
  { value: 'ueberlastung', label: 'Überlastung' },
  { value: 'leistungsverlust', label: 'Leistungsverlust' },
  { value: 'arbeitsplatzverlust', label: 'Arbeitsplatzverlust' },
  { value: 'sonstiges', label: 'sonstiges' }
];

function preventionStatusReached(current: PreventionStatus, minimum: PreventionStatus): boolean {
  return preventionStatusOrder.indexOf(current) >= preventionStatusOrder.indexOf(minimum);
}

function canShowEmployerReactionSection(status: PreventionStatus): boolean {
  return preventionStatusReached(status, 'arbeitgeber_reagiert');
}

function canShowMeasureClarificationSection(status: PreventionStatus): boolean {
  return preventionStatusReached(status, 'massnahmen_in_klaerung') || status === 'blockiert_verweigert';
}

function canShowResultSection(status: PreventionStatus): boolean {
  return status === 'abgeschlossen' || status === 'blockiert_verweigert';
}

export function PreventionProcessDetail({
  processType,
  process,
  onUpdate,
  onOpenTemplates
}: {
  processType: CaseProcessType;
  process?: PreventionProcessRecord;
  onUpdate: (processId: string, input: UpdatePreventionProcessInput) => void | Promise<void>;
  onOpenTemplates: (process: PreventionProcessRecord) => void | Promise<void>;
}) {
  if (processType !== 'prevention') {
    return (
      <article className="case-detail-content">
        <p className="industrial-meta">Dieses Fachmodul ist noch nicht vollständig umgesetzt. Die Maßnahme wurde als fallbezogene Notiz vorgemerkt und erscheint in der Fallhistorie.</p>
      </article>
    );
  }

  if (!process) {
    return (
      <article className="case-detail-content">
        <p className="industrial-meta">Präventionsverfahren nicht gefunden.</p>
      </article>
    );
  }

  return (
    <article className="case-detail-content">
      <div className="case-detail-inline-form">
        <div className="case-process-header">
          <div className="case-process-header-main">
            <div className="case-process-title-row">
              <span className="industrial-badge">Maßnahme</span>
              <button type="button" className="case-process-document-link" onClick={() => void onOpenTemplates(process)}>
                <FileText className="h-3.5 w-3.5" />
                Dokumente
              </button>
            </div>
            <h2>{processTypeLabel(processType)}</h2>
          </div>
          <div className="case-process-badges" aria-label="Statusübersicht">
            <span className="case-process-badge"><strong>Status</strong>{statusLabel(process.status)}</span>
            <span className="case-process-badge"><strong>Risiko</strong>{process.riskType.replaceAll('_', ' ')}</span>
            <span className="case-process-badge"><strong>Person</strong>{process.personStatus}</span>
          </div>
        </div>

        <div className="prevention-status-sections">
          <section className="prevention-status-section">
            <header><span>1</span><strong>Prüfung und Ausgangslage</strong></header>
            <div className="industrial-form-grid">
              <label>
                <span>Status</span>
                <select value={process.status} onChange={(event) => void onUpdate(process.id, { status: event.target.value as PreventionStatus })}>
                  <option value="zu_pruefen">zu prüfen</option>
                  <option value="angefordert">angefordert</option>
                  <option value="arbeitgeber_reagiert">Arbeitgeber reagiert</option>
                  <option value="inklusionsamt_eingeschaltet">Inklusionsamt eingeschaltet</option>
                  <option value="massnahmen_in_klaerung">Maßnahmen in Klärung</option>
                  <option value="massnahmen_vereinbart">Maßnahmen vereinbart</option>
                  <option value="abgeschlossen">abgeschlossen</option>
                  <option value="blockiert_verweigert">blockiert / verweigert</option>
                </select>
              </label>
              <label>
                <span>Schwierigkeit</span>
                <select value={process.difficultyType} onChange={(event) => void onUpdate(process.id, { difficultyType: event.target.value as PreventionDifficultyType })}>
                  {preventionDifficultyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span>Risiko</span>
                <select value={process.riskType} onChange={(event) => void onUpdate(process.id, { riskType: event.target.value as PreventionRiskType })}>
                  {preventionRiskOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span>Status Person</span>
                <select value={process.personStatus} onChange={(event) => void onUpdate(process.id, { personStatus: event.target.value as PreventionProcessRecord['personStatus'] })}>
                  <option value="unklar">unklar</option>
                  <option value="schwerbehindert">schwerbehindert</option>
                  <option value="gleichgestellt">gleichgestellt</option>
                  <option value="antrag_laeuft">Antrag läuft</option>
                </select>
              </label>
            </div>
            <label>
              <span>Gefährdung / Anlass</span>
              <TextCommandTextarea fieldId="prevention-hazard" defaultValue={process.hazardDescription ?? ''} onBlur={(event) => void onUpdate(process.id, { hazardDescription: event.currentTarget.value })} />
            </label>
          </section>

          {preventionStatusReached(process.status, 'angefordert') && (
            <section className="prevention-status-section">
              <header><span>2</span><strong>Anforderung an den Arbeitgeber</strong></header>
              <div className="industrial-form-grid">
                <label>
                  <span>Arbeitgeber angefordert am</span>
                  <input type="datetime-local" defaultValue={toDateTimeLocalValue(process.requestedAt)} onBlur={(event) => void onUpdate(process.id, { requestedAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : undefined })} />
                </label>
                <label>
                  <span>Frist Arbeitgeberreaktion</span>
                  <input type="datetime-local" defaultValue={toDateTimeLocalValue(process.employerResponseDueAt)} onBlur={(event) => void onUpdate(process.id, { employerResponseDueAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : undefined })} />
                </label>
              </div>
            </section>
          )}

          {canShowEmployerReactionSection(process.status) && (
            <section className="prevention-status-section">
              <header><span>3</span><strong>Reaktion des Arbeitgebers</strong></header>
              <label>
                <span>Arbeitgeberreaktion / Stand</span>
                <TextCommandTextarea fieldId="prevention-employer-reaction" defaultValue={process.employerRequestSummary ?? ''} onBlur={(event) => void onUpdate(process.id, { employerRequestSummary: event.currentTarget.value })} />
              </label>
            </section>
          )}

          {canShowMeasureClarificationSection(process.status) && (
            <section className="prevention-status-section">
              <header><span>4</span><strong>Maßnahmenklärung und Umsetzung</strong></header>
              <label>
                <span>Maßnahmen</span>
                <TextCommandTextarea fieldId="prevention-measures" defaultValue={process.measures ?? ''} onBlur={(event) => void onUpdate(process.id, { measures: event.currentTarget.value })} />
              </label>
            </section>
          )}

          {canShowResultSection(process.status) && (
            <section className="prevention-status-section">
              <header><span>5</span><strong>Ergebnis / Abschluss</strong></header>
              <label>
                <span>Ergebnis / Abschluss</span>
                <TextCommandTextarea fieldId="prevention-result" defaultValue={process.result ?? ''} onBlur={(event) => void onUpdate(process.id, { result: event.currentTarget.value })} />
              </label>
            </section>
          )}
        </div>
        <p className="industrial-meta">Abschnitte werden erst sichtbar, wenn der Status fachlich erreicht ist. Eine Arbeitgeberreaktion wird deshalb erst nach dokumentierter Anforderung geführt.</p>
      </div>
    </article>
  );
}
