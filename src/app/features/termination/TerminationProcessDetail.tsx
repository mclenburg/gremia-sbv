import { useEffect, useState } from 'react';
import type { DisabilityProtectionStatus, TerminationHearingRecord, TerminationHearingStatus, TerminationType } from '../../core/models/termination.model';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import { formatDateShort } from '../../shared/format/dates';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { ProcessDetailHeader, ProcessSection } from '../../shared/process/ProcessDetailHeader';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../cases/caseWorkbenchFormat';
import { protectionStatusLabel, terminationStatusLabel, terminationStatusOrder, terminationTypeLabel } from './terminationShared';
import { suggestedStatementDueAt, terminationStatusObjective, suggestNextTerminationStatus } from '@services/terminationWorkflowPolicy';

const terminationTypes: TerminationType[] = ['ordentlich', 'ausserordentlich', 'aenderungskuendigung', 'verdachtskuendigung', 'personenbedingt', 'verhaltensbedingt', 'betriebsbedingt', 'sonstiges'];
const protectionStatuses: DisabilityProtectionStatus[] = ['schwerbehindert', 'gleichgestellt', 'antrag_laeuft', 'unklar', 'nicht_bekannt'];

function normalizeDateTime(value: string): string | undefined {
  return value ? fromDateTimeLocalValue(value) : undefined;
}

export function TerminationProcessDetail({
  process,
  onUpdate,
  onOpenTemplates
}: {
  process: TerminationHearingRecord;
  onUpdate: (id: string, input: Partial<TerminationHearingRecord>) => Promise<void>;
  onOpenTemplates?: (process: TerminationHearingRecord) => void;
}) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const suggestedStatus = suggestNextTerminationStatus(process);
  const suggestedDueAt = !process.sbvStatementDueAt ? suggestedStatementDueAt(process.receivedAt, process.terminationType) : undefined;

  useEffect(() => {
    let active = true;
    async function loadWarnings() {
      try {
        const bridge = await waitForBridge();
        const rows = await bridge?.termination?.warnings(process.id);
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
          title="Kündigungsanhörung"
          description="Fristen, Schutzstatus, Integrationsamt und SBV-Stellungnahme sind hier die kritischen Punkte."
          documentAction={onOpenTemplates ? () => onOpenTemplates(process) : undefined}
          badges={[
            { label: 'Status', value: terminationStatusLabel(process.status) },
            { label: 'Frist', value: formatDateShort(process.sbvStatementDueAt) },
            { label: 'Schutz', value: protectionStatusLabel(process.protectionStatus) }
          ]}
        />

        <div className="industrial-message termination-guidance-panel">
          <div>
            <strong>Kündigungsanhörung-Statusführung</strong>
            <p>{terminationStatusObjective(process.status)}</p>
          </div>
          <div className="termination-guidance-actions">
            {suggestedDueAt && (
              <button type="button" className="industrial-secondary-button compact" onClick={() => void onUpdate(process.id, { sbvStatementDueAt: suggestedDueAt })}>
                Frist vorschlagen: {formatDateShort(suggestedDueAt)}
              </button>
            )}
            {suggestedStatus && (
              <button type="button" className="industrial-secondary-button compact" onClick={() => void onUpdate(process.id, { status: suggestedStatus })}>
                Status vorschlagen: {terminationStatusLabel(suggestedStatus)}
              </button>
            )}
          </div>
        </div>

        <div className="industrial-message termination-privacy-panel">
          <strong>Kündigungsdaten sind vertraulich.</strong>
          <p>Arbeitgebervortrag, Schutzstatus, SBV-Bewertung und Stellungnahme können Gesundheits-, Leistungs- oder Verhaltensdaten enthalten. Exporte nur mit Zweckbindung und minimal notwendigem Inhalt nutzen.</p>
        </div>

        {warnings.length > 0 && (
          <div className="industrial-message industrial-message-warning">
            <strong>Hinweise</strong>
            <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </div>
        )}

        <div className="prevention-status-sections bem-status-sections">
          <ProcessSection title="Eingang und Fristen" objective="Eingang und Stellungnahmefrist sofort sichern.">
            <label><span>Status</span><select value={process.status} onChange={(event) => void onUpdate(process.id, { status: event.target.value as TerminationHearingStatus })}>{terminationStatusOrder.map((status) => <option key={status} value={status}>{terminationStatusLabel(status)}</option>)}</select></label>
            <label><span>Kündigungsart</span><select value={process.terminationType} onChange={(event) => void onUpdate(process.id, { terminationType: event.target.value as TerminationType })}>{terminationTypes.map((type) => <option key={type} value={type}>{terminationTypeLabel(type)}</option>)}</select></label>
            <label><span>Eingang Anhörung</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.receivedAt)} onBlur={(event) => void onUpdate(process.id, { receivedAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label><span>SBV-Stellungnahmefrist</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.sbvStatementDueAt)} onBlur={(event) => void onUpdate(process.id, { sbvStatementDueAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label><span>BR-Anhörung / Parallelverfahren</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.worksCouncilHearingAt)} onBlur={(event) => void onUpdate(process.id, { worksCouncilHearingAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <p className="industrial-field-hint">Fristvorschläge sind Arbeitshilfen. Maßgeblich bleiben Zugang, konkrete Anhörungslage und ggf. anwaltliche Prüfung.</p>
          </ProcessSection>

          <ProcessSection title="Schutzstatus und Integrationsamt" objective="Bei Schwerbehinderung, Gleichstellung oder laufendem Antrag muss der besondere Kündigungsschutz geprüft werden.">
            <label><span>Schutzstatus</span><select value={process.protectionStatus} onChange={(event) => void onUpdate(process.id, { protectionStatus: event.target.value as DisabilityProtectionStatus })}>{protectionStatuses.map((status) => <option key={status} value={status}>{protectionStatusLabel(status)}</option>)}</select></label>
            <label><span>Integrationsamt angefragt am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.integrationOfficeRequestedAt)} onBlur={(event) => void onUpdate(process.id, { integrationOfficeRequestedAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label><span>Entscheidung Integrationsamt am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.integrationOfficeDecisionAt)} onBlur={(event) => void onUpdate(process.id, { integrationOfficeDecisionAt: normalizeDateTime(event.currentTarget.value) })} /></label>
            <label className="case-note-content-input"><span>Entscheidung / Stand Integrationsamt</span><TextCommandTextarea fieldId="termination-integration-office" defaultValue={process.integrationOfficeDecision ?? ''} onBlur={(event) => void onUpdate(process.id, { integrationOfficeDecision: event.currentTarget.value })} /></label>
          </ProcessSection>

          <ProcessSection title="Arbeitgebervortrag und fehlende Unterlagen" objective="Die SBV kann nur wirksam Stellung nehmen, wenn Unterlagen und Kündigungsgrund konkret vorliegen.">
            <label className="case-note-content-input"><span>Kündigungsgrund / Arbeitgebervortrag</span><TextCommandTextarea fieldId="termination-employer-reason" defaultValue={process.employerReason ?? ''} onBlur={(event) => void onUpdate(process.id, { employerReason: event.currentTarget.value })} /></label>
            <label className="case-note-content-input"><span>Fehlende Informationen / Nachforderung</span><TextCommandTextarea fieldId="termination-missing-information" defaultValue={process.missingInformation ?? ''} onBlur={(event) => void onUpdate(process.id, { missingInformation: event.currentTarget.value })} /></label>
          </ProcessSection>

          <ProcessSection title="SBV-Bewertung und Stellungnahme" objective="Stellungnahme sachlich, fristgerecht und auf die Rechte schwerbehinderter Menschen fokussiert dokumentieren.">
            <label className="case-note-content-input"><span>SBV-Bewertung</span><TextCommandTextarea fieldId="termination-assessment" defaultValue={process.sbvAssessment ?? ''} onBlur={(event) => void onUpdate(process.id, { sbvAssessment: event.currentTarget.value })} /></label>
            <label className="case-note-content-input"><span>SBV-Stellungnahme</span><TextCommandTextarea fieldId="termination-statement" defaultValue={process.statement ?? ''} onBlur={(event) => void onUpdate(process.id, { statement: event.currentTarget.value })} /></label>
          </ProcessSection>
        </div>
      </div>
    </article>
  );
}
