import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ActivityJournalPrefill } from '../../../domain/models/activity-journal.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormSection } from '../../shared/components/IndustrialForm';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { DataTable, EmptyState, WorkbenchGrid, WorkbenchPage, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';
import { useSbvParticipationViolations } from './hooks/useSbvParticipationViolations';
import type { ViolationDraftContextInput } from './hooks/useViolationDraftContext';
import { ViolationDraftForm } from './ViolationDraftForm';
import {
  getNextStatusActions,
  stageLabels,
  statusLabels,
  type SbvParticipationViolationPrefill,
  violationTypeLabels,
} from './sbvParticipationViolationViewLogic';

export function SbvParticipationViolationsView({
  cases,
  measures,
  pendingPrefill,
  onPrefillConsumed,
  onOpenJournalPrefill,
}: ViolationDraftContextInput & {
  pendingPrefill?: SbvParticipationViolationPrefill | null;
  onPrefillConsumed?: () => void;
  onOpenJournalPrefill?: (prefill: ActivityJournalPrefill) => void;
}) {
  const state = useSbvParticipationViolations({ cases, measures, pendingPrefill, onPrefillConsumed, onOpenJournalPrefill });
  const { loadInitial } = state;

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

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
      description="Beteiligungsverstöße nachverfolgen und bearbeiten."
      helpId="participationViolations.sourceContext"
    >
      <ModuleFeedback items={[
        state.message ? { id: 'participation-violation-message', tone: 'success', message: state.message } : null,
        state.error ? { id: 'participation-violation-error', tone: 'warning', message: state.error } : null,
      ]} />

      <WorkbenchSummary items={state.summaryItems} />

      <WorkbenchGrid>
        <ViolationDraftForm state={state} />

        <FormSection
          kicker="Nachverfolgung"
          title="Protokollierte Beteiligungsverstöße"
          description="Kontrollsicht für bereits protokollierte Vorgänge."
          helpId="participationViolations.tracking"
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
