import { type FormEvent, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, FileWarning, Plus } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type { ActivityJournalPrefill } from '../../core/models/activity-journal.model';
import type { ParticipationViolationSourceContextType, ParticipationViolationStage, ParticipationViolationType } from '../../core/models/sbv-participation-violation.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormActions, FormSection, SelectInput, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { DataTable, EmptyState, IndustrialWarningPanel, WorkbenchGrid, WorkbenchPage, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';
import { useSbvParticipationViolations } from './hooks/useSbvParticipationViolations';
import {
  getNextStatusActions,
  needsEscalationHint,
  participationViolationSourceContextOptions,
  stageLabels,
  stageOptions,
  statusLabels,
  type SbvParticipationViolationPrefill,
  violationTypeLabels,
  violationTypeOptions,
} from './sbvParticipationViolationViewLogic';

export function SbvParticipationViolationsView({
  cases,
  pendingPrefill,
  onPrefillConsumed,
  onOpenJournalPrefill,
}: {
  cases: CaseRecord[];
  pendingPrefill?: SbvParticipationViolationPrefill | null;
  onPrefillConsumed?: () => void;
  onOpenJournalPrefill?: (prefill: ActivityJournalPrefill) => void;
}) {
  const state = useSbvParticipationViolations({ cases, pendingPrefill, onPrefillConsumed, onOpenJournalPrefill });

  useEffect(() => {
    void state.loadInitial();
  }, [state.loadInitial]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void state.createViolation();
  }

  const rows = state.items.map((item) => ({
    id: item.id,
    cells: [
      <div key="subject"><strong>{item.subject}</strong><p className="industrial-settings-note mt-1">{item.measureDescription}</p></div>,
      stageLabels[item.stage],
      violationTypeLabels[item.violationType],
      statusLabels[item.status],
      item.legalBasis,
      <div key="actions" className="industrial-search-actions">
        {getNextStatusActions(item.status).map((action) => (
          <ToolbarButton key={action.targetStatus} disabled={state.busy} onClick={() => void state.changeStatus(item, action.targetStatus)}>
            {action.label}
          </ToolbarButton>
        ))}
        <ToolbarButton disabled={state.busy || state.documentBusyId === item.id} onClick={() => void state.generateDocument(item)}>DOCX erzeugen</ToolbarButton>
        <ToolbarButton disabled={state.busy || state.followUpBusyId === item.id || Boolean(item.relatedDeadlineId)} onClick={() => void state.createFollowUp(item)}>+7-Tage-Wiedervorlage</ToolbarButton>
        <ToolbarButton disabled={state.busy || !onOpenJournalPrefill} onClick={() => void state.openJournalPrefill(item)}>Journal-Vorlage</ToolbarButton>
      </div>,
    ],
  }));

  return (
    <WorkbenchPage
      kicker="§ 178 Abs. 2 SGB IX"
      title="Beteiligungsverstöße"
      description="Zentrale Nachverfolgung, Suche und Auswertung. Der Standardweg ist die Anlage aus einer konkreten SBV-Beteiligungsmaßnahme heraus."
    >
      <ModuleFeedback items={[
        state.message ? { id: 'participation-violation-message', tone: 'success', message: state.message } : null,
        state.error ? { id: 'participation-violation-error', tone: 'warning', message: state.error } : null,
      ]} />

      <WorkbenchSummary items={state.summaryItems} />

      <WorkbenchGrid>
        <FormSection
          kicker="Bewusster Entwurf"
          title="Beteiligungsverstoß erfassen"
          description="Neue Vorgänge werden nur mit bewusst gesetztem Ausgangskontext gespeichert. Für konkrete SBV-Beteiligungen bitte bevorzugt die Maßnahme in der Fallakte öffnen."
          actions={<FileWarning className="h-5 w-5 text-yellow-300" aria-hidden="true" />}
        >
          {state.contextNotice && (
            <IndustrialWarningPanel>
              <div className="flex items-start gap-3">
                <FileWarning className="mt-1 h-5 w-5 text-yellow-300" aria-hidden="true" />
                <div>
                  <strong>{state.contextNotice.sourceLabel}</strong>
                  <p>{state.contextNotice.privacyNotice}</p>
                </div>
              </div>
            </IndustrialWarningPanel>
          )}

          {needsEscalationHint(state.form.stage) && (
            <IndustrialWarningPanel>
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 text-yellow-300" aria-hidden="true" />
                <div>
                  <strong>Scharfe Eskalationsstufe</strong>
                  <p>Abmahnung, Aussetzungsverlangen und OWi-Vorbereitung sollten bei streitigen oder folgenreichen Sachverhalten anwaltlich abgestimmt werden.</p>
                </div>
              </div>
            </IndustrialWarningPanel>
          )}

          <form onSubmit={handleSubmit} noValidate aria-label="Beteiligungsverstoß bewusst speichern">
            <div className="industrial-form-grid industrial-form-grid-auto">
              <SelectInput
                label="Ausgangskontext"
                value={state.form.sourceContextType}
                options={participationViolationSourceContextOptions}
                onValueChange={(sourceContextType) => state.updateSourceContextType(sourceContextType as ParticipationViolationSourceContextType)}
                helpText="Der Standardweg ist die konkrete SBV-Beteiligungsmaßnahme; Sonderkontexte müssen bewusst gewählt werden."
              />
              <SelectInput label="Eskalationsstufe" value={state.form.stage} options={stageOptions} onValueChange={(stage) => state.updateForm({ stage: stage as ParticipationViolationStage })} />
              <SelectInput label="Verstoßart" value={state.form.violationType} options={violationTypeOptions} onValueChange={(violationType) => state.updateForm({ violationType: violationType as ParticipationViolationType })} />
              <SelectInput
                label="Fall allgemein wählen"
                value={state.form.sourceContextType === 'case' ? state.form.caseId ?? '' : ''}
                options={state.caseOptions}
                onValueChange={state.updateCaseContext}
                disabled={state.form.sourceContextType !== 'case'}
                error={state.fieldErrors.caseId}
                helpText="Nur aktiv, wenn als Ausgangskontext „Fall allgemein“ gewählt wurde."
              />
              <TextInput
                label={state.form.sourceContextType === 'case_measure_participation' ? 'Maßnahmen-ID' : 'Kontext-ID'}
                value={state.form.sourceContextId}
                required
                error={state.fieldErrors.sourceContextId}
                helpText={state.form.sourceContextType === 'case_measure_participation' ? 'Bevorzugt aus der SBV-Beteiligungsmaßnahme übernehmen; manuelle Eingabe ist bewusst möglich.' : 'Bitte den realen Ursprungsvorgang eindeutig referenzieren.'}
                onValueChange={(sourceContextId) => state.updateForm({ sourceContextId })}
              />
              <TextInput label="Betreff" value={state.form.subject} required error={state.fieldErrors.subject} onValueChange={(subject) => state.updateForm({ subject })} />
              <TextInput label="Rechtsgrundlage" value={state.form.legalBasis ?? ''} onValueChange={(legalBasis) => state.updateForm({ legalBasis })} />
            </div>
            <TextareaInput label="Maßnahme / Sachverhalt" value={state.form.measureDescription} required error={state.fieldErrors.measureDescription} onValueChange={(measureDescription) => state.updateForm({ measureDescription })} />
            <TextareaInput label="Was war falsch?" value={state.form.wrongBehavior} required error={state.fieldErrors.wrongBehavior} onValueChange={(wrongBehavior) => state.updateForm({ wrongBehavior })} />
            <TextareaInput label="Was wäre richtig gewesen?" value={state.form.requiredBehavior} required error={state.fieldErrors.requiredBehavior} onValueChange={(requiredBehavior) => state.updateForm({ requiredBehavior })} />
            <TextareaInput label="Konsequenz-/Warnhinweis" value={state.form.consequenceWarning ?? ''} onValueChange={(consequenceWarning) => state.updateForm({ consequenceWarning })} />
            <FormActions>
              <IndustrialButton type="submit" disabled={state.busy} loading={state.busy}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Verstoß bewusst speichern
              </IndustrialButton>
            </FormActions>
          </form>
        </FormSection>

        <FormSection
          kicker="Nachverfolgung"
          title="Protokollierte Beteiligungsverstöße"
          description="Statusänderungen laufen über die Transition-Map und erzeugen Verlaufseinträge. Die Übersicht ist Kontrollsicht, nicht der normale Anlageort."
          actions={<CheckCircle2 className="h-5 w-5 text-yellow-300" aria-hidden="true" />}
        >
          <DataTable
            headers={['Betreff', 'Stufe', 'Verstoßart', 'Status', 'Rechtskern', 'Aktion']}
            rows={rows}
            ariaLabel="Beteiligungsverstöße"
            empty={<EmptyState title="Keine Beteiligungsverstöße" text="Es sind noch keine Beteiligungsverstöße protokolliert." />}
          />
        </FormSection>
      </WorkbenchGrid>
    </WorkbenchPage>
  );
}
